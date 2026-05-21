import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import Asset from "@/models/Asset";
import dbConnect from "@/lib/mongodb";
import { uploadToR2, buildUserKey } from "@/lib/r2-upload";
import { consumeCreditsForAction, refundCreditsForAction } from "@/lib/credit-system";

/**
 * POST /api/veo-long-ad/generate-pipeline
 *
 * Core SSE pipeline:
 *   1. Generate first 8s clip (Veo 3.1 generateVideos with reference images)
 *   2. For each subsequent chunk, extend using Veo 3.1 extend (video: { uri })
 *   3. Return final extended video URL
 *
 * Input (FormData):
 *   chunks: JSON string (array of chunk objects from /chunk-script)
 *   masterVoicePrompt: string
 *   locationImages[]: File[]
 *   avatarImages[]: File[]
 *   language: string
 *   aspectRatio: "9:16" | "16:9"
 *
 * SSE events:
 *   { type: "progress", chunkIndex, totalChunks, status, message }
 *   { type: "chunk_done", chunkIndex, totalChunks, estimatedDuration }
 *   { type: "uploading", message }
 *   { type: "video_ready", videoUrl, totalChunks, totalDuration }
 *   { type: "error", message, failedChunkIndex? }
 *   { type: "done" }
 */
export async function POST(request) {
  let userId = null;
  let debit = null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;

    const { resolveUserFromSession } = await import("@/lib/user-resolver");
    const user = await resolveUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    userId = user._id.toString();

    const formData = await request.formData();

    // Parse chunks JSON
    const chunksRaw = formData.get("chunks");
    if (!chunksRaw) {
      return NextResponse.json({ error: "chunks is required" }, { status: 400 });
    }
    let chunks;
    try {
      chunks = JSON.parse(chunksRaw);
    } catch {
      return NextResponse.json({ error: "Invalid chunks JSON" }, { status: 400 });
    }
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ error: "At least 1 chunk required" }, { status: 400 });
    }
    if (chunks.length > 10) {
      return NextResponse.json({ error: "Maximum 10 chunks allowed" }, { status: 400 });
    }

    const masterVoicePrompt = (formData.get("masterVoicePrompt") || "").toString();
    const language = (formData.get("language") || "english").toString();
    const aspectRatio = (formData.get("aspectRatio") || "9:16").toString();

    // Collect location images (for first video reference)
    const locationImages = [];
    for (let i = 0; i < 10; i++) {
      const file = formData.get(`locationImage_${i}`);
      if (file) locationImages.push(file);
    }
    if (locationImages.length === 0) {
      const single = formData.get("locationImage");
      if (single) locationImages.push(single);
    }

    // Collect avatar images
    const avatarImages = [];
    for (let i = 0; i < 10; i++) {
      const file = formData.get(`avatarImage_${i}`);
      if (file) avatarImages.push(file);
    }
    if (avatarImages.length === 0) {
      const single = formData.get("avatarImage");
      if (single) avatarImages.push(single);
    }

    // Debit credits (for first generation)
    const creditResult = await consumeCreditsForAction({
      userId,
      action: "real_estate_video",
      metadata: { endpoint: "/api/veo-long-ad/generate-pipeline" },
    });
    if (!creditResult.ok) {
      return NextResponse.json(creditResult.payload, { status: creditResult.status });
    }
    debit = creditResult.debit;

    // Build reference images for first clip
    async function fileToBase64(file) {
      const buf = Buffer.from(await file.arrayBuffer());
      return {
        imageBytes: buf.toString("base64"),
        mimeType: file.type || "image/jpeg",
      };
    }

    const avatarImgs = [];
    for (const f of avatarImages.slice(0, 2)) {
      try {
        avatarImgs.push(await fileToBase64(f));
      } catch (_) {}
    }

    const locationImgs = [];
    for (const f of locationImages.slice(0, 2)) {
      try {
        locationImgs.push(await fileToBase64(f));
      } catch (_) {}
    }

    const maxSlots = 3;
    const avatarSlots = Math.min(avatarImgs.length, maxSlots - 1);
    const locationSlots = Math.min(locationImgs.length, maxSlots - avatarSlots);
    console.log(`[VeoLongAd] avatarSlots: ${avatarSlots}, locationSlots: ${locationSlots}`);

    const referenceImages = [
      ...avatarImgs.slice(0, avatarSlots).map((img) => ({
        image: img,
        referenceType: "asset",
      })),
      ...locationImgs.slice(0, locationSlots).map((img) => ({
        image: img,
        referenceType: "asset",
      })),
    ];
    console.log(`[VeoLongAd] Total referenceImages: ${referenceImages.length}`);

    // ── SSE stream ────────────────────────────────────────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function send(data) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (_) {}
        }

        async function pollOperation(initialOperation, timeoutMs = 12 * 60 * 1000) {
          let currentOp = initialOperation;
          const deadline = Date.now() + timeoutMs;

          while (currentOp && !currentOp.done) {
            if (Date.now() > deadline) throw new Error("Video generation timed out");
            await new Promise((r) => setTimeout(r, 10000));

            const nextOp = await ai.operations.getVideosOperation({ operation: currentOp });
            if (!nextOp) {
              console.warn("[VeoLongAd] Poll returned null, retrying...");
              continue;
            }
            currentOp = nextOp;
          }

          if (!currentOp) throw new Error("Operation lost during polling");
          if (currentOp.error) {
            const msg = currentOp.error.message || "";
            throw new Error(msg.includes("internal server issue")
              ? "Gemini encountered a transient error. Please retry in 1–2 minutes."
              : msg || "Operation failed");
          }
          return currentOp.response;
        }

        function extractGeneratedVideo(result) {
          // Defensive extractor — handles all known SDK response shapes
          return (
            result?.generatedVideos?.[0]?.video ||
            result?.generatedVideos?.[0]?.videoResponse ||
            result?.response?.generatedVideos?.[0]?.video ||
            result?.response?.generatedVideos?.[0]?.videoResponse ||
            result?.candidates?.[0]?.content?.parts?.find((p) => p?.fileData?.fileUri)?.fileData ||
            null
          );
        }

        function extractFileId(uri) {
          if (!uri) return null;
          const match = uri.match(/files\/([^/:?]+)/);
          return match?.[1] || null;
        }

        /**
         * Strip :download?alt=media (and any query params) from the Veo URI.
         * Veo returns:  https://.../files/<id>:download?alt=media
         * Extension needs: https://.../files/<id>
         */
        function cleanVeoUri(uri) {
          if (!uri) return uri;
          // Remove anything after and including the colon suffix (:download...)
          // e.g. "https://.../files/21wkcqsf1kgd:download?alt=media" → "https://.../files/21wkcqsf1kgd"
          return uri.replace(/:download.*$/, "").replace(/\?.*$/, "");
        }

        let currentVideoUri = null;
        const totalChunks = chunks.length;

        try {
          // ── Step 1: Generate first 8-second clip ─────────────────────────
          const chunk0 = chunks[0];

          send({
            type: "progress",
            chunkIndex: 0,
            totalChunks,
            status: "generating",
            message: `🎬 Generating base clip (1/${totalChunks}) — this takes 2–3 minutes...`,
          });

          const firstPrompt = buildFirstClipPrompt(chunk0, masterVoicePrompt, language);

          const genOp = await ai.models.generateVideos({
            model: "veo-3.1-generate-preview",
            prompt: firstPrompt,
            config: {
              aspectRatio,
              resolution: "720p",
              durationSeconds: 8,
              referenceImages,
            },
          });

          if (!genOp) throw new Error("Failed to start base video generation");

          // ── DIAGNOSTIC: log the operation object shape ─────────────────
          console.log("[VeoLongAd] genOp keys:", genOp ? Object.keys(genOp) : null);
          console.log("[VeoLongAd] genOp.done:", genOp?.done, "genOp.name:", genOp?.name);

          send({
            type: "progress",
            chunkIndex: 0,
            totalChunks,
            status: "rendering",
            message: "⏳ Rendering base clip... usually takes 2–3 minutes.",
          });

          const firstResult = await pollOperation(genOp);

          // ── DIAGNOSTIC: log full result shape to understand SDK nesting ─
          console.log("[VeoLongAd] firstResult keys:", firstResult ? Object.keys(firstResult) : null);
          console.log("[VeoLongAd] firstResult.generatedVideos:", JSON.stringify(firstResult?.generatedVideos, null, 2));
          console.log("[VeoLongAd] firstResult.response:", JSON.stringify(firstResult?.response, null, 2));
          console.log("[VeoLongAd] firstResult.candidates:", JSON.stringify(firstResult?.candidates, null, 2));

          const firstGeneratedVideo = extractGeneratedVideo(firstResult);

          if (!firstGeneratedVideo?.uri) {
            console.error("[VeoLongAd] Unexpected first result shape:", JSON.stringify({
              keys: firstResult ? Object.keys(firstResult) : null,
              generatedVideos: firstResult?.generatedVideos,
            }));
            throw new Error("Base video generation returned no video. The prompt may have been rejected or Veo returned an unexpected response shape.");
          }

          // Store the raw URI for downloading, clean URI for extension
          const rawVideoUri = firstGeneratedVideo.uri;
          currentVideoUri = cleanVeoUri(rawVideoUri);
          console.log("[VeoLongAd] Base clip URI (raw):", rawVideoUri);
          console.log("[VeoLongAd] Base clip URI (clean for extension):", currentVideoUri);

          send({
            type: "chunk_done",
            chunkIndex: 0,
            totalChunks,
            estimatedDuration: chunk0.estimatedSeconds || 8,
            message: `✅ Base clip ready (${chunk0.estimatedSeconds || 8}s)`,
          });

          // ── Step 2: Extend for each subsequent chunk ──────────────────────
          let cumulativeDuration = chunk0.estimatedSeconds || 8;

          if (chunks.length > 1) {
            // Give Veo time to fully "process" the base clip before it can be
            // used as extension input (avoids INVALID_ARGUMENT "not processed" error).
            // 45s is the empirically safe minimum for Veo 3.1.
            send({
              type: "progress",
              chunkIndex: 0,
              totalChunks,
              status: "extending",
              message: "⏳ Waiting for base clip to be indexed by Veo (45s)...",
            });
            await new Promise((r) => setTimeout(r, 45000));
          }

          for (let i = 1; i < chunks.length; i++) {
            const chunk = chunks[i];

            send({
              type: "progress",
              chunkIndex: i,
              totalChunks,
              status: "extending",
              message: `🔄 Extending with chunk ${i + 1}/${totalChunks} (~${cumulativeDuration}s so far)...`,
            });

            const extensionPrompt = buildExtensionPrompt(chunk, masterVoicePrompt, language);

            let extVideoUri = null;
            let lastErr;

            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                console.log(`[VeoLongAd] Extend chunk ${i} attempt ${attempt + 1}: uri=${currentVideoUri}`);

                // Extension: generateVideos with video: { uri } — use the CLEAN uri (no :download suffix)
                const extOp = await ai.models.generateVideos({
                  model: "veo-3.1-generate-preview",
                  video: { uri: currentVideoUri },
                  prompt: extensionPrompt,
                  config: {
                    aspectRatio,
                    resolution: "720p",
                  },
                });

                if (!extOp) throw new Error("Failed to start extension operation");

                send({
                  type: "progress",
                  chunkIndex: i,
                  totalChunks,
                  status: "extending",
                  message: `⏳ Rendering extension ${i + 1}/${totalChunks}...`,
                });

                const extResult = await pollOperation(extOp);

                // ── DIAGNOSTIC: log extension result shape ────────────────
                console.log(`[VeoLongAd] extResult chunk ${i} keys:`, extResult ? Object.keys(extResult) : null);
                console.log(`[VeoLongAd] extResult.generatedVideos:`, JSON.stringify(extResult?.generatedVideos, null, 2));

                const extVideo = extractGeneratedVideo(extResult);
                const rawExtUri = extVideo?.uri || extVideo?.fileUri || null;
                extVideoUri = cleanVeoUri(rawExtUri);

                if (!extVideoUri) {
                  console.error(`[VeoLongAd] Extension chunk ${i} returned no URI. extVideo:`, extVideo);
                  throw new Error(`Extension chunk ${i + 1} returned no video URI`);
                }

                console.log(`[VeoLongAd] Chunk ${i} extended. Clean URI:`, extVideoUri);
                break; // success

              } catch (err) {
                lastErr = err;
                const msg = (err.message || "").toLowerCase();
                const isTransient =
                  msg.includes("internal server") ||
                  msg.includes("transient") ||
                  msg.includes("timeout") ||
                  msg.includes("429") ||
                  msg.includes("503") ||
                  msg.includes("not processed") ||
                  msg.includes("invalid_argument");

                if (!isTransient || attempt === 2) throw err;

                // For "not processed" errors, wait longer between retries
                const delay = msg.includes("not processed") || msg.includes("invalid_argument")
                  ? 30000 * (attempt + 1)
                  : 8000 * (attempt + 1);

                console.warn(`[VeoLongAd] Transient error on chunk ${i}, retrying in ${delay}ms:`, err.message);
                send({
                  type: "progress",
                  chunkIndex: i,
                  totalChunks,
                  status: "extending",
                  message: `⚠️ Temporary error, retrying chunk ${i + 1} in ${delay / 1000}s...`,
                });
                await new Promise((r) => setTimeout(r, delay));
              }
            }

            if (!extVideoUri) {
              // Non-fatal partial failure: stop extending, save what we have
              send({
                type: "error",
                failedChunkIndex: i,
                message: `Extension stopped at chunk ${i + 1}: ${lastErr?.message || "No video returned"}. Saving partial video (${cumulativeDuration}s).`,
                partial: true,
              });
              break;
            }

            currentVideoUri = extVideoUri;
            cumulativeDuration += chunk.estimatedSeconds || 8;

            send({
              type: "chunk_done",
              chunkIndex: i,
              totalChunks,
              estimatedDuration: cumulativeDuration,
              message: `✅ Extended to ~${cumulativeDuration}s (chunk ${i + 1}/${totalChunks} done)`,
            });
          }

          // ── Step 3: Download + upload to R2 ──────────────────────────────
          const finalFileId = extractFileId(currentVideoUri);
          if (!finalFileId) throw new Error("Failed to extract final fileId");

          send({
            type: "uploading",
            message: "☁️ Saving final video to cloud storage...",
          });

          let finalVideoUrl = `/api/ai-walkthrough/video-proxy?fileId=${finalFileId}`;

          try {
            const downloadUrl = `https://generativelanguage.googleapis.com/v1beta/files/${finalFileId}?key=${apiKey}&alt=media`;
            const videoResponse = await fetch(downloadUrl);
            if (!videoResponse.ok) throw new Error(`Download failed: ${videoResponse.status}`);
            const videoBytes = Buffer.from(await videoResponse.arrayBuffer());

            const key = buildUserKey(userId, "videos", "mp4", "veo-long-ad");
            finalVideoUrl = await uploadToR2(videoBytes, key, "video/mp4");
            console.log(`[VeoLongAd] Uploaded to R2: ${key} (${(videoBytes.length / 1024 / 1024).toFixed(1)} MB)`);
          } catch (saveErr) {
            console.error("[VeoLongAd] R2 upload failed, using proxy URL:", saveErr.message);
          }

          // ── Save to Asset Library ─────────────────────────────────────────
          try {
            await dbConnect();
            await Asset.create({
              userId,
              name: `Long-Form Ad — ${new Date().toLocaleDateString()}`,
              url: finalVideoUrl,
              type: "clip",
              metadata: {
                fileId: finalFileId,
                videoUri: currentVideoUri,
                source: "veo-long-ad",
                totalChunks,
                totalDuration: chunks.reduce((s, c) => s + (c.estimatedSeconds || 8), 0),
                context: "veo-long-ad",
              },
            });
          } catch (dbErr) {
            console.error("[VeoLongAd] DB save error:", dbErr);
          }

          const totalDuration = chunks.reduce((s, c) => s + (c.estimatedSeconds || 8), 0);

          send({
            type: "video_ready",
            videoUrl: finalVideoUrl,
            totalChunks,
            totalDuration,
            message: `🎉 Your ${totalDuration}s long-form ad is ready!`,
          });

          send({ type: "done" });
          controller.close();
        } catch (err) {
          console.error("[VeoLongAd] Pipeline error:", err);

          if (userId && debit) {
            await refundCreditsForAction({
              userId,
              action: "real_estate_video",
              debit,
              metadata: {
                endpoint: "/api/veo-long-ad/generate-pipeline",
                reason: "generation_failed",
                message: err.message,
              },
            });
          }

          send({ type: "error", message: err.message || "Pipeline failed" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[VeoLongAd] Outer error:", error);

    if (userId && debit) {
      await refundCreditsForAction({
        userId,
        action: "real_estate_video",
        debit,
        metadata: {
          endpoint: "/api/veo-long-ad/generate-pipeline",
          reason: "unexpected_error",
          message: error.message,
        },
      });
    }

    return NextResponse.json(
      { error: error.message || "Failed to start pipeline" },
      { status: 500 }
    );
  }
}

/**
 * High-quality realism tokens from the master creative SOP.
 */
const SKIN_ENHANCER_TOKENS = `Photorealistic detail. Real human skin with visible natural texture, pores, and micro shadows. Preserve natural under-eye detail and realistic lip texture. No airbrushing or waxy finish. Authentic facial structure with natural micro-expressions and eye depth. Lighting behaves naturally with soft highlights and realistic shadows. High-detail editorial realism, grounded in real-world 4k camera capture.`;

/**
 * Build the prompt for the FIRST Veo clip.
 */
function buildFirstClipPrompt(chunk, masterVoicePrompt, language) {
  const langMap = {
    english: "Indian-English", hindi: "natural Hindi", hinglish: "natural Hinglish",
    marathi: "fluent Marathi", tamil: "fluent Tamil", telugu: "fluent Telugu",
    kannada: "fluent Kannada", malayalam: "fluent Malayalam", bengali: "fluent Bengali",
    gujarati: "fluent Gujarati", punjabi: "fluent Punjabi", urdu: "fluent Urdu", odia: "fluent Odia",
  };
  const langLabel = langMap[language] || "Indian-English";

  return `Cinematic ultra-realistic luxury real estate video ad in 9:16 portrait format for Instagram Reels / YouTube Shorts. High-end cinematic luxury property walkthrough aesthetic, warm natural sunlight, shallow depth of field, 4k editorial photorealistic detail.

${chunk.veoPrompt || ""}

PRESENTER IDENTITY BINDING:
• Strictly match the physical face, hair, gender, features, and clothing of the presenter shown in the presenter/avatar reference images.
• The presenter is speaking directly to the camera with natural micro-expressions, dynamic facial movement, and realistic eye depth.

ENVIRONMENT BINDING:
• Strictly match the architectural style, materials, colors, and layout of the contemporary luxury house shown in the property/location reference images.
• Show premium exterior details: white stucco walls, natural warm wood facade panels, a dark black/grey gabled metal roof, clean modern lines, minimalist glass railings, and elegant landscaping.

${SKIN_ENHANCER_TOKENS}

VOICE DIRECTION:
• Voice characteristics: ${masterVoicePrompt || "Confident professional Indian real estate presenter, warm authoritative tone, natural delivery, ~140 wpm, dry close-mic studio recording."}
• Speaking language: ${langLabel}.
• PERFECT LIP-SYNC: The presenter's lip movements must perfectly sync to the dialogue: "${chunk.text}".
• Audio quality: Clean dry close-mic recording, absolute studio quality with no echo, reverb, background music, or sound effects.

CAMERA ACTION:
• Camera: ${chunk.cameraDirection || "Dynamic energetic camera movement toward presenter standing at a luxury property exterior gate"}.

STRICT VISUAL RULES:
• ONLY exterior shots (gate, facade, exterior walls, balcony, front elevation). NO interior shots.
• NO text, NO captions, NO watermarks, NO overlays on screen.`;
}

/**
 * Build the EXTENSION prompt (voice + visual continuity).
 */
function buildExtensionPrompt(chunk, masterVoicePrompt, language) {
  const langMap = {
    english: "Indian-English", hindi: "natural Hindi", hinglish: "natural Hinglish",
    marathi: "fluent Marathi", tamil: "fluent Tamil", telugu: "fluent Telugu",
    kannada: "fluent Kannada", malayalam: "fluent Malayalam", bengali: "fluent Bengali",
    gujarati: "fluent Gujarati", punjabi: "fluent Punjabi", urdu: "fluent Urdu", odia: "fluent Odia",
  };
  const langLabel = langMap[language] || "Indian-English";

  return `SEAMLESS MOTION & VISUAL CONTINUITY: Continue the SAME video with the EXACT SAME presenter and in the EXACT SAME location. Zero visual jumps, zero color shifts, perfect seamless continuation of the scene.

${chunk.veoPrompt ? `SCENE DIRECTION:\n${chunk.veoPrompt}\n` : ""}

PRESENTER VISUAL CONTINUITY:
• Maintain identical appearance of the presenter: same face, same hair, same clothing, and styling. No variations.
• Speaking naturally with realistic micro-expressions and eye movement.

ENVIRONMENT VISUAL CONTINUITY:
• Maintain identical high-end contemporary property setting: white stucco walls, natural wood panels, dark gabled metal roof, and lighting.
• Keep identical warm golden hour or natural sunlight.

${SKIN_ENHANCER_TOKENS}

DIALOGUE FOR THIS EXTENSION:
• Dialogue: "${chunk.text}"
• PERFECT LIP-SYNC: The presenter's lip movements must perfectly sync to this dialogue.

VOICE (must remain identical):
• Voice style: ${masterVoicePrompt || "Keep the same voice characteristics as the original clip."}
• Speaking language: ${langLabel}.

CAMERA CONTINUITY:
• Camera: ${chunk.cameraDirection || "Continue with cinematic exterior shot, presenter walking"}

STRICT VISUAL RULES:
• ONLY exterior shots. NO interior shots.
• NO text, NO captions, NO watermarks on screen.`;
}

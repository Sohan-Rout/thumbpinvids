export const maxDuration = 300;

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import Asset from "@/models/Asset";
import dbConnect from "@/lib/mongodb";
import { uploadToR2, buildUserKey } from "@/lib/r2-upload";
import { consumeCreditsForAction, refundCreditsForAction } from "@/lib/credit-system";
import { pendingJobs } from "@/lib/veo-pending-jobs";
import sharp from "sharp";

/**
 * POST /api/veo-long-ad/generate-pipeline
 *
 * Hybrid reel pipeline — Indian real estate Instagram ad format.
 *
 * Beat routing:
 *   visual_type: "avatar"   → Veo with presenter as SUBJECT ref + Sarvam TTS audio overlay
 *   visual_type: "property" → Veo property visuals + Sarvam TTS voiceover (if beat has narration)
 *
 * Generation strategy:
 *   - All beats start concurrently via Veo (concurrency-limited to 2)
 *   - All beats with narration get Sarvam TTS audio generated in parallel
 *   - video_ready sends clipUrls[] + audioUrls[] in beat order
 *   - Client FFmpeg mixes audio into each clip that has one, then concats
 *
 * Requires:
 *   SARVAM_API_KEY — https://sarvam.ai (optional; clips have no audio if absent)
 *   GEMINI_API_KEY — for Veo video generation
 *
 * Input (FormData):
 *   beats: JSON string (Beat[] from /chunk-script)
 *   chunks: JSON string (legacy fallback)
 *   voiceProfile / masterVoicePrompt: string
 *   language: string (english | hindi | hinglish | …)
 *   locationImages[]: File[]
 *   avatarImages[]:   File[]
 *   aspectRatio: "9:16" | "16:9"
 *
 * SSE events:
 *   script_requires_approval — { jobId, chunks, beats, masterVoicePrompt, message }
 *   beat_plan_approved        — { message }
 *   voice_generating          — { narrationBeatCount, message }
 *   voice_ready               — { message }
 *   beat_generating           — { beatIndex, beatType, visualType, totalBeats, message }
 *   beat_done                 — { beatIndex, beatType, visualType, clipUrl, message,
 *                                 chunkIndex, totalChunks, estimatedDuration }
 *   uploading                 — { message }
 *   video_ready               — { clipUrls, audioUrls, videoUrl, totalDuration, totalBeats, message }
 *   error                     — { message }
 *   done
 *   ping
 */

const VEO_MAX_CONCURRENCY = 3;
const VEO_POLL_INTERVAL_MS = 10000;
const VEO_TIMEOUT_MS = 12 * 60 * 1000;

// Sarvam language code + speaker mapping for Indian languages
// Model: bulbul:v3 — kavitha (female), rahul (male)
// Speaker is overridden per-generation by detectAvatarGender (kavitha=female, rahul=male)
const SARVAM_LANG_MAP = {
  english:   { code: "en-IN", speaker: "kavitha" },
  hindi:     { code: "hi-IN", speaker: "kavitha" },
  hinglish:  { code: "hi-IN", speaker: "kavitha" },
  marathi:   { code: "mr-IN", speaker: "kavitha" },
  tamil:     { code: "ta-IN", speaker: "kavitha" },
  telugu:    { code: "te-IN", speaker: "kavitha" },
  kannada:   { code: "kn-IN", speaker: "kavitha" },
  malayalam: { code: "ml-IN", speaker: "kavitha" },
  bengali:   { code: "bn-IN", speaker: "kavitha" },
  gujarati:  { code: "gu-IN", speaker: "kavitha" },
  punjabi:   { code: "pa-IN", speaker: "kavitha" },
  urdu:      { code: "ur-IN", speaker: "kavitha" },
  odia:      { code: "od-IN", speaker: "kavitha" },
};

async function detectAvatarGender(ai, imageBuf) {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        parts: [
          { text: "Is the person in this image male or female? Reply with exactly one word: male or female." },
          { inlineData: { mimeType: "image/jpeg", data: imageBuf.toString("base64") } },
        ],
      }],
    });
    const answer = (result.text ?? "").trim().toLowerCase();
    // "female" contains "male" as substring — check female first
    if (answer.includes("female")) return "female";
    if (answer.includes("male")) return "male";
    return "female";
  } catch (err) {
    console.warn("[VeoLongAd] Gender detection failed, defaulting to female:", err.message);
    return "female";
  }
}

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

    const { resolveUserFromSession } = await import("@/lib/user-resolver");
    const user = await resolveUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    userId = user._id.toString();

    const formData = await request.formData();
    const aspectRatio = (formData.get("aspectRatio") || "9:16").toString();
    const language = (formData.get("language") || "english").toString();

    // ── Parse beat plan ─────────────────────────────────────────────────────
    let beats = null;
    const beatsRaw = formData.get("beats");
    if (beatsRaw) {
      try { beats = JSON.parse(beatsRaw); } catch (_) {}
    }

    // Legacy fallback: convert chunks → beats
    if (!beats || !Array.isArray(beats) || beats.length === 0) {
      const chunksRaw = formData.get("chunks");
      if (chunksRaw) {
        try {
          const chunks = JSON.parse(chunksRaw);
          beats = chunks.map((c, i) => ({
            index: i,
            type: c.beatType || (i === 0 ? "HOOK" : i === chunks.length - 1 ? "CTA" : "PROPERTY_VISUAL"),
            duration_seconds: c.estimatedSeconds || 6,
            visual_type: c.visualType || "property",
            veo_prompt: c.veoPrompt || c.text || "",
            overlay_text: c.overlayText || null,
            narration: c.narration || c.text || null,
            lipsync_expression: c.lipsyncExpression || "friendly",
          }));
        } catch (_) {}
      }
    }

    if (!beats || beats.length === 0) {
      return NextResponse.json({ error: "beats or chunks are required" }, { status: 400 });
    }
    if (beats.length > 12) {
      return NextResponse.json({ error: "Maximum 12 beats allowed" }, { status: 400 });
    }

    const voiceProfile = (
      formData.get("voiceProfile") || formData.get("masterVoicePrompt") || ""
    ).toString();

    // ── Collect uploaded images ─────────────────────────────────────────────
    const locationImages = [];
    for (let i = 0; i < 10; i++) {
      const f = formData.get(`locationImage_${i}`);
      if (f) locationImages.push(f);
    }
    if (locationImages.length === 0) {
      const s = formData.get("locationImage");
      if (s) locationImages.push(s);
    }

    const avatarImages = [];
    for (let i = 0; i < 10; i++) {
      const f = formData.get(`avatarImage_${i}`);
      if (f) avatarImages.push(f);
    }
    if (avatarImages.length === 0) {
      const s = formData.get("avatarImage");
      if (s) avatarImages.push(s);
    }

    // ── Debit credits ───────────────────────────────────────────────────────
    const creditResult = await consumeCreditsForAction({
      userId,
      action: "real_estate_video",
      metadata: { endpoint: "/api/veo-long-ad/generate-pipeline" },
    });
    if (!creditResult.ok) {
      return NextResponse.json(creditResult.payload, { status: creditResult.status });
    }
    debit = creditResult.debit;

    // ── Prepare image buffers and collages ──────────────────────────────────
    const avatarBufs = [];
    for (const f of avatarImages.slice(0, 4)) {
      try { avatarBufs.push(Buffer.from(await f.arrayBuffer())); } catch (_) {}
    }
    const locationBufs = [];
    for (const f of locationImages.slice(0, 4)) {
      try { locationBufs.push(Buffer.from(await f.arrayBuffer())); } catch (_) {}
    }

    const [stitchedAvatarBuf, stitchedLocationBuf] = await Promise.all([
      stitchImagesHorizontal(avatarBufs),
      stitchImagesHorizontal(locationBufs),
    ]);

    // Property beats use only location as STYLE reference — no avatar in property shots
    const propertyRefImages = stitchedLocationBuf
      ? [{ image: { imageBytes: stitchedLocationBuf.toString("base64"), mimeType: "image/jpeg" }, referenceType: "STYLE" }]
      : [];

    // Avatar beats for Veo fallback use avatar as SUBJECT + location as STYLE
    const avatarRefImages = [
      ...(stitchedAvatarBuf
        ? [{ image: { imageBytes: stitchedAvatarBuf.toString("base64"), mimeType: "image/jpeg" }, referenceType: "SUBJECT" }]
        : []),
      ...propertyRefImages,
    ];

    // Upload each location image individually to R2 so property beats can use the
    // actual uploaded photos as B-roll instead of generating new Veo clips.
    const locationImageR2Urls = [];
    await Promise.all(
      locationBufs.map(async (buf, i) => {
        try {
          const key = buildUserKey(userId, "images", "jpg", `location-${i}`);
          const url = await uploadToR2(buf, key, "image/jpeg");
          if (url.startsWith("http")) locationImageR2Urls[i] = url;
        } catch (e) {
          console.warn(`[VeoLongAd] Failed to upload location image ${i}:`, e.message);
        }
      })
    );
    console.log(`[VeoLongAd] Uploaded ${locationImageR2Urls.filter(Boolean).length} location images to R2`);

    const sarvamKey = process.env.SARVAM_API_KEY || null;
    const ttsEnabled = !!(sarvamKey);

    if (!ttsEnabled) {
      console.log("[VeoLongAd] Sarvam TTS disabled — SARVAM_API_KEY not set. Clips will have no voiceover.");
    }

    const avatarGender = stitchedAvatarBuf
      ? await detectAvatarGender(ai, stitchedAvatarBuf)
      : "female";
    const sarvamLangBase = SARVAM_LANG_MAP[language] || SARVAM_LANG_MAP.english;
    const sarvamLang = { ...sarvamLangBase, speaker: avatarGender === "male" ? "rahul" : "kavitha" };
    console.log(`[VeoLongAd] Avatar gender detected: ${avatarGender} → speaker: ${sarvamLang.speaker}`);

    // ── SSE stream ──────────────────────────────────────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function send(data) {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch (_) {}
        }

        let workBeats = [...beats];

        try {
          // ── Stage 1: Approval gate ────────────────────────────────────────
          const jobId = Date.now().toString();

          const approvalChunks = workBeats.map((b) => ({
            index: b.index,
            text: b.narration || b.overlay_text || `${b.type} — property visual`,
            estimatedSeconds: b.duration_seconds,
            veoPrompt: b.veo_prompt || "",
            cameraDirection: b.overlay_text || b.type,
            beatType: b.type,
            visualType: b.visual_type,
          }));

          send({
            type: "script_requires_approval",
            jobId,
            message: "Review your beat plan — auto-approving in 10 seconds…",
            chunks: approvalChunks,
            beats: workBeats,
            masterVoicePrompt: voiceProfile,
            presenterDescription: "",
          });

          const pingInterval = setInterval(() => send({ type: "ping" }), 3000);

          const approved = await new Promise((resolve) => {
            pendingJobs.set(jobId, { resolve });
            setTimeout(() => {
              if (pendingJobs.has(jobId)) {
                pendingJobs.get(jobId).resolve({
                  chunks: approvalChunks,
                  masterVoicePrompt: voiceProfile,
                  presenterDescription: "",
                });
                pendingJobs.delete(jobId);
              }
            }, 10000);
          });

          clearInterval(pingInterval);

          // Apply any user edits from approval
          if (approved.chunks && Array.isArray(approved.chunks)) {
            workBeats = workBeats.map((b) => {
              const edited = approved.chunks.find((c) => c.index === b.index);
              if (!edited) return b;
              return b.visual_type === "avatar"
                ? { ...b, narration: edited.text || b.narration }
                : { ...b, veo_prompt: edited.veoPrompt || b.veo_prompt };
            });
          }

          send({ type: "beat_plan_approved", message: "Beat plan confirmed. Starting generation…" });

          const totalBeats = workBeats.length;

          // ── Stage 2: Sarvam TTS for all beats with narration ─────────────
          const beatAudioUrls = {};
          const narrationBeats = workBeats.filter((b) => b.narration);

          if (ttsEnabled && narrationBeats.length > 0) {
            send({
              type: "voice_generating",
              narrationBeatCount: narrationBeats.length,
              message: `Generating Sarvam voice for ${narrationBeats.length} beat(s) (${sarvamLang.code})…`,
            });

            await Promise.all(
              narrationBeats.map(async (beat) => {
                try {
                  const audioBuffer = await generateSarvamTTS(
                    beat.narration,
                    sarvamLang.code,
                    sarvamLang.speaker
                  );
                  const audioKey = buildUserKey(userId, "audio", "wav", `beat-${beat.index}`);
                  const audioUrl = await uploadToR2(audioBuffer, audioKey, "audio/wav");
                  if (audioUrl.startsWith("http")) {
                    beatAudioUrls[beat.index] = audioUrl;
                  }
                } catch (ttsErr) {
                  console.error(`[VeoLongAd] Sarvam TTS failed for beat ${beat.index}:`, ttsErr.message);
                }
              })
            );

            send({ type: "voice_ready", message: "Voice ready. Starting video generation…" });
          }

          // ── Stage 3: All beats → generate in parallel ────────────────────
          // Property beats use the uploaded location images directly (no Veo).
          // Avatar beats go through Veo with the presenter as SUBJECT reference.
          const veoSemaphore = createSemaphore(VEO_MAX_CONCURRENCY);
          const clipResults = new Array(totalBeats).fill(null);
          let propertyImageIdx = 0;

          const beatPromises = workBeats.map(async (beat) => {
            send({
              type: "beat_generating",
              beatIndex: beat.index,
              beatType: beat.type,
              visualType: beat.visual_type,
              totalBeats,
              message: `Generating beat ${beat.index + 1}/${totalBeats} — ${beat.type}…`,
            });

            let clipUrl = null;

            if (beat.visual_type === "property" && locationImageR2Urls.length > 0) {
              // Use uploaded property photo directly — skip Veo for B-roll beats
              clipUrl = locationImageR2Urls[propertyImageIdx++ % locationImageR2Urls.length];
            } else {
              try {
                await veoSemaphore.acquire();
                try {
                  clipUrl = await generateVeoClip({
                    ai,
                    apiKey,
                    prompt: buildPresenterVeoPrompt(beat),
                    referenceImages: avatarRefImages,
                    aspectRatio,
                    userId,
                    beatIndex: beat.index,
                    send,
                  });
                } finally {
                  veoSemaphore.release();
                }
              } catch (beatErr) {
                console.error(`[VeoLongAd] Beat ${beat.index} (${beat.type}) failed:`, beatErr.message);
                send({
                  type: "beat_generating",
                  beatIndex: beat.index,
                  beatType: beat.type,
                  visualType: beat.visual_type,
                  totalBeats,
                  message: `⚠️ Beat ${beat.index + 1} failed: ${beatErr.message}`,
                });
              }
            }

            clipResults[beat.index] = clipUrl;

            const runningDuration = workBeats
              .slice(0, beat.index + 1)
              .reduce((s, b) => s + (b.duration_seconds || 4), 0);

            send({
              type: "beat_done",
              beatIndex: beat.index,
              beatType: beat.type,
              visualType: beat.visual_type,
              clipUrl,
              // Legacy compat fields
              chunkIndex: beat.index,
              totalChunks: totalBeats,
              estimatedDuration: runningDuration,
              message: `✅ Beat ${beat.index + 1}/${totalBeats} done (${beat.type})`,
            });

            return { index: beat.index, clipUrl };
          });

          await Promise.allSettled(beatPromises);

          // ── Stage 4: Collect, save, emit ─────────────────────────────────
          // Build parallel arrays so audioUrls[i] always matches clipUrls[i]
          const validPairs = clipResults
            .map((clipUrl, i) => clipUrl ? { clipUrl, audioUrl: beatAudioUrls[i] || null } : null)
            .filter(Boolean);
          const clipUrls = validPairs.map((p) => p.clipUrl);
          const audioUrls = validPairs.map((p) => p.audioUrl);
          const totalDuration = workBeats.reduce((s, b) => s + (b.duration_seconds || 4), 0);

          send({ type: "uploading", message: "Saving to your Asset Library…" });

          if (clipUrls.length > 0) try {
            await dbConnect();
            await Asset.create({
              userId,
              name: `Hybrid Reel — ${new Date().toLocaleDateString()}`,
              url: clipUrls[0],
              type: "clip",
              metadata: {
                source: "veo-long-ad-hybrid",
                clipUrls,
                audioUrls,
                beats: workBeats,
                totalBeats,
                totalDuration,
                ttsProvider: ttsEnabled ? "sarvam" : null,
                language,
              },
            });
          } catch (dbErr) {
            console.error("[VeoLongAd] DB save error:", dbErr);
          }

          send({
            type: "video_ready",
            clipUrls,
            audioUrls,
            videoUrl: clipUrls[0] || null,
            totalDuration,
            totalBeats,
            totalChunks: totalBeats,
            message: `🎉 ${clipUrls.length} beat clips ready! Combining with voiceover…`,
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
        Connection: "keep-alive",
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

// ── Sarvam TTS ──────────────────────────────────────────────────────────────

async function generateSarvamTTS(text, languageCode, speaker) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("SARVAM_API_KEY not configured");

  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "API-Subscription-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: languageCode,
      speaker: speaker || "kavitha",
      pace: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: "bulbul:v3",
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Sarvam TTS error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const base64Audio = data?.audios?.[0];
  if (!base64Audio) throw new Error("Sarvam returned empty audio");

  return Buffer.from(base64Audio, "base64");
}

// ── Veo generateVideos ──────────────────────────────────────────────────────

async function generateVeoClip({ ai, apiKey, prompt, referenceImages, aspectRatio, userId, beatIndex, send }) {
  const initialOp = await ai.models.generateVideos({
    model: "veo-3.1-generate-preview",
    prompt,
    config: {
      aspectRatio: aspectRatio || "9:16",
      numberOfVideos: 1,
      personGeneration: "allow_adult",
      ...(referenceImages.length > 0 ? { referenceImages } : {}),
    },
  });

  let currentOp = initialOp;
  const deadline = Date.now() + VEO_TIMEOUT_MS;

  while (currentOp && !currentOp.done) {
    if (Date.now() > deadline) throw new Error(`Veo timed out for beat ${beatIndex}`);
    await sleep(VEO_POLL_INTERVAL_MS);
    send({ type: "ping" });

    const nextOp = await ai.operations.getVideosOperation({ operation: currentOp });
    if (nextOp) currentOp = nextOp;
  }

  if (!currentOp) throw new Error(`Veo operation lost for beat ${beatIndex}`);
  if (currentOp.error) throw new Error(currentOp.error.message || `Veo failed for beat ${beatIndex}`);

  const resp = currentOp.response ?? currentOp;
  const videoObj = extractGeneratedVideo(resp);
  const uri = extractVideoUri(videoObj);
  if (!uri) throw new Error(`No video URI from Veo for beat ${beatIndex}`);

  const fileId = extractFileId(uri);
  if (!fileId) throw new Error(`Cannot extract fileId from Veo URI for beat ${beatIndex}`);

  const downloadUrl = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?key=${apiKey}&alt=media`;
  const videoRes = await fetch(downloadUrl);
  if (!videoRes.ok) throw new Error(`Veo download failed for beat ${beatIndex}: ${videoRes.status}`);

  const videoBuf = Buffer.from(await videoRes.arrayBuffer());
  const key = buildUserKey(userId, "videos", "mp4", `property-beat-${beatIndex}`);
  return uploadToR2(videoBuf, key, "video/mp4");
}

// ── Prompt builders ─────────────────────────────────────────────────────────

function buildPropertyVeoPrompt(beat) {
  const base = beat.veo_prompt || "Luxury property interior, slow cinematic push-in, warm ambient light. 9:16 vertical. No people.";
  return `${base}

RULES: 9:16 vertical portrait. No text or watermarks. No presenter — property visuals only. Match architectural style from reference image exactly. One room, one camera movement, one mood. No background music. No songs. Silent ambient sounds only.`;
}

function buildPresenterVeoPrompt(beat) {
  const scene = beat.veo_prompt || presenterSceneByType(beat.type);
  const narration = beat.narration || "";

  return `Ultra-realistic real estate UGC video, 9:16 portrait for Instagram Reels.

SUBJECT: Reconstruct the presenter exactly from the reference image — face, hair, outfit, skin tone, body type. The presenter must be MOVING and WALKING throughout the shot.

SCENE: ${scene}

${narration ? `DIALOGUE: "${narration.slice(0, 100)}${narration.length > 100 ? "…" : ""}" — mouth movement must match the words.` : ""}

EXPRESSION: ${beat.lipsync_expression === "professional" ? "Confident professional smile, direct eye contact — like a seasoned real estate creator." : "Warm, natural, genuine smile — authentic UGC creator energy, not staged or stiff."}

RULES: No text overlays. No watermarks. Ultra-realistic skin and lighting. No background music. No songs. Ambient sound only. The presenter must feel like a real Instagram real estate content creator, not a corporate spokesperson.`;
}

function presenterSceneByType(type) {
  const map = {
    HOOK: "Presenter already stepping out of a white luxury SUV, car door held open behind them, walks confidently toward camera with a natural warm smile, briefly glances up at the building facade. Smooth cinematic push-in following the walk. Golden hour warm light.",
    AVATAR_SEGMENT: "Presenter walks through the most visually impressive area of the property, turns naturally to face camera mid-step, speaks with genuine enthusiasm and expressive hand gestures pointing at the space around them. Medium close-up tracking shot, luxury interior or exterior visible and moving behind.",
    CTA: "Presenter finishes walking, stops and turns directly to camera with a warm authentic smile, extends one open hand toward viewer in a confident welcoming gesture. Close-up, elegant property softly blurred behind.",
  };
  return map[type] || "Presenter walks through the property, turns naturally to camera, speaks directly with energy and natural hand gestures. Medium close-up tracking shot.";
}

// ── Extraction helpers ───────────────────────────────────────────────────────

function extractGeneratedVideo(result) {
  if (!result) return null;
  return (
    result?.generatedVideos?.[0]?.video ||
    result?.generatedVideos?.[0]?.videoResponse ||
    result?.response?.generatedVideos?.[0]?.video ||
    result?.response?.generatedVideos?.[0]?.videoResponse ||
    result?.generateVideoResponse?.generatedSamples?.[0]?.video ||
    result?.response?.generateVideoResponse?.generatedSamples?.[0]?.video ||
    result?.videos?.[0] ||
    result?.candidates?.[0]?.content?.parts?.find((p) => p?.fileData?.fileUri)?.fileData ||
    null
  );
}

function extractVideoUri(videoObj) {
  if (!videoObj) return null;
  return videoObj.uri || videoObj.fileUri || videoObj.videoUri || videoObj.url || null;
}

function extractFileId(uri) {
  if (!uri) return null;
  const match = uri.match(/files\/([^/:?]+)/);
  return match?.[1] || null;
}

// ── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function createSemaphore(maxConcurrent) {
  let running = 0;
  const queue = [];
  return {
    async acquire() {
      if (running < maxConcurrent) { running++; return; }
      return new Promise((resolve) => queue.push(resolve));
    },
    release() {
      running--;
      if (queue.length > 0) { running++; queue.shift()(); }
    },
  };
}

async function stitchImagesHorizontal(buffers) {
  if (!buffers || buffers.length === 0) return null;
  if (buffers.length === 1) {
    return sharp(buffers[0]).jpeg({ quality: 88 }).toBuffer();
  }

  const CELL_HEIGHT = 512;
  const cells = await Promise.all(
    buffers.map(async (buf) => {
      const resized = await sharp(buf)
        .resize({ height: CELL_HEIGHT, withoutEnlargement: false })
        .jpeg({ quality: 88 })
        .toBuffer();
      const meta = await sharp(resized).metadata();
      return { buffer: resized, width: meta.width };
    })
  );

  const totalWidth = cells.reduce((sum, c) => sum + c.width, 0);
  let offsetX = 0;
  const composites = cells.map((c) => {
    const entry = { input: c.buffer, left: offsetX, top: 0 };
    offsetX += c.width;
    return entry;
  });

  return sharp({
    create: { width: totalWidth, height: CELL_HEIGHT, channels: 3, background: { r: 20, g: 20, b: 20 } },
  })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toBuffer();
}

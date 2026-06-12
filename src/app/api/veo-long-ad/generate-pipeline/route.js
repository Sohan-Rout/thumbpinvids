export const maxDuration = 300;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import Asset from "@/models/Asset";
import dbConnect from "@/lib/mongodb";
import { uploadToR2, buildUserKey } from "@/lib/r2-upload";
import { consumeCreditsForAction, refundCreditsForAction } from "@/lib/credit-system";
import { pendingJobs } from "@/lib/veo-pending-jobs";
import sharp from "sharp";
import { fal } from "@fal-ai/client";

if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

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
 *   - video_ready sends clipUrls[] + fullAudioUrl (single continuous WAV)
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


// ── ElevenLabs voice settings ─────────────────────────────────────────────────
// Tune these to change how the voice sounds:
//   stability        0.0–1.0  lower = more dynamic/emotional, higher = more consistent
//   similarity_boost 0.0–1.0  higher = more faithful to the original voice clone
//   style            0.0–1.0  higher = more expressive delivery (v2 models only)
//   speed            0.7–1.2  speaking rate — 1.0 is natural, 1.1 is slightly punchy for ads
const ELEVENLABS_VOICE_SETTINGS = {
  stability:        0.40,
  similarity_boost: 0.65,
  style:            0.00,
  use_speaker_boost: true,
  speed:            0.90,
};
const ELEVENLABS_MODEL = "eleven_multilingual_v2"; // supports Hindi, Hinglish, and English

async function generateHailuoBroll(imageUrl, prompt) {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY not configured");
  const result = await fal.subscribe("fal-ai/minimax/hailuo-02/standard/image-to-video", {
    input: {
      image_url: imageUrl,
      prompt: prompt || "Smooth cinematic pan across this real estate property. Natural lighting, high quality.",
    },
    logs: false,
  });
  const videoUrl = result?.data?.video?.url;
  if (!videoUrl) throw new Error("Hailuo returned no video URL");
  return videoUrl;
}

export async function POST(request) {
  let userId = null;
  let debit = null;

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


    // Crop location images to 9:16 (1080×1920) — Hailuo output aspect ratio follows input image.
    // centre-crop preserves the most important subject area for real estate shots.
    const locationImageR2Urls = [];
    await Promise.all(
      locationBufs.map(async (buf, i) => {
        try {
          const cropped = await sharp(buf)
            .resize(1080, 1920, { fit: "cover", position: "centre" })
            .jpeg({ quality: 88 })
            .toBuffer();
          const key = buildUserKey(userId, "images", "jpg", `location-${i}`);
          const url = await uploadToR2(cropped, key, "image/jpeg");
          if (url.startsWith("http")) locationImageR2Urls[i] = url;
        } catch (e) {
          console.warn(`[VeoLongAd] Failed to upload location image ${i}:`, e.message);
        }
      })
    );
    console.log(`[VeoLongAd] Uploaded ${locationImageR2Urls.filter(Boolean).length} location images to R2 (9:16 cropped)`);

    const ttsEnabled = !!(process.env.FAL_KEY);

    if (!ttsEnabled) {
      console.log("[VeoLongAd] ElevenLabs TTS disabled — FAL_KEY not set. Clips will have no voiceover.");
    }

    // Use the voice ID chosen in the UI; fall back to Rachel if not provided
    const elevenLabsVoiceId = (formData.get("elevenLabsVoice") || "21m00Tcm4TlvDq8ikWAM").toString();
    console.log(`[VeoLongAd] ElevenLabs voice: ${elevenLabsVoiceId}, model: ${ELEVENLABS_MODEL}`);

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

          // ── Stage 2: Full-script TTS — one ElevenLabs call via fal ─────────
          // All beat narrations are joined into a single script so ElevenLabs
          // delivers a consistent, continuous performance with natural pacing.
          // The single MP3 is mixed over the concatenated video by the client.
          const narrationBeats = workBeats.filter((b) => b.narration);
          let fullAudioUrl = null;

          if (!ttsEnabled) {
            send({ type: "voice_warning", message: "⚠️ FAL_KEY not configured — video will have no voiceover." });
          } else if (narrationBeats.length === 0) {
            console.warn("[VeoLongAd] No beats have narration — skipping TTS.");
          }

          if (ttsEnabled && narrationBeats.length > 0) {
            send({
              type: "voice_generating",
              narrationBeatCount: narrationBeats.length,
              message: `Generating full ${narrationBeats.length}-beat voiceover via ElevenLabs…`,
            });

            // Join all narration lines with double-newlines so ElevenLabs inserts
            // natural inter-beat pauses without extra configuration.
            const fullScript = narrationBeats.map((b) => b.narration.trim()).join("\n\n");
            console.log(`[VeoLongAd] Full TTS script (${fullScript.length} chars): "${fullScript.slice(0, 120)}…"`);

            try {
              const audioBuf = await generateElevenLabsTTS(fullScript, elevenLabsVoiceId);
              const key = buildUserKey(userId, "audio", "mp3", "full-narration");
              fullAudioUrl = await uploadToR2(audioBuf, key, "audio/mpeg");
              console.log(`[VeoLongAd] Full narration uploaded: ${audioBuf.length} bytes → ${fullAudioUrl}`);
              send({ type: "voice_ready", message: "Voice ready. Starting video generation…" });
            } catch (ttsErr) {
              console.error("[VeoLongAd] TTS failed:", ttsErr.message);
              send({ type: "voice_warning", message: `⚠️ TTS failed: ${ttsErr.message} — video will have no audio.` });
              send({ type: "voice_ready", message: "⚠️ Continuing without audio…" });
            }
          }

          // ── Stage 3: All beats → generate in parallel ────────────────────
          // Property beats: Hailuo image-to-video B-roll from uploaded reference photos.
          // Avatar beats: black screen placeholder (Veo temporarily disabled).
          const clipResults = new Array(totalBeats).fill(null);

          // Pre-assign image indices synchronously before any async work to avoid races
          const beatImageIndices = (() => {
            let idx = 0;
            return workBeats.map((b) =>
              b.visual_type === "property" && locationImageR2Urls.length > 0
                ? idx++ % locationImageR2Urls.length
                : null
            );
          })();

          const beatPromises = workBeats.map(async (beat, mapIdx) => {
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
              const imgUrl = locationImageR2Urls[beatImageIndices[mapIdx]];
              try {
                console.log(`[VeoLongAd] Hailuo B-roll beat ${beat.index}: ${imgUrl}`);
                const falVideoUrl = await generateHailuoBroll(imgUrl, beat.veo_prompt);
                // Download and re-upload to R2 for permanent storage
                const videoRes = await fetch(falVideoUrl);
                if (!videoRes.ok) throw new Error(`Failed to fetch Hailuo video: ${videoRes.status}`);
                const videoBuf = Buffer.from(await videoRes.arrayBuffer());
                const key = buildUserKey(userId, "videos", "mp4", `broll-beat-${beat.index}`);
                clipUrl = await uploadToR2(videoBuf, key, "video/mp4");
                console.log(`[VeoLongAd] Hailuo B-roll beat ${beat.index} uploaded: ${clipUrl}`);
              } catch (brollErr) {
                console.error(`[VeoLongAd] Hailuo failed for beat ${beat.index}, falling back to static image:`, brollErr.message);
                clipUrl = imgUrl; // fallback: static image → client Ken Burns
              }
            } else {
              // Avatar beat — black screen placeholder (Veo temporarily disabled for design phase)
              try {
                const blackBuf = await sharp({
                  create: { width: 1080, height: 1920, channels: 3, background: { r: 0, g: 0, b: 0 } },
                }).jpeg({ quality: 85 }).toBuffer();
                const key = buildUserKey(userId, "images", "jpg", `black-beat-${beat.index}`);
                clipUrl = await uploadToR2(blackBuf, key, "image/jpeg");
              } catch (beatErr) {
                console.error(`[VeoLongAd] Black screen gen failed for beat ${beat.index}:`, beatErr.message);
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
          const clipUrls = clipResults.filter(Boolean);
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
                fullAudioUrl,
                beats: workBeats,
                totalBeats,
                totalDuration,
                ttsProvider: ttsEnabled ? "elevenlabs" : null,
                language,
              },
            });
          } catch (dbErr) {
            console.error("[VeoLongAd] DB save error:", dbErr);
          }

          send({
            type: "video_ready",
            clipUrls,
            fullAudioUrl,
            audioUrls: null,
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

// ── ElevenLabs TTS via fal (multilingual-v2) ─────────────────────────────────
// Model: fal-ai/elevenlabs/tts/multilingual-v2
// Input: flat fields — voice, stability, similarity_boost, style, speed
// Output: result.data.audio.url (MP3)
async function generateElevenLabsTTS(text, voiceId) {
  const result = await fal.subscribe("fal-ai/elevenlabs/tts/multilingual-v2", {
    input: {
      text,
      voice: voiceId,
      stability:        ELEVENLABS_VOICE_SETTINGS.stability,
      similarity_boost: ELEVENLABS_VOICE_SETTINGS.similarity_boost,
      style:            ELEVENLABS_VOICE_SETTINGS.style,
      speed:            ELEVENLABS_VOICE_SETTINGS.speed,
    },
    logs: false,
  });

  const audioUrl = result?.data?.audio?.url;
  if (!audioUrl) throw new Error(`fal ElevenLabs returned no audio URL. keys: ${Object.keys(result?.data || {}).join(", ")}`);

  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error(`Failed to download TTS audio: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

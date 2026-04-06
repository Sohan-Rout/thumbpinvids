import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateTTS } from "@/lib/api/tts";
import { generateLipSync } from "@/lib/api/lipsync";

export async function POST(request) {
  let supabaseAdmin;
  let videoId = null;
  let userId = null;
  let creditsDeducted = false;

  try {
    // ── 1. Parse & Validate Input ──────────────────────────
    const body = await request.json();
    const { script, avatar_url, voice_id, music_enabled, expression, gesture_intensity, head_motion } = body;

    if (!script || !avatar_url || !voice_id) {
      return NextResponse.json(
        { error: "Missing required fields: script, avatar_url, voice_id" },
        { status: 400 }
      );
    }

    if (script.trim().length < 10) {
      return NextResponse.json(
        { error: "Script must be at least 10 characters" },
        { status: 400 }
      );
    }

    if (script.length > 500) {
      return NextResponse.json(
        { error: "Script must not exceed 500 characters" },
        { status: 400 }
      );
    }

    // ── 2. Authenticate User ───────────────────────────────
    const supabaseAuth = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    userId = user.id;
    supabaseAdmin = createAdminClient();

    // ── 3. Check & Deduct Credits (Atomic) ─────────────────
    const { data: hasCredits, error: creditError } = await supabaseAdmin.rpc(
      "deduct_credits",
      { p_user_id: userId, p_amount: 2 }
    );

    if (creditError) {
      console.error("[Generate] Credit deduction RPC error:", creditError);
      return NextResponse.json(
        { error: "Failed to check credits. Please try again." },
        { status: 500 }
      );
    }

    if (!hasCredits) {
      return NextResponse.json(
        { error: "Not enough credits. You need 2 credits to generate a video." },
        { status: 402 }
      );
    }

    creditsDeducted = true;

    // ── 4. Insert Video Row (status: queued) ───────────────
    const { data: videoRow, error: insertError } = await supabaseAdmin
      .from("videos")
      .insert({
        user_id: userId,
        script: script.trim(),
        avatar_url,
        voice_id,
        music_enabled: music_enabled ?? true,
        status: "queued",
      })
      .select("id")
      .single();

    if (insertError || !videoRow) {
      console.error("[Generate] Insert video error:", insertError);
      // Refund credits
      await refundCredits(supabaseAdmin, userId, 2);
      return NextResponse.json(
        { error: "Failed to create video record. Credits refunded." },
        { status: 500 }
      );
    }

    videoId = videoRow.id;
    console.log(`[Generate] Video ${videoId} created for user ${userId}`);

    // ── 5. Return immediately, then run pipeline async ─────
    runPipelineAsync(supabaseAdmin, videoId, userId, script.trim(), avatar_url, voice_id, {
      expression: expression || "friendly",
      gesture_intensity: gesture_intensity || "natural",
      head_motion: head_motion || "natural",
    });

    return NextResponse.json({
      success: true,
      video_id: videoId,
      status: "queued",
      message: "Video generation started. Track progress in real-time.",
    });
  } catch (error) {
    console.error("[Generate] Unexpected error:", error);

    if (creditsDeducted && supabaseAdmin && userId) {
      await refundCredits(supabaseAdmin, userId, 2);
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Async Pipeline (runs after response is sent) ─────────────
async function runPipelineAsync(supabaseAdmin, videoId, userId, script, avatarUrl, voiceId, gestureConfig = {}) {
  try {
    // Step A: Update status → generating
    await updateVideoStatus(supabaseAdmin, videoId, "generating");

    // Step B: ElevenLabs TTS (text → audio)
    console.log(`[Pipeline] Step 1/2: Generating TTS audio...`);
    const ttsResult = await generateTTS(script, voiceId, supabaseAdmin, videoId);

    if (!ttsResult.success || !ttsResult.audio_url) {
      throw new Error("TTS generation failed: no audio URL returned");
    }

    console.log(`[Pipeline] TTS complete: ${ttsResult.audio_url}`);

    // Step C: D-ID Lip-Sync (avatar image + audio → video)
    console.log(`[Pipeline] Step 2/2: Generating lip-sync video...`);
    const lipSyncResult = await generateLipSync(
      avatarUrl,
      ttsResult.audio_url,
      supabaseAdmin,
      videoId,
      gestureConfig
    );

    if (!lipSyncResult.success || !lipSyncResult.video_url) {
      throw new Error("Lip-sync generation failed: no video URL returned");
    }

    console.log(`[Pipeline] Lip-sync complete: ${lipSyncResult.video_url}`);

    // Step D: Update video row → ready
    const { error: updateError } = await supabaseAdmin
      .from("videos")
      .update({
        status: "ready",
        video_url: lipSyncResult.video_url,
      })
      .eq("id", videoId);

    if (updateError) {
      console.error(`[Pipeline] Failed to update video to ready:`, updateError);
      throw new Error("Failed to save video URL");
    }

    console.log(`[Pipeline] ✅ Video ${videoId} is READY!`);
  } catch (error) {
    console.error(`[Pipeline] ❌ Video ${videoId} failed:`, error.message);

    await supabaseAdmin
      .from("videos")
      .update({
        status: "error",
        error_message: error.message,
      })
      .eq("id", videoId);

    await refundCredits(supabaseAdmin, userId, 2);
    console.log(`[Pipeline] Credits refunded for user ${userId}`);
  }
}

// ── Helpers ──────────────────────────────────────────────────

async function updateVideoStatus(supabaseAdmin, videoId, status) {
  const { error } = await supabaseAdmin
    .from("videos")
    .update({ status })
    .eq("id", videoId);

  if (error) {
    console.error(`[Pipeline] Failed to update status to ${status}:`, error);
  }
}

async function refundCredits(supabaseAdmin, userId, amount) {
  try {
    await supabaseAdmin.rpc("add_credits", {
      p_user_id: userId,
      p_amount: amount,
    });
  } catch (error) {
    console.error("[Pipeline] CRITICAL: Failed to refund credits:", error);
  }
}

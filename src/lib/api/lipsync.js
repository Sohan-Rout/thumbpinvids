// D-ID Lip-Sync API – Production Implementation
// Creates talking-head video from avatar image + audio

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;
const MAX_POLLS = 60; // 60 polls × 3s = 3 minute timeout
const POLL_INTERVAL_MS = 3000;

// Map gesture presets to D-ID motion factors
const GESTURE_MOTION_MAP = {
  subtle: 0.3,
  natural: 0.6,
  expressive: 1.0,
};

// Map expression presets to D-ID driver expressions
const EXPRESSION_MAP = {
  friendly: { expression: "happy", intensity: 0.5 },
  professional: { expression: "neutral", intensity: 0.3 },
  excited: { expression: "surprise", intensity: 0.8 },
  calm: { expression: "neutral", intensity: 0.2 },
  serious: { expression: "neutral", intensity: 0.1 },
};

/**
 * Generate lip-synced video using D-ID API
 * @param {string} imageUrl - Public URL of the avatar image
 * @param {string} audioUrl - Public URL of the TTS audio
 * @param {object} supabaseAdmin - Supabase admin client for storage upload
 * @param {string} videoId - Video ID for naming the video file
 * @param {object} gestureConfig - Expression and gesture configuration
 * @returns {Promise<{success: boolean, video_url: string, duration_seconds: number}>}
 */
export async function generateLipSync(imageUrl, audioUrl, supabaseAdmin, videoId, gestureConfig = {}) {
  const apiKey = process.env.DID_API_KEY;

  if (!apiKey) {
    throw new Error("DID_API_KEY is not configured");
  }

  // Build D-ID config from gesture settings
  const motionFactor = GESTURE_MOTION_MAP[gestureConfig.gesture_intensity] ?? 0.6;
  const expressionConfig = EXPRESSION_MAP[gestureConfig.expression] || EXPRESSION_MAP.friendly;

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Lip-Sync] Retry attempt ${attempt}/${MAX_RETRIES}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }

      console.log(`[Lip-Sync] Creating talk for video ${videoId} (expression: ${gestureConfig.expression}, gesture: ${gestureConfig.gesture_intensity}, head: ${gestureConfig.head_motion})...`);

      // Build the D-ID request body with gesture/expression config
      const didRequestBody = {
        source_url: imageUrl,
        script: {
          type: "audio",
          audio_url: audioUrl,
        },
        config: {
          result_format: "mp4",
          stitch: true,
          motion_factor: motionFactor,
        },
      };

      // Add driver expression if supported
      if (expressionConfig.expression !== "neutral") {
        didRequestBody.config.driver_expressions = {
          expressions: [
            {
              start_frame: 0,
              expression: expressionConfig.expression,
              intensity: expressionConfig.intensity,
            },
          ],
        };
      }

      // Step 1: Create a talk
      const createResponse = await fetch("https://api.d-id.com/talks", {
        method: "POST",
        headers: {
          Authorization: `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(didRequestBody),
      });

      if (!createResponse.ok) {
        const errorBody = await createResponse.text().catch(() => "");

        if (createResponse.status === 401 || createResponse.status === 403) {
          throw new Error("D-ID API key is invalid or expired. Please check your DID_API_KEY.");
        }
        if (createResponse.status === 402) {
          throw new Error("D-ID credits exhausted. Please upgrade your D-ID plan at d-id.com.");
        }
        if (createResponse.status === 429) {
          throw new Error("D-ID rate limit exceeded. Please wait a moment and try again.");
        }

        throw new Error(`D-ID create talk failed (${createResponse.status}): ${errorBody}`);
      }

      const createResult = await createResponse.json();
      const talkId = createResult.id;

      if (!talkId) {
        throw new Error("D-ID did not return a talk ID");
      }

      console.log(`[Lip-Sync] Talk created: ${talkId}. Polling for completion...`);

      // Step 2: Poll for completion
      for (let poll = 0; poll < MAX_POLLS; poll++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const pollResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, {
          headers: {
            Authorization: `Basic ${apiKey}`,
          },
        });

        if (!pollResponse.ok) {
          console.warn(`[Lip-Sync] Poll ${poll + 1} returned ${pollResponse.status}, retrying...`);
          continue;
        }

        const result = await pollResponse.json();

        if (result.status === "done") {
          const didVideoUrl = result.result_url;

          if (!didVideoUrl) {
            throw new Error("D-ID returned done status but no result_url");
          }

          console.log(`[Lip-Sync] Talk completed. Downloading from D-ID...`);

          // Step 3: Download the video from D-ID
          const videoResponse = await fetch(didVideoUrl);
          if (!videoResponse.ok) {
            throw new Error(`Failed to download video from D-ID: ${videoResponse.status}`);
          }

          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

          if (videoBuffer.length === 0) {
            throw new Error("Downloaded video is empty");
          }

          console.log(`[Lip-Sync] Video downloaded: ${videoBuffer.length} bytes. Uploading to storage...`);

          // Step 4: Upload to Supabase Storage
          const fileName = `output/${videoId}.mp4`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from("videos")
            .upload(fileName, videoBuffer, {
              contentType: "video/mp4",
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
          }

          // Get public URL
          const { data: urlData } = supabaseAdmin.storage
            .from("videos")
            .getPublicUrl(fileName);

          const publicVideoUrl = urlData.publicUrl;
          console.log(`[Lip-Sync] Video uploaded: ${publicVideoUrl}`);

          return {
            success: true,
            video_url: publicVideoUrl,
            duration_seconds: result.duration || 0,
          };
        }

        if (result.status === "error" || result.status === "rejected") {
          const errorDesc = result.error?.description || result.reject_reason || "Unknown error";
          throw new Error(`D-ID video generation failed: ${errorDesc}`);
        }

        // Log progress
        if (poll % 5 === 0) {
          console.log(`[Lip-Sync] Poll ${poll + 1}/${MAX_POLLS}: status = ${result.status}`);
        }
      }

      throw new Error("D-ID video generation timed out after 3 minutes");
    } catch (error) {
      lastError = error;
      console.error(`[Lip-Sync] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on auth/quota/validation errors
      if (
        error.message.includes("invalid") ||
        error.message.includes("expired") ||
        error.message.includes("exhausted") ||
        error.message.includes("API key")
      ) {
        break;
      }
    }
  }

  throw lastError;
}

// ElevenLabs TTS API – Production Implementation
// Generates speech audio from text using Indian-English voices

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

/**
 * Generate TTS audio using ElevenLabs API
 * @param {string} text - The script text to convert to speech
 * @param {string} voiceId - ElevenLabs voice ID
 * @param {object} supabaseAdmin - Supabase admin client for storage upload
 * @param {string} videoId - Video ID for naming the audio file
 * @returns {Promise<{success: boolean, audio_url: string, duration_seconds: number}>}
 */
export async function generateTTS(text, voiceId, supabaseAdmin, videoId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[TTS] Retry attempt ${attempt}/${MAX_RETRIES}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }

      console.log(`[TTS] Generating audio for video ${videoId} (${text.length} chars)...`);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        
        if (response.status === 401) {
          throw new Error("ElevenLabs API key is invalid. Please check your ELEVENLABS_API_KEY.");
        }
        if (response.status === 422) {
          throw new Error(`Invalid voice ID "${voiceId}". Please update the voice ID in your database.`);
        }
        if (response.status === 429) {
          throw new Error("ElevenLabs rate limit or quota exceeded. Please wait or upgrade your plan.");
        }
        
        throw new Error(`ElevenLabs API error ${response.status}: ${errorBody}`);
      }

      // Get audio as buffer
      const audioBuffer = Buffer.from(await response.arrayBuffer());

      if (audioBuffer.length === 0) {
        throw new Error("ElevenLabs returned empty audio");
      }

      console.log(`[TTS] Audio generated: ${audioBuffer.length} bytes`);

      // Upload to Supabase Storage
      const fileName = `audio/${videoId}.mp3`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("videos")
        .upload(fileName, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from("videos")
        .getPublicUrl(fileName);

      const audioUrl = urlData.publicUrl;
      console.log(`[TTS] Audio uploaded: ${audioUrl}`);

      // Estimate duration (roughly 2.5 words per second for Indian English)
      const wordCount = text.split(/\s+/).length;
      const durationSeconds = Math.ceil(wordCount / 2.5);

      return {
        success: true,
        audio_url: audioUrl,
        duration_seconds: durationSeconds,
      };
    } catch (error) {
      lastError = error;
      console.error(`[TTS] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on auth/validation errors
      if (
        error.message.includes("invalid") ||
        error.message.includes("quota") ||
        error.message.includes("API key")
      ) {
        break;
      }
    }
  }

  throw lastError;
}

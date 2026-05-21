import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * POST /api/veo-long-ad/chunk-script
 *
 * Takes a full property script + reference images (location + avatar),
 * then uses Gemini to:
 *   1. Split the script into 8-second spoken chunks (~20–25 words each)
 *   2. Generate a cinematic Veo director prompt for EACH chunk
 *   3. Generate a master voice prompt for voice consistency
 *
 * Input (FormData):
 *   script: string
 *   language: string
 *   locationImages[]: File[] (1–5 images)
 *   avatarImages[]: File[] (1–5 images)
 *
 * Output (JSON):
 *   {
 *     chunks: Array<{
 *       index: number,
 *       text: string,
 *       estimatedSeconds: number,
 *       veoPrompt: string,
 *       cameraDirection: string,
 *     }>,
 *     masterVoicePrompt: string,
 *     totalChunks: number,
 *     totalEstimatedDuration: number,
 *   }
 */
export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const script = (formData.get("script") || "").toString().trim();
    const language = (formData.get("language") || "english").toString();

    if (!script || script.length < 20) {
      return NextResponse.json({ error: "script is required (min 20 chars)" }, { status: 400 });
    }

    // Collect location images
    const locationImages = [];
    for (let i = 0; i < 10; i++) {
      const file = formData.get(`locationImage_${i}`);
      if (file) locationImages.push(file);
    }
    // Fallback single
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

    async function fileToBase64(file) {
      const buf = Buffer.from(await file.arrayBuffer());
      return { data: buf.toString("base64"), mimeType: file.type || "image/jpeg" };
    }

    const locationDataArr = locationImages.length > 0
      ? await Promise.all(locationImages.slice(0, 1).map(fileToBase64))
      : [];
    const avatarDataArr = avatarImages.length > 0
      ? await Promise.all(avatarImages.slice(0, 1).map(fileToBase64))
      : [];

    const ai = new GoogleGenAI({ apiKey });

    const languageMap = {
      english: "English", hindi: "Hindi", hinglish: "Hinglish", marathi: "Marathi",
      tamil: "Tamil", telugu: "Telugu", kannada: "Kannada", malayalam: "Malayalam",
      bengali: "Bengali", gujarati: "Gujarati", punjabi: "Punjabi", urdu: "Urdu", odia: "Odia",
    };
    const langName = languageMap[language] || "English";

    const MAX_CHUNKS = 10;

    const chunkingPrompt = `You are a world-class AI video director and scriptwriter specializing in luxury real-estate social media ads.

Your task:
1. Split the following property ad script into spoken CHUNKS, each designed to fill ~8 seconds of spoken audio (~20–25 words at 140 wpm speaking pace).
2. Splits MUST happen at natural sentence breaks or phrase pauses. Never cut mid-sentence.
3. Maximum ${MAX_CHUNKS} chunks total. If the script would create more than ${MAX_CHUNKS} chunks, combine the shortest adjacent chunks to reduce count.
4. For EACH chunk, write a full CINEMATIC VEO DIRECTOR PROMPT — a rich, detailed video production brief using the provided property and avatar reference images.
5. Generate a MASTER VOICE PROMPT for consistent voice characteristics across all chunks.

SCRIPT TO SPLIT:
---
${script}
---

LANGUAGE: ${langName}

VEO PROMPT FORMAT FOR EACH CHUNK (follow this structure exactly):

🎬 VEO 3.1 PROMPT — CHUNK [N] OF [TOTAL] (8 SEC, ${langName.toUpperCase()})

🎭 CHARACTER (from reference image):
• [Brief character description from avatar image — age, appearance, styling, expression. Describe their hair, clothing, and features matching the reference photo.]
• Confident real-estate creator energy, speaking directly to camera
• Extreme photorealistic details: real human skin texture (pores, micro-shadows, natural lines), expressive eyes, no waxy or artificial AI skin look
• Lip-sync perfectly matched to dialogue

🗣️ DIALOGUE:
"[EXACT TEXT FROM CHUNK — same words, no changes]"

🎥 CAMERA & SHOT (8 SEC):
[One specific 8-second shot breakdown with camera movement. Describe:
  — Shot type (wide, medium, close-up, drone)
  — Camera movement (push in, pull back, orbit, handheld walk)
  — Subject position (gate, facade, balcony, exterior)
  — Mood/lighting beat]

🏠 VISUAL CONTEXT (from property reference images):
[2–3 sentences describing the high-end contemporary house shown in the location reference images: white stucco exterior walls, warm natural wood siding cladding, dark black/grey gabled metal roof, clean minimalist modern architectural lines, glass balustrades/railings, luxury landscaping, and soft golden hour or natural lighting. Ground all visuals strictly in the provided location photo.]

⚠️ STRICT RULES:
• ONLY exterior shots (gate, facade, exterior walls, balcony) — NO interior shots at all
• Match character EXACTLY from reference image. Preserve natural facial depth and avoid any synthetic, waxy, or artificial look.
• NO text, captions, overlays, or watermarks on screen
• Ultra-realistic cinematic quality, 4k editorial photorealism, 9:16 portrait
• Soft golden hour lighting, luxury real-estate aesthetic
• Perfect lip-sync mandatory

VOICE DIRECTION:
• Language: ${langName}
• Style: Confident real-estate creator
• Tone: Luxury, aspirational, fast-paced urgency
• Pacing: ~140 wpm, clear delivery

---

OUTPUT FORMAT (follow EXACTLY):

MASTER_VOICE_PROMPT:
[One detailed paragraph describing the presenter's voice: gender, age, accent, pitch, tone quality, emotional arc, pacing, recording quality. Used for ALL chunks.]

CHUNKS:
[CHUNK 1]
TEXT: [exact spoken text]
ESTIMATED_SECONDS: [number]
CAMERA_DIRECTION: [one-line camera note]
VEO_PROMPT:
[full veo prompt using format above]
[END_CHUNK]

[CHUNK 2]
TEXT: [exact spoken text]
ESTIMATED_SECONDS: [number]
CAMERA_DIRECTION: [one-line camera note]
VEO_PROMPT:
[full veo prompt using format above]
[END_CHUNK]

... (continue for all chunks)

IMPORTANT: Return ONLY the structured output above. No extra commentary. Use the property images to make each chunk's visual context location-specific.`;

    const parts = [{ text: chunkingPrompt }];
    locationDataArr.forEach((d) => parts.push({ inlineData: d }));
    avatarDataArr.forEach((d) => parts.push({ inlineData: d }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts }],
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rawText) {
      return NextResponse.json({ error: "Failed to generate chunk prompts" }, { status: 502 });
    }

    // ── Parse the structured output ──────────────────────────────────────────
    const masterVoiceMatch = rawText.match(/MASTER_VOICE_PROMPT:\s*\n([\s\S]*?)(?=\nCHUNKS:|$)/i);
    const masterVoicePrompt = masterVoiceMatch?.[1]?.trim() || getDefaultVoicePrompt(language);

    const chunks = [];
    const chunkRegex = /\[CHUNK\s+\d+\]([\s\S]*?)\[END_CHUNK\]/gi;
    let match;

    while ((match = chunkRegex.exec(rawText)) !== null) {
      const block = match[1];

      const textMatch = block.match(/TEXT:\s*(.+?)(?=\nESTIMATED_SECONDS:|$)/is);
      const secondsMatch = block.match(/ESTIMATED_SECONDS:\s*(\d+)/i);
      const cameraMatch = block.match(/CAMERA_DIRECTION:\s*(.+?)(?=\nVEO_PROMPT:|$)/is);
      const veoMatch = block.match(/VEO_PROMPT:\s*([\s\S]+?)$/i);

      const text = textMatch?.[1]?.trim().replace(/^["']|["']$/g, "") || "";
      const estimatedSeconds = parseInt(secondsMatch?.[1] || "8");
      const cameraDirection = cameraMatch?.[1]?.trim() || "";
      const veoPrompt = veoMatch?.[1]?.trim() || "";

      if (text) {
        chunks.push({
          index: chunks.length,
          text,
          estimatedSeconds,
          cameraDirection,
          veoPrompt,
        });
      }
    }

    if (chunks.length === 0) {
      // Fallback: simple word-based chunking if parsing fails
      const words = script.split(/\s+/);
      const WORDS_PER_CHUNK = 22;
      let wordIdx = 0;
      let chunkIdx = 0;

      while (wordIdx < words.length && chunkIdx < MAX_CHUNKS) {
        const chunkWords = words.slice(wordIdx, wordIdx + WORDS_PER_CHUNK);
        const text = chunkWords.join(" ");
        chunks.push({
          index: chunkIdx,
          text,
          estimatedSeconds: 8,
          cameraDirection: chunkIdx === 0 ? "Fast zoom-in toward presenter at property gate" : "Cinematic wide shot with presenter walking",
          veoPrompt: buildFallbackVeoPrompt(text, chunkIdx, chunks.length, masterVoicePrompt, langName),
        });
        wordIdx += WORDS_PER_CHUNK;
        chunkIdx++;
      }
    }

    const totalEstimatedDuration = chunks.reduce((sum, c) => sum + (c.estimatedSeconds || 8), 0);

    return NextResponse.json({
      success: true,
      chunks,
      masterVoicePrompt,
      totalChunks: chunks.length,
      totalEstimatedDuration,
    });
  } catch (error) {
    console.error("[VeoLongAd] chunk-script error:", error);
    return NextResponse.json(
      { error: error.message || "Chunk generation failed" },
      { status: 500 }
    );
  }
}

function getDefaultVoicePrompt(language = "english") {
  const accents = {
    english: "polished Indian-English accent with confident urban inflection",
    hindi: "natural North Indian Hindi with smooth warm delivery",
    kannada: "fluent Kannada with calm confident real-estate creator energy",
    tamil: "fluent Tamil with natural Chennai cadence and smooth delivery",
    telugu: "smooth Telugu with warm confident delivery",
    marathi: "fluent Marathi with warm Maharashtrian delivery",
  };
  const accent = accents[language] || accents.english;
  return `Male or female, age 26–36, ${accent}, medium-high pitch with natural variation, rich warm authoritative tone, real-estate influencer delivery style — fast on highlights, softer on premium details, meaningful dramatic pauses. Pacing ~140 wpm. Recorded on dry close-mic in treated studio, zero reverb, zero echo, zero noise, warm chest resonance, natural sibilance, natural dynamic range.`;
}

function buildFallbackVeoPrompt(text, index, total, voicePrompt, langName) {
  return `Ultra-realistic real estate showcase video, 9:16 portrait for Instagram Reels.

🗣️ DIALOGUE: "${text}"

🎥 CAMERA: ${index === 0 ? "Fast zoom-in toward presenter standing at property gate, dynamic energetic movement" : index === total - 1 ? "Final close-up push-in toward presenter, strong confident ending expression" : "Wide cinematic exterior shot, presenter walking in front of property facade"}

⚠️ RULES: Exterior shots ONLY (gate, front elevation, balcony). NO interior shots. Match reference images exactly. NO text or watermarks on screen.

VOICE: ${voicePrompt}
Language: ${langName}. Perfect lip-sync mandatory. Ultra-realistic cinematic quality. Golden hour luxury lighting.`;
}

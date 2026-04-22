import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * POST /api/real-estate-video/generate-voice-prompt
 * Generate a hyper-detailed voice description for a real estate spokesperson.
 * Input: FormData with compositeImage (file) + script (string)
 * Output: { voicePrompt: string }
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
    const compositeFile = formData.get("compositeImage");
    const script = formData.get("script");

    if (!compositeFile || !script) {
      return NextResponse.json({ error: "compositeImage and script are required" }, { status: 400 });
    }

    async function fileToBase64(file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return {
        data: buffer.toString("base64"),
        mimeType: file.type || "image/jpeg",
      };
    }

    const compositeData = await fileToBase64(compositeFile);

    const prompt = `You are an expert voice casting director specializing in real estate video content and property showcase videos.

Look at this image of a person presenting a property. They will speak the following script in a short property showcase video:

SCRIPT: "${script}"

Based on:
1. The person's apparent gender, age, ethnicity, and overall vibe from the image
2. The tone and content of the script — it's a real estate property showcase
3. How the BEST real estate content creators on Instagram and YouTube sound — confident, warm, authoritative, aspirational

Generate a DETAILED voice description prompt. The voice must sound like a CONFIDENT REAL ESTATE PROFESSIONAL who makes properties sound irresistible — warm but authoritative, aspirational but genuine.

FORMAT — Return a single paragraph with ALL of these attributes, comma-separated:
- Gender and age range
- Accent type (be specific — e.g., "neutral Indian-English accent", "polished urban Hindi-English mix")
- Pitch level and VARIATION (e.g., "medium pitch that drops for authoritative statements and rises with excitement when revealing features")
- Tone quality (warm, confident, rich, authoritative, inviting, etc.)
- Emotional delivery — describe the arc: opens with hook energy (attention-grabbing), transitions to smooth confident walkthrough, ends with aspirational close
- Speaking style: confident real estate presenter — like a top luxury property YouTuber, NOT a stiff news anchor
- Vocal expressiveness cues (e.g., "slight dramatic pause before revealing a key feature, voice drops to intimate/warm when describing the view, rises with genuine excitement for spacious rooms")
- Pacing: measured but engaging — slightly slower for premium feel, speeds up subtly for exciting features, deliberate pauses for emphasis
- Energy level: confident and warm — the energy of someone who genuinely LOVES showing beautiful spaces
- Natural vocal habits (slight smile in voice when describing aspirational features, warm breath before hook delivery)
- RECORDING QUALITY (CRITICAL): dry close-mic (6 inches from mouth), zero reverb, zero echo, zero robotic artifacts, warm natural chest resonance, subtle lip-smack between sentences, natural sibilance on 's' sounds, soft room ambient hum (NOT dead digital silence), natural dynamic range
- Background ambience: very soft natural room tone ONLY, NO music, NO echo, intimate close-mic presence

CRITICAL RULES:
1. Return ONLY the voice description paragraph. No headers, no explanations.
2. The voice MUST sound like a REAL human recording — absolutely ZERO robotic, metallic, or synthetic qualities.
3. This is a REAL ESTATE presenter, not a product reviewer — the voice should convey authority and aspiration.

EXAMPLE OUTPUT:
"Male, age 30-38, polished neutral Indian-English accent with confident urban inflection, medium-low pitch that drops to authoritative depth when stating facts about the property and rises with warm excitement when revealing views or premium features, rich and confident tone with natural warmth, delivery opens with a dramatic attention-grabbing hook then transitions to smooth confident walkthrough narration and closes with aspirational warmth, professional real estate presenter style like a top luxury property YouTuber who makes every space feel like home, slight dramatic pause before revealing the master bedroom view with voice dropping to intimate warmth, measured pacing around 140 words per minute with deliberate pauses for emphasis on square footage and price points, confident warm energy of someone who genuinely loves showing beautiful spaces and wants you to picture yourself living there, recorded on a dry close-mic with zero reverb and zero echo, warm chest resonance with natural sibilance, subtle lip-smack between phrases, very soft room ambient hum, natural dynamic range with confident louder delivery for hooks and softer intimate tone for aspirational closing, absolutely no robotic or metallic artifacts."`;

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: compositeData },
          ],
        },
      ],
    });

    let voicePrompt = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!voicePrompt) {
      return NextResponse.json({ error: "Failed to generate voice prompt" }, { status: 502 });
    }

    voicePrompt = voicePrompt.replace(/^["']|["']$/g, "");

    return NextResponse.json({ success: true, voicePrompt });
  } catch (error) {
    console.error("[RealEstateVideo] Generate voice prompt error:", error);
    return NextResponse.json({ error: error.message || "Voice prompt generation failed" }, { status: 500 });
  }
}

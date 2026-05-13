import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * POST /api/real-estate-video/generate-script
 *
 * PRIMARY GOAL: Generate a rich, cinematic VIDEO AD PROMPT for each composite.
 * This is NOT a script of what the presenter says — it is a full director's brief
 * that gets passed directly to Veo 3.1 as the video generation prompt.
 *
 * The prompt includes:
 *   - Opening camera move / shot style (cinematic, UGC, real estate)
 *   - Avatar action / energy / pacing (fast → slow, turn → reveal, etc.)
 *   - What the presenter says (short, punchy — ≤18 words, 8 seconds)
 *   - Room/space atmosphere, lighting mood
 *   - Closing beat
 *
 * Optional: if the user provides `userIntent` (something they want the presenter
 * to say or highlight), it is woven into the spoken line organically.
 *
 * Returns:
 *   hook        — short spoken fragment for UI preview (≤6 words)
 *   walkthrough — medium spoken line for UI preview (≤10 words)
 *   cta         — closing spoken fragment for UI preview (≤4 words)
 *   fullScript  — THE CINEMATIC VEO PROMPT (2-4 rich sentences)
 *
 * Single:  compositeImage + propertyImage + [userIntent] → { script }
 * Batch:   compositeImage_0..N + compositeCount + [userIntent_0..N or userIntent] → { scripts: [] }
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
    const language        = formData.get("language")        || "english";
    const tone            = formData.get("tone")            || "professional";
    const allowEmotionTags= formData.get("allowEmotionTags") === "true";
    const compositeCount  = parseInt(formData.get("compositeCount")) || 0;
    // userIntent: optional text — what the user wants the presenter to say/highlight
    const userIntent      = (formData.get("userIntent") || formData.get("script") || "").trim();

    async function fileToBase64(file) {
      const buf = Buffer.from(await file.arrayBuffer());
      return { data: buf.toString("base64"), mimeType: file.type || "image/jpeg" };
    }

    const ai = new GoogleGenAI({ apiKey });

    // ── Property brief ──────────────────────────────────────────────────────
    let brief = {};
    try {
      const raw = formData.get("propertyBrief");
      if (raw) brief = JSON.parse(raw);
    } catch {}
    const loc   = brief.location     || formData.get("location")     || "";
    const ptype  = brief.propertyType || formData.get("propertyType") || "";
    const price  = brief.price        || formData.get("price")        || "";
    const beds   = brief.bedrooms     || formData.get("bedrooms")     || "";
    const baths  = brief.bathrooms    || formData.get("bathrooms")    || "";
    const area   = brief.area         || formData.get("area")         || "";
    const feat   = brief.keyFeatures  || formData.get("keyFeatures")  || "";
    const amen   = brief.amenities    || formData.get("amenities")    || "";

    const briefLines = [
      loc   && `Location: ${loc}`,
      ptype && `Property type: ${ptype}`,
      price && `Price: ${price}`,
      beds  && `Beds: ${beds}`,
      baths && `Baths: ${baths}`,
      area  && `Area: ${area}`,
      feat  && `Key features: ${feat}`,
      amen  && `Amenities: ${amen}`,
      brief.furnishing && `Furnishing: ${brief.furnishing}`,
      brief.facing     && `Facing: ${brief.facing}`,
    ].filter(Boolean);
    const briefBlock = briefLines.length
      ? `\nPROPERTY BRIEF:\n${briefLines.join("\n")}`
      : "";

    // ── Language / tone ──────────────────────────────────────────────────────
    const langMap = {
      english:  "The presenter speaks in natural, confident Indian-English.",
      hindi:    "The presenter speaks in natural Hindi (Devanagari script).",
      hinglish: "The presenter speaks in Hinglish — casual mix of Hindi and English in Roman script, as spoken in urban India.",
      marathi:  "The presenter speaks in natural Marathi with a warm Maharashtrian tone.",
      tamil:    "The presenter speaks in natural Tamil with a polished South Indian tone.",
      telugu:   "The presenter speaks in natural Telugu with a smooth, clear delivery.",
      kannada:  "The presenter speaks in natural Kannada with a calm, confident delivery.",
      malayalam:"The presenter speaks in natural Malayalam with an elegant, grounded delivery.",
      bengali:  "The presenter speaks in natural Bengali with a soft, expressive delivery.",
      gujarati: "The presenter speaks in natural Gujarati with a bright, friendly tone.",
      punjabi:  "The presenter speaks in natural Punjabi with a warm, energetic delivery.",
      urdu:     "The presenter speaks in natural Urdu with an elegant, expressive delivery.",
      odia:     "The presenter speaks in natural Odia with a smooth, conversational delivery.",
    };
    const langRule = langMap[language] || langMap.hindi;

    const emotionRule = allowEmotionTags
      ? "You may embed emotion tags like {{excited}}, {{calm}}, {{happy}} immediately before the word/phrase they color. Keep tags exactly as written."
      : "Do NOT include emotion tags or any special markup in the spoken text.";

    const userIntentBlock = userIntent
      ? `\nUSER INTENT (MUST incorporate this into the spoken line):\n"${userIntent}"\n`
      : "";

    // ── Shared director brief ────────────────────────────────────────────────
    const DIRECTOR_BRIEF = `
You are a world-class real estate UGC ad director who creates VIRAL Instagram Reels and YouTube Shorts for luxury and aspirational properties.

YOUR JOB IS NOT to write a simple script. You are generating a FULL CINEMATIC VIDEO AD PROMPT — the exact instructions that will be sent to an AI video generator (Google Veo 3) to produce a jaw-dropping 8-second real estate clip.

Think: cinematic opening shot → presenter energy → punchy spoken hook → reveal → emotional close.
Take inspiration from the best real estate content creators: walking shots, quick zooms, turn-and-reveal moves, pull focus on architecture details, natural light flares.
${briefBlock}
${userIntentBlock}
LANGUAGE: ${langRule}
EMOTION TAGS: ${emotionRule}
TONE: ${tone}

═══════════════════════════════════════════════════════════
⚠️  SPOKEN WORD BUDGET — 8 seconds MAXIMUM
    Total spoken words must be ≤18 words across the entire clip.
    Average speaking pace: 2.3 words/second.
    ❌ Do NOT write long sentences — every word must earn its place.
    ✅ Short, punchy fragments hit harder than full sentences.
    ✅ Think: "This view. Every morning." not "You get this amazing view every single morning."
═══════════════════════════════════════════════════════════

HOW TO WRITE THE CINEMATIC PROMPT (fullScript):
Write 2-4 tight sentences describing:
  1. OPENING SHOT: How the camera starts. Examples:
     - "Slow cinematic push-in from wide-angle, revealing the presenter standing confidently at the center of a sun-drenched living room."
     - "Camera starts close on a marble countertop detail, then pulls back to reveal the presenter with a smirk."
     - "Handheld UGC-style shot — presenter walks toward camera fast, stops close, looks dead into lens."
     - "Quick whip-pan from the window view to the presenter who's already mid-gesture."
  2. PRESENTER ACTION: What does the presenter DO before speaking? (gesture, turn, step aside, look up, touch a surface)
  3. SPOKEN LINE (≤18 words total, verbatim): Exactly what the presenter says. If user intent provided, honor it.
  4. CLOSING ENERGY: How does the clip end? (lingering shot, quick cut, zoom-out, freeze on presenter)

FOR THE UI FIELDS (hook / walkthrough / cta):
  hook        — first 5-6 spoken words only (the attention-grabbing fragment)
  walkthrough — middle 8-10 spoken words (the value reveal)
  cta         — final 3-4 spoken words (the close)
  These are for display in the editor UI — they are slices of the spoken line inside fullScript.
  Do NOT add extra words — just slice the spoken line across the 3 fields.

❌ ABSOLUTE RULE — NO TEXT ON SCREEN:
  NEVER include instructions for text overlays, captions, subtitles, titles, price tags,
  watermarks, lower thirds, or any on-screen graphics in the fullScript prompt.
  The video must be 100% clean — no text whatsoever on the generated video.`;

    // ── BATCH MODE ────────────────────────────────────────────────────────────
    if (compositeCount > 1) {
      const compositeFiles = [];
      const propertyFiles  = [];
      const perClipIntents = [];
      for (let i = 0; i < compositeCount; i++) {
        const c = formData.get(`compositeImage_${i}`);
        const p = formData.get(`propertyImage_${i}`);
        const u = formData.get(`userIntent_${i}`) || "";
        if (c) compositeFiles.push(c);
        if (p) propertyFiles.push(p);
        perClipIntents.push(u.trim());
      }

      if (compositeFiles.length < 2) {
        return NextResponse.json(
          { error: "Batch mode requires at least 2 composite images" },
          { status: 400 }
        );
      }

      const compositeDataArr = await Promise.all(compositeFiles.map(fileToBase64));
      const propertyDataArr  = await Promise.all(propertyFiles.map(fileToBase64));
      const N = compositeDataArr.length;

      // Per-clip user intents — fall back to shared userIntent
      const intentLines = perClipIntents.map((u, i) => {
        const resolved = u || userIntent;
        return resolved ? `  Clip ${i + 1}: "${resolved}"` : `  Clip ${i + 1}: (none — AI decides)`;
      }).join("\n");

      const batchPrompt = `${DIRECTOR_BRIEF}

You have ${N} composite images showing the SAME presenter in DIFFERENT rooms/spaces of the same property.
Together they form a continuous walkthrough — each clip is 8 seconds. They will be stitched together.

PER-CLIP USER INTENT (what user wants said in each clip):
${intentLines}

NARRATIVE ARC — this is a JOURNEY through one property:
  Clip 1 = EXPLOSIVE ENTRY — make the viewer STOP scrolling. Big hook, big energy, WOW moment.
  Clips 2 to ${N - 1} = STEADY REVEAL — each room is a new surprise, energy builds then eases.
  Clip ${N} = SLOW CONFIDENT CLOSE — let the space breathe, presenter exudes certainty.

CAMERA VARIETY (use DIFFERENT shots for each clip — do NOT repeat):
  Clip 1 ideas: fast handheld rush-in, whip-pan reveal, close face then pull back
  Middle ideas: smooth dolly through doorway, rack focus on feature then presenter, turn-and-gesture
  Final ideas: slow push-in, presenter steps aside wide reveal, lingering hold then smile to camera

Generate exactly ${N} cinematic video ad prompts.
Return ONLY a valid JSON array:
[
  {
    "hook": "5-6 words — first spoken fragment",
    "walkthrough": "8-10 words — mid spoken reveal",
    "cta": "3-4 words — closing fragment",
    "fullScript": "Full 2-4 sentence cinematic Veo prompt with camera direction + presenter action + spoken line (≤18 words verbatim) + closing energy"
  }
]
No markdown, no explanation, no text outside the JSON array.`;

      const parts = [
        { text: batchPrompt },
        ...compositeDataArr.map((d) => ({ inlineData: d })),
        ...propertyDataArr.map((d)  => ({ inlineData: d })),
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts }],
      });

      const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!rawText) {
        return NextResponse.json({ error: "Failed to generate prompts" }, { status: 502 });
      }

      let scripts;
      try {
        const jsonStr = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        scripts = JSON.parse(jsonStr);
        if (!Array.isArray(scripts)) throw new Error("Not an array");
        scripts = scripts.map((s) => ({
          hook:        (s.hook        || "").trim(),
          walkthrough: (s.walkthrough || "").trim(),
          cta:         (s.cta         || "").trim(),
          fullScript:  (s.fullScript  || [s.hook, s.walkthrough, s.cta].filter(Boolean).join(" ")).trim(),
        }));
      } catch {
        const lines = rawText.split("\n").filter((l) => l.trim().length > 20).slice(0, N);
        scripts = lines.map((line) => ({ hook: "", walkthrough: "", cta: "", fullScript: line }));
      }

      return NextResponse.json({ success: true, scripts });
    }

    // ── SINGLE MODE ───────────────────────────────────────────────────────────
    const compositeFile = formData.get("compositeImage");
    const propertyFile  = formData.get("propertyImage");
    const hasBrief = !!(loc || ptype || price || beds || baths || area || feat || amen);

    if (!compositeFile && !propertyFile && !hasBrief) {
      return NextResponse.json(
        { error: "Provide a compositeImage, propertyImage, or property brief fields" },
        { status: 400 }
      );
    }

    const singlePrompt = `${DIRECTOR_BRIEF}

You have ONE composite image showing a presenter in a property space.

Generate ONE cinematic 8-second real estate video ad prompt.

Return ONLY a valid JSON object:
{
  "hook": "5-6 words — first spoken fragment",
  "walkthrough": "8-10 words — mid spoken reveal",
  "cta": "3-4 words — closing fragment",
  "fullScript": "Full 2-4 sentence cinematic Veo prompt with camera direction + presenter action + spoken line (≤18 words verbatim) + closing energy"
}
No markdown, no explanation, no text outside the JSON object.`;

    const parts = [{ text: singlePrompt }];
    if (compositeFile) parts.push({ inlineData: await fileToBase64(compositeFile) });
    if (propertyFile)  parts.push({ inlineData: await fileToBase64(propertyFile)  });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rawText) {
      return NextResponse.json({ error: "Failed to generate prompt" }, { status: 502 });
    }

    let scriptObj;
    try {
      const jsonStr = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      scriptObj = JSON.parse(jsonStr);
      if (!scriptObj.fullScript) {
        scriptObj.fullScript = [scriptObj.hook, scriptObj.walkthrough, scriptObj.cta]
          .filter(Boolean).join(" ");
      }
    } catch {
      scriptObj = { hook: "", walkthrough: "", cta: "", fullScript: rawText };
    }

    return NextResponse.json({ success: true, script: scriptObj });

  } catch (error) {
    console.error("[RealEstateVideo] Generate prompt error:", error);
    return NextResponse.json(
      { error: error.message || "Prompt generation failed" },
      { status: 500 }
    );
  }
}

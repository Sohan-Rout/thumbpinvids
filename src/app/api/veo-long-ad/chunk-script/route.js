import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * POST /api/veo-long-ad/chunk-script
 *
 * Beat Planner: analyzes the property script and outputs a 3-act beat plan.
 * Uses fal.ai any-llm (FAL_KEY) — falls back to Gemini if FAL_KEY is absent.
 *
 * Act 1 — Avatar Intro (~18-20s): HOOK + AVATAR_INTRO + AVATAR_WALK
 * Act 2 — Ken Burns Property (~18-22s): PROPERTY_VISUAL × 3 + FEATURE_BURST
 * Act 3 — Avatar Outro (~16-20s): AVATAR_RETURN + INVENTORY_ALERT + CTA
 *
 * Beat types:
 *   HOOK           — avatar exits luxury car, walks to camera, 5-6s
 *   AVATAR_INTRO   — avatar standing at entrance, introduces property, 6-7s
 *   AVATAR_WALK    — avatar walks through lobby/key area with gestures, 5-6s
 *   PROPERTY_VISUAL— room Ken Burns shot, Sarvam voiceover, 4-6s
 *   FEATURE_BURST  — price/spec overlay + punchy narration, 3-4s
 *   AVATAR_RETURN  — avatar returns to frame, limited inventory message, 5-6s
 *   INVENTORY_ALERT— avatar leans in with urgency/scarcity, 4-5s
 *   CTA            — avatar extends hand, delivers contact CTA, 5-6s
 */

const MAX_BEATS = 10;
const MAX_AVATAR_BEATS = 6;

// fal.ai any-llm model to use for beat planning
const FAL_MODEL = "anthropic/claude-3-5-haiku";

async function callLLM(prompt) {
  const falKey = process.env.FAL_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (falKey) {
    fal.config({ credentials: falKey });
    const result = await fal.subscribe("fal-ai/any-llm", {
      input: { model: FAL_MODEL, prompt, max_tokens: 4096 },
    });
    return (result?.data?.output ?? result?.output ?? "").toString().trim();
  }

  if (geminiKey) {
    // Fallback to Gemini if no FAL_KEY
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });
    return (response.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  }

  throw new Error("No LLM API key configured — set FAL_KEY or GEMINI_API_KEY");
}

export async function POST(request) {
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

    const langMap = {
      english: "English", hindi: "Hindi", hinglish: "Hinglish", marathi: "Marathi",
      tamil: "Tamil", telugu: "Telugu", kannada: "Kannada", malayalam: "Malayalam",
      bengali: "Bengali", gujarati: "Gujarati", punjabi: "Punjabi", urdu: "Urdu", odia: "Odia",
    };
    const langName = langMap[language] || "English";

    const beatPlanPrompt = `You are a senior Indian real estate Instagram reel director. Design a HYBRID BEAT PLAN for a 55-65 second vertical reel that follows this EXACT 3-act structure.

═══════════════════════════════════════════════════
ACT 1 — AVATAR INTRO  (beats 0-2, target 18-20 seconds)
Presenter is the star. Camera stays on avatar. Physics-based realistic movement.
═══════════════════════════════════════════════════

Beat 0 — HOOK (visual_type "avatar") — 5-6s
Presenter exits a luxury car (door already mid-swing, never manually opened) and walks toward camera. First line of narration hooks viewer instantly. Smooth cinematic push-in following the walk.

Beat 1 — AVATAR_INTRO (visual_type "avatar") — 6-7s
Presenter standing confidently just outside property entrance, addressing camera directly. Introduces key highlights — location, configuration, lifestyle. UGC creator energy. Static medium close-up, property façade behind.

Beat 2 — AVATAR_WALK (visual_type "avatar") — 5-6s
Presenter walks purposefully through grand entrance or lobby, gestures at surroundings. Highlights one or two wow features visible in the space. Tracking medium shot follows the walk.

═══════════════════════════════════════════════════
ACT 2 — KEN BURNS PROPERTY SHOWCASE  (beats 3-6, target 18-22 seconds)
No presenter. Property photos with Ken Burns animation. Sarvam voiceover describes each space.
═══════════════════════════════════════════════════

Beat 3 — PROPERTY_VISUAL (visual_type "property") — 4-6s — living room / main hall
Beat 4 — PROPERTY_VISUAL (visual_type "property") — 4-6s — master bedroom
Beat 5 — PROPERTY_VISUAL (visual_type "property") — 4-6s — kitchen, dining, or premium amenity
Beat 6 — FEATURE_BURST  (visual_type "property") — 3-4s — price / key spec with overlay

Each property beat: one room only, one slow camera movement, warm lighting, NO people.

═══════════════════════════════════════════════════
ACT 3 — AVATAR OUTRO  (beats 7-9, target 16-20 seconds)
Presenter returns with urgency. Limited inventory + contact CTA.
═══════════════════════════════════════════════════

Beat 7 — AVATAR_RETURN (visual_type "avatar") — 5-6s
Presenter walks back into frame from side or turns to camera with renewed energy. Limited inventory message — only X units left, scarcity. Medium close-up as they settle into frame.

Beat 8 — INVENTORY_ALERT (visual_type "avatar") — 4-5s
Presenter leans slightly toward camera, urgent expression, one raised finger for emphasis. Emphasises: prices going up, last few units, closing soon. Close-up with slight push-in.

Beat 9 — CTA (visual_type "avatar") — 5-6s
Presenter stops, extends open hand toward camera with warm confident smile. Clear call-to-action: site visit, call number, DM. Elegant property softly blurred behind.

═══════════════════════════════════════════════════
PHYSICS & MOVEMENT RULES for ALL AVATAR BEATS:
- Every step: natural weight shift — foot placement to shoulder sway physically realistic
- Clothing fabric has micro-movement responding to motion; hair settles naturally when stopping
- When presenter stops: realistic momentum carries body slightly forward before settling
- Camera: gimbal/Steadicam with very low damping — slight natural sway, authentic creator look
- NEVER describe voice, audio, or speech — Sarvam TTS handles audio separately
- Max 50 words per avatar veo_prompt
- Include at end of every avatar prompt: "Natural physics: weighted walk, clothing micro-movement, hair settles. 9:16 vertical portrait."
═══════════════════════════════════════════════════

VEO PROMPT FORMAT for property beats (max 35 words):
"[Room name with specific detail]. [One slow camera movement]. [Lighting mood]. 9:16 vertical. No people. No text. No music."

NARRATION RULES — voiceover spoken by Sarvam TTS in ${langName}:
- HOOK: 12-18 words — instant hook as presenter exits car. UGC energy.
- AVATAR_INTRO: 22-30 words — property name, location, config, standout USP conversationally
- AVATAR_WALK: 20-28 words — 2 wow features visible in entrance/lobby, like talking to a friend
- PROPERTY_VISUAL: 18-26 words — describe the specific room: size, finishes, one distinctive detail. Natural, not brochure.
- FEATURE_BURST: 10-14 words — punchy price or spec fact
- AVATAR_RETURN: 20-26 words — limited inventory warning, FOMO
- INVENTORY_ALERT: 14-20 words — urgent scarcity push
- CTA: 18-24 words — clear action: call, book site visit, DM, link in bio
- Pure spoken words only — no stage directions, no quotation marks
- Punctuate for natural spoken delivery: use commas for breathing pauses, em-dash (—) for dramatic emphasis, ellipsis (...) before a reveal or twist, exclamation mark for energy, question mark for genuine curiosity.

Write all narration in English — a dedicated translation pass converts to the target language after beat planning.

OVERLAY TEXT RULES:
- HOOK: property name or tagline (2-5 words)
- FEATURE_BURST overlay: price/sqft/config (max 5 words) e.g. "₹2.5 Cr Onwards"
- INVENTORY_ALERT overlay: scarcity text (max 4 words) e.g. "Only 3 Units Left"
- CTA overlay: action text (max 4 words) e.g. "Book Site Visit →"
- All other beats: overlay_text = null

OUTPUT: valid JSON only, no markdown fences, no extra text:
{
  "beats": [
    {
      "index": 0,
      "type": "HOOK",
      "duration_seconds": 5,
      "visual_type": "avatar",
      "veo_prompt": "Presenter already stepping out of white luxury SUV, door swinging open mid-motion, walks confidently toward camera with warm smile and brief upward glance at building. Smooth cinematic push-in following walk. Golden hour light. Natural physics: weighted walk, clothing micro-movement, hair settles. 9:16 vertical portrait.",
      "overlay_text": "...",
      "narration": "...",
      "lipsync_expression": "friendly"
    },
    {
      "index": 1,
      "type": "AVATAR_INTRO",
      "duration_seconds": 6,
      "visual_type": "avatar",
      "veo_prompt": "Presenter standing confidently outside grand property entrance, addresses camera directly with genuine enthusiasm and open hand gestures. Static medium close-up, property façade visible behind. Natural physics: weighted walk, clothing micro-movement, hair settles. 9:16 vertical portrait.",
      "overlay_text": null,
      "narration": "...",
      "lipsync_expression": "friendly"
    },
    {
      "index": 2,
      "type": "AVATAR_WALK",
      "duration_seconds": 5,
      "visual_type": "avatar",
      "veo_prompt": "Presenter walks through grand entrance lobby, turns to camera mid-stride with expressive hand gesture pointing at the space. Tracking medium shot follows walk, luxury interior visible. Natural physics: weighted walk, clothing micro-movement, hair settles. 9:16 vertical portrait.",
      "overlay_text": null,
      "narration": "...",
      "lipsync_expression": "friendly"
    },
    {
      "index": 3,
      "type": "PROPERTY_VISUAL",
      "duration_seconds": 5,
      "visual_type": "property",
      "veo_prompt": "...",
      "overlay_text": null,
      "narration": "...",
      "lipsync_expression": null
    },
    {
      "index": 4,
      "type": "PROPERTY_VISUAL",
      "duration_seconds": 5,
      "visual_type": "property",
      "veo_prompt": "...",
      "overlay_text": null,
      "narration": "...",
      "lipsync_expression": null
    },
    {
      "index": 5,
      "type": "PROPERTY_VISUAL",
      "duration_seconds": 5,
      "visual_type": "property",
      "veo_prompt": "...",
      "overlay_text": null,
      "narration": "...",
      "lipsync_expression": null
    },
    {
      "index": 6,
      "type": "FEATURE_BURST",
      "duration_seconds": 3,
      "visual_type": "property",
      "veo_prompt": "...",
      "overlay_text": "₹X Cr Onwards",
      "narration": "...",
      "lipsync_expression": null
    },
    {
      "index": 7,
      "type": "AVATAR_RETURN",
      "duration_seconds": 5,
      "visual_type": "avatar",
      "veo_prompt": "Presenter walks back into frame from side, settles to face camera with renewed energy and slightly urgent expression. Medium close-up as body settles after entry. Natural physics: weighted walk, clothing micro-movement, hair settles. 9:16 vertical portrait.",
      "overlay_text": null,
      "narration": "...",
      "lipsync_expression": "friendly"
    },
    {
      "index": 8,
      "type": "INVENTORY_ALERT",
      "duration_seconds": 4,
      "visual_type": "avatar",
      "veo_prompt": "Presenter leans slightly toward camera with focused urgent expression, raises one finger for emphasis. Slight push-in. Subtle fabric tension as body leans forward. Natural physics: weighted walk, clothing micro-movement, hair settles. 9:16 vertical portrait.",
      "overlay_text": "Only X Units Left",
      "narration": "...",
      "lipsync_expression": "professional"
    },
    {
      "index": 9,
      "type": "CTA",
      "duration_seconds": 5,
      "visual_type": "avatar",
      "veo_prompt": "Presenter stops and turns directly to camera with warm confident smile, extends one open hand toward viewer. Body weight settles naturally, property softly blurred behind. Natural physics: weighted walk, clothing micro-movement, hair settles. 9:16 vertical portrait.",
      "overlay_text": "Book Site Visit →",
      "narration": "...",
      "lipsync_expression": "professional"
    }
  ],
  "voice_profile": "Brief description of presenter voice style",
  "full_narration": "Complete spoken text from all beats with narration, in order",
  "total_duration": 53
}

PROPERTY SCRIPT TO PLAN:
---
${script}
---`;

    const rawText = await callLLM(beatPlanPrompt);

    if (!rawText) {
      return NextResponse.json({ error: "Failed to generate beat plan" }, { status: 502 });
    }

    let beats = [];
    let voiceProfile = buildDefaultVoiceProfile(language);
    let fullNarration = script;

    const cleanText = rawText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.beats) && parsed.beats.length > 0) {
          beats = parsed.beats.slice(0, MAX_BEATS).map((b, i) => ({
            index: i,
            type: b.type || "PROPERTY_VISUAL",
            duration_seconds: clamp(b.duration_seconds || 4, 2, 8),
            visual_type: b.visual_type || "property",
            veo_prompt: b.veo_prompt || null,
            overlay_text: b.overlay_text || null,
            narration: b.narration || null,
            lipsync_expression: b.lipsync_expression || "friendly",
          }));
        }
        if (parsed.voice_profile) voiceProfile = parsed.voice_profile;
        if (parsed.full_narration) fullNarration = parsed.full_narration;
      } catch (_) {}
    }

    // Enforce max presenter beat limit — downgrade excess avatar beats to property
    let avatarCount = 0;
    beats = beats.map((b) => {
      if (b.visual_type === "avatar") {
        avatarCount++;
        if (avatarCount > MAX_AVATAR_BEATS) {
          return {
            ...b,
            visual_type: "property",
            type: "PROPERTY_VISUAL",
            veo_prompt: b.veo_prompt || "Luxury interior detail close-up. Slow push-in. Warm ambient light. 9:16 vertical. No people.",
          };
        }
      }
      return b;
    });

    // Ensure all beats have veo_prompt and narration
    beats = beats.map((b) => ({
      ...b,
      veo_prompt: b.visual_type === "property"
        ? (b.veo_prompt || buildFallbackVeoPrompt(b.type))
        : (b.veo_prompt || buildFallbackPresenterVeoPrompt(b.type)),
      narration: b.narration || buildFallbackNarration(b.type),
    }));

    if (beats.length === 0) {
      beats = buildFallbackBeats(script);
    }

    // ── Translation pass: convert narrations to native script ────────────
    // Runs only when language is non-English. Dedicated focused LLM call so
    // translation doesn't compete with beat-structure instructions.
    if (language !== "english") {
      const SCRIPT_RULE = {
        hindi:     "Hindi words in Devanagari script, English brand/place names and numbers stay Roman. Example: \"यह apartment सिर्फ ₹2.4 Crore में — यह chance बार-बार नहीं आता!\"",
        hinglish:  "Hindi/Urdu words in Devanagari, English words stay Roman. Example: \"यह property Gurgaon की best locality में है — यहाँ की amenities बिल्कुल world-class हैं!\"",
        marathi:   "Full Marathi in Devanagari. English proper nouns stay Roman.",
        tamil:     "Full Tamil in Tamil script (தமிழ்). English proper nouns stay Roman.",
        telugu:    "Full Telugu in Telugu script (తెలుగు). English proper nouns stay Roman.",
        kannada:   "Full Kannada in Kannada script (ಕನ್ನಡ). English proper nouns stay Roman.",
        malayalam: "Full Malayalam in Malayalam script (മലയാളം). English proper nouns stay Roman.",
        bengali:   "Full Bengali in Bengali script (বাংলা). English proper nouns stay Roman.",
        gujarati:  "Full Gujarati in Gujarati script (ગુજરાતી). English proper nouns stay Roman.",
        punjabi:   "Full Punjabi in Gurmukhi script (ਪੰਜਾਬੀ). English proper nouns stay Roman.",
        urdu:      "Urdu words in Devanagari-friendly Urdu. English proper nouns stay Roman.",
      };
      const scriptRule = SCRIPT_RULE[language] || `Translate to ${langName} in its native script.`;

      const toTranslate = beats
        .filter((b) => b.narration)
        .map((b) => ({ index: b.index, text: b.narration }));

      if (toTranslate.length > 0) {
        try {
          const translationPrompt = `You are a professional Indian real estate copywriter. Translate these voiceover lines for Sarvam TTS.

RULE: ${scriptRule}
Keep the same energy, emotion, and approximate word count. Do NOT add or remove ideas.
Return ONLY a valid JSON array — no markdown, no extra text:
[{"index": 0, "text": "translated narration"}, ...]

TEXTS TO TRANSLATE:
${JSON.stringify(toTranslate)}`;

          const translRaw = await callLLM(translationPrompt);
          const translClean = translRaw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
          const translMatch = translClean.match(/\[[\s\S]*\]/);
          if (translMatch) {
            const translArr = JSON.parse(translMatch[0]);
            const translMap = Object.fromEntries(translArr.map((t) => [t.index, t.text]));
            beats = beats.map((b) =>
              translMap[b.index] !== undefined ? { ...b, narration: translMap[b.index] } : b
            );
            fullNarration = beats
              .filter((b) => b.narration)
              .map((b) => b.narration)
              .join(" ");
          }
        } catch (translErr) {
          console.warn("[VeoLongAd] Translation pass failed, using original narration:", translErr.message);
        }
      }
    }

    const totalDuration = beats.reduce((s, b) => s + (b.duration_seconds || 4), 0);

    if (!fullNarration || fullNarration === script) {
      const avatarLines = beats
        .filter((b) => b.visual_type === "avatar" && b.narration)
        .map((b) => b.narration);
      if (avatarLines.length > 0) fullNarration = avatarLines.join(" ");
    }

    const chunks = beats.map((b) => ({
      index: b.index,
      text: b.narration || b.overlay_text || `${b.type} — property visual`,
      estimatedSeconds: b.duration_seconds,
      veoPrompt: b.veo_prompt || "",
      cameraDirection: b.overlay_text || b.type,
      beatType: b.type,
      visualType: b.visual_type,
      overlayText: b.overlay_text,
      lipsyncExpression: b.lipsync_expression,
      narration: b.narration,
    }));

    return NextResponse.json({
      success: true,
      beats,
      voiceProfile,
      fullNarration,
      totalDuration,
      chunks,
      masterVoicePrompt: voiceProfile,
      presenterDescription: "",
      totalChunks: beats.length,
      totalEstimatedDuration: totalDuration,
    });
  } catch (error) {
    console.error("[VeoLongAd] chunk-script error:", error);
    return NextResponse.json(
      { error: error.message || "Beat planning failed" },
      { status: 500 }
    );
  }
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function buildDefaultVoiceProfile(language = "english") {
  return `Warm, confident Indian real estate creator speaking in ${language}. Direct to camera, authentic, conversational. Natural pauses, no performance voice.`;
}

function buildFallbackVeoPrompt(type) {
  const map = {
    PROPERTY_VISUAL: "Luxury living room interior, slow dolly push-in, warm ambient lighting. 9:16 vertical. No people.",
    FEATURE_BURST: "Premium property finishes close-up, shallow depth of field. 9:16 vertical. No people.",
  };
  return map[type] || "Luxury property interior. Slow cinematic push-in. Warm light. 9:16 vertical. No people.";
}

const PHYSICS_SUFFIX = "Natural physics: weighted walk, clothing micro-movement, hair settles. 9:16 vertical portrait.";

function buildFallbackPresenterVeoPrompt(type) {
  const map = {
    HOOK: `Presenter already stepping out of white luxury SUV, door swinging open mid-motion, walks confidently toward camera with warm smile and brief upward glance at building. Smooth cinematic push-in following walk. Golden hour warm light. ${PHYSICS_SUFFIX}`,
    AVATAR_INTRO: `Presenter standing confidently outside grand property entrance, addresses camera directly with genuine enthusiasm and open hand gestures. Static medium close-up, property façade visible behind. ${PHYSICS_SUFFIX}`,
    AVATAR_WALK: `Presenter walks through grand entrance lobby, turns to camera mid-stride with expressive hand gesture pointing at the space. Tracking medium shot follows walk, luxury interior visible. ${PHYSICS_SUFFIX}`,
    AVATAR_RETURN: `Presenter walks back into frame from side, settles to face camera with renewed energy and slightly urgent expression. Medium close-up as body settles after entry momentum. ${PHYSICS_SUFFIX}`,
    INVENTORY_ALERT: `Presenter leans slightly toward camera with focused urgent expression, raises one finger for emphasis. Slight push-in for tension. Subtle fabric tension as body leans forward. ${PHYSICS_SUFFIX}`,
    CTA: `Presenter stops and turns directly to camera with warm confident smile, extends one open hand toward viewer. Body weight settles naturally, property softly blurred behind. ${PHYSICS_SUFFIX}`,
    AVATAR_SEGMENT: `Presenter walks through bright property interior, turns naturally to camera mid-step with genuine excitement and expressive hand gestures. Tracking medium close-up, luxury space behind. ${PHYSICS_SUFFIX}`,
  };
  return map[type] || `Presenter walks through property, turns naturally to camera, speaks directly with energy and natural hand gestures. Medium close-up tracking shot. ${PHYSICS_SUFFIX}`;
}

function buildFallbackNarration(type) {
  const map = {
    HOOK: "Yaar, check out this property — you are not going to believe what is inside!",
    AVATAR_INTRO: "I am standing right outside this incredible project — perfect location, stunning design, and everything you have been looking for in a home.",
    AVATAR_WALK: "Just look at this entrance — marble floors, double height ceiling, and the lobby itself is like a five star hotel.",
    AVATAR_SEGMENT: "I am here at this stunning property and honestly, this is one of the best I have seen in a long time.",
    PROPERTY_VISUAL: "Look at the incredible attention to detail in every corner of this space.",
    FEATURE_BURST: "Starting at just two crore — an unbelievable opportunity.",
    AVATAR_RETURN: "Listen, I have to be real with you — there are only three units left at this price. Once those go, this offer is gone.",
    INVENTORY_ALERT: "Prices are going up next week. This is genuinely your last chance at this rate. Do not wait.",
    CTA: "If you are serious about this, call us today or book a site visit. Link is right there in the bio.",
  };
  return map[type] || "This property is absolutely stunning. You have to see it to believe it.";
}

function buildFallbackBeats(script) {
  const words = script.split(/\s+/).filter(Boolean);
  const q = Math.floor(words.length / 4);

  return [
    {
      index: 0,
      type: "HOOK",
      duration_seconds: 5,
      visual_type: "avatar",
      veo_prompt: buildFallbackPresenterVeoPrompt("HOOK"),
      overlay_text: "Premium Property",
      narration: buildFallbackNarration("HOOK"),
      lipsync_expression: "friendly",
    },
    {
      index: 1,
      type: "AVATAR_INTRO",
      duration_seconds: 6,
      visual_type: "avatar",
      veo_prompt: buildFallbackPresenterVeoPrompt("AVATAR_INTRO"),
      overlay_text: null,
      narration: words.slice(0, Math.min(q, 28)).join(" ") || buildFallbackNarration("AVATAR_INTRO"),
      lipsync_expression: "friendly",
    },
    {
      index: 2,
      type: "AVATAR_WALK",
      duration_seconds: 5,
      visual_type: "avatar",
      veo_prompt: buildFallbackPresenterVeoPrompt("AVATAR_WALK"),
      overlay_text: null,
      narration: buildFallbackNarration("AVATAR_WALK"),
      lipsync_expression: "friendly",
    },
    {
      index: 3,
      type: "PROPERTY_VISUAL",
      duration_seconds: 5,
      visual_type: "property",
      veo_prompt: "Grand living room with marble floors and double-height ceiling, slow left-to-right tracking shot, warm ambient lighting. 9:16 vertical. No people.",
      overlay_text: null,
      narration: "This living room is absolutely massive — marble floors, double-height ceiling, and enough space to comfortably seat the whole family.",
      lipsync_expression: null,
    },
    {
      index: 4,
      type: "PROPERTY_VISUAL",
      duration_seconds: 5,
      visual_type: "property",
      veo_prompt: "Master bedroom with floor-to-ceiling windows and balcony access, slow dolly push-in toward window. Soft morning light. 9:16 vertical. No people.",
      overlay_text: null,
      narration: "The master bedroom is huge — easily fits a king bed, has a walk-in wardrobe and glass doors that open directly onto the private balcony.",
      lipsync_expression: null,
    },
    {
      index: 5,
      type: "PROPERTY_VISUAL",
      duration_seconds: 5,
      visual_type: "property",
      veo_prompt: "Modern modular kitchen with island counter and premium appliances, slow right-to-left tracking shot. Warm under-cabinet lighting. 9:16 vertical. No people.",
      overlay_text: null,
      narration: "Look at this kitchen — fully modular with an island counter, imported fittings, and enough storage to make any home chef fall in love.",
      lipsync_expression: null,
    },
    {
      index: 6,
      type: "FEATURE_BURST",
      duration_seconds: 3,
      visual_type: "property",
      veo_prompt: "Premium property finishes close-up — marble countertop, brass hardware, wide-plank flooring. Shallow depth of field. 9:16 vertical. No people.",
      overlay_text: "Starting ₹X Cr",
      narration: buildFallbackNarration("FEATURE_BURST"),
      lipsync_expression: null,
    },
    {
      index: 7,
      type: "AVATAR_RETURN",
      duration_seconds: 5,
      visual_type: "avatar",
      veo_prompt: buildFallbackPresenterVeoPrompt("AVATAR_RETURN"),
      overlay_text: null,
      narration: words.slice(q * 2, Math.min(q * 3, q * 2 + 26)).join(" ") || buildFallbackNarration("AVATAR_RETURN"),
      lipsync_expression: "friendly",
    },
    {
      index: 8,
      type: "INVENTORY_ALERT",
      duration_seconds: 4,
      visual_type: "avatar",
      veo_prompt: buildFallbackPresenterVeoPrompt("INVENTORY_ALERT"),
      overlay_text: "Only 3 Units Left",
      narration: buildFallbackNarration("INVENTORY_ALERT"),
      lipsync_expression: "professional",
    },
    {
      index: 9,
      type: "CTA",
      duration_seconds: 5,
      visual_type: "avatar",
      veo_prompt: buildFallbackPresenterVeoPrompt("CTA"),
      overlay_text: "Book Site Visit →",
      narration: words.slice(-22).join(" ") || buildFallbackNarration("CTA"),
      lipsync_expression: "professional",
    },
  ];
}

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/**
 * POST /api/ai-walkthrough/generate
 * Generates 3-4 sequential Veo videos using reference images + script parts.
 * Streams responses via SSE so the client sees each video as it completes.
 *
 * Body: multipart/form-data
 *   personImages[]  — 1 or 2 image files (the person)
 *   locationImages[] — 1 or 2 image files (surroundings / background)
 *   scriptParts     — JSON string: array of 3-4 script snippet strings
 */
export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const formData = await request.formData();

    // ── Parse person images ──────────────────────────────────────────────────
    const personFiles = formData.getAll("personImages");
    const locationFiles = formData.getAll("locationImages");
    const scriptPartsRaw = formData.get("scriptParts");

    if (!scriptPartsRaw) {
      return NextResponse.json({ error: "scriptParts is required" }, { status: 400 });
    }
    if (!personFiles.length) {
      return NextResponse.json({ error: "At least 1 person image is required" }, { status: 400 });
    }
    if (!locationFiles.length) {
      return NextResponse.json({ error: "At least 1 location image is required" }, { status: 400 });
    }

    const scriptParts = JSON.parse(scriptPartsRaw);
    if (!Array.isArray(scriptParts) || scriptParts.length < 2) {
      return NextResponse.json({ error: "scriptParts must be an array of at least 2 strings" }, { status: 400 });
    }

    // ── Convert images to base64 ─────────────────────────────────────────────
    async function fileToBase64(file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return { imageBytes: buffer.toString("base64"), mimeType: file.type || "image/jpeg" };
    }

    const personImgs = await Promise.all(personFiles.slice(0, 2).map(fileToBase64));
    const locationImgs = await Promise.all(locationFiles.slice(0, 2).map(fileToBase64));

    // ── Allocate reference slots (max 3 total) ───────────────────────────────
    // Priority: person first, then fill remaining with location
    const maxSlots = 3;
    const personSlots = Math.min(personImgs.length, maxSlots - 1); // leave at least 1 for location
    const locationSlots = Math.min(locationImgs.length, maxSlots - personSlots);

    const referenceImages = [
      ...personImgs.slice(0, personSlots).map((img) => ({
        image: img,
        referenceType: "asset",
      })),
      ...locationImgs.slice(0, locationSlots).map((img) => ({
        image: img,
        referenceType: "asset",
      })),
    ];

    // ── SSE stream setup ─────────────────────────────────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function send(data) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        async function pollOperation(operation) {
          const timeout = Date.now() + 7 * 60 * 1000; // 7 min timeout
          while (!operation.done) {
            if (Date.now() > timeout) throw new Error("Video generation timed out");
            await new Promise((r) => setTimeout(r, 10000));
            operation = await ai.operations.getVideosOperation({ operation });
          }
          return operation;
        }

        try {
          let previousVideoObj = null; // holds { videoBytes, mimeType } of last generated video

          for (let i = 0; i < scriptParts.length; i++) {
            const part = scriptParts[i];
            const isFirst = i === 0;

            send({ type: "progress", videoIndex: i, status: "generating", message: isFirst ? "Generating your walkthrough video..." : `Extending video ${i + 1} of ${scriptParts.length}...` });

            let operation;

            if (isFirst) {
              // ── First clip: use reference images ────────────────────────────
              const prompt = buildPrompt(part, true);
              operation = await ai.models.generateVideos({
                model: "veo-3.1-generate-preview",
                prompt,
                config: {
                  referenceImages,
                  aspectRatio: "9:16",
                  durationSeconds: 8,
                  personGeneration: "allow_adult",
                  resolution: "720p",
                },
              });
            } else {
              // ── Subsequent clips: extend previous video ──────────────────────
              if (!previousVideoObj) throw new Error("No previous video to extend");
              const prompt = buildPrompt(part, false);
              operation = await ai.models.generateVideos({
                model: "veo-3.1-generate-preview",
                video: previousVideoObj,
                prompt,
                config: {
                  numberOfVideos: 1,
                  resolution: "720p",
                  durationSeconds: 8,
                  personGeneration: "allow_adult", // Required when using reference images
                  referenceImages, 
                },
              });
            }

            // Poll until done
            operation = await pollOperation(operation);

            const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
            if (!generatedVideo) throw new Error(`Video ${i + 1} generation returned no video`);

            // Store for next extension
            previousVideoObj = generatedVideo;

            const fileId = generatedVideo.uri.split("/").pop();
            const videoUrl = `/api/ai-walkthrough/video-proxy?fileId=${fileId}`;

            send({
              type: "video_ready",
              videoIndex: i,
              videoUrl,
              isLast: i === scriptParts.length - 1,
            });
          }

          send({ type: "done", totalVideos: scriptParts.length });
          controller.close();
        } catch (err) {
          console.error("[AI Walkthrough] Generation error:", err);
          send({ type: "error", message: err.message || "Video generation failed" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AI Walkthrough] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to start generation" }, { status: 500 });
  }
}

/**
 * Build a cinematic Veo prompt from a script part.
 */
function buildPrompt(scriptPart, isFirst) {
  const masterBase = `High-end luxury real estate walkthrough video in 9:16 portrait. Cinematic lighting, soft natural sunlight, shallow depth of field, 4k photorealistic detail. The professional agent (as seen in reference) walks through the property with a warm, confident smile, gesturing naturally to the surroundings. They are speaking directly to the camera.`;

  if (isFirst) {
    return `${masterBase} The video opens with a smooth tracking shot. The agent looks at the camera and speaks clearly: "${scriptPart}". Everything looks crisp, premium, and inviting. High-quality synchronized audio.`;
  }
  
  return `SEAMLESS CONTINUITY: ${masterBase} The agent continues their walk and speech naturally without any jump cuts, continuing their message: "${scriptPart}". Maintain identical appearance of the person, clothing, and the high-end property interior. Smooth gimbal motion continues. High-quality synchronized audio.`;
}

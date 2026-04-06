import { NextResponse } from "next/server";

/**
 * POST /api/avatar/generate-photo
 * Generates a personalized AI avatar photo using HeyGen.
 * Body: { name, age, gender, ethnicity, orientation, pose, style, appearance }
 */
export async function POST(request) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "HEYGEN_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, age, gender, ethnicity, orientation, pose, style, appearance } = body;

    if (!name || !age || !gender || !ethnicity || !orientation || !pose || !style || !appearance) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const response = await fetch("https://api.heygen.com/v2/photo_avatar/photo/generate", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ name, age, gender, ethnicity, orientation, pose, style, appearance }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[generate-photo] HeyGen error:", data);
      return NextResponse.json(
        { error: data.message || data.error || `HeyGen error (${response.status})` },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 }
      );
    }

    const generation_id = data.data?.generation_id || data.generation_id;
    return NextResponse.json({ success: true, generation_id });
  } catch (error) {
    console.error("[generate-photo] Error:", error);
    return NextResponse.json({ error: error.message || "Photo generation failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

/**
 * POST /api/avatar/train-group
 * Initiates training for a photo avatar group.
 * Body: { group_id }
 * Returns: { success, job_id }
 */
export async function POST(request) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "HEYGEN_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { group_id } = body;

    if (!group_id) {
      return NextResponse.json({ error: "group_id is required" }, { status: 400 });
    }

    const response = await fetch("https://api.heygen.com/v2/photo_avatar/train", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ group_id }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[train-group] HeyGen error:", data);
      return NextResponse.json(
        { error: data.message || data.error || `HeyGen error (${response.status})` },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 }
      );
    }

    const result = data.data || data;
    return NextResponse.json({
      success: true,
      job_id: result.job_id || result.id,
    });
  } catch (error) {
    console.error("[train-group] Error:", error);
    return NextResponse.json({ error: error.message || "Training failed to start" }, { status: 500 });
  }
}

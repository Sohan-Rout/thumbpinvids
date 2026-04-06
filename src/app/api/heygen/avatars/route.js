import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.HEYGEN_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "HEYGEN_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.heygen.com/v2/avatars", {
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Failed to fetch avatars from Heygen" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Heygen Avatars] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch avatars" },
      { status: 500 }
    );
  }
}

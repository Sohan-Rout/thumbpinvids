import { NextResponse } from "next/server";

/**
 * GET /api/ai-walkthrough/video-proxy?fileId=...
 * Proxies the video from Gemini Files API to the browser.
 * Requires GEMINI_API_KEY.
 */
export async function GET(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("GEMINI_API_KEY is not configured", { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return new Response("fileId is required", { status: 400 });
  }

  // Handle both "files/abc" and just "abc"
  const cleanId = fileId.startsWith("files/") ? fileId.split("/")[1] : fileId;
  const url = `https://generativelanguage.googleapis.com/v1beta/files/${cleanId}?alt=media&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new Response(`Failed to fetch video from Gemini: ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "video/mp4";
    const contentLength = res.headers.get("content-length");

    // Pass through the stream
    return new Response(res.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Video Proxy] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

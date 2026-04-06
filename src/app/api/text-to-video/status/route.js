import { NextResponse } from "next/server";

const MODEL_CONFIGS = {
  heygen: {
    envKey: "HEYGEN_API_KEY",
    getStatus: async (videoId, apiKey) => {
      console.log(`[Status Check] Fetching Heygen status for video ${videoId}...`);
      
      let res = await fetch(`https://api.heygen.com/v2/video/status?video_id=${videoId}`, {
        headers: { "X-Api-Key": apiKey },
      });

      // If V2 returns 404, try V1 fallback
      if (res.status === 404) {
        console.warn(`[Status Check] V2 404 for ${videoId}, trying V1 fallback...`);
        res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
          headers: { "X-Api-Key": apiKey },
        });
      }
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error(`[Status Check] Expected JSON but got ${contentType}:`, text.substring(0, 500));
        throw new Error(`Unexpected response format from Heygen: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log(`[Status Check] Heygen response for ${videoId}:`, data.data?.status || data.status);
      
      // Handle both V1 and V2 response structures
      const status = data.data?.status || (data.status === "success" ? "completed" : data.status) || "processing";
      const video_url = data.data?.video_url || data.video_url || null;
      const thumbnail_url = data.data?.thumbnail_url || data.thumbnail_url || null;
      const error = data.error?.message || data.err || null;

      return { status, video_url, thumbnail_url, error };
    },
  },
  // Add other models if needed
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("video_id");
  const model = searchParams.get("model")?.toLowerCase();

  if (!videoId || !model) {
    return NextResponse.json({ error: "Missing video_id or model" }, { status: 400 });
  }

  const config = MODEL_CONFIGS[model];
  if (!config) {
    return NextResponse.json({ error: `Status check not implemented for ${model}` }, { status: 501 });
  }

  const apiKey = process.env[config.envKey];
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const result = await config.getStatus(videoId, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`[Status Check] ${model} error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import Asset from "@/models/Asset";
import dbConnect from "@/lib/mongodb";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * POST /api/real-estate-video/save-combined
 * Receives a combined video blob from the client-side FFmpeg WASM combiner,
 * saves it to disk, and creates an Asset Library entry.
 * Input: FormData with video (file)
 * Output: { url, assetId }
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const videoFile = formData.get("video");

    if (!videoFile || !(videoFile instanceof File)) {
      return NextResponse.json(
        { error: "video file is required" },
        { status: 400 }
      );
    }

    // Save to disk
    const timestamp = Date.now();
    const localFileName = `combined-walkthrough-${timestamp}.mp4`;
    const outputDir = path.join(process.cwd(), "public", "generated-videos");
    await mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, localFileName);

    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(outputPath, buffer);

    const videoUrl = `/generated-videos/${localFileName}`;
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    console.log(`[CombinedVideo] Saved: ${outputPath} (${sizeMB} MB)`);

    // Create Asset Library entry
    await dbConnect();
    const asset = await Asset.create({
      userId: session.user.id,
      name: `Combined Walkthrough - ${new Date().toLocaleDateString()}`,
      url: videoUrl,
      type: "clip",
      metadata: {
        localPath: videoUrl,
        source: "ffmpeg-wasm",
        context: "real-estate-video-combined",
        fileSize: buffer.length,
      },
    });

    console.log(`[CombinedVideo] Asset created: ${asset._id}`);

    return NextResponse.json({
      url: videoUrl,
      assetId: asset._id.toString(),
    });
  } catch (err) {
    console.error("[CombinedVideo] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save combined video" },
      { status: 500 }
    );
  }
}

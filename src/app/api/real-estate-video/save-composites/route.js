import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Asset from "@/models/Asset";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * POST /api/real-estate-video/save-composites
 * Saves composite data-URLs as local files + creates Asset records.
 * Input: JSON { composites: [{ dataUrl, name }], selectedIndex }
 * Saves all EXCEPT the selected one (that one goes through the pipeline).
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { composites, selectedIndex } = await request.json();

    if (!composites || !Array.isArray(composites) || composites.length === 0) {
      return NextResponse.json({ error: "No composites to save" }, { status: 400 });
    }

    await dbConnect();
    const outputDir = path.join(process.cwd(), "public", "composites");
    await mkdir(outputDir, { recursive: true });

    const saved = [];

    for (let i = 0; i < composites.length; i++) {
      // Skip the selected one — it's being used in the pipeline
      if (i === selectedIndex) continue;

      const { dataUrl, name } = composites[i];
      if (!dataUrl) continue;

      // Extract base64 from data URL
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) continue;

      const mimeType = matches[1];
      const base64Data = matches[2];
      const ext = mimeType.includes("png") ? "png" : "jpeg";
      const timestamp = Date.now();
      const fileName = `composite-${timestamp}-${i}.${ext}`;
      const filePath = path.join(outputDir, fileName);

      await writeFile(filePath, Buffer.from(base64Data, "base64"));

      const localUrl = `/composites/${fileName}`;

      const asset = await Asset.create({
        userId: session.user.id,
        name: name || `RE Composite ${i + 1}`,
        url: localUrl,
        type: "composite",
        metadata: {
          source: "real-estate-pipeline",
          originalIndex: i,
        },
      });

      saved.push({ id: asset._id, url: localUrl, name: asset.name });
    }

    return NextResponse.json({
      success: true,
      saved,
      message: `${saved.length} composite(s) saved to library`,
    });
  } catch (error) {
    console.error("[SaveComposites] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

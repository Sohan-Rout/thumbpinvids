import { NextResponse } from "next/server";

export async function POST(request) {
  const apiKey = process.env.HEYGEN_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "HEYGEN_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Step 1: Upload Asset to Heygen
    console.log("[Heygen Upload] Uploading asset...");
    const fileBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch("https://upload.heygen.com/v1/asset", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": file.type,
      },
      body: fileBuffer,
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { error: uploadData.error?.message || "Failed to upload asset to Heygen" },
        { status: uploadResponse.status }
      );
    }

    const assetId = uploadData.data?.id || uploadData.data?.asset_id || uploadData.id;
    if (!assetId) {
      return NextResponse.json({ error: "Failed to get asset ID from Heygen" }, { status: 500 });
    }

    console.log(`[Heygen Upload] Asset uploaded: ${assetId}. Creating talking photo...`);

    // Step 2: Create Photo Avatar (Talking Photo)
    const avatarResponse = await fetch("https://api.heygen.com/v2/photo_avatar", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asset_id: assetId,
      }),
    });

    const avatarData = await avatarResponse.json();

    if (!avatarResponse.ok) {
      return NextResponse.json(
        { error: avatarData.error?.message || "Failed to create talking photo" },
        { status: avatarResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      talking_photo_id: avatarData.data?.talking_photo_id || avatarData.id,
      data: avatarData,
    });
  } catch (error) {
    console.error("[Heygen Upload] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process upload" },
      { status: 500 }
    );
  }
}

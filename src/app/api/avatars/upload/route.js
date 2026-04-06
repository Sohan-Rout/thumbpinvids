import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request) {
  try {
    // 1. Authenticate user
    const supabaseAuth = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file");
    const name = formData.get("name") || "Custom Avatar";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file uploaded. Please select an image." },
        { status: 400 }
      );
    }

    // 3. Validate file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // 4. Upload to Supabase Storage
    const supabaseAdmin = createAdminClient();
    const fileExt = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const fileName = `custom-avatars/${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Avatar Upload] Storage error:", uploadError);

      // If bucket doesn't exist, try the videos bucket as fallback
      if (uploadError.message?.includes("not found") || uploadError.statusCode === "404") {
        const { error: fallbackError } = await supabaseAdmin.storage
          .from("videos")
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (fallbackError) {
          console.error("[Avatar Upload] Fallback storage error:", fallbackError);
          return NextResponse.json(
            { error: "Failed to upload avatar. Please try again." },
            { status: 500 }
          );
        }

        // Get public URL from fallback bucket
        const { data: urlData } = supabaseAdmin.storage
          .from("videos")
          .getPublicUrl(fileName);

        const imageUrl = urlData.publicUrl;

        // Insert into avatars_library
        const avatar = await insertAvatarRecord(supabaseAdmin, user.id, name, imageUrl);
        return NextResponse.json({ success: true, avatar });
      }

      return NextResponse.json(
        { error: "Failed to upload avatar. Please try again." },
        { status: 500 }
      );
    }

    // 5. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // 6. Insert into avatars_library table
    const avatar = await insertAvatarRecord(supabaseAdmin, user.id, name, imageUrl);

    return NextResponse.json({ success: true, avatar });
  } catch (error) {
    console.error("[Avatar Upload] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

async function insertAvatarRecord(supabaseAdmin, userId, name, imageUrl) {
  const { data: avatar, error: insertError } = await supabaseAdmin
    .from("avatars_library")
    .insert({
      name: name.trim().substring(0, 50),
      image_url: imageUrl,
      ethnicity: "Custom Upload",
      user_id: userId,
      is_custom: true,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("[Avatar Upload] DB insert error:", insertError);
    throw new Error("Failed to save avatar record");
  }

  return avatar;
}

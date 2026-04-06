import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request) {
  try {
    // 1. Authenticate user
    const supabaseAuth = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    // 2. Parse body
    const { avatar_id } = await request.json();

    if (!avatar_id) {
      return NextResponse.json(
        { error: "Missing avatar_id" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 3. Verify ownership — only delete custom avatars owned by this user
    const { data: avatar, error: fetchError } = await supabaseAdmin
      .from("avatars_library")
      .select("*")
      .eq("id", avatar_id)
      .eq("user_id", user.id)
      .eq("is_custom", true)
      .single();

    if (fetchError || !avatar) {
      return NextResponse.json(
        { error: "Avatar not found or you don't have permission to delete it." },
        { status: 404 }
      );
    }

    // 4. Delete from storage (best effort)
    if (avatar.image_url) {
      try {
        const url = new URL(avatar.image_url);
        // Extract the path after /storage/v1/object/public/{bucket}/
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
        if (pathMatch) {
          const filePath = pathMatch[1];
          // Try both buckets
          await supabaseAdmin.storage.from("avatars").remove([filePath]);
          await supabaseAdmin.storage.from("videos").remove([filePath]);
        }
      } catch (storageErr) {
        console.warn("[Avatar Delete] Storage cleanup failed:", storageErr.message);
        // Continue anyway — DB record deletion is more important
      }
    }

    // 5. Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from("avatars_library")
      .delete()
      .eq("id", avatar_id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[Avatar Delete] DB error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete avatar." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Avatar Delete] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

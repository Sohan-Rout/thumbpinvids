"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Hook to manage all user assets (avatars, product images, backgrounds, etc.)
 * Interacts with MongoDB/local storage via /api/assets
 */
export function useAssets(typeFilter = null) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      let url = "/api/assets";
      if (typeFilter) url += `?type=${typeFilter}`;

      const res = await fetch(url);
      const data = await res.json();

      console.log("[useAssets] GET /api/assets →", res.status, data);

      if (!res.ok) {
        setFetchError(`${res.status}: ${data.error || "Failed to fetch assets"}`);
        return;
      }

      setFetchError(null);
      const fetchedAssets = (data.assets || []).map(a => ({
        id: a._id,
        name: a.name,
        url: a.url,
        type: a.type,
        is_custom: true,
        metadata: a.metadata || {},
        image_url: a.url,
        ethnicity: a.metadata?.ethnicity || "Custom",
      }));

      setAssets(fetchedAssets);
    } catch (error) {
      console.warn("[useAssets] Fetch failed:", error.message);
      setFetchError(error.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** 
   * Upload any file as an asset 
   */
  async function uploadAsset(file, name, type = "general", category = "general") {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("type", type);
      formData.append("category", category);

      const uploadRes = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      // Second, save the asset reference in MongoDB (upload API does this too for avatars, but let's be explicit if needed)
      // Actually, my src/app/api/avatars/upload/route.js already saves to MongoDB if type is avatar.
      // Let's check that route to see if it handles other types.

      await fetchData();
      return { success: true, asset: uploadData.asset };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setUploading(false);
    }
  }

  async function deleteAsset(id) {
    try {
      const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchData();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return {
    assets,
    avatars: assets.filter(a => a.type === "avatar" || a.type === "presenter"),
    customAvatars: assets.filter(a => a.type === "avatar" || a.type === "presenter"),
    libraryAvatars: [],
    productImages: assets.filter(a => a.type === "product" || a.type === "image"),
    backgrounds: assets.filter(a => a.type === "background"),
    composites: assets.filter(a => a.type === "composite"),
    videos: assets.filter(a => a.type === "video" || a.type === "clip"),
    voices: [],
    loading,
    uploading,
    fetchError,
    uploadAsset,
    deleteAsset,
    refetch: fetchData,
  };
}

/** 
 * Legacy wrapper for backward compatibility 
 */
export function useAvatarsAndVoices() {
  const { avatars, customAvatars, loading, uploading, uploadAsset, deleteAsset, refetch } = useAssets("avatar");
  
  return {
    avatars,
    customAvatars,
    libraryAvatars: [],
    voices: [],
    loading,
    uploading,
    uploadAvatar: (file, name) => uploadAsset(file, name, "avatar"),
    deleteAvatar: deleteAsset,
    refetch,
  };
}

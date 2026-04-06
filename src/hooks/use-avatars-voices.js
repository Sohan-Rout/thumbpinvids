"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockAvatars, mockVoices } from "@/lib/mock-data";

/**
 * Hook to fetch avatars and voices from Supabase.
 * Falls back to mock data if Supabase is not configured or fetch fails.
 * Includes upload and delete functionality for custom avatars.
 */
export function useAvatarsAndVoices() {
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();

      // Fetch avatars
      const { data: avatarData, error: avatarError } = await supabase
        .from("avatars_library")
        .select("*")
        .order("is_custom", { ascending: false })
        .order("name");

      if (avatarError) throw avatarError;

      // Fetch voices
      const { data: voiceData, error: voiceError } = await supabase
        .from("voices")
        .select("*")
        .order("name");

      if (voiceError) throw voiceError;

      setAvatars(avatarData?.length ? avatarData : mockAvatars);
      setVoices(voiceData?.length ? voiceData : mockVoices);
    } catch (error) {
      console.warn("[useAvatarsAndVoices] Falling back to mock data:", error.message);
      setAvatars(mockAvatars);
      setVoices(mockVoices);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Upload a custom avatar image
   * @param {File} file - The image file to upload
   * @param {string} name - Display name for the avatar
   * @returns {Promise<{success: boolean, avatar?: object, error?: string}>}
   */
  async function uploadAvatar(file, name = "Custom Avatar") {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);

      const response = await fetch("/api/avatars/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Upload failed" };
      }

      // Refresh avatars list
      await fetchData();

      return { success: true, avatar: data.avatar };
    } catch (error) {
      return { success: false, error: error.message || "Upload failed" };
    } finally {
      setUploading(false);
    }
  }

  /**
   * Delete a custom avatar
   * @param {string} avatarId - ID of the avatar to delete
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function deleteAvatar(avatarId) {
    try {
      const response = await fetch("/api/avatars/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_id: avatarId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Delete failed" };
      }

      // Refresh avatars list
      await fetchData();

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || "Delete failed" };
    }
  }

  // Helper: separate custom and library avatars
  const customAvatars = avatars.filter((a) => a.is_custom);
  const libraryAvatars = avatars.filter((a) => !a.is_custom);

  return {
    avatars,
    customAvatars,
    libraryAvatars,
    voices,
    loading,
    uploading,
    uploadAvatar,
    deleteAvatar,
    refetch: fetchData,
  };
}

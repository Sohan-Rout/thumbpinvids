"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeVideo(videoId) {
  const [video, setVideo] = useState(null);

  useEffect(() => {
    if (!videoId) return;

    const supabase = createClient();

    // Initial fetch
    supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .single()
      .then(({ data }) => {
        if (data) setVideo(data);
      });

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`video-${videoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "videos",
          filter: `id=eq.${videoId}`,
        },
        (payload) => {
          setVideo(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  return { video };
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockUser } from "@/lib/mock-data";

export function useUser() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          setUser(authUser);

          // Fetch user profile with credits
          const { data: profileData } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .single();

          setProfile(profileData || { ...mockUser, id: authUser.id, email: authUser.email });
        } else {
          // Fallback to mock in development
          setUser({ id: mockUser.id, email: mockUser.email });
          setProfile(mockUser);
        }
      } catch {
        // Use mock data when Supabase is not configured
        setUser({ id: mockUser.id, email: mockUser.email });
        setProfile(mockUser);
      } finally {
        setLoading(false);
      }
    }

    getUser();
  }, []);

  return { user, profile, loading, credits: profile?.credits ?? 0 };
}

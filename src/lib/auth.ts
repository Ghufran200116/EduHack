import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "student" | "educator";

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  institution: string | null;
  subject: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async (u: User | null) => {
      if (!u) {
        if (active) { setUser(null); setProfile(null); setLoading(false); }
        return;
      }
      if (active) setUser(u);
      const { data } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
      if (active) {
        setProfile(data as ProfileRow | null);
        setLoading(false);
      }
    };

    supabase.auth.getUser().then(({ data }) => load(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user ?? null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { user, profile, loading };
}

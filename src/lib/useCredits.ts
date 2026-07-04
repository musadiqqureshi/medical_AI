"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

/** Reads the logged-in user's remaining credits from the profiles table.
 *  Returns null when Supabase isn't configured or the user is signed out. */
export function useCredits() {
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("free");

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setCredits(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("credits, plan")
      .eq("id", uid)
      .single();
    if (data) {
      setCredits(data.credits as number);
      setPlan((data.plan as string) || "free");
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { credits, plan, refresh };
}

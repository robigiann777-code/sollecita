"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

// Un solo client per tutta l'app (lato browser). La sessione viene salvata
// nei cookie automaticamente, così l'utente resta loggato.
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!cached) {
    cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return cached;
}

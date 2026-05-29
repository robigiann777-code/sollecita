import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

// Client Supabase lato server, da usare SOLO nelle API route.
// Legge la sessione dai cookie del browser, così possiamo capire chi è
// l'utente connesso (e bloccare chi non lo è).
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // In alcuni contesti non è possibile scrivere i cookie: lo ignoriamo,
          // la sessione viene comunque letta correttamente.
        }
      },
    },
  });
}

import { getSupabaseServerClient } from "@/lib/supabase/server";

// Verifica GRATUITA di una Partita IVA tramite il servizio ufficiale europeo VIES.
// Dice se la P.IVA esiste/è valida e, per l'Italia, restituisce ragione sociale
// e indirizzo. Non costa nulla e non richiede chiavi. Va chiamata dal server
// perché VIES non permette le chiamate dirette dal browser.

interface Body {
  vat?: string;
}

interface ViesResponse {
  isValid?: boolean;
  valid?: boolean;
  name?: string;
  address?: string;
  userError?: string;
}

// Da una P.IVA scritta in qualsiasi modo ("IT 1234 5671007", "12485671007")
// ricava la sigla nazione (2 lettere) e il numero.
function splitVat(raw: string): { country: string; number: string } {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/^[A-Z]{2}/.test(cleaned)) {
    return { country: cleaned.slice(0, 2), number: cleaned.slice(2) };
  }
  return { country: "IT", number: cleaned };
}

export async function POST(request: Request) {
  // Solo utenti connessi: così nessun estraneo può usare l'API.
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "unauthorized", message: "Devi essere connesso." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json(
      { ok: false, error: "bad_request", message: "Richiesta non valida." },
      { status: 400 },
    );
  }

  const raw = body.vat?.trim();
  if (!raw) {
    return Response.json(
      { ok: false, error: "bad_request", message: "Inserisci una Partita IVA." },
      { status: 400 },
    );
  }

  const { country, number } = splitVat(raw);
  if (number.length < 4) {
    return Response.json({
      ok: true,
      valid: false,
      name: null,
      address: null,
      country,
      number,
      message: "La Partita IVA inserita è troppo corta per essere valida.",
    });
  }

  // VIES a volte è lento o offline: mettiamo un tempo massimo di attesa.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country}/vat/${number}`,
      { signal: controller.signal, headers: { accept: "application/json" } },
    );
    clearTimeout(timer);

    if (!res.ok) {
      return Response.json({
        ok: false,
        error: "vies_unavailable",
        message:
          "Il servizio europeo VIES non risponde adesso. Riprova tra qualche minuto.",
      });
    }

    const data = (await res.json()) as ViesResponse;
    const valid = data.isValid ?? data.valid ?? false;
    const name =
      data.name && data.name.trim() && data.name.trim() !== "---"
        ? data.name.trim()
        : null;
    const address =
      data.address && data.address.trim() && data.address.trim() !== "---"
        ? data.address.trim()
        : null;

    return Response.json({
      ok: true,
      valid,
      name,
      address,
      country,
      number,
      source: "VIES",
    });
  } catch {
    clearTimeout(timer);
    return Response.json({
      ok: false,
      error: "vies_unavailable",
      message:
        "Il servizio europeo VIES non risponde adesso (o ci ha messo troppo). Riprova tra qualche minuto.",
    });
  }
}

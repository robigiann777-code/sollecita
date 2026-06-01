import { getSupabaseServerClient } from "@/lib/supabase/server";

// Affidabilità di un'azienda tramite openapi.it (servizio a PAGAMENTO).
// Richiede la variabile d'ambiente OPENAPI_TOKEN (il token del proprio account
// openapi.it, con credito ricaricato). Se manca, NON va in errore: risponde con
// un messaggio chiaro, esattamente come l'invio email senza chiave.
//
// Questa route fa UNA sola chiamata a pagamento per volta (dati camerali
// dell'azienda: stato attività, ateco, PEC, indirizzo, bilancio). Non viene mai
// chiamata in automatico su liste: ogni controllo è un clic deliberato.

interface Body {
  vat?: string;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

// Cerca il primo valore utile tra più possibili nomi di campo (gli archivi
// possono usare nomi diversi: companyName, denominazione, ragioneSociale...).
function pick(obj: unknown, keys: string[]): string | null {
  const r = asRecord(obj);
  if (!r) return null;
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  }
  return null;
}

// Toglie spazi/punti e l'eventuale prefisso "IT": resta il solo numero italiano.
function onlyDigits(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return cleaned.startsWith("IT") ? cleaned.slice(2) : cleaned;
}

export async function POST(request: Request) {
  // 1) Solo utenti connessi.
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

  // 2) Senza token del servizio rispondiamo con un messaggio chiaro (come email/PEC).
  const token = process.env.OPENAPI_TOKEN;
  if (!token) {
    return Response.json({
      ok: false,
      error: "missing_key",
      message:
        "Affidabilità non ancora attiva: manca la chiave del servizio openapi.it. Apri un account, ricarica qualche euro e comunicami il token per attivarla.",
    });
  }

  // 3) Leggiamo la richiesta.
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json(
      { ok: false, error: "bad_request", message: "Richiesta non valida." },
      { status: 400 },
    );
  }

  const piva = onlyDigits(body.vat?.trim() ?? "");
  if (piva.length < 8) {
    return Response.json(
      {
        ok: false,
        error: "bad_request",
        message: "Inserisci una Partita IVA italiana valida.",
      },
      { status: 400 },
    );
  }

  // 4) Chiamata a pagamento (un tempo massimo di attesa per sicurezza).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`https://company.openapi.com/IT-advanced/${piva}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    });
    clearTimeout(timer);

    if (res.status === 401 || res.status === 403) {
      return Response.json({
        ok: false,
        error: "bad_key",
        message:
          "La chiave openapi.it non è valida, è scaduta o non ha i permessi per questo servizio. Controlla il token.",
      });
    }
    if (res.status === 402) {
      return Response.json({
        ok: false,
        error: "no_credit",
        message:
          "Credito openapi.it esaurito. Ricarica il saldo del tuo account per continuare.",
      });
    }
    if (res.status === 404) {
      return Response.json({
        ok: true,
        found: false,
        message:
          "Nessuna azienda trovata con questa Partita IVA negli archivi camerali.",
      });
    }
    if (!res.ok) {
      return Response.json({
        ok: false,
        error: "provider_error",
        message: `Il servizio openapi.it ha risposto con un errore (codice ${res.status}). Riprova più tardi.`,
      });
    }

    const json: unknown = await res.json();
    const jr = asRecord(json);
    const payload = jr && "data" in jr ? jr.data : json;
    const company = Array.isArray(payload) ? payload[0] : payload;

    const summary = {
      ragioneSociale: pick(company, [
        "companyName",
        "denominazione",
        "ragioneSociale",
        "ragione_sociale",
        "name",
      ]),
      stato: pick(company, [
        "companyStatus",
        "statoAttivita",
        "stato_attivita",
        "status",
        "stato",
      ]),
      ateco:
        pick(asRecord(company)?.ateco, ["code", "ateco", "description", "descrizione"]) ??
        pick(company, ["ateco", "atecoCode"]),
      pec: pick(company, ["pec", "pecEmail", "pec_email"]),
      indirizzo:
        pick(asRecord(company)?.address, [
          "registeredOffice",
          "fullAddress",
          "indirizzo",
          "address",
          "via",
        ]) ?? pick(company, ["indirizzo", "address", "registeredOffice"]),
      capitaleSociale: pick(company, [
        "shareCapital",
        "capitaleSociale",
        "capitale_sociale",
      ]),
      dataIscrizione: pick(company, [
        "registrationDate",
        "dataIscrizione",
        "startDate",
        "creationDate",
      ]),
    };

    return Response.json({ ok: true, found: true, summary, raw: company });
  } catch {
    clearTimeout(timer);
    return Response.json({
      ok: false,
      error: "provider_unavailable",
      message:
        "Il servizio openapi.it non risponde adesso. Riprova tra qualche minuto.",
    });
  }
}

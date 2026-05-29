import { Resend } from "resend";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// API che invia davvero un'email tramite il servizio Resend.
// Funziona solo se:
//   1. chi chiama è un utente connesso (così nessun estraneo può usarla);
//   2. è stata configurata la chiave RESEND_API_KEY tra le variabili d'ambiente.
// Se la chiave manca, NON va in errore: risponde in modo chiaro così l'app
// continua a funzionare e mostra un messaggio comprensibile.

interface SendBody {
  to?: string;
  subject?: string;
  text?: string;
  replyTo?: string;
}

export async function POST(request: Request) {
  // 1) Solo utenti connessi possono inviare.
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "unauthorized", message: "Devi essere connesso per inviare email." },
      { status: 401 },
    );
  }

  // 2) Senza chiave del servizio email rispondiamo con un messaggio chiaro.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({
      ok: false,
      error: "missing_key",
      message:
        "Invio email non ancora attivo: manca la chiave del servizio email. Apri un account gratuito su Resend e comunicami la chiave per attivarlo.",
    });
  }

  // 3) Leggiamo e controlliamo i dati della richiesta.
  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return Response.json(
      { ok: false, error: "bad_request", message: "Richiesta non valida." },
      { status: 400 },
    );
  }

  const to = body.to?.trim();
  const subject = body.subject?.trim();
  const text = body.text;
  if (!to || !subject || !text) {
    return Response.json(
      {
        ok: false,
        error: "bad_request",
        message: "Servono destinatario, oggetto e testo del messaggio.",
      },
      { status: 400 },
    );
  }

  // 4) Inviamo. "from" è configurabile; se non impostato usiamo l'indirizzo di
  // test di Resend (utile per le prove, prima di verificare il proprio dominio).
  const from = process.env.RESEND_FROM || "Sollecita <onboarding@resend.dev>";
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
    ...(body.replyTo ? { replyTo: body.replyTo } : {}),
  });

  if (error) {
    return Response.json(
      {
        ok: false,
        error: "send_failed",
        message: error.message || "Invio non riuscito. Riprova.",
      },
      { status: 502 },
    );
  }

  return Response.json({ ok: true, id: data?.id ?? null });
}

import nodemailer from "nodemailer";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// La PEC è come un'email, ma con valore legale: si invia via SMTP attraverso
// il proprio gestore (es. Aruba). Servono le credenziali della casella PEC,
// messe tra le variabili d'ambiente:
//   PEC_SMTP_HOST  (es. smtps.pec.aruba.it)
//   PEC_SMTP_PORT  (es. 465)
//   PEC_SMTP_USER  (l'indirizzo PEC)
//   PEC_SMTP_PASS  (la password della casella PEC)
//   PEC_FROM       (facoltativo; di norma uguale a PEC_SMTP_USER)
// Se mancano, l'app NON va in errore: risponde con un messaggio chiaro.

export const runtime = "nodejs";

interface PecBody {
  to?: string;
  subject?: string;
  text?: string;
}

export async function POST(request: Request) {
  // 1) Solo utenti connessi possono inviare.
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "unauthorized", message: "Devi essere connesso per inviare la PEC." },
      { status: 401 },
    );
  }

  // 2) Senza credenziali della casella PEC rispondiamo con un messaggio chiaro.
  const host = process.env.PEC_SMTP_HOST;
  const smtpUser = process.env.PEC_SMTP_USER;
  const pass = process.env.PEC_SMTP_PASS;
  if (!host || !smtpUser || !pass) {
    return Response.json({
      ok: false,
      error: "missing_config",
      message:
        "Invio PEC non ancora attivo: mancano i dati della casella PEC (indirizzo e password). Aprila con Aruba o un altro gestore e comunicami i dati per attivarlo.",
    });
  }

  // 3) Leggiamo e controlliamo i dati della richiesta.
  let body: PecBody;
  try {
    body = (await request.json()) as PecBody;
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

  // 4) Inviamo via SMTP. La porta 465 usa SSL; le altre lo STARTTLS.
  const port = Number(process.env.PEC_SMTP_PORT) || 465;
  const from = process.env.PEC_FROM || smtpUser;
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass },
    });
    const info = await transporter.sendMail({ from, to, subject, text });
    return Response.json({ ok: true, id: info.messageId ?? null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invio PEC non riuscito. Riprova.";
    return Response.json(
      { ok: false, error: "send_failed", message },
      { status: 502 },
    );
  }
}

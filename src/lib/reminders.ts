import { formatDate, formatEuro, daysBetween } from "./format";
import type {
  Invoice,
  InvoiceStatus,
  ReminderChannel,
  ReminderStepKey,
} from "./types";

export interface ReminderStep {
  key: ReminderStepKey;
  order: number;
  label: string;
  // Giorni rispetto alla scadenza: negativo = prima, positivo = dopo.
  offsetDays: number;
  channels: ReminderChannel[];
  tone: string;
  optional: boolean;
  subject: string;
}

// La "scala di sollecito conforme": progressiva, sempre legale, mai minacciosa.
export const REMINDER_LADDER: ReminderStep[] = [
  {
    key: "promemoria",
    order: 1,
    label: "Promemoria",
    offsetDays: -4,
    channels: ["email"],
    tone: "Gentile",
    optional: false,
    subject: "Promemoria: la fattura {numero} scade a breve",
  },
  {
    key: "sollecito_1",
    order: 2,
    label: "1° sollecito",
    offsetDays: 1,
    channels: ["email", "sms"],
    tone: "Cordiale ma chiaro",
    optional: false,
    subject: "Fattura {numero} scaduta — sollecito di pagamento",
  },
  {
    key: "sollecito_2",
    order: 3,
    label: "2° sollecito",
    offsetDays: 10,
    channels: ["email", "sms"],
    tone: "Fermo",
    optional: false,
    subject: "Secondo sollecito — fattura {numero} ancora non pagata",
  },
  {
    key: "messa_in_mora",
    order: 4,
    label: "Messa in mora",
    offsetDays: 30,
    channels: ["pec"],
    tone: "Formale, valore legale",
    optional: false,
    subject: "Diffida e messa in mora — fattura {numero}",
  },
  {
    key: "raccomandata",
    order: 5,
    label: "Raccomandata A/R",
    offsetDays: 45,
    channels: ["posta"],
    tone: "Prova cartacea",
    optional: true,
    subject: "Raccomandata A/R — fattura {numero}",
  },
  {
    key: "avvocato",
    order: 6,
    label: "Passaggio all'avvocato",
    offsetDays: 60,
    channels: ["avvocato"],
    tone: "Ultima spiaggia",
    optional: true,
    subject: "Esportazione fascicolo per decreto ingiuntivo",
  },
];

// Regole di sicurezza integrate e non disattivabili (conformita' di legge).
export const SAFETY_RULES = {
  orarioInvioInizio: 8, // niente invii prima delle 8
  orarioInvioFine: 21, // niente invii dopo le 21
  maxContattiSettimana: 3,
  note: "Mai contatti assillanti (art. 660 c.p.), mai minacce, sempre una via per rispondere. WhatsApp escluso.",
} as const;

export const CHANNEL_LABEL: Record<ReminderChannel, string> = {
  email: "Email",
  sms: "SMS",
  pec: "PEC",
  posta: "Posta A/R",
  avvocato: "Avvocato",
};

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  pagata: "Pagata",
  sospesa: "Sospesa",
  in_regola: "In regola",
  in_scadenza: "In scadenza",
  scaduta: "Scaduta",
};

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

// Data prevista di invio di uno step (scadenza + offset).
export function getStepDate(invoice: Invoice, step: ReminderStep): Date {
  const due = parseDate(invoice.dueDate);
  const d = new Date(due);
  d.setDate(d.getDate() + step.offsetDays);
  return d;
}

export function computeStatus(invoice: Invoice, today: Date = new Date()): InvoiceStatus {
  if (invoice.paidAt) return "pagata";
  if (invoice.suspended) return "sospesa";
  const daysToDue = daysBetween(today, parseDate(invoice.dueDate));
  if (daysToDue < 0) return "scaduta";
  if (daysToDue <= 7) return "in_scadenza";
  return "in_regola";
}

export function isStepSent(invoice: Invoice, key: ReminderStepKey): boolean {
  return invoice.reminders.some((r) => r.stepKey === key);
}

// Il prossimo sollecito che andrebbe inviato oggi (stop automatico se pagata/sospesa).
export function getNextDueStep(
  invoice: Invoice,
  today: Date = new Date(),
): ReminderStep | null {
  if (invoice.paidAt || invoice.suspended) return null;
  for (const step of REMINDER_LADDER) {
    if (step.optional) continue;
    if (isStepSent(invoice, step.key)) continue;
    if (getStepDate(invoice, step) <= today) return step;
  }
  return null;
}

// Genera il testo del messaggio per uno step, sempre fermo ma corretto.
export function buildMessage(invoice: Invoice, step: ReminderStep): string {
  const importo = formatEuro(invoice.amount);
  const scadenza = formatDate(invoice.dueDate);
  const cliente = invoice.clientName;
  const numero = invoice.number;

  switch (step.key) {
    case "promemoria":
      return `Gentile ${cliente},\nle ricordiamo che la fattura ${numero} di ${importo} scade il ${scadenza}. La invitiamo a procedere al pagamento entro la scadenza. Grazie e cordiali saluti.`;
    case "sollecito_1":
      return `Gentile ${cliente},\nla fattura ${numero} di ${importo}, con scadenza ${scadenza}, risulta ancora non pagata. La preghiamo di provvedere al saldo al piu' presto. Se ha gia' pagato, ignori questo messaggio.`;
    case "sollecito_2":
      return `Gentile ${cliente},\nnonostante i precedenti solleciti, la fattura ${numero} di ${importo} (scaduta il ${scadenza}) risulta non pagata. La invitiamo al saldo immediato; in mancanza saranno applicati gli interessi di mora previsti dalla legge.`;
    case "messa_in_mora":
      return `Egregio ${cliente},\ncon la presente, avente valore di formale messa in mora, la diffidiamo al pagamento della fattura ${numero} di ${importo}, scaduta il ${scadenza}, entro 7 giorni dal ricevimento. In difetto adiremo le vie legali per il recupero del credito, oltre interessi e spese.`;
    case "raccomandata":
      return `Comunicazione cartacea (raccomandata A/R) relativa alla fattura ${numero} di ${importo}, scaduta il ${scadenza}: ulteriore diffida al pagamento a comprova della richiesta.`;
    case "avvocato":
      return `Fascicolo pronto per il legale: fattura ${numero} di ${importo}, scaduta il ${scadenza}, con lo storico completo dei solleciti inviati a ${cliente} per l'eventuale decreto ingiuntivo.`;
    default:
      return "";
  }
}

export function renderSubject(invoice: Invoice, step: ReminderStep): string {
  return step.subject.replace("{numero}", invoice.number);
}

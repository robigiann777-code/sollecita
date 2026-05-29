export type ReminderChannel =
  | "email"
  | "sms"
  | "chiamata"
  | "pec"
  | "posta"
  | "avvocato";

export type ReminderStepKey =
  | "promemoria"
  | "sollecito_1"
  | "sollecito_2"
  | "telefonata"
  | "messa_in_mora"
  | "raccomandata"
  | "avvocato";

export interface ReminderLog {
  id: string;
  stepKey: ReminderStepKey;
  channel: ReminderChannel;
  sentAt: string; // ISO datetime
}

export interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  number: string;
  amount: number; // in euro
  issueDate: string; // ISO date (yyyy-mm-dd)
  dueDate: string; // ISO date (yyyy-mm-dd)
  paidAt: string | null; // ISO datetime, null = non pagata
  suspended: boolean;
  promisedDate?: string | null; // ISO date: il cliente ha promesso di pagare entro questa data
  notes?: string;
  reminders: ReminderLog[];
  createdAt: string; // ISO datetime
}

// Profilo dell'azienda che usa Sollecita: compare nei messaggi e nell'estratto conto.
export interface CompanyProfile {
  name: string;
  vat: string; // P.IVA / C.F.
  address: string;
  email: string;
  phone: string;
  iban: string;
}

// Stato calcolato della fattura, usato per badge e filtri.
export type InvoiceStatus =
  | "pagata"
  | "sospesa"
  | "in_regola"
  | "in_scadenza"
  | "scaduta";

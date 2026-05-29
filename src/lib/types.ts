export type ReminderChannel = "email" | "sms" | "pec" | "posta" | "avvocato";

export type ReminderStepKey =
  | "promemoria"
  | "sollecito_1"
  | "sollecito_2"
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
  notes?: string;
  reminders: ReminderLog[];
  createdAt: string; // ISO datetime
}

// Stato calcolato della fattura, usato per badge e filtri.
export type InvoiceStatus =
  | "pagata"
  | "sospesa"
  | "in_regola"
  | "in_scadenza"
  | "scaduta";

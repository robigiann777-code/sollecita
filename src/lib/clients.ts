import { computeStatus } from "./reminders";
import { daysBetween } from "./format";
import type { Invoice } from "./types";

export type RiskLevel = "basso" | "medio" | "alto";

export interface ClientStats {
  name: string;
  email: string;
  phone?: string;
  vat?: string; // Partita IVA (presa dalla prima fattura che ce l'ha)
  invoices: Invoice[];
  totalCount: number;
  paidCount: number;
  openCount: number; // non pagate
  overdueCount: number; // scadute
  totalAmount: number; // valore di tutte le fatture
  outstanding: number; // ancora da incassare (non pagate)
  overdueAmount: number; // importo scaduto
  remindersSent: number;
  avgDaysToPay: number | null; // media giorni tra emissione e pagamento
  maxDaysLate: number; // giorni di ritardo della fattura piu' vecchia non pagata
  riskScore: number; // 0-100
  risk: RiskLevel;
}

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function aggregateClients(
  invoices: Invoice[],
  today: Date = new Date(),
): ClientStats[] {
  const byClient = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    const list = byClient.get(inv.clientName) ?? [];
    list.push(inv);
    byClient.set(inv.clientName, list);
  }

  const result: ClientStats[] = [];
  for (const [name, list] of byClient.entries()) {
    let paidCount = 0;
    let overdueCount = 0;
    let totalAmount = 0;
    let outstanding = 0;
    let overdueAmount = 0;
    let remindersSent = 0;
    let payDaysTot = 0;
    let payDaysN = 0;
    let maxDaysLate = 0;
    let email = "";
    let phone: string | undefined;
    let vat: string | undefined;

    for (const inv of list) {
      totalAmount += inv.amount;
      remindersSent += inv.reminders.length;
      if (!email && inv.clientEmail) email = inv.clientEmail;
      if (!phone && inv.clientPhone) phone = inv.clientPhone;
      if (!vat && inv.clientVat) vat = inv.clientVat;

      const status = computeStatus(inv, today);
      if (status === "pagata") {
        paidCount += 1;
        if (inv.paidAt) {
          const d = daysBetween(parseDate(inv.issueDate), new Date(inv.paidAt));
          if (d >= 0) {
            payDaysTot += d;
            payDaysN += 1;
          }
        }
      } else {
        outstanding += inv.amount;
        if (status === "scaduta") {
          overdueCount += 1;
          overdueAmount += inv.amount;
          const late = daysBetween(parseDate(inv.dueDate), today);
          if (late > maxDaysLate) maxDaysLate = late;
        }
      }
    }

    const avgDaysToPay = payDaysN > 0 ? Math.round(payDaysTot / payDaysN) : null;

    // Punteggio di rischio 0-100: più alto = peggiore pagatore.
    let score = 0;
    if (overdueCount > 0) score += 25;
    score += Math.min(overdueCount * 10, 25); // più fatture scadute
    score += Math.min(Math.floor(maxDaysLate / 15) * 10, 30); // ritardo prolungato
    score += Math.min(remindersSent * 4, 20); // ha richiesto molti solleciti
    if (avgDaysToPay !== null && avgDaysToPay > 30) score += 10; // storicamente lento
    score = Math.min(score, 100);

    const risk: RiskLevel = score >= 60 ? "alto" : score >= 30 ? "medio" : "basso";

    result.push({
      name,
      email,
      phone,
      vat,
      invoices: list,
      totalCount: list.length,
      paidCount,
      openCount: list.length - paidCount,
      overdueCount,
      totalAmount,
      outstanding,
      overdueAmount,
      remindersSent,
      avgDaysToPay,
      maxDaysLate,
      riskScore: score,
      risk,
    });
  }

  // Ordina per rischio (peggiori in alto), poi per scaduto.
  result.sort(
    (a, b) => b.riskScore - a.riskScore || b.overdueAmount - a.overdueAmount,
  );
  return result;
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  basso: "Basso",
  medio: "Medio",
  alto: "Alto",
};

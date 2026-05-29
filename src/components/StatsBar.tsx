import type { Invoice } from "@/lib/types";
import { computeStatus } from "@/lib/reminders";
import { formatEuro } from "@/lib/format";

function Card({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-extrabold ${accent}`}>{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-700">{label}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function StatsBar({ invoices }: { invoices: Invoice[] }) {
  const today = new Date();
  let daIncassare = 0;
  let incassato = 0;
  let scaduteImporto = 0;
  let scaduteCount = 0;
  let inScadenzaCount = 0;

  for (const inv of invoices) {
    const status = computeStatus(inv, today);
    if (status === "pagata") {
      incassato += inv.amount;
    } else {
      daIncassare += inv.amount;
      if (status === "scaduta") {
        scaduteImporto += inv.amount;
        scaduteCount += 1;
      }
      if (status === "in_scadenza") inScadenzaCount += 1;
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        label="Da incassare"
        value={formatEuro(daIncassare)}
        hint="Fatture non ancora pagate"
        accent="text-slate-900"
      />
      <Card
        label="Scadute"
        value={formatEuro(scaduteImporto)}
        hint={`${scaduteCount} fatture oltre la scadenza`}
        accent="text-red-600"
      />
      <Card
        label="In scadenza"
        value={String(inScadenzaCount)}
        hint="Scadono entro 7 giorni"
        accent="text-amber-600"
      />
      <Card
        label="Incassato"
        value={formatEuro(incassato)}
        hint="Fatture già pagate"
        accent="text-emerald-600"
      />
    </div>
  );
}

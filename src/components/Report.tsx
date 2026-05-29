"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useInvoices } from "@/lib/store";
import { computeStatus } from "@/lib/reminders";
import { formatEuro, daysBetween } from "@/lib/format";

function Kpi({
  label,
  value,
  accent = "text-slate-900",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`text-3xl font-extrabold ${accent}`}>{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-600">{label}</div>
    </div>
  );
}

export function Report() {
  const { invoices, loaded } = useInvoices();

  const stats = useMemo(() => {
    const today = new Date();
    let incassato = 0;
    let daIncassare = 0;
    let scaduto = 0;
    let pagate = 0;
    let solleciti = 0;
    let giorniIncassoTot = 0;
    let giorniIncassoN = 0;
    const debitori = new Map<string, number>();
    const aging = { f0_30: 0, f31_60: 0, f61_90: 0, f90: 0 };

    for (const inv of invoices) {
      solleciti += inv.reminders.length;
      const status = computeStatus(inv, today);
      if (status === "pagata") {
        incassato += inv.amount;
        pagate += 1;
        if (inv.paidAt) {
          const d = daysBetween(new Date(inv.issueDate), new Date(inv.paidAt));
          if (d >= 0) {
            giorniIncassoTot += d;
            giorniIncassoN += 1;
          }
        }
      } else {
        daIncassare += inv.amount;
        if (status === "scaduta") {
          scaduto += inv.amount;
          debitori.set(
            inv.clientName,
            (debitori.get(inv.clientName) ?? 0) + inv.amount,
          );
          const ritardo = daysBetween(new Date(inv.dueDate), today);
          if (ritardo <= 30) aging.f0_30 += inv.amount;
          else if (ritardo <= 60) aging.f31_60 += inv.amount;
          else if (ritardo <= 90) aging.f61_90 += inv.amount;
          else aging.f90 += inv.amount;
        }
      }
    }

    const tempoMedio =
      giorniIncassoN > 0 ? Math.round(giorniIncassoTot / giorniIncassoN) : null;
    const totale = incassato + daIncassare;
    const tassoIncasso = totale > 0 ? Math.round((incassato / totale) * 100) : 0;
    const peggiori = [...debitori.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      incassato,
      daIncassare,
      scaduto,
      pagate,
      totaleFatture: invoices.length,
      solleciti,
      tempoMedio,
      tassoIncasso,
      peggiori,
      aging,
    };
  }, [invoices]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-brand hover:underline">
          ← Torna alla dashboard
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">
        Report e statistiche
      </h1>

      {!loaded ? (
        <p className="text-slate-400">Caricamento…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              label="Incassato"
              value={formatEuro(stats.incassato)}
              accent="text-emerald-600"
            />
            <Kpi label="Ancora da incassare" value={formatEuro(stats.daIncassare)} />
            <Kpi
              label="Scaduto"
              value={formatEuro(stats.scaduto)}
              accent="text-red-600"
            />
            <Kpi
              label="Tasso di incasso"
              value={`${stats.tassoIncasso}%`}
              accent="text-brand"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              label="Tempo medio di incasso"
              value={stats.tempoMedio !== null ? `${stats.tempoMedio} gg` : "—"}
            />
            <Kpi
              label="Fatture pagate"
              value={`${stats.pagate}/${stats.totaleFatture}`}
            />
            <Kpi label="Solleciti inviati" value={String(stats.solleciti)} />
            <Kpi
              label="Clienti morosi"
              value={String(stats.peggiori.length)}
            />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-slate-800">
            Scaduto per fasce di ritardo
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="0–30 giorni" value={formatEuro(stats.aging.f0_30)} />
            <Kpi
              label="31–60 giorni"
              value={formatEuro(stats.aging.f31_60)}
              accent="text-amber-600"
            />
            <Kpi
              label="61–90 giorni"
              value={formatEuro(stats.aging.f61_90)}
              accent="text-orange-600"
            />
            <Kpi
              label="Oltre 90 giorni"
              value={formatEuro(stats.aging.f90)}
              accent="text-red-600"
            />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-slate-800">
            Clienti più problematici
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {stats.peggiori.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400">
                Nessun credito scaduto. Ottimo lavoro!
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 text-right">Importo scaduto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.peggiori.map(([name, amount]) => (
                    <tr key={name}>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {name}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">
                        {formatEuro(amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

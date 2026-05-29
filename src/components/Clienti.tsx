"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInvoices } from "@/lib/store";
import { useSettings } from "@/lib/settings";
import { aggregateClients, RISK_LABEL, type ClientStats } from "@/lib/clients";
import { computeStatus } from "@/lib/reminders";
import { formatDate, formatEuro } from "@/lib/format";
import type { CompanyProfile } from "@/lib/types";

function riskColor(risk: ClientStats["risk"]): string {
  if (risk === "alto") return "bg-red-100 text-red-700";
  if (risk === "medio") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-700";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Genera l'estratto conto del cliente e apre la finestra di stampa del browser.
function printStatement(client: ClientStats, company: CompanyProfile) {
  const today = new Date();
  const rows = client.invoices
    .map((inv) => {
      const status = computeStatus(inv, today);
      return `<tr>
        <td>${escapeHtml(inv.number)}</td>
        <td>${formatDate(inv.issueDate)}</td>
        <td>${formatDate(inv.dueDate)}</td>
        <td style="text-align:right">${formatEuro(inv.amount)}</td>
        <td>${inv.paidAt ? "Pagata" : status === "scaduta" ? "Scaduta" : "Da pagare"}</td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8" />
<title>Estratto conto — ${escapeHtml(client.name)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #64748b; font-size: 13px; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px; }
  table { width:100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 6px; text-align:left; }
  th { background:#f1f5f9; }
  .totals { margin-top: 16px; font-size: 14px; }
  .totals b { font-size: 16px; }
  .foot { margin-top: 32px; font-size: 12px; color:#64748b; }
</style></head>
<body>
  <div class="head">
    <div>
      <h1>${escapeHtml(company.name || "La tua azienda")}</h1>
      <div class="muted">${escapeHtml(company.address || "")}</div>
      <div class="muted">${company.vat ? "P.IVA " + escapeHtml(company.vat) : ""}</div>
      <div class="muted">${escapeHtml(company.email || "")} ${company.phone ? "· " + escapeHtml(company.phone) : ""}</div>
    </div>
    <div style="text-align:right">
      <div class="muted">Estratto conto</div>
      <div class="muted">${formatDate(today.toISOString().slice(0, 10))}</div>
    </div>
  </div>

  <h2 style="font-size:16px;margin:0">Spett.le ${escapeHtml(client.name)}</h2>
  <div class="muted">${escapeHtml(client.email || "")} ${client.phone ? "· " + escapeHtml(client.phone) : ""}</div>

  <table>
    <thead><tr>
      <th>Fattura</th><th>Emessa</th><th>Scadenza</th>
      <th style="text-align:right">Importo</th><th>Stato</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div>Totale fatture: ${formatEuro(client.totalAmount)}</div>
    <div>Ancora da incassare: <b>${formatEuro(client.outstanding)}</b></div>
    <div>Di cui scaduto: ${formatEuro(client.overdueAmount)}</div>
  </div>

  <div class="foot">
    Per il pagamento: ${company.iban ? "IBAN " + escapeHtml(company.iban) : "vedi coordinate bancarie in fattura"}.<br/>
    Documento generato con Sollecita.
  </div>
  <script>window.onload = function(){ window.print(); }</script>
</body></html>`;

  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) {
    alert(
      "Il browser ha bloccato la finestra di stampa. Consenti i popup per questo sito.",
    );
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function Clienti() {
  const { invoices, loaded } = useInvoices();
  const { company } = useSettings();
  const [search, setSearch] = useState("");

  const clients = useMemo(() => aggregateClients(invoices), [invoices]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, search]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-brand hover:underline">
          ← Torna alla dashboard
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-extrabold text-slate-900">Clienti</h1>
      <p className="mb-6 text-sm text-slate-500">
        Ogni cliente con il suo punteggio di rischio (chi paga male), quanto deve
        ancora e l&apos;estratto conto pronto da stampare o inviare.
      </p>

      {!loaded ? (
        <p className="text-slate-400">Caricamento…</p>
      ) : clients.length === 0 ? (
        <p className="text-slate-400">Nessun cliente ancora.</p>
      ) : (
        <>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca cliente…"
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-72"
          />
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Rischio</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Da incassare</th>
                  <th className="px-4 py-3 text-right">Scaduto</th>
                  <th className="hidden px-4 py-3 text-center md:table-cell">Fatture</th>
                  <th className="hidden px-4 py-3 text-center md:table-cell">Tempo medio</th>
                  <th className="px-4 py-3 text-right">Estratto conto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((c) => (
                  <tr key={c.name}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${riskColor(
                          c.risk,
                        )}`}
                      >
                        {RISK_LABEL[c.risk]} · {c.riskScore}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-right font-semibold text-slate-700 sm:table-cell">
                      {formatEuro(c.outstanding)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {c.overdueAmount > 0 ? formatEuro(c.overdueAmount) : "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-center text-slate-500 md:table-cell">
                      {c.paidCount}/{c.totalCount} pagate
                    </td>
                    <td className="hidden px-4 py-3 text-center text-slate-500 md:table-cell">
                      {c.avgDaysToPay !== null ? `${c.avgDaysToPay} gg` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => printStatement(c, company)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Stampa / PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Suggerimento: nella finestra di stampa scegli &quot;Salva come
            PDF&quot; per inviare l&apos;estratto conto via email.
          </p>
        </>
      )}
    </div>
  );
}

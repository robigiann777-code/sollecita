"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInvoices } from "@/lib/store";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { computeStatus, getNextDueStep } from "@/lib/reminders";
import { formatDate, formatEuro } from "@/lib/format";
import { StatsBar } from "./StatsBar";
import { StatusBadge } from "./StatusBadge";
import { AddInvoiceDialog } from "./AddInvoiceDialog";
import { ImportDialog } from "./ImportDialog";
import { InvoiceDetailDrawer } from "./InvoiceDetailDrawer";

type Filter = "tutte" | "scaduta" | "in_scadenza" | "in_regola" | "pagata";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "tutte", label: "Tutte" },
  { key: "scaduta", label: "Scadute" },
  { key: "in_scadenza", label: "In scadenza" },
  { key: "in_regola", label: "In regola" },
  { key: "pagata", label: "Pagate" },
];

export function Dashboard() {
  const { invoices, loaded, resetDemoData } = useInvoices();
  const [filter, setFilter] = useState<Filter>("tutte");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = invoices.find((i) => i.id === selectedId) ?? null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      const status = computeStatus(inv);
      const matchFilter =
        filter === "tutte" ||
        (filter === "pagata" && status === "pagata") ||
        (filter === "scaduta" && status === "scaduta") ||
        (filter === "in_scadenza" && status === "in_scadenza") ||
        (filter === "in_regola" &&
          (status === "in_regola" || status === "sospesa"));
      const matchSearch =
        !q ||
        inv.clientName.toLowerCase().includes(q) ||
        inv.number.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [invoices, filter, search]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Intestazione */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-lg font-extrabold text-white">
              S
            </div>
            <div>
              <div className="text-lg font-extrabold leading-none text-slate-900">
                Sollecita
              </div>
              <div className="text-xs text-slate-400">
                Solleciti di pagamento automatici
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/report"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:inline-block"
            >
              Report
            </Link>
            <Link
              href="/prezzi"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:inline-block"
            >
              Prezzi
            </Link>
            <button
              onClick={() => setImportOpen(true)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Importa
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              + Nuova fattura
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {!loaded ? (
          <p className="text-slate-400">Caricamento…</p>
        ) : (
          <>
            <StatsBar invoices={invoices} />

            {/* Filtri + ricerca */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    filter === f.key
                      ? "bg-brand text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca cliente o numero…"
                className="ml-auto w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-64"
              />
            </div>

            {/* Tabella */}
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {visible.length === 0 ? (
                <div className="px-4 py-12 text-center text-slate-400">
                  Nessuna fattura da mostrare.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Fattura</th>
                      <th className="hidden px-4 py-3 sm:table-cell">Importo</th>
                      <th className="hidden px-4 py-3 md:table-cell">Scadenza</th>
                      <th className="px-4 py-3">Stato</th>
                      <th className="px-4 py-3">Solleciti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map((inv) => (
                      <Row
                        key={inv.id}
                        invoice={inv}
                        onClick={() => setSelectedId(inv.id)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Ripristinare i dati di esempio? Le fatture attuali verranno sostituite.",
                    )
                  ) {
                    resetDemoData();
                  }
                }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Ripristina dati di esempio
              </button>
            </div>
          </>
        )}
      </main>

      <AddInvoiceDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <InvoiceDetailDrawer
        invoice={selected}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function Row({
  invoice,
  onClick,
}: {
  invoice: Invoice;
  onClick: () => void;
}) {
  const status: InvoiceStatus = computeStatus(invoice);
  const nextStep = getNextDueStep(invoice);
  const sentCount = invoice.reminders.length;

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-slate-50"
    >
      <td className="px-4 py-3 font-semibold text-slate-900">
        {invoice.clientName}
      </td>
      <td className="px-4 py-3 text-slate-500">{invoice.number}</td>
      <td className="hidden px-4 py-3 font-semibold text-slate-700 sm:table-cell">
        {formatEuro(invoice.amount)}
      </td>
      <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
        {formatDate(invoice.dueDate)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={status} />
      </td>
      <td className="px-4 py-3">
        {nextStep ? (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            Da inviare
          </span>
        ) : (
          <span className="text-xs text-slate-400">
            {sentCount > 0 ? `${sentCount} inviati` : "—"}
          </span>
        )}
      </td>
    </tr>
  );
}

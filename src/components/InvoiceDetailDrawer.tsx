"use client";

import { useInvoices } from "@/lib/store";
import type { Invoice } from "@/lib/types";
import {
  REMINDER_LADDER,
  SAFETY_RULES,
  CHANNEL_LABEL,
  buildMessage,
  computeStatus,
  getNextDueStep,
  getStepDate,
  isStepSent,
} from "@/lib/reminders";
import { formatDate, formatDateTime, formatEuro } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export function InvoiceDetailDrawer({
  invoice,
  onClose,
}: {
  invoice: Invoice | null;
  onClose: () => void;
}) {
  const { markPaid, markUnpaid, toggleSuspend, sendStep, deleteInvoice } =
    useInvoices();

  if (!invoice) return null;

  const status = computeStatus(invoice);
  const nextStep = getNextDueStep(invoice);
  const stopped = Boolean(invoice.paidAt) || invoice.suspended;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-xl">
        {/* Intestazione */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {invoice.clientName}
              </h2>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-slate-500">
              Fattura {invoice.number} · {formatEuro(invoice.amount)} · scadenza{" "}
              {formatDate(invoice.dueDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        {/* Azioni */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-5 py-3">
          {invoice.paidAt ? (
            <button
              onClick={() => markUnpaid(invoice.id)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Segna come non pagata
            </button>
          ) : (
            <button
              onClick={() => markPaid(invoice.id)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Segna come pagata
            </button>
          )}
          <button
            onClick={() => toggleSuspend(invoice.id)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            disabled={Boolean(invoice.paidAt)}
          >
            {invoice.suspended ? "Riprendi solleciti" : "Sospendi"}
          </button>
          <button
            onClick={() => {
              if (confirm("Eliminare definitivamente questa fattura?")) {
                deleteInvoice(invoice.id);
                onClose();
              }
            }}
            className="ml-auto rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Elimina
          </button>
        </div>

        {/* Contenuto scrollabile */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {invoice.paidAt && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Pagata il {formatDateTime(invoice.paidAt)}. I solleciti si sono
              fermati automaticamente.
            </div>
          )}
          {invoice.suspended && !invoice.paidAt && (
            <div className="mb-4 rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
              Solleciti sospesi: stai trattando a voce con il cliente. Nessun
              messaggio verrà inviato finché non riprendi.
            </div>
          )}

          {/* Prossima azione consigliata */}
          {nextStep && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Sollecito da inviare ora
              </div>
              <div className="mt-1 font-semibold text-slate-900">
                {nextStep.order}. {nextStep.label} ·{" "}
                {nextStep.channels.map((c) => CHANNEL_LABEL[c]).join(" + ")}
              </div>
              <button
                onClick={() => sendStep(invoice.id, nextStep.key)}
                className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Invia {nextStep.label.toLowerCase()}
              </button>
            </div>
          )}

          {/* Linea del tempo della scala di sollecito */}
          <h3 className="mb-2 text-sm font-bold text-slate-700">
            Scala di sollecito
          </h3>
          <ol className="space-y-3">
            {REMINDER_LADDER.map((step) => {
              const sent = isStepSent(invoice, step.key);
              const plannedDate = getStepDate(invoice, step);
              const isNext = nextStep?.key === step.key;
              const sentLogs = invoice.reminders.filter(
                (r) => r.stepKey === step.key,
              );
              return (
                <li
                  key={step.key}
                  className={`rounded-xl border p-4 ${
                    sent
                      ? "border-emerald-200 bg-emerald-50/60"
                      : isNext
                        ? "border-amber-300 bg-white"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900">
                      {step.order}. {step.label}
                      {step.optional && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          (opzionale)
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-500">
                      {step.channels.map((c) => CHANNEL_LABEL[c]).join(" + ")}
                    </div>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Tono: {step.tone} ·{" "}
                    {sent
                      ? `Inviato il ${formatDateTime(sentLogs[0].sentAt)}`
                      : `Previsto per il ${formatDate(plannedDate.toISOString())}`}
                  </div>
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
                    {buildMessage(invoice, step)}
                  </p>
                  {!sent && !stopped && !isNext && (
                    <button
                      onClick={() => sendStep(invoice.id, step.key)}
                      className="mt-2 text-xs font-semibold text-brand hover:underline"
                    >
                      Invia in anticipo
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          {/* Regole di sicurezza */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
            <div className="font-bold text-slate-600">
              Regole di sicurezza (sempre attive)
            </div>
            <p className="mt-1">
              Invii consentiti solo tra le {SAFETY_RULES.orarioInvioInizio}:00 e
              le {SAFETY_RULES.orarioInvioFine}:00, massimo{" "}
              {SAFETY_RULES.maxContattiSettimana} contatti a settimana.{" "}
              {SAFETY_RULES.note}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useInvoices } from "@/lib/store";
import { useSettings } from "@/lib/settings";
import { fillTemplate } from "@/lib/templates";
import { calcolaInteressiMora } from "@/lib/interessi";
import type { Invoice } from "@/lib/types";
import {
  REMINDER_LADDER,
  SAFETY_RULES,
  CHANNEL_LABEL,
  computeStatus,
  getNextDueStep,
  getStepDate,
  isStepSent,
  type ReminderStep,
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
  const { markPaid, markUnpaid, toggleSuspend, sendStep, deleteInvoice, updateInvoice } =
    useInvoices();
  const { company, templates } = useSettings();
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    stepKey: string;
    ok: boolean;
    msg: string;
  } | null>(null);

  // Invia DAVVERO l'email del passo indicato e, se va a buon fine, la registra.
  async function inviaEmail(inv: Invoice, step: ReminderStep) {
    if (!inv.clientEmail) {
      setFeedback({
        stepKey: step.key,
        ok: false,
        msg: "Questo cliente non ha un indirizzo email.",
      });
      return;
    }
    setSendingKey(step.key);
    setFeedback(null);
    const subject = fillTemplate(templates[step.key].subject, inv, company);
    const text = fillTemplate(templates[step.key].body, inv, company);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: inv.clientEmail,
          subject,
          text,
          replyTo: company.email || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await sendStep(inv.id, step.key, ["email"]);
        setFeedback({
          stepKey: step.key,
          ok: true,
          msg: `Email inviata a ${inv.clientEmail}.`,
        });
      } else {
        setFeedback({
          stepKey: step.key,
          ok: false,
          msg: data.message || "Invio non riuscito.",
        });
      }
    } catch {
      setFeedback({
        stepKey: step.key,
        ok: false,
        msg: "Errore di rete: riprova tra poco.",
      });
    } finally {
      setSendingKey(null);
    }
  }

  if (!invoice) return null;

  const status = computeStatus(invoice);
  const nextStep = getNextDueStep(invoice);
  const stopped = Boolean(invoice.paidAt) || invoice.suspended;
  const mora = calcolaInteressiMora(invoice);

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

          {/* Promessa di pagamento */}
          {!invoice.paidAt && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Promessa di pagamento
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Il cliente ha detto che paga entro una certa data? Segnala qui:
                la fattura resterà in evidenza fino a quel giorno.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={invoice.promisedDate ?? ""}
                  onChange={(e) =>
                    updateInvoice(invoice.id, {
                      promisedDate: e.target.value || null,
                    })
                  }
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
                />
                {invoice.promisedDate && (
                  <button
                    onClick={() =>
                      updateInvoice(invoice.id, { promisedDate: null })
                    }
                    className="text-xs font-semibold text-slate-500 hover:text-red-600"
                  >
                    Rimuovi
                  </button>
                )}
              </div>
              {invoice.promisedDate && (
                <p className="mt-2 text-xs font-semibold text-indigo-600">
                  Pagamento promesso entro il{" "}
                  {formatDate(invoice.promisedDate)}.
                </p>
              )}
            </div>
          )}

          {/* Interessi di mora (D.lgs 231/2002) */}
          {mora.giorni > 0 && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Interessi di mora (indicativi)
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {mora.giorni}
                  </div>
                  <div className="text-[11px] text-slate-500">giorni di ritardo</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-red-600">
                    {formatEuro(mora.interessi)}
                  </div>
                  <div className="text-[11px] text-slate-500">interessi</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {formatEuro(mora.totaleDovuto)}
                  </div>
                  <div className="text-[11px] text-slate-500">totale dovuto</div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Calcolo indicativo secondo il D.lgs. 231/2002 (tasso BCE{" "}
                {(mora.tassoAnnuo - 8).toFixed(2)}% + 8 punti ={" "}
                {mora.tassoAnnuo.toFixed(2)}%). Verifica il saggio ufficiale del
                semestre prima di usarlo in un atto legale.
              </p>
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
              <div className="mt-3 flex flex-wrap gap-2">
                {nextStep.channels.includes("email") && invoice.clientEmail && (
                  <button
                    onClick={() => inviaEmail(invoice, nextStep)}
                    disabled={sendingKey === nextStep.key}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                  >
                    {sendingKey === nextStep.key ? "Invio in corso…" : "Invia email"}
                  </button>
                )}
                <button
                  onClick={() => sendStep(invoice.id, nextStep.key)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Segna come inviato
                </button>
              </div>
              {feedback?.stepKey === nextStep.key && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    feedback.ok ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {feedback.msg}
                </p>
              )}
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
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Oggetto:{" "}
                    {fillTemplate(templates[step.key].subject, invoice, company)}
                  </p>
                  <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
                    {fillTemplate(templates[step.key].body, invoice, company)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        const txt = fillTemplate(
                          templates[step.key].body,
                          invoice,
                          company,
                        );
                        navigator.clipboard?.writeText(txt);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-brand"
                    >
                      Copia testo
                    </button>
                    {step.channels.includes("email") &&
                      invoice.clientEmail &&
                      !stopped &&
                      !isNext && (
                        <button
                          onClick={() => inviaEmail(invoice, step)}
                          disabled={sendingKey === step.key}
                          className="text-xs font-semibold text-brand hover:underline disabled:opacity-60"
                        >
                          {sendingKey === step.key ? "Invio…" : "Invia email"}
                        </button>
                      )}
                    {!sent && !stopped && !isNext && (
                      <button
                        onClick={() => sendStep(invoice.id, step.key)}
                        className="text-xs font-semibold text-slate-500 hover:underline"
                      >
                        Segna come inviato
                      </button>
                    )}
                  </div>
                  {feedback?.stepKey === step.key && !isNext && (
                    <p
                      className={`mt-2 text-xs font-semibold ${
                        feedback.ok ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {feedback.msg}
                    </p>
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

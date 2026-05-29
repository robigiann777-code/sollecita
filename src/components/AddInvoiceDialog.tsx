"use client";

import { useState } from "react";
import { useInvoices } from "@/lib/store";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100";
const labelClass = "block text-sm font-semibold text-slate-700 mb-1";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AddInvoiceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addInvoice } = useInvoices();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(plusDaysISO(30));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  function reset() {
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setNumber("");
    setAmount("");
    setIssueDate(todayISO());
    setDueDate(plusDaysISO(30));
    setNotes("");
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount.replace(",", "."));
    if (!clientName.trim()) return setError("Inserisci il nome del cliente.");
    if (!clientEmail.trim()) return setError("Inserisci l'email del cliente.");
    if (!number.trim()) return setError("Inserisci il numero della fattura.");
    if (!parsedAmount || parsedAmount <= 0)
      return setError("Inserisci un importo valido.");

    addInvoice({
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim() || undefined,
      number: number.trim(),
      amount: parsedAmount,
      issueDate,
      dueDate,
      notes: notes.trim() || undefined,
    });
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Nuova fattura</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label className={labelClass}>Nome cliente *</label>
            <input
              className={inputClass}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Es. Pizzeria Da Mario"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Email cliente *</label>
              <input
                className={inputClass}
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="amministrazione@cliente.it"
              />
            </div>
            <div>
              <label className={labelClass}>Telefono (per SMS)</label>
              <input
                className={inputClass}
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+39 ..."
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Numero fattura *</label>
              <input
                className={inputClass}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="2026/152"
              />
            </div>
            <div>
              <label className={labelClass}>Importo (€) *</label>
              <input
                className={inputClass}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1200"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Data emissione</label>
              <input
                className={inputClass}
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Scadenza</label>
              <input
                className={inputClass}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Note (facoltative)</label>
            <textarea
              className={inputClass}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Salva fattura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

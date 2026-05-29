"use client";

import { useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/settings";
import { useRequireAuth } from "@/lib/auth";
import { PLACEHOLDERS } from "@/lib/templates";
import { REMINDER_LADDER } from "@/lib/reminders";
import type { CompanyProfile } from "@/lib/types";

const COMPANY_FIELDS: { key: keyof CompanyProfile; label: string; placeholder: string }[] = [
  { key: "name", label: "Nome azienda", placeholder: "Es. Rossi Costruzioni S.r.l." },
  { key: "vat", label: "P.IVA / Codice Fiscale", placeholder: "IT01234567890" },
  { key: "address", label: "Indirizzo", placeholder: "Via Roma 1, 20100 Milano" },
  { key: "email", label: "Email", placeholder: "info@tuazienda.it" },
  { key: "phone", label: "Telefono", placeholder: "02 1234567" },
  { key: "iban", label: "IBAN per i pagamenti", placeholder: "IT60X0542811101000000123456" },
];

export function Impostazioni() {
  const {
    company,
    templates,
    loaded,
    updateCompany,
    updateTemplate,
    resetTemplates,
  } = useSettings();
  const [saved, setSaved] = useState(false);
  const { user, loading: authLoading } = useRequireAuth();

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-slate-400">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-brand hover:underline">
          ← Torna alla dashboard
        </Link>
        {saved && (
          <span className="text-sm font-semibold text-emerald-600">
            Salvato ✓
          </span>
        )}
      </div>

      <h1 className="mb-1 text-2xl font-extrabold text-slate-900">Impostazioni</h1>
      <p className="mb-6 text-sm text-slate-500">
        I dati della tua azienda finiscono nei messaggi e nell&apos;estratto
        conto. Le modifiche si salvano da sole.
      </p>

      {!loaded ? (
        <p className="text-slate-400">Caricamento…</p>
      ) : (
        <>
          {/* Profilo azienda */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-800">
              Dati della tua azienda
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {COMPANY_FIELDS.map((f) => (
                <div key={f.key} className={f.key === "address" ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    {f.label}
                  </label>
                  <input
                    value={company[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => {
                      updateCompany({ [f.key]: e.target.value });
                      flashSaved();
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Modelli messaggi */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Modelli dei messaggi
              </h2>
              <button
                onClick={() => {
                  if (confirm("Ripristinare i testi predefiniti?")) {
                    resetTemplates();
                    flashSaved();
                  }
                }}
                className="text-xs font-semibold text-slate-500 hover:text-red-600"
              >
                Ripristina predefiniti
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Personalizza ogni messaggio. Puoi usare questi segnaposto, che
              vengono sostituiti in automatico:
            </p>
            <div className="mb-5 flex flex-wrap gap-2">
              {PLACEHOLDERS.map((p) => (
                <span
                  key={p.token}
                  title={p.description}
                  className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600"
                >
                  {p.token}
                </span>
              ))}
            </div>

            <div className="space-y-5">
              {REMINDER_LADDER.map((step) => (
                <div key={step.key} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 font-semibold text-slate-800">
                    {step.order}. {step.label}
                    {step.optional && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        (opzionale)
                      </span>
                    )}
                  </div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Oggetto
                  </label>
                  <input
                    value={templates[step.key].subject}
                    onChange={(e) => {
                      updateTemplate(step.key, { subject: e.target.value });
                      flashSaved();
                    }}
                    className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Testo
                  </label>
                  <textarea
                    value={templates[step.key].body}
                    rows={5}
                    onChange={(e) => {
                      updateTemplate(step.key, { body: e.target.value });
                      flashSaved();
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

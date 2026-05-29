import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prezzi — Sollecita",
  description:
    "Piani di abbonamento Sollecita: Starter, Pro e Completo con chiamate, SMS, email e PEC.",
};

interface Plan {
  name: string;
  price: string;
  period: string;
  audience: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "€29",
    period: "/mese",
    audience: "Micro-imprese e liberi professionisti",
    features: [
      "Fino a 50 solleciti al mese",
      "Solleciti via email",
      "Dashboard fatture e scadenze",
      "Stop automatico al pagamento",
      "1 utente",
    ],
  },
  {
    name: "Pro",
    price: "€79",
    period: "/mese",
    audience: "PMI con molte fatture",
    features: [
      "Fino a 300 solleciti al mese",
      "Email + SMS con nome azienda",
      "PEC di messa in mora (valore legale)",
      "Import da gestionale / Excel (CSV)",
      "Report e statistiche",
      "Più utenti",
    ],
  },
  {
    name: "Completo",
    price: "€150",
    period: "/mese",
    audience: "Chi vuole tutti i canali, telefonate incluse",
    highlighted: true,
    badge: "Più scelto",
    features: [
      "Solleciti illimitati",
      "Telefonate di sollecito (con traccia e registro esiti)",
      "Email + SMS + PEC + Raccomandata A/R",
      "Tutta la scala conforme, automatica",
      "Import da qualsiasi gestionale",
      "Report avanzati e tempi medi di incasso",
      "Utenti illimitati + supporto prioritario",
    ],
  },
];

export default function PrezziPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold text-brand hover:underline"
        >
          ← Torna alla dashboard
        </Link>
      </div>

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Scegli il pacchetto giusto
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-500">
          Canone fisso mensile, nessuna percentuale sul recuperato. Disdici
          quando vuoi. I costi vivi (SMS, PEC, telefonate, raccomandate) sono a
          consumo, al costo del servizio più un piccolo margine.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
              plan.highlighted
                ? "border-brand ring-2 ring-brand"
                : "border-slate-200"
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
                {plan.badge}
              </span>
            )}
            <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{plan.audience}</p>
            <div className="mt-4">
              <span className="text-4xl font-extrabold text-slate-900">
                {plan.price}
              </span>
              <span className="text-slate-500">{plan.period}</span>
            </div>
            <ul className="mt-5 flex-1 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              className={`mt-6 rounded-lg px-4 py-2.5 text-sm font-semibold ${
                plan.highlighted
                  ? "bg-brand text-white hover:bg-brand-dark"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Inizia con {plan.name}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Sollecita è uno strumento software: ogni impresa sollecita i propri
        crediti in autonomia, nel rispetto della legge (GDPR, niente molestie,
        niente WhatsApp per i solleciti).
      </p>
    </div>
  );
}

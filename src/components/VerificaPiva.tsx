"use client";

import { useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/auth";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100";

interface FreeResult {
  ok: boolean;
  valid?: boolean;
  name?: string | null;
  address?: string | null;
  country?: string;
  number?: string;
  message?: string;
  error?: string;
}

interface Summary {
  ragioneSociale: string | null;
  stato: string | null;
  ateco: string | null;
  pec: string | null;
  indirizzo: string | null;
  capitaleSociale: string | null;
  dataIscrizione: string | null;
}

interface PaidResult {
  ok: boolean;
  found?: boolean;
  summary?: Summary;
  raw?: unknown;
  message?: string;
  error?: string;
}

// Colore del badge stato azienda in base al testo (attiva = verde, cessata = rosso).
function statoColor(stato: string): string {
  if (/cess|ceas|liquid|falli|inattiv|suspend|scioglim/i.test(stato))
    return "bg-red-100 text-red-700";
  if (/attiv|active|regist/i.test(stato)) return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function SummaryRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="text-sm text-slate-900 sm:text-right">{value}</span>
    </div>
  );
}

export function VerificaPiva() {
  const { user, loading: authLoading } = useRequireAuth();
  // Pre-compila da ?vat=... (quando si arriva dalla scheda di un cliente).
  // Guardia su window: sul server non esiste, restituiamo stringa vuota.
  const [vat, setVat] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("vat") ?? "";
  });
  const [freeLoading, setFreeLoading] = useState(false);
  const [free, setFree] = useState<FreeResult | null>(null);
  const [paidLoading, setPaidLoading] = useState(false);
  const [paid, setPaid] = useState<PaidResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function verificaGratis() {
    const v = vat.trim();
    if (!v) return;
    setFreeLoading(true);
    setFree(null);
    setPaid(null);
    setShowRaw(false);
    try {
      const res = await fetch("/api/verifica-piva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vat: v }),
      });
      setFree((await res.json()) as FreeResult);
    } catch {
      setFree({
        ok: false,
        message: "Errore di rete. Controlla la connessione e riprova.",
      });
    } finally {
      setFreeLoading(false);
    }
  }

  async function controllaAffidabilita() {
    const v = vat.trim();
    if (!v) return;
    setPaidLoading(true);
    setPaid(null);
    setShowRaw(false);
    try {
      const res = await fetch("/api/affidabilita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vat: v }),
      });
      setPaid((await res.json()) as PaidResult);
    } catch {
      setPaid({
        ok: false,
        message: "Errore di rete. Controlla la connessione e riprova.",
      });
    } finally {
      setPaidLoading(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-slate-400">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm font-semibold text-brand hover:underline">
          ← Torna alla dashboard
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-extrabold text-slate-900">
        Verifica P.IVA e affidabilità
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Incolla la Partita IVA di un cliente o di un fornitore. La verifica di
        validità è gratuita. Il controllo di affidabilità (stato dell&apos;azienda,
        bilancio, dati camerali) usa un servizio a pagamento e parte solo quando
        lo chiedi tu.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <label className="mb-1 block text-sm font-semibold text-slate-700">
          Partita IVA
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={inputClass}
            value={vat}
            onChange={(e) => setVat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") verificaGratis();
            }}
            placeholder="Es. 12485671007"
            inputMode="numeric"
          />
          <button
            onClick={verificaGratis}
            disabled={freeLoading || !vat.trim()}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {freeLoading ? "Verifico…" : "Verifica gratis"}
          </button>
        </div>

        {/* Risultato verifica gratuita (VIES) */}
        {free && (
          <div className="mt-4">
            {free.ok && free.valid ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-bold text-emerald-800">
                  Partita IVA valida e attiva
                </p>
                {free.name && (
                  <p className="mt-1 text-sm text-emerald-900">
                    <span className="font-semibold">Intestata a:</span> {free.name}
                  </p>
                )}
                {free.address && (
                  <p className="mt-0.5 whitespace-pre-line text-sm text-emerald-900">
                    {free.address}
                  </p>
                )}
                <p className="mt-2 text-xs text-emerald-700">
                  Fonte: registro europeo VIES (gratuito).
                </p>
              </div>
            ) : free.ok && !free.valid ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="font-bold text-red-700">
                  Partita IVA non valida o non attiva
                </p>
                <p className="mt-1 text-sm text-red-700">
                  {free.message ||
                    "Il registro europeo non riconosce questa Partita IVA. Controlla che sia scritta correttamente."}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  {free.message ||
                    "Non è stato possibile completare la verifica. Riprova."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Affidabilità a pagamento */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Affidabilità (a pagamento)
          </h2>
          <button
            onClick={controllaAffidabilita}
            disabled={paidLoading || !vat.trim()}
            className="shrink-0 rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-blue-50 disabled:opacity-50"
          >
            {paidLoading ? "Controllo…" : "Controlla affidabilità"}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Recupera stato dell&apos;azienda, codice ateco, PEC, indirizzo e dati di
          bilancio dagli archivi camerali. Ogni controllo ha un piccolo costo (pochi
          centesimi). Parte solo quando premi il pulsante.
        </p>

        {paid && (
          <div className="mt-4">
            {paid.error === "missing_key" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="font-bold text-amber-800">
                  Affidabilità non ancora attiva
                </p>
                <p className="mt-1 text-sm text-amber-800">{paid.message}</p>
                <p className="mt-2 text-xs text-amber-700">
                  La verifica gratuita qui sopra funziona già. Per accendere questa
                  parte serve la chiave del servizio: chiedi pure e ti guido passo
                  passo.
                </p>
              </div>
            ) : !paid.ok ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  {paid.message || "Controllo non riuscito. Riprova."}
                </p>
              </div>
            ) : paid.found === false ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  {paid.message ||
                    "Nessuna azienda trovata con questa Partita IVA."}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                {paid.summary?.stato && (
                  <span
                    className={`mb-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${statoColor(
                      paid.summary.stato,
                    )}`}
                  >
                    {paid.summary.stato}
                  </span>
                )}
                <div>
                  <SummaryRow
                    label="Ragione sociale"
                    value={paid.summary?.ragioneSociale ?? null}
                  />
                  <SummaryRow label="Indirizzo" value={paid.summary?.indirizzo ?? null} />
                  <SummaryRow label="Codice ateco" value={paid.summary?.ateco ?? null} />
                  <SummaryRow label="PEC" value={paid.summary?.pec ?? null} />
                  <SummaryRow
                    label="Capitale sociale"
                    value={paid.summary?.capitaleSociale ?? null}
                  />
                  <SummaryRow
                    label="Iscritta dal"
                    value={paid.summary?.dataIscrizione ?? null}
                  />
                </div>

                <button
                  onClick={() => setShowRaw((s) => !s)}
                  className="mt-3 text-xs font-semibold text-brand hover:underline"
                >
                  {showRaw ? "Nascondi" : "Mostra"} tutti i dati grezzi (per esperti)
                </button>
                {showRaw && (
                  <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                    {JSON.stringify(paid.raw, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

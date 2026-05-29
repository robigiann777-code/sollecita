"use client";

import { useState } from "react";
import { useInvoices, type NewInvoiceInput } from "@/lib/store";
import {
  parseCsv,
  guessMapping,
  parseAmount,
  parseDateToIso,
  FIELD_LABELS,
  REQUIRED_FIELDS,
  type FieldKey,
  type ParsedCsv,
} from "@/lib/csv";

const FIELD_ORDER: FieldKey[] = [
  "clientName",
  "clientEmail",
  "clientPhone",
  "number",
  "amount",
  "issueDate",
  "dueDate",
  "notes",
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addManyInvoices } = useInvoices();
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<FieldKey, number>>(
    {} as Record<FieldKey, number>,
  );
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  if (!open) return null;

  function loadText(text: string, name: string) {
    try {
      const p = parseCsv(text);
      if (p.headers.length === 0 || p.rows.length === 0) {
        setError("Il file sembra vuoto o non leggibile.");
        return;
      }
      setParsed(p);
      setMapping(guessMapping(p.headers));
      setFileName(name);
      setError("");
    } catch {
      setError("Non riesco a leggere questo file. Esportalo in formato CSV.");
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadText(String(reader.result ?? ""), file.name);
    reader.readAsText(file);
  }

  function cell(row: string[], field: FieldKey): string {
    const idx = mapping[field];
    if (idx === undefined || idx < 0) return "";
    return (row[idx] ?? "").trim();
  }

  function buildInputs(): { valid: NewInvoiceInput[]; skipped: number } {
    if (!parsed) return { valid: [], skipped: 0 };
    const valid: NewInvoiceInput[] = [];
    let skipped = 0;
    for (const row of parsed.rows) {
      const clientName = cell(row, "clientName");
      const number = cell(row, "number");
      const amount = parseAmount(cell(row, "amount"));
      const dueDate = parseDateToIso(cell(row, "dueDate"));
      if (!clientName || !number || amount === null || !dueDate) {
        skipped++;
        continue;
      }
      const issueDate = parseDateToIso(cell(row, "issueDate")) ?? todayISO();
      valid.push({
        clientName,
        clientEmail: cell(row, "clientEmail"),
        clientPhone: cell(row, "clientPhone") || undefined,
        number,
        amount,
        issueDate,
        dueDate,
        notes: cell(row, "notes") || undefined,
      });
    }
    return { valid, skipped };
  }

  function handleImport() {
    const { valid, skipped } = buildInputs();
    if (valid.length === 0) {
      setError(
        "Nessuna riga valida. Controlla di aver associato almeno Nome cliente, Numero, Importo e Scadenza.",
      );
      return;
    }
    addManyInvoices(valid);
    alert(
      `Importate ${valid.length} fatture.${
        skipped > 0 ? ` ${skipped} righe saltate (dati mancanti).` : ""
      }`,
    );
    handleClose();
  }

  function handleClose() {
    setParsed(null);
    setMapping({} as Record<FieldKey, number>);
    setError("");
    setFileName("");
    onClose();
  }

  const preview = buildInputs();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={handleClose} aria-hidden />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Importa fatture da file
            </h2>
            <p className="text-xs text-slate-500">
              Funziona con qualsiasi gestionale o Excel: esporta in CSV e
              caricalo qui.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!parsed ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
              <p className="mb-3 text-sm text-slate-600">
                Scegli il file CSV esportato dal tuo gestionale.
              </p>
              <label className="inline-block cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                Scegli file CSV
                <input
                  type="file"
                  accept=".csv,.txt,text/csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
              <p className="mt-4 text-xs text-slate-400">
                In Excel: File → Salva con nome → formato &quot;CSV (delimitato
                da separatore di elenco)&quot;.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-700">{fileName}</span>
                <span className="text-slate-500">
                  {parsed.rows.length} righe trovate
                </span>
              </div>

              <h3 className="mb-2 text-sm font-bold text-slate-700">
                Associa le colonne
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                Ho provato a indovinare. Controlla e correggi dove serve. I
                campi con * sono obbligatori.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {FIELD_ORDER.map((field) => (
                  <div key={field}>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      {FIELD_LABELS[field]}
                      {REQUIRED_FIELDS.includes(field) && (
                        <span className="text-red-500"> *</span>
                      )}
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
                      value={mapping[field] ?? -1}
                      onChange={(e) =>
                        setMapping((m) => ({
                          ...m,
                          [field]: Number(e.target.value),
                        }))
                      }
                    >
                      <option value={-1}>— ignora —</option>
                      {parsed.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Colonna ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Anteprima */}
              <h3 className="mb-2 mt-5 text-sm font-bold text-slate-700">
                Anteprima ({preview.valid.length} valide,{" "}
                {preview.skipped} saltate)
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5">Cliente</th>
                      <th className="px-2 py-1.5">Numero</th>
                      <th className="px-2 py-1.5">Importo</th>
                      <th className="px-2 py-1.5">Scadenza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.valid.slice(0, 5).map((inv, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5">{inv.clientName}</td>
                        <td className="px-2 py-1.5">{inv.number}</td>
                        <td className="px-2 py-1.5">{inv.amount}</td>
                        <td className="px-2 py-1.5">{inv.dueDate}</td>
                      </tr>
                    ))}
                    {preview.valid.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-3 text-slate-400">
                          Nessuna riga valida con la mappatura attuale.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Annulla
          </button>
          {parsed && (
            <button
              onClick={handleImport}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Importa {preview.valid.length} fatture
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import type { InvoiceStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/reminders";

const STYLES: Record<InvoiceStatus, string> = {
  pagata: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  sospesa: "bg-slate-200 text-slate-700 ring-slate-300",
  in_regola: "bg-sky-100 text-sky-800 ring-sky-200",
  in_scadenza: "bg-amber-100 text-amber-800 ring-amber-200",
  scaduta: "bg-red-100 text-red-800 ring-red-200",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

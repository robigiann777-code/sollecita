"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Invoice,
  ReminderChannel,
  ReminderLog,
  ReminderStepKey,
} from "./types";
import { REMINDER_LADDER } from "./reminders";
import { SAMPLE_INVOICES } from "./sample-data";
import { getSupabaseClient } from "./supabase/client";
import { useAuth } from "./auth";

export type NewInvoiceInput = Omit<
  Invoice,
  "id" | "paidAt" | "suspended" | "reminders" | "createdAt"
>;

interface InvoicesContextValue {
  invoices: Invoice[];
  loaded: boolean;
  addInvoice: (input: NewInvoiceInput) => void;
  addManyInvoices: (inputs: NewInvoiceInput[]) => void;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  markPaid: (id: string) => void;
  markUnpaid: (id: string) => void;
  toggleSuspend: (id: string) => void;
  sendStep: (id: string, stepKey: string, onlyChannels?: string[]) => void;
  resetDemoData: () => void;
}

const InvoicesContext = createContext<InvoicesContextValue | null>(null);

// ---- Righe del database (snake_case) ----
interface InvoiceRow {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_vat: string | null;
  number: string;
  amount: number | string;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  suspended: boolean;
  promised_date: string | null;
  notes: string | null;
  created_at: string;
}

interface ReminderRow {
  id: string;
  invoice_id: string;
  user_id: string;
  step_key: string;
  channel: string;
  sent_at: string;
}

function reminderRowToLog(r: ReminderRow): ReminderLog {
  return {
    id: r.id,
    stepKey: r.step_key as ReminderStepKey,
    channel: r.channel as ReminderChannel,
    sentAt: r.sent_at,
  };
}

function rowToInvoice(row: InvoiceRow, reminders: ReminderRow[]): Invoice {
  return {
    id: row.id,
    clientName: row.client_name,
    clientEmail: row.client_email ?? "",
    clientPhone: row.client_phone ?? undefined,
    clientVat: row.client_vat ?? undefined,
    number: row.number,
    amount: Number(row.amount),
    issueDate: row.issue_date,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    suspended: row.suspended,
    promisedDate: row.promised_date,
    notes: row.notes ?? undefined,
    reminders: reminders
      .filter((r) => r.invoice_id === row.id)
      .map(reminderRowToLog),
    createdAt: row.created_at,
  };
}

function inputToRow(input: NewInvoiceInput, userId: string) {
  return {
    user_id: userId,
    client_name: input.clientName,
    client_email: input.clientEmail ?? "",
    client_phone: input.clientPhone ?? null,
    client_vat: input.clientVat ?? null,
    number: input.number,
    amount: input.amount,
    issue_date: input.issueDate,
    due_date: input.dueDate,
    notes: input.notes ?? null,
  };
}

function patchToRow(patch: Partial<Invoice>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.clientName !== undefined) row.client_name = patch.clientName;
  if (patch.clientEmail !== undefined) row.client_email = patch.clientEmail;
  if (patch.clientPhone !== undefined) row.client_phone = patch.clientPhone ?? null;
  if (patch.clientVat !== undefined) row.client_vat = patch.clientVat ?? null;
  if (patch.number !== undefined) row.number = patch.number;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.issueDate !== undefined) row.issue_date = patch.issueDate;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.paidAt !== undefined) row.paid_at = patch.paidAt;
  if (patch.suspended !== undefined) row.suspended = patch.suspended;
  if (patch.promisedDate !== undefined)
    row.promised_date = patch.promisedDate ?? null;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  return row;
}

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setInvoices([]);
      setLoaded(true);
      return;
    }
    const supabase = getSupabaseClient();
    const [{ data: invRows, error: e1 }, { data: remRows, error: e2 }] =
      await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("reminders").select("*"),
      ]);
    if (e1 || e2) {
      setLoaded(true);
      return;
    }
    const reminders = (remRows ?? []) as ReminderRow[];
    setInvoices(
      ((invRows ?? []) as InvoiceRow[]).map((r) => rowToInvoice(r, reminders)),
    );
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoaded(false);
    reload();
  }, [authLoading, reload]);

  const addInvoice = useCallback(
    async (input: NewInvoiceInput) => {
      if (!user) return;
      const { data, error } = await getSupabaseClient()
        .from("invoices")
        .insert(inputToRow(input, user.id))
        .select()
        .single();
      if (error || !data) return;
      setInvoices((prev) => [rowToInvoice(data as InvoiceRow, []), ...prev]);
    },
    [user],
  );

  const addManyInvoices = useCallback(
    async (inputs: NewInvoiceInput[]) => {
      if (!user || inputs.length === 0) return;
      const rows = inputs.map((i) => inputToRow(i, user.id));
      const { data, error } = await getSupabaseClient()
        .from("invoices")
        .insert(rows)
        .select();
      if (error || !data) return;
      const mapped = (data as InvoiceRow[]).map((r) => rowToInvoice(r, []));
      setInvoices((prev) => [...mapped, ...prev]);
    },
    [user],
  );

  const updateInvoice = useCallback(
    async (id: string, patch: Partial<Invoice>) => {
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)),
      );
      await getSupabaseClient()
        .from("invoices")
        .update(patchToRow(patch))
        .eq("id", id);
    },
    [],
  );

  const deleteInvoice = useCallback(async (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    await getSupabaseClient().from("invoices").delete().eq("id", id);
  }, []);

  const markPaid = useCallback(async (id: string) => {
    const paidAt = new Date().toISOString();
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, paidAt, suspended: false } : inv,
      ),
    );
    await getSupabaseClient()
      .from("invoices")
      .update({ paid_at: paidAt, suspended: false })
      .eq("id", id);
  }, []);

  const markUnpaid = useCallback(async (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, paidAt: null } : inv)),
    );
    await getSupabaseClient()
      .from("invoices")
      .update({ paid_at: null })
      .eq("id", id);
  }, []);

  const toggleSuspend = useCallback(
    async (id: string) => {
      const current = invoices.find((i) => i.id === id);
      if (!current) return;
      const next = !current.suspended;
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, suspended: next } : inv)),
      );
      await getSupabaseClient()
        .from("invoices")
        .update({ suspended: next })
        .eq("id", id);
    },
    [invoices],
  );

  const sendStep = useCallback(
    async (id: string, stepKey: string, onlyChannels?: string[]) => {
      if (!user) return;
      const step = REMINDER_LADDER.find((s) => s.key === stepKey);
      if (!step) return;
      const channels =
        onlyChannels && onlyChannels.length
          ? step.channels.filter((c) => onlyChannels.includes(c))
          : step.channels;
      const rows = channels.map((channel) => ({
        invoice_id: id,
        user_id: user.id,
        step_key: step.key,
        channel,
      }));
      const { data, error } = await getSupabaseClient()
        .from("reminders")
        .insert(rows)
        .select();
      if (error || !data) return;
      const logs = (data as ReminderRow[]).map(reminderRowToLog);
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? { ...inv, reminders: [...inv.reminders, ...logs] }
            : inv,
        ),
      );
    },
    [user],
  );

  const resetDemoData = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabaseClient();
    await supabase.from("invoices").delete().eq("user_id", user.id);
    const rows = SAMPLE_INVOICES.map((s) => inputToRow(s, user.id));
    const { data } = await supabase.from("invoices").insert(rows).select();
    setInvoices(((data ?? []) as InvoiceRow[]).map((r) => rowToInvoice(r, [])));
  }, [user]);

  const value = useMemo<InvoicesContextValue>(
    () => ({
      invoices,
      loaded,
      addInvoice,
      addManyInvoices,
      updateInvoice,
      deleteInvoice,
      markPaid,
      markUnpaid,
      toggleSuspend,
      sendStep,
      resetDemoData,
    }),
    [
      invoices,
      loaded,
      addInvoice,
      addManyInvoices,
      updateInvoice,
      deleteInvoice,
      markPaid,
      markUnpaid,
      toggleSuspend,
      sendStep,
      resetDemoData,
    ],
  );

  return (
    <InvoicesContext.Provider value={value}>
      {children}
    </InvoicesContext.Provider>
  );
}

export function useInvoices(): InvoicesContextValue {
  const ctx = useContext(InvoicesContext);
  if (!ctx) {
    throw new Error("useInvoices deve essere usato dentro <InvoicesProvider>");
  }
  return ctx;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Invoice, ReminderLog } from "./types";
import { REMINDER_LADDER } from "./reminders";
import { SAMPLE_INVOICES } from "./sample-data";

const STORAGE_KEY = "sollecita.invoices.v1";

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
  sendStep: (id: string, stepKey: string) => void;
  resetDemoData: () => void;
}

const InvoicesContext = createContext<InvoicesContextValue | null>(null);

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Carica dal browser al primo avvio (o semina con dati di esempio).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setInvoices(JSON.parse(raw) as Invoice[]);
      } else {
        setInvoices(SAMPLE_INVOICES);
      }
    } catch {
      setInvoices(SAMPLE_INVOICES);
    }
    setLoaded(true);
  }, []);

  // Salva nel browser a ogni modifica.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    } catch {
      // spazio pieno o modalita' privata: ignoriamo, resta in memoria
    }
  }, [invoices, loaded]);

  const addInvoice = useCallback((input: NewInvoiceInput) => {
    const invoice: Invoice = {
      ...input,
      id: uid(),
      paidAt: null,
      suspended: false,
      reminders: [],
      createdAt: new Date().toISOString(),
    };
    setInvoices((prev) => [invoice, ...prev]);
  }, []);

  const addManyInvoices = useCallback((inputs: NewInvoiceInput[]) => {
    const now = new Date().toISOString();
    const newInvoices: Invoice[] = inputs.map((input) => ({
      ...input,
      id: uid(),
      paidAt: null,
      suspended: false,
      reminders: [],
      createdAt: now,
    }));
    setInvoices((prev) => [...newInvoices, ...prev]);
  }, []);

  const updateInvoice = useCallback((id: string, patch: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)),
    );
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }, []);

  // Stop automatico: segnare pagata azzera i solleciti futuri.
  const markPaid = useCallback((id: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? { ...inv, paidAt: new Date().toISOString(), suspended: false }
          : inv,
      ),
    );
  }, []);

  const markUnpaid = useCallback((id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, paidAt: null } : inv)),
    );
  }, []);

  const toggleSuspend = useCallback((id: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, suspended: !inv.suspended } : inv,
      ),
    );
  }, []);

  const sendStep = useCallback((id: string, stepKey: string) => {
    const step = REMINDER_LADDER.find((s) => s.key === stepKey);
    if (!step) return;
    const now = new Date().toISOString();
    const logs: ReminderLog[] = step.channels.map((channel) => ({
      id: uid(),
      stepKey: step.key,
      channel,
      sentAt: now,
    }));
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? { ...inv, reminders: [...inv.reminders, ...logs] }
          : inv,
      ),
    );
  }, []);

  const resetDemoData = useCallback(() => {
    setInvoices(SAMPLE_INVOICES);
  }, []);

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

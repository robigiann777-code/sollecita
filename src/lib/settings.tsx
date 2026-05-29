"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CompanyProfile, ReminderStepKey } from "./types";
import {
  DEFAULT_TEMPLATES,
  type MessageTemplate,
  type TemplateMap,
} from "./templates";
import { getSupabaseClient } from "./supabase/client";
import { useAuth } from "./auth";

const DEFAULT_COMPANY: CompanyProfile = {
  name: "",
  vat: "",
  address: "",
  email: "",
  phone: "",
  iban: "",
};

interface SettingsContextValue {
  company: CompanyProfile;
  templates: TemplateMap;
  loaded: boolean;
  updateCompany: (patch: Partial<CompanyProfile>) => void;
  updateTemplate: (key: ReminderStepKey, patch: Partial<MessageTemplate>) => void;
  resetTemplates: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [templates, setTemplates] = useState<TemplateMap>(() =>
    clone(DEFAULT_TEMPLATES),
  );
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carica il profilo dell'utente.
  useEffect(() => {
    if (authLoading) return;
    let active = true;
    (async () => {
      if (!user) {
        setCompany(DEFAULT_COMPANY);
        setTemplates(clone(DEFAULT_TEMPLATES));
        setLoaded(true);
        return;
      }
      setLoaded(false);
      const { data } = await getSupabaseClient()
        .from("profiles")
        .select("company, templates")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      const savedCompany = (data?.company ?? {}) as Partial<CompanyProfile>;
      const savedTemplates = (data?.templates ?? {}) as Partial<TemplateMap>;
      setCompany({ ...DEFAULT_COMPANY, ...savedCompany });
      setTemplates({ ...clone(DEFAULT_TEMPLATES), ...savedTemplates });
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  // Salva su Supabase (con piccolo ritardo per non scrivere a ogni tasto).
  const scheduleSave = useCallback(
    (nextCompany: CompanyProfile, nextTemplates: TemplateMap) => {
      if (!user) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        getSupabaseClient()
          .from("profiles")
          .upsert({
            id: user.id,
            company: nextCompany,
            templates: nextTemplates,
            updated_at: new Date().toISOString(),
          })
          .then(() => {});
      }, 600);
    },
    [user],
  );

  const updateCompany = useCallback(
    (patch: Partial<CompanyProfile>) => {
      setCompany((prev) => {
        const next = { ...prev, ...patch };
        scheduleSave(next, templates);
        return next;
      });
    },
    [scheduleSave, templates],
  );

  const updateTemplate = useCallback(
    (key: ReminderStepKey, patch: Partial<MessageTemplate>) => {
      setTemplates((prev) => {
        const next = { ...prev, [key]: { ...prev[key], ...patch } };
        scheduleSave(company, next);
        return next;
      });
    },
    [scheduleSave, company],
  );

  const resetTemplates = useCallback(() => {
    const next = clone(DEFAULT_TEMPLATES);
    setTemplates(next);
    scheduleSave(company, next);
  }, [scheduleSave, company]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      company,
      templates,
      loaded,
      updateCompany,
      updateTemplate,
      resetTemplates,
    }),
    [company, templates, loaded, updateCompany, updateTemplate, resetTemplates],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings deve essere usato dentro <SettingsProvider>");
  }
  return ctx;
}

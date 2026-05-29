"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CompanyProfile, ReminderStepKey } from "./types";
import {
  DEFAULT_TEMPLATES,
  type MessageTemplate,
  type TemplateMap,
} from "./templates";

const STORAGE_KEY = "sollecita.settings.v1";

const DEFAULT_COMPANY: CompanyProfile = {
  name: "",
  vat: "",
  address: "",
  email: "",
  phone: "",
  iban: "",
};

interface SettingsState {
  company: CompanyProfile;
  templates: TemplateMap;
}

interface SettingsContextValue {
  company: CompanyProfile;
  templates: TemplateMap;
  loaded: boolean;
  updateCompany: (patch: Partial<CompanyProfile>) => void;
  updateTemplate: (key: ReminderStepKey, patch: Partial<MessageTemplate>) => void;
  resetTemplates: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function buildDefaults(): SettingsState {
  return {
    company: { ...DEFAULT_COMPANY },
    templates: structuredCloneSafe(DEFAULT_TEMPLATES),
  };
}

function structuredCloneSafe<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [templates, setTemplates] = useState<TemplateMap>(() =>
    structuredCloneSafe(DEFAULT_TEMPLATES),
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SettingsState>;
        setCompany({ ...DEFAULT_COMPANY, ...(saved.company ?? {}) });
        // Uniamo ai default cosi' eventuali nuovi step hanno sempre un modello.
        setTemplates({
          ...structuredCloneSafe(DEFAULT_TEMPLATES),
          ...(saved.templates ?? {}),
        });
      }
    } catch {
      const d = buildDefaults();
      setCompany(d.company);
      setTemplates(d.templates);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ company, templates } satisfies SettingsState),
      );
    } catch {
      // spazio pieno o modalita' privata: resta in memoria
    }
  }, [company, templates, loaded]);

  const updateCompany = useCallback((patch: Partial<CompanyProfile>) => {
    setCompany((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateTemplate = useCallback(
    (key: ReminderStepKey, patch: Partial<MessageTemplate>) => {
      setTemplates((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...patch },
      }));
    },
    [],
  );

  const resetTemplates = useCallback(() => {
    setTemplates(structuredCloneSafe(DEFAULT_TEMPLATES));
  }, []);

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

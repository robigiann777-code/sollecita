import type { Invoice } from "./types";

// Helper: data ISO (yyyy-mm-dd) spostata di N giorni da oggi.
function dayOffset(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Helper: datetime ISO spostato di N giorni da ora.
function timeOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Fatture di esempio per mostrare i vari stati. Date relative a oggi.
export const SAMPLE_INVOICES: Invoice[] = [
  {
    id: "demo-1",
    clientName: "Pizzeria Da Mario",
    clientEmail: "amministrazione@damario.it",
    clientPhone: "+39 081 1234567",
    number: "2026/142",
    amount: 480,
    issueDate: dayOffset(-25),
    dueDate: dayOffset(3),
    paidAt: null,
    suspended: false,
    reminders: [],
    createdAt: timeOffset(-25),
  },
  {
    id: "demo-2",
    clientName: "Edil Rossi Srl",
    clientEmail: "contabilita@edilrossi.it",
    clientPhone: "+39 06 7654321",
    number: "2026/130",
    amount: 2150,
    issueDate: dayOffset(-35),
    dueDate: dayOffset(-5),
    paidAt: null,
    suspended: false,
    reminders: [
      {
        id: "r-2-1",
        stepKey: "promemoria",
        channel: "email",
        sentAt: timeOffset(-9),
      },
    ],
    createdAt: timeOffset(-35),
  },
  {
    id: "demo-3",
    clientName: "Studio Bianchi & Associati",
    clientEmail: "segreteria@studiobianchi.it",
    clientPhone: "+39 02 9988776",
    number: "2026/118",
    amount: 960,
    issueDate: dayOffset(-50),
    dueDate: dayOffset(-20),
    paidAt: null,
    suspended: false,
    reminders: [
      {
        id: "r-3-1",
        stepKey: "promemoria",
        channel: "email",
        sentAt: timeOffset(-24),
      },
      {
        id: "r-3-2",
        stepKey: "sollecito_1",
        channel: "email",
        sentAt: timeOffset(-19),
      },
      {
        id: "r-3-3",
        stepKey: "sollecito_1",
        channel: "sms",
        sentAt: timeOffset(-19),
      },
      {
        id: "r-3-4",
        stepKey: "sollecito_2",
        channel: "email",
        sentAt: timeOffset(-10),
      },
      {
        id: "r-3-5",
        stepKey: "sollecito_2",
        channel: "sms",
        sentAt: timeOffset(-10),
      },
    ],
    createdAt: timeOffset(-50),
  },
  {
    id: "demo-4",
    clientName: "Hotel Sole",
    clientEmail: "direzione@hotelsole.it",
    clientPhone: "+39 071 4455667",
    number: "2026/095",
    amount: 3400,
    issueDate: dayOffset(-65),
    dueDate: dayOffset(-35),
    paidAt: null,
    suspended: true,
    reminders: [
      {
        id: "r-4-1",
        stepKey: "sollecito_1",
        channel: "email",
        sentAt: timeOffset(-33),
      },
    ],
    createdAt: timeOffset(-65),
  },
  {
    id: "demo-5",
    clientName: "Bar Centrale",
    clientEmail: "bar.centrale@gmail.com",
    clientPhone: "+39 055 2233445",
    number: "2026/150",
    amount: 320,
    issueDate: dayOffset(-20),
    dueDate: dayOffset(-2),
    paidAt: timeOffset(-1),
    suspended: false,
    reminders: [
      {
        id: "r-5-1",
        stepKey: "sollecito_1",
        channel: "email",
        sentAt: timeOffset(-1),
      },
    ],
    createdAt: timeOffset(-20),
  },
  {
    id: "demo-6",
    clientName: "Autofficina Verdi",
    clientEmail: "info@autofficinaverdi.it",
    number: "2026/151",
    amount: 1280,
    issueDate: dayOffset(-5),
    dueDate: dayOffset(25),
    paidAt: null,
    suspended: false,
    reminders: [],
    createdAt: timeOffset(-5),
  },
];

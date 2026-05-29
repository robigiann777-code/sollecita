import { formatDate, formatEuro, daysBetween } from "./format";
import { calcolaInteressiMora } from "./interessi";
import type { CompanyProfile, Invoice, ReminderStepKey } from "./types";

export interface MessageTemplate {
  subject: string;
  body: string;
}

export type TemplateMap = Record<ReminderStepKey, MessageTemplate>;

// Segnaposto che l'utente puo' usare nei modelli. Vengono sostituiti al volo.
export const PLACEHOLDERS: { token: string; description: string }[] = [
  { token: "{cliente}", description: "Nome del cliente" },
  { token: "{numero}", description: "Numero della fattura" },
  { token: "{importo}", description: "Importo (es. 1.200,00 €)" },
  { token: "{scadenza}", description: "Data di scadenza" },
  { token: "{giorni_ritardo}", description: "Giorni di ritardo" },
  { token: "{telefono}", description: "Telefono del cliente" },
  { token: "{azienda}", description: "Nome della tua azienda" },
  { token: "{iban}", description: "Il tuo IBAN per il bonifico" },
  { token: "{interessi}", description: "Interessi di mora maturati (indicativo)" },
  { token: "{totale_dovuto}", description: "Capitale + interessi di mora" },
];

// Modelli predefiniti: sempre fermi ma corretti, mai minacciosi.
export const DEFAULT_TEMPLATES: TemplateMap = {
  promemoria: {
    subject: "Promemoria: la fattura {numero} scade a breve",
    body: "Gentile {cliente},\nle ricordiamo che la fattura {numero} di {importo} scade il {scadenza}. La invitiamo a procedere al pagamento entro la scadenza.\nPer il bonifico: {iban}\nGrazie e cordiali saluti.\n{azienda}",
  },
  sollecito_1: {
    subject: "Fattura {numero} scaduta — sollecito di pagamento",
    body: "Gentile {cliente},\nla fattura {numero} di {importo}, con scadenza {scadenza}, risulta ancora non pagata ({giorni_ritardo} giorni di ritardo). La preghiamo di provvedere al saldo al piu' presto.\nPer il bonifico: {iban}\nSe ha gia' pagato, ignori questo messaggio.\n{azienda}",
  },
  sollecito_2: {
    subject: "Secondo sollecito — fattura {numero} ancora non pagata",
    body: "Gentile {cliente},\nnonostante i precedenti solleciti, la fattura {numero} di {importo} (scaduta il {scadenza}, {giorni_ritardo} giorni di ritardo) risulta non pagata. La invitiamo al saldo immediato; in mancanza saranno applicati gli interessi di mora previsti dalla legge.\nPer il bonifico: {iban}\n{azienda}",
  },
  telefonata: {
    subject: "Telefonata di sollecito — fattura {numero}",
    body: 'Traccia per la telefonata a {cliente} (numero {telefono}):\n"Buongiorno, la chiamo per la fattura {numero} di {importo}, scaduta il {scadenza}. Possiamo concordare oggi una data per il pagamento?"\nMantenere un tono cortese, negli orari consentiti, e annotare l\'esito.',
  },
  messa_in_mora: {
    subject: "Diffida e messa in mora — fattura {numero}",
    body: "Egregio {cliente},\ncon la presente, avente valore di formale messa in mora, la diffidiamo al pagamento della fattura {numero} di {importo}, scaduta il {scadenza} ({giorni_ritardo} giorni di ritardo), entro 7 giorni dal ricevimento.\nAlla data odierna risultano maturati interessi di mora per {interessi} (D.lgs. 231/2002), per un totale dovuto di {totale_dovuto}.\nIn difetto adiremo le vie legali per il recupero del credito, oltre ulteriori interessi e spese.\n{azienda}",
  },
  raccomandata: {
    subject: "Raccomandata A/R — fattura {numero}",
    body: "Comunicazione cartacea (raccomandata A/R) relativa alla fattura {numero} di {importo}, scaduta il {scadenza}: ulteriore diffida al pagamento a comprova della richiesta.\n{azienda}",
  },
  avvocato: {
    subject: "Esportazione fascicolo per decreto ingiuntivo",
    body: "Fascicolo pronto per il legale: fattura {numero} di {importo}, scaduta il {scadenza}, con lo storico completo dei solleciti inviati a {cliente} per l'eventuale decreto ingiuntivo.\n{azienda}",
  },
};

function daysLate(invoice: Invoice): number {
  const due = new Date(`${invoice.dueDate}T00:00:00`);
  const d = daysBetween(due, new Date());
  return d > 0 ? d : 0;
}

// Sostituisce i segnaposto con i dati reali di fattura e azienda.
export function fillTemplate(
  text: string,
  invoice: Invoice,
  company: CompanyProfile,
): string {
  const mora = calcolaInteressiMora(invoice);
  const map: Record<string, string> = {
    "{cliente}": invoice.clientName,
    "{numero}": invoice.number,
    "{importo}": formatEuro(invoice.amount),
    "{scadenza}": formatDate(invoice.dueDate),
    "{giorni_ritardo}": String(daysLate(invoice)),
    "{telefono}": invoice.clientPhone ?? "—",
    "{azienda}": company.name || "La nostra azienda",
    "{iban}": company.iban || "—",
    "{interessi}": formatEuro(mora.interessi),
    "{totale_dovuto}": formatEuro(mora.totaleDovuto),
  };
  let out = text;
  for (const [token, value] of Object.entries(map)) {
    out = out.split(token).join(value);
  }
  return out;
}

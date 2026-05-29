import { daysBetween } from "./format";
import type { Invoice } from "./types";

// ---------------------------------------------------------------------------
// Interessi di mora per le transazioni commerciali (D.lgs. 231/2002).
//
// La legge italiana dice: chi paga in ritardo una fattura tra aziende deve
// anche gli "interessi di mora". Il tasso annuo è:
//
//     tasso di riferimento BCE  +  8 punti percentuali
//
// Il tasso di riferimento BCE viene fissato OGNI SEI MESI e pubblicato dal
// Ministero dell'Economia (MEF) in Gazzetta Ufficiale. Per questo qui sotto
// teniamo una tabella per semestre: va aggiornata a ogni nuovo comunicato.
//
// NOTA: il risultato è sempre INDICATIVO. Prima di usarlo in un atto legale
// (es. messa in mora), verifica il saggio ufficiale del semestre.
// ---------------------------------------------------------------------------

// Maggiorazione fissa prevista dall'art. 5 del D.lgs. 231/2002.
export const MAGGIORAZIONE_MORA = 8;

// Saggio di riferimento BCE per semestre. "from" = primo giorno del semestre.
// Aggiornare a ogni nuovo comunicato semestrale del MEF.
const TASSI_BCE: { from: string; rate: number }[] = [
  { from: "2023-01-01", rate: 2.5 },
  { from: "2023-07-01", rate: 4.0 },
  { from: "2024-01-01", rate: 4.5 },
  { from: "2024-07-01", rate: 4.25 },
  { from: "2025-01-01", rate: 3.15 },
  { from: "2025-07-01", rate: 2.15 },
];

const ULTIMO_SEMESTRE_NOTO = TASSI_BCE[TASSI_BCE.length - 1].from;

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateOnly(iso: string): Date {
  // Accetta sia "yyyy-mm-dd" sia un ISO datetime completo.
  return dateOnly(new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso));
}

// Primo giorno del semestre successivo a quello della data passata.
function inizioSemestreSuccessivo(d: Date): Date {
  const m = d.getMonth(); // 0-11
  return m < 6
    ? new Date(d.getFullYear(), 6, 1) // → 1° luglio stesso anno
    : new Date(d.getFullYear() + 1, 0, 1); // → 1° gennaio anno dopo
}

// Tasso BCE valido alla data (l'ultima riga della tabella con "from" <= data).
function tassoBceAlla(d: Date): { bce: number; stima: boolean } {
  const t = d.getTime();
  let scelto = TASSI_BCE[0];
  for (const riga of TASSI_BCE) {
    if (parseDateOnly(riga.from).getTime() <= t) scelto = riga;
  }
  // È una stima se la data cade oltre l'ultimo semestre presente in tabella.
  const oltreTabella =
    t >= inizioSemestreSuccessivo(parseDateOnly(ULTIMO_SEMESTRE_NOTO)).getTime();
  return { bce: scelto.rate, stima: oltreTabella };
}

export interface InteressiResult {
  giorni: number; // giorni di ritardo (0 se non scaduta)
  capitale: number; // importo della fattura
  interessi: number; // interessi di mora maturati (euro)
  totaleDovuto: number; // capitale + interessi
  tassoAnnuo: number; // tasso totale corrente (BCE + 8), in %
  indicativo: boolean; // true se abbiamo usato un tasso stimato
}

// Calcola gli interessi di mora maturati su una fattura scaduta.
// Se il ritardo attraversa più semestri, applica il tasso giusto a ogni
// periodo (così il calcolo resta corretto anche su ritardi lunghi).
export function calcolaInteressiMora(
  invoice: Invoice,
  today: Date = new Date(),
): InteressiResult {
  const capitale = invoice.amount;
  const inizio = parseDateOnly(invoice.dueDate);
  const fine = invoice.paidAt ? parseDateOnly(invoice.paidAt) : dateOnly(today);
  const giorni = daysBetween(inizio, fine);

  const tassoCorrente = tassoBceAlla(fine).bce + MAGGIORAZIONE_MORA;
  if (giorni <= 0 || capitale <= 0) {
    return {
      giorni: 0,
      capitale,
      interessi: 0,
      totaleDovuto: capitale,
      tassoAnnuo: tassoCorrente,
      indicativo: false,
    };
  }

  let interessi = 0;
  let indicativo = false;
  let ultimoTasso = tassoCorrente;
  let cursore = new Date(inizio);

  while (cursore.getTime() < fine.getTime()) {
    const { bce, stima } = tassoBceAlla(cursore);
    const tasso = bce + MAGGIORAZIONE_MORA;
    const fineSegmento = new Date(
      Math.min(fine.getTime(), inizioSemestreSuccessivo(cursore).getTime()),
    );
    const giorniSegmento = daysBetween(cursore, fineSegmento);
    if (giorniSegmento > 0) {
      interessi += capitale * (tasso / 100) * (giorniSegmento / 365);
      ultimoTasso = tasso;
      if (stima) indicativo = true;
    }
    cursore = fineSegmento;
  }

  const interessiArrot = Math.round(interessi * 100) / 100;
  return {
    giorni,
    capitale,
    interessi: interessiArrot,
    totaleDovuto: Math.round((capitale + interessiArrot) * 100) / 100,
    tassoAnnuo: ultimoTasso,
    indicativo,
  };
}

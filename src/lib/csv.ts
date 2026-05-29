// Lettura e interpretazione di file CSV esportati da qualsiasi gestionale/Excel.

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

// Campi della fattura su cui mappare le colonne del file.
export type FieldKey =
  | "clientName"
  | "clientEmail"
  | "clientPhone"
  | "number"
  | "amount"
  | "issueDate"
  | "dueDate"
  | "notes";

export const FIELD_LABELS: Record<FieldKey, string> = {
  clientName: "Nome cliente",
  clientEmail: "Email cliente",
  clientPhone: "Telefono",
  number: "Numero fattura",
  amount: "Importo",
  issueDate: "Data emissione",
  dueDate: "Scadenza",
  notes: "Note",
};

export const REQUIRED_FIELDS: FieldKey[] = [
  "clientName",
  "number",
  "amount",
  "dueDate",
];

// Rileva il separatore piu' probabile guardando la prima riga.
function detectDelimiter(line: string): string {
  const candidates = [";", ",", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const c of candidates) {
    const count = line.split(c).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  return best;
}

// Parser CSV che gestisce virgolette e campi con il separatore dentro.
export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const firstLine = clean.split("\n")[0] ?? "";
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);

  const headers = (rows.shift() ?? []).map((h) => h.trim());
  const dataRows = rows.filter((r) => r.some((c) => c.trim() !== ""));
  return { headers, rows: dataRows, delimiter };
}

// Interpreta un importo in formato italiano (1.234,56) o inglese (1234.56).
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d.,-]/g, "").trim();
  if (!s) return null;
  if (s.includes(",")) {
    // virgola = decimale all'italiana: togli i punti delle migliaia
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Interpreta una data nei formati comuni e restituisce ISO yyyy-mm-dd.
export function parseDateToIso(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // gia' ISO yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return iso(Number(y), Number(mo), Number(d));
  }
  // dd/mm/yyyy oppure dd-mm-yyyy oppure dd.mm.yyyy
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    let year = Number(y);
    if (year < 100) year += 2000;
    return iso(year, Number(mo), Number(d));
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return iso(
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
    );
  }
  return null;
}

function iso(y: number, m: number, d: number): string | null {
  if (!y || !m || !d || m > 12 || d > 31) return null;
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

// Indovina quale colonna corrisponde a quale campo, dai nomi delle intestazioni.
const KEYWORDS: Record<FieldKey, string[]> = {
  clientName: ["cliente", "ragione", "nome", "denominazione", "azienda", "name", "customer"],
  clientEmail: ["email", "mail", "e-mail", "pec"],
  clientPhone: ["telefono", "cellulare", "tel", "phone", "cell", "numero di telefono"],
  number: ["numero fattura", "n. fattura", "n fattura", "numero", "fattura", "documento", "invoice", "n.doc"],
  amount: ["importo", "totale", "imponibile", "valore", "amount", "total", "saldo", "dovuto"],
  issueDate: ["data emissione", "data fattura", "emissione", "data documento", "data", "issue"],
  dueDate: ["scadenza", "data scadenza", "due", "termine"],
  notes: ["note", "descrizione", "causale", "notes", "memo"],
};

export function guessMapping(headers: string[]): Record<FieldKey, number> {
  const map: Record<FieldKey, number> = {
    clientName: -1,
    clientEmail: -1,
    clientPhone: -1,
    number: -1,
    amount: -1,
    issueDate: -1,
    dueDate: -1,
    notes: -1,
  };
  const used = new Set<number>();
  const lower = headers.map((h) => h.toLowerCase().trim());

  (Object.keys(KEYWORDS) as FieldKey[]).forEach((field) => {
    for (const kw of KEYWORDS[field]) {
      const idx = lower.findIndex(
        (h, i) => !used.has(i) && h.includes(kw),
      );
      if (idx !== -1) {
        map[field] = idx;
        used.add(idx);
        break;
      }
    }
  });
  return map;
}

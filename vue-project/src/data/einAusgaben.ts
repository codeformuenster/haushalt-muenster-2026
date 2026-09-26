/**
 * Erträge und Aufwendungen je Produkt aus der Gesamtübersicht 2026/2027.
 * Wird von der Seite „Ein- & Ausgaben“ und von „1 Mio. €“ genutzt.
 */
import rawData from '@/assets/data/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027_preprocessed.csv?raw'
import rawGroups from '@/assets/data/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027_gruppen.csv?raw'

export type DataRow = {
  Code: string
  Bezeichnung: string
  Ertraege_2026: string
  Aufwendungen_2026: string
  Ertraege_2027: string
  Aufwendungen_2027: string
  Gruppe: string
}

type GroupRow = {
  Gruppe: string
  Gruppenbezeichnung: string
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      const next = text[i + 1]
      if (inQuotes && next === '"') {
        value += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0))
}

function toObjects<T extends Record<string, string>>(text: string): T[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const [header = [], ...data] = rows

  return data.map((values) => {
    const obj: Record<string, string> = {}
    header.forEach((key, idx) => {
      obj[key] = values[idx] ?? ''
    })
    return obj as T
  })
}

/** Leere Zellen im CSV bedeuten 0 €. */
export function asNumber(value: string): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

/** Alle Produkte, einmal geparst. */
export const produkte: DataRow[] = toObjects<DataRow>(rawData)

/** Produktbereich-Code (z. B. "01") -> Name (z. B. "Innere Verwaltung"). */
export const gruppenNamen = new Map(
  toObjects<GroupRow>(rawGroups).map((g) => [g.Gruppe, g.Gruppenbezeichnung] as const),
)

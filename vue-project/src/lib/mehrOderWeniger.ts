/**
 * Spiellogik für „Mehr oder weniger?“: Zwei Produktgruppen, welche kostet die
 * Stadt 2026 mehr? Verglichen wird der Zuschussbedarf (Aufwendungen − Erträge),
 * also das, was aus allgemeinen Mitteln wie Steuern bezahlt werden muss.
 */
import { zahl } from '@/charts/format'
import { asNumber, gruppenNamen, produkte } from '@/data/einAusgaben'

export type Posten = {
  code: string
  bezeichnung: string
  bereich: string
  bedarf: number
}

/**
 * Mindestabstand zwischen zwei Beträgen. Bei fast gleich großen Posten wäre
 * die Frage reines Raten.
 */
export const MIN_FAKTOR = 1.2

/** Alle Produktgruppen mit Zuschussbedarf 2026. */
export function posten2026(): Posten[] {
  return produkte
    .map((row) => ({
      code: row.Code,
      bezeichnung: row.Bezeichnung,
      bereich: gruppenNamen.get(row.Gruppe) ?? row.Gruppe,
      bedarf: asNumber(row.Aufwendungen_2026) - asNumber(row.Ertraege_2026),
    }))
    .filter((p) => p.bedarf > 0)
}

function genugAbstand(a: Posten, b: Posten): boolean {
  return Math.max(a.bedarf, b.bedarf) / Math.min(a.bedarf, b.bedarf) >= MIN_FAKTOR
}

/**
 * Zieht einen Gegner für `aktuell`, der in dieser Runde noch nicht dran war.
 * `null`, wenn keiner mehr übrig ist – dann ist das Spiel durchgespielt.
 */
export function naechsterPosten(
  aktuell: Posten,
  pool: Posten[],
  gesehen: ReadonlySet<string>,
  zufall: () => number = Math.random,
): Posten | null {
  const kandidaten = pool.filter(
    (p) => p.code !== aktuell.code && !gesehen.has(p.code) && genugAbstand(aktuell, p),
  )
  if (kandidaten.length === 0) return null
  return kandidaten[Math.floor(zufall() * kandidaten.length)] ?? null
}

/** Zufälliger Startposten. */
export function startPosten(pool: Posten[], zufall: () => number = Math.random): Posten | null {
  return pool[Math.floor(zufall() * pool.length)] ?? null
}

/** Wie viel teurer ist der größere Betrag? 3.42 -> "3,4-mal so viel". */
export function faktor(a: number, b: number): string {
  const f = Math.max(a, b) / Math.min(a, b)
  return `${zahl(f)}-mal so viel`
}

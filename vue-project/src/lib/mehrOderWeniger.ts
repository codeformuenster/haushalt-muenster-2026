/**
 * Spiellogik für „Mehr oder weniger?“: Zwei Produktgruppen, welche kostet die
 * Stadt 2026 mehr? Verglichen wird der Zuschussbedarf (Aufwendungen − Erträge),
 * also das, was aus allgemeinen Mitteln wie Steuern bezahlt werden muss.
 */
import { euro, zahl } from '@/charts/format'
import { asNumber, gruppenNamen, produkte } from '@/data/einAusgaben'
import { absaetze, hatInhalt, type Produktgruppe } from '@/data/produkte'

export type Posten = {
  code: string
  bezeichnung: string
  bereich: string
  bedarf: number
  /** Geplanter Zuschussbedarf 2027, nur für die Hinweise nach der Auflösung. */
  bedarf2027: number
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
      bedarf2027: asNumber(row.Aufwendungen_2027) - asNumber(row.Ertraege_2027),
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

/**
 * Ab diesem Faktor zwischen 2026 und 2027 gilt der Betrag als Ausreißer, der
 * einen Hinweis wert ist.
 */
export const SPRUNG_FAKTOR = 3

/**
 * Hinweis, wenn 2027 ein ganz anderer Betrag geplant ist als 2026, etwa weil
 * eine Wahl ansteht. `null`, wenn sich die beiden Jahre ähneln. Ohne
 * Zuschussbedarf 2027 (0 oder Überschuss) ist der Unterschied immer groß.
 */
export function hinweis2027(posten: Posten): string | null {
  const { bedarf, bedarf2027 } = posten
  if (bedarf2027 < 0) return `2027 geplant: ${euro(-bedarf2027)} mehr Erträge als Aufwendungen`
  if (bedarf2027 === 0) return '2027 geplant: kein Zuschussbedarf'
  const f = Math.max(bedarf, bedarf2027) / Math.min(bedarf, bedarf2027)
  return f >= SPRUNG_FAKTOR ? `2027 geplant: ${euro(bedarf2027)}` : null
}

/** Von Hand geprüfte Erklärung zu einem auffälligen Betrag, mit Fundstelle. */
export type Notiz = {
  text: string
  /** PDF-Seite in Band 1 des Haushaltsplans. */
  seite: number
}

/**
 * Erklärungen für Beträge, die ohne Kontext unplausibel wirken. Schlüssel ist
 * der Code der Produktgruppe. Jeder Text ist am Haushaltsplan nachgeprüft.
 */
export const NOTIZEN: Readonly<Record<string, Notiz>> = {
  '0208': {
    text: '2026 ist keine Wahl eingeplant: Es fallen weder Personal- noch Sachkosten an, nur Abschreibungen und kleine sonstige Aufwendungen. 2027 ist Landtagswahl in NRW, dann plant die Stadt 873.130 € Aufwand ein, davon kommen 489.500 € über Kostenerstattungen wieder herein.',
    seite: 154,
  },
}

/** Längere Texte werden nach ganzen Sätzen gekürzt, damit das Popover klein bleibt. */
const MAX_ZEICHEN = 240

/**
 * Kürzt einen Absatz auf ganze Sätze bis etwa `max` Zeichen und hängt dann
 * „…“ an. Ist schon der erste Satz länger, bleibt er vollständig stehen.
 */
export function kurzfassung(text: string, max: number = MAX_ZEICHEN): string {
  if (text.length <= max) return text
  const saetze = text.match(/[^.!?]+(?:[.!?]+|$)\s*/g) ?? [text]
  let ergebnis = ''
  for (const satz of saetze) {
    if (ergebnis && ergebnis.length + satz.length > max) break
    ergebnis += satz
  }
  return ergebnis.length < text.length ? `${ergebnis.trim()} …` : text
}

/**
 * Kurze Beschreibung einer Produktgruppe. Bei einem einzigen Produkt ist es der
 * erste Absatz seiner Beschreibung in Einfacher Sprache (`vereinfacht`), bei
 * mehreren die Liste der Produktnamen im Wortlaut des Plans.
 */
export function gruppenBeschreibung(
  gruppe: Produktgruppe,
): { text: string; vereinfacht: boolean } | null {
  const [erstes, ...weitere] = gruppe.produkte
  if (!erstes) return null
  if (weitere.length)
    return {
      text: `Dazu gehören: ${gruppe.produkte.map((p) => p.name).join(', ')}.`,
      vereinfacht: false,
    }
  if (!hatInhalt(erstes.beschreibung_einfach)) return null
  const [absatz] = absaetze(erstes.beschreibung_einfach)
  return absatz ? { text: kurzfassung(absatz), vereinfacht: true } : null
}

/** Erste PDF-Seite der Gruppe in Band 1, für die Quellenangabe. */
export function ersteSeite(gruppe: Produktgruppe): number | null {
  const seiten = gruppe.produkte
    .flatMap((p) => p.pdf_seiten.split(','))
    .map(Number)
    .filter((s) => Number.isInteger(s) && s > 0)
  return seiten.length ? Math.min(...seiten) : null
}

/**
 * „Besonderheiten in den Planjahren“ aus dem Haushaltsplan, je Produkt der
 * erste Absatz in Einfacher Sprache. Bei mehreren Produkten steht der
 * Produktname davor, damit klar ist, worauf sich der Satz bezieht.
 */
export function besonderheiten(gruppe: Produktgruppe): string[] {
  const mehrere = gruppe.produkte.length > 1
  return gruppe.produkte.flatMap((p) => {
    if (!hatInhalt(p.besonderheiten_einfach)) return []
    const [absatz] = absaetze(p.besonderheiten_einfach)
    if (!absatz) return []
    return [mehrere ? `${p.name}: ${kurzfassung(absatz)}` : kurzfassung(absatz)]
  })
}

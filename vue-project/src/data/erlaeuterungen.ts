/**
 * Bewirtschaftungsregeln und Erläuterungen je Produktgruppe aus Band 1,
 * erzeugt von scripts/pipeline/erlaeuterungen.py nach
 * public/daten/erlaeuterungen.json. Geladen wird die Datei erst bei Bedarf
 * und dann nur einmal.
 */

/** Ein Block der Textseite, Feldnamen wie in der JSON-Datei. */
export interface Erlaeuterung {
  /** Produktgruppe, vierstellig. */
  pg: string
  /** Bewirtschaftungsregel (Budgetbindung, Sperrvermerk …) oder Erläuterung. */
  abschnitt: 'regel' | 'erlaeuterung'
  /** Worauf sich die Zeilennummern beziehen. */
  plan: 'ergebnis' | 'finanz' | 'invest'
  /** Zeilen des Teilergebnis- bzw. Teilfinanzplans; leer bei allgemeinen Texten. */
  zeilen: number[]
  /** Nummer der Investitionsmaßnahme (nur plan = invest). */
  massnahme: string | null
  titel: string | null
  sperrvermerk: boolean
  /** Originaltext; Zeilenumbrüche trennen Aufzählungen. */
  text: string
  /** PDF-Seite in Band 1. */
  seite: number
}

let laden: Promise<Map<string, Erlaeuterung[]>> | null = null

/** Alle Blöcke nach Produktgruppe, in der Reihenfolge des Haushaltsplans. */
export function ladeErlaeuterungen(): Promise<Map<string, Erlaeuterung[]>> {
  laden ??= fetch(`${import.meta.env.BASE_URL}daten/erlaeuterungen.json`)
    .then((antwort) => {
      if (!antwort.ok) throw new Error(`erlaeuterungen.json: ${antwort.status}`)
      return antwort.json() as Promise<Erlaeuterung[]>
    })
    .then((liste) => {
      const nachPg = new Map<string, Erlaeuterung[]>()
      for (const e of liste) nachPg.set(e.pg, [...(nachPg.get(e.pg) ?? []), e])
      return nachPg
    })
    .catch((fehler: unknown) => {
      laden = null // beim nächsten Öffnen erneut versuchen
      throw fehler
    })
  return laden
}

const PLAN = { ergebnis: 'Teilergebnisplan', finanz: 'Teilfinanzplan', invest: 'Investitionsplan' }

/** Überschrift eines Blocks, etwa „Zeile 13–16 (Teilergebnisplan)“ oder „Maßnahme 4125 …“. */
export function bezug(e: Erlaeuterung): string {
  if (e.massnahme) return `Maßnahme ${e.massnahme}${e.titel ? ` „${e.titel}“` : ''}`
  if (!e.zeilen.length) return e.plan === 'invest' ? PLAN.invest : 'Allgemein'
  const erste = e.zeilen[0]!
  const letzte = e.zeilen[e.zeilen.length - 1]!
  const fortlaufend = e.zeilen.length > 2 && letzte - erste === e.zeilen.length - 1
  const nummern = fortlaufend ? `${erste}–${letzte}` : e.zeilen.join(', ')
  return `${e.zeilen.length > 1 ? 'Zeilen' : 'Zeile'} ${nummern} (${PLAN[e.plan]})`
}

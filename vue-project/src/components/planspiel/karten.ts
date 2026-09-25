/**
 * Daten und Entscheidungskarten für das Planspiel.
 *
 * ENTWURF: Auswahl, Texte und Annahmen der Karten sind ein Vorschlag und müssen
 * im Team geprüft werden. Die Beträge werden aus src/data/planspiel.json
 * berechnet (erzeugt von scripts/pipeline/planspiel_daten.py), nicht eingetippt.
 * Seitenangaben sind PDF-Seiten.
 */
import daten from '@/data/planspiel.json'

/** Nur das Haushaltsjahr 2026 zählt im Spiel. */
const JAHR = '2026'

/** Index in den Wertelisten: Zeile 01 des Ergebnisplans steht an Stelle 0. */
export const ZEILE = {
  leistungsentgelte: 3,
  ertraege: 9,
  personal: 10,
  aufwendungen: 16,
} as const

/** Zeilen 01 bis 08 des Ergebnisplans: die Ertragsarten. Zeile 09 ist überall 0. */
export const ERTRAGSARTEN = daten.zeilen.slice(0, 8)

export const PRODUKTBEREICHE = daten.produktbereiche

/** Betrag einer Zeile im Gesamtergebnisplan 2026. */
export function gesamt(zeile: number): number {
  return daten.gesamt[JAHR][zeile] ?? 0
}

/** Betrag einer Zeile im Teilergebnisplan einer Produktgruppe, 2026. */
function produktgruppe(code: string, zeile: number): number {
  return daten.produktgruppen.find((pg) => pg.code === code)?.werte[JAHR][zeile] ?? 0
}

/** Ordentliche Aufwendungen eines Produktbereichs 2026 (Summe seiner Produktgruppen). */
export function aufwendungenProduktbereich(code: string): number {
  return daten.produktgruppen
    .filter((pg) => pg.code.startsWith(code))
    .reduce((summe, pg) => summe + (pg.werte[JAHR][ZEILE.aufwendungen] ?? 0), 0)
}

export interface Karte {
  id: string
  titel: string
  text: string
  /** Veränderung des ordentlichen Ergebnisses in €. Positiv heißt: das Defizit sinkt. */
  wirkung: number
  annahme: string
  quelle: string
}

export const KARTEN: Karte[] = [
  {
    id: 'kita-beitragsfrei',
    titel: 'Kita-Beiträge abschaffen',
    text: 'Eltern zahlen keine Beiträge mehr für die Kindertagesbetreuung.',
    wirkung: -produktgruppe('0601', ZEILE.leistungsentgelte),
    annahme:
      'Die öffentlich-rechtlichen Leistungsentgelte der Produktgruppe 06 01 (Förderung von Kindern in Tagesbetreuung) fallen vollständig weg.',
    quelle: 'Haushaltsplan Band 1, S. 318 (PDF), Zeile 04',
  },
  {
    id: 'jugendarbeit',
    titel: 'Mehr Geld für Jugendarbeit',
    text: 'Die Kinder- und Jugendarbeit (z. B. Jugendzentren, Ferienangebote) bekommt 10 % mehr.',
    wirkung: -0.1 * produktgruppe('0602', ZEILE.aufwendungen),
    annahme:
      'Die ordentlichen Aufwendungen der Produktgruppe 06 02 (Kinder- und Jugendarbeit) steigen um 10 %.',
    quelle: 'Haushaltsplan Band 1, S. 328 (PDF), Zeile 17',
  },
  {
    id: 'wiederbesetzungssperre',
    titel: 'Wiederbesetzungssperre',
    text: 'Frei werdende Stellen in der Verwaltung bleiben eine Zeit lang unbesetzt.',
    wirkung: 0.02 * gesamt(ZEILE.personal),
    annahme:
      'Die Personalaufwendungen der ganzen Stadt sinken dadurch um 2 %. In gebührenfinanzierten Bereichen würden eigentlich die Gebühren sinken, das bleibt hier unberücksichtigt.',
    quelle: 'Haushaltsplan Band 1, S. 9 (PDF), Zeile 11',
  },
  {
    id: 'zuschuesse',
    titel: 'Freiwillige Zuschüsse kürzen',
    text: 'Vereine und Verbände bekommen 10 % weniger freiwillige Zuschüsse.',
    wirkung: 0.1 * daten.freiwilligeZuschuesse[JAHR],
    annahme:
      'Gekürzt werden nur Zuschüsse, die im Zuschussbericht als „freiwillig“ gekennzeichnet sind.',
    quelle: 'Haushaltsplan Band 2, S. 351-362 (PDF), Zuschussbericht',
  },
  {
    id: 'grundsteuer',
    titel: 'Grundsteuer-Hebesatz anheben',
    text: 'Der Hebesatz der Grundsteuer steigt um 10 %. Das zahlen Eigentümer und über die Nebenkosten auch Mieter.',
    wirkung: 0.1 * daten.grundsteuer[JAHR],
    annahme:
      'Der Grundsteuerertrag steigt im selben Verhältnis wie der Hebesatz. Der Plan nennt ihn nur auf 0,1 Mio. € gerundet.',
    quelle: 'Haushaltsplan Band 2, S. 20 (PDF), Vorbericht',
  },
]

/**
 * Daten und Entscheidungskarten für das Planspiel.
 *
 * ENTWURF: Auswahl, Texte und Annahmen der Karten sind ein Vorschlag und müssen
 * im Team geprüft werden. Die Beträge werden aus src/data/planspiel.json
 * berechnet (erzeugt von scripts/pipeline/planspiel_daten.py), nicht eingetippt.
 * Seitenangaben sind PDF-Seiten.
 */
import daten from '@/data/planspiel.json'
import { euroKurz } from '@/charts/format'

/** Nur das Haushaltsjahr 2026 zählt im Spiel. */
const JAHR = '2026'

/** Index in den Wertelisten: Zeile 01 des Ergebnisplans steht an Stelle 0. */
export const ZEILE = {
  zuwendungen: 1,
  oeffentlicheEntgelte: 3,
  privateEntgelte: 4,
  ertraege: 9,
  personal: 10,
  sachleistungen: 12,
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

/** Anteil als gerundete ganze Prozentzahl, z. B. "24 %". */
function anteil(teil: number, ganzes: number): string {
  return `${Math.round((100 * teil) / ganzes)} %`
}

export const GRUPPEN = [
  { id: 'einnehmen', titel: 'Mehr einnehmen' },
  { id: 'sparen', titel: 'Sparen' },
  { id: 'ausgeben', titel: 'Mehr ausgeben' },
] as const

export interface Karte {
  id: string
  gruppe: (typeof GRUPPEN)[number]['id']
  titel: string
  text: string
  /** Veränderung des ordentlichen Ergebnisses in €. Positiv heißt: das Defizit sinkt. */
  wirkung: number
  /** Hintergrundwissen, wie städtische Finanzen funktionieren. */
  wissen: string
  annahme: string
  quelle: string
}

const kitaKosten = produktgruppe('0601', ZEILE.aufwendungen)
/** Durchschnittliche Personalaufwendungen je Vollzeitstelle bei den Bürgerangelegenheiten. */
const stelleBuergeramt = produktgruppe('0204', ZEILE.personal) / daten.stellen['0204'][JAHR]

export const KARTEN: Karte[] = [
  {
    id: 'grundsteuer',
    gruppe: 'einnehmen',
    titel: 'Grundsteuer-Hebesatz anheben',
    text: 'Der Hebesatz der Grundsteuer steigt um 10 %.',
    wirkung: 0.1 * daten.grundsteuer[JAHR],
    wissen:
      'Den Hebesatz legt der Rat der Stadt fest. Die Grundsteuer zahlen die Eigentümer, Vermieter dürfen sie über die Nebenkosten an Mieter weitergeben.',
    annahme:
      'Der Grundsteuerertrag steigt im selben Verhältnis wie der Hebesatz. Der Plan nennt ihn nur auf 0,1 Mio. € gerundet.',
    quelle: 'Haushaltsplan Band 2, S. 20 (PDF), Vorbericht',
  },
  {
    id: 'gewerbesteuer',
    gruppe: 'einnehmen',
    titel: 'Gewerbesteuer-Hebesatz anheben',
    text: 'Der Hebesatz der Gewerbesteuer steigt um 5 %.',
    wirkung: 0.05 * daten.gewerbesteuer[JAHR],
    wissen: `Die Gewerbesteuer ist die größte Steuerquelle der Stadt, 2026 rund ${anteil(daten.gewerbesteuer[JAHR], gesamt(ZEILE.ertraege))} aller ordentlichen Erträge. Sie schwankt mit der Wirtschaftslage, und Städte konkurrieren mit ihren Hebesätzen um Betriebe.`,
    annahme:
      'Der Gewerbesteuerertrag steigt im selben Verhältnis wie der Hebesatz. Die Gewerbesteuerumlage an Bund und Land steigt dadurch nicht, weil sie sich allein nach dem Messbetrag richtet. Der Plan nennt den Ertrag nur auf 0,1 Mio. € gerundet.',
    quelle: 'Haushaltsplan Band 2, S. 20 (PDF), Vorbericht',
  },
  {
    id: 'baeder',
    gruppe: 'einnehmen',
    titel: 'Eintritt in die Bäder erhöhen',
    text: 'Der Eintritt in die städtischen Bäder wird 20 % teurer.',
    wirkung: 0.2 * produktgruppe('0802', ZEILE.privateEntgelte),
    wissen: `Die Bäder decken mit allen ihren Erträgen nur rund ${anteil(produktgruppe('0802', ZEILE.ertraege), produktgruppe('0802', ZEILE.aufwendungen))} ihrer Kosten. Den Rest zahlt die Stadt aus dem allgemeinen Haushalt.`,
    annahme:
      'Die privatrechtlichen Leistungsentgelte der Produktgruppe 08 02 (Bäder) steigen um 20 %. Es kommen gleich viele Besucher wie bisher.',
    quelle: 'Haushaltsplan Band 1, S. 387 (PDF), Zeile 05',
  },
  {
    id: 'abwasser',
    gruppe: 'einnehmen',
    titel: 'Abwassergebühren erhöhen',
    text: 'Die Gebühren für das Abwasser steigen.',
    wirkung: 0,
    wissen:
      'Gebühren für Abwasser oder Müllabfuhr dürfen nach dem Kommunalabgabengesetz NRW nur die Kosten decken. Dazu zählen auch kalkulatorische Zinsen und Abschreibungen, die dem allgemeinen Haushalt zugutekommen. Nimmt die Stadt mehr ein, muss sie die Überdeckung innerhalb von vier Jahren über niedrigere Gebühren ausgleichen. Eine Erhöhung über die Kosten hinaus hilft dem Haushalt deshalb nicht.',
    annahme:
      'Die Gebühren decken schon die zulässigen Kosten. Mehreinnahmen müssten in den Folgejahren über niedrigere Gebühren ausgeglichen werden.',
    quelle: 'Haushaltsplan Band 1, S. 445 (PDF), Zeile 04',
  },
  {
    id: 'wiederbesetzungssperre',
    gruppe: 'sparen',
    titel: 'Wiederbesetzungssperre',
    text: 'Frei werdende Stellen in der Verwaltung bleiben eine Zeit lang unbesetzt.',
    wirkung: 0.02 * gesamt(ZEILE.personal),
    wissen: `Personal ist einer der größten Posten: 2026 rund ${anteil(gesamt(ZEILE.personal), gesamt(ZEILE.aufwendungen))} aller ordentlichen Aufwendungen. Bleiben Stellen frei, spart das Geld, aber Aufgaben bleiben liegen oder dauern länger.`,
    annahme:
      'Die Personalaufwendungen der ganzen Stadt sinken dadurch um 2 %. In gebührenfinanzierten Bereichen würden eigentlich die Gebühren sinken, das bleibt hier unberücksichtigt.',
    quelle: 'Haushaltsplan Band 1, S. 9 (PDF), Zeile 11',
  },
  {
    id: 'zuschuesse',
    gruppe: 'sparen',
    titel: 'Freiwillige Zuschüsse kürzen',
    text: 'Vereine und Verbände bekommen 10 % weniger freiwillige Zuschüsse.',
    wirkung: 0.1 * daten.freiwilligeZuschuesse[JAHR],
    wissen:
      'Viele Aufgaben muss die Stadt per Gesetz erfüllen (Pflichtaufgaben). Über freiwillige Aufgaben entscheidet der Rat selbst. Deshalb wird bei knappem Geld dort zuerst gespart, etwa bei Sport, Kultur und Vereinen.',
    annahme:
      'Gekürzt werden nur Zuschüsse, die im Zuschussbericht als „freiwillig“ gekennzeichnet sind.',
    quelle: 'Haushaltsplan Band 2, S. 349-362 (PDF), Zuschussbericht',
  },
  {
    id: 'theater',
    gruppe: 'sparen',
    titel: 'Zuschuss für das Theater kürzen',
    text: 'Das Theater Münster bekommt 10 % weniger Geld von der Stadt.',
    wirkung: 0.1 * produktgruppe('0407', ZEILE.aufwendungen),
    wissen: `Die Stadt gibt dem Theater Münster 2026 rund ${euroKurz(produktgruppe('0407', ZEILE.aufwendungen))}. Im Haushalt steht dafür nur dieser eine Zuschuss. Kultur gehört zu den freiwilligen Aufgaben der Stadt.`,
    annahme:
      'Die ordentlichen Aufwendungen der Produktgruppe 04 07 (Theater Münster) sinken um 10 %.',
    quelle: 'Haushaltsplan Band 1, S. 264 (PDF), Zeile 17',
  },
  {
    id: 'strassen',
    gruppe: 'sparen',
    titel: 'Straßenunterhaltung aufschieben',
    text: 'Reparaturen an Straßen und Wegen werden verschoben.',
    wirkung: 0.2 * produktgruppe('1201', ZEILE.sachleistungen),
    wissen:
      'Wer an der Unterhaltung spart, entlastet den Haushalt sofort. Die Schäden wachsen aber weiter, und die Reparatur wird später meist teurer. Man spricht dann von einem Sanierungsstau.',
    annahme:
      'Die Aufwendungen für Sach- und Dienstleistungen der Produktgruppe 12 01 (Verkehrsflächen und -anlagen) sinken um 20 %. Vereinfacht zählen sie alle als Unterhaltung.',
    quelle: 'Haushaltsplan Band 1, S. 459 (PDF), Zeile 13',
  },
  {
    id: 'sozialleistungen',
    gruppe: 'sparen',
    titel: 'Sozialleistungen kürzen',
    text: 'Die Stadt zahlt weniger Grundsicherung für Arbeitsuchende.',
    wirkung: 0,
    wissen: `Leistungen wie die Grundsicherung für Arbeitsuchende regelt der Bund im Sozialgesetzbuch. Die Stadt darf die Höhe nicht selbst festlegen. Sie trägt vor allem die Kosten für Unterkunft und Heizung, der Bund erstattet einen großen Teil. 2026 stehen hier ${euroKurz(produktgruppe('0501', ZEILE.aufwendungen))} Aufwendungen rund ${euroKurz(produktgruppe('0501', ZEILE.ertraege))} Erträge gegenüber.`,
    annahme:
      'Die Stadt muss die gesetzlichen Leistungen in voller Höhe zahlen. Ein Ratsbeschluss kann sie nicht kürzen.',
    quelle: 'Haushaltsplan Band 1, S. 282 (PDF), Zeile 17',
  },
  {
    id: 'kita-beitragsfrei',
    gruppe: 'ausgeben',
    titel: 'Kita-Beiträge abschaffen',
    text: 'Eltern zahlen keine Beiträge mehr für die Kindertagesbetreuung.',
    wirkung: -produktgruppe('0601', ZEILE.oeffentlicheEntgelte),
    wissen: `Die Elternbeiträge decken nur rund ${anteil(produktgruppe('0601', ZEILE.oeffentlicheEntgelte), kitaKosten)} der Kosten der Kindertagesbetreuung. Rund ${anteil(produktgruppe('0601', ZEILE.zuwendungen), kitaKosten)} kommen als Zuwendungen, vor allem vom Land. Rund ${anteil(kitaKosten - produktgruppe('0601', ZEILE.ertraege), kitaKosten)} zahlt die Stadt aus dem allgemeinen Haushalt.`,
    annahme:
      'Die öffentlich-rechtlichen Leistungsentgelte der Produktgruppe 06 01 (Förderung von Kindern in Tagesbetreuung) fallen vollständig weg.',
    quelle: 'Haushaltsplan Band 1, S. 318 (PDF), Zeile 04',
  },
  {
    id: 'jugendarbeit',
    gruppe: 'ausgeben',
    titel: 'Mehr Geld für Jugendarbeit',
    text: 'Die Kinder- und Jugendarbeit (z. B. Jugendzentren, Ferienangebote) bekommt 10 % mehr.',
    wirkung: -0.1 * produktgruppe('0602', ZEILE.aufwendungen),
    wissen: `Jugendarbeit ist eine Aufgabe der Jugendhilfe nach dem Sozialgesetzbuch. Wie viele Angebote es gibt, entscheidet die Stadt aber weitgehend selbst. 2026 sind dafür rund ${euroKurz(produktgruppe('0602', ZEILE.aufwendungen))} eingeplant.`,
    annahme:
      'Die ordentlichen Aufwendungen der Produktgruppe 06 02 (Kinder- und Jugendarbeit) steigen um 10 %.',
    quelle: 'Haushaltsplan Band 1, S. 328 (PDF), Zeile 17',
  },
  {
    id: 'buergerbuero',
    gruppe: 'ausgeben',
    titel: 'Mehr Personal fürs Bürgerbüro',
    text: 'Zehn zusätzliche Vollzeitstellen sollen die Wartezeiten für Termine verkürzen.',
    wirkung: -10 * stelleBuergeramt,
    wissen: `Eine Vollzeitstelle bei den Bürgerangelegenheiten kostet die Stadt im Schnitt rund ${euroKurz(stelleBuergeramt)} im Jahr. Neue Stellen belasten den Haushalt jedes Jahr wieder.`,
    annahme:
      'Die zehn neuen Stellen kosten so viel wie der Durchschnitt der bisherigen (Personalaufwendungen der Produktgruppe 02 04 geteilt durch ihre Stellen laut Stellenplan). Zusätzliche Gebühreneinnahmen gibt es nicht.',
    quelle: 'Haushaltsplan Band 1, S. 129 (PDF), Zeile 11; Band 2, S. 42 und 46 (PDF), Stellenplan',
  },
]

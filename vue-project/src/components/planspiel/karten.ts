/**
 * Daten und Entscheidungskarten für das Planspiel.
 *
 * ENTWURF: Auswahl, Texte und Annahmen der Karten sind ein Vorschlag und müssen
 * im Team geprüft werden. Die Beträge werden aus src/data/planspiel.json
 * berechnet (erzeugt von scripts/pipeline/planspiel_daten.py). Nur Werte, die nicht
 * im Haushaltsplan stehen, sind unten als Konstanten mit Quelle eingetragen.
 * Seitenangaben sind PDF-Seiten.
 */
import daten from '@/data/planspiel.json'
import { euroKurz, zahl } from '@/charts/format'

/** Nur das Haushaltsjahr 2026 zählt im Spiel. */
const JAHR = '2026'

/** Index in den Wertelisten: Zeile 01 des Ergebnisplans steht an Stelle 0. */
export const ZEILE = {
  steuern: 0,
  zuwendungen: 1,
  oeffentlicheEntgelte: 3,
  privateEntgelte: 4,
  sonstigeErtraege: 6,
  ertraege: 9,
  personal: 10,
  sachleistungen: 12,
  abschreibungen: 13,
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
export function anteil(teil: number, ganzes: number): string {
  return `${Math.round((100 * teil) / ganzes)} %`
}

export const GRUPPEN = [
  { id: 'einnehmen', titel: 'Mehr einnehmen' },
  { id: 'sparen', titel: 'Sparen' },
  { id: 'ausgeben', titel: 'Mehr ausgeben' },
  { id: 'investieren', titel: 'Schulden und Investitionen' },
] as const

/** Ein Betrag aus dem Haushalt 2026, den die Karte zur Einordnung zeigt. */
export interface Posten {
  name: string
  betrag: number
  /** Ohne Einheit ist der Betrag in €. */
  einheit?: string
  /** Das Ganze, zu dem der Betrag gehört. Die Karte zeigt dann den Anteil als Balken. */
  ganzes?: { name: string; betrag: number }
}

export interface Karte {
  id: string
  gruppe: (typeof GRUPPEN)[number]['id']
  titel: string
  text: string
  /** Veränderung des ordentlichen Ergebnisses in €. Positiv heißt: das Defizit sinkt. */
  wirkung: number
  /** Hintergrundwissen, wie städtische Finanzen funktionieren. */
  wissen: string
  posten: Posten[]
  annahme: string
  quelle: string
}

const kitaKosten = produktgruppe('0601', ZEILE.aufwendungen)
const buergeramtPersonal = produktgruppe('0204', ZEILE.personal)
const buergeramtStellen = daten.stellen['0204'][JAHR]
/** Durchschnittliche Personalaufwendungen je Vollzeitstelle bei den Bürgerangelegenheiten. */
const stelleBuergeramt = buergeramtPersonal / buergeramtStellen
const theaterZuschuss = produktgruppe('0407', ZEILE.aufwendungen)

/** Personal im Verhältnis zu allen Aufwendungen, für zwei Karten. */
const personalPosten: Posten = {
  name: 'Personal',
  betrag: gesamt(ZEILE.personal),
  ganzes: { name: 'Ordentliche Aufwendungen', betrag: gesamt(ZEILE.aufwendungen) },
}

/** Die Kosten (Zeile 17) einer Produktgruppe. */
function kosten(name: string, code: string): Posten {
  return { name, betrag: produktgruppe(code, ZEILE.aufwendungen) }
}

/** Eine Zeile einer Produktgruppe als Anteil an deren Kosten (Zeile 17). */
function anteilKosten(name: string, code: string, zeile: number, kostenName: string): Posten {
  return { name, betrag: produktgruppe(code, zeile), ganzes: kosten(kostenName, code) }
}

// Werte außerhalb des Haushaltsplans, Quellen in den Karten.
/** Investitionsvolumen der neuen Grundschule im York-Quartier (Stadt Münster, 2024). */
const schulKosten = 45_000_000
/** Angenommene Nutzungsdauer, Mitte des NRW-Rahmens für Schulgebäude (40 bis 80 Jahre). */
const schulNutzungsdauer = 60
/** Angenommener Zinssatz, nur zur Erläuterung. */
const schulZins = 0.03
/** Umsatz der Verkehrsbetriebe der Stadtwerke Münster 2024 (Beteiligungsbericht 2024). */
const busUmsatz = 39_800_000
/** Hundesteuer pro Jahr laut Stadt Münster (2026, gerundet). */
const hundesteuer = 1_500_000

export const KARTEN: Karte[] = [
  {
    id: 'grundsteuer',
    gruppe: 'einnehmen',
    titel: 'Grundsteuer-Hebesatz anheben',
    text: 'Der Hebesatz der Grundsteuer steigt um 10 %.',
    wirkung: 0.1 * daten.grundsteuer[JAHR],
    wissen:
      'Den Hebesatz legt der Rat der Stadt fest. Die Grundsteuer zahlen die Eigentümer, Vermieter dürfen sie über die Nebenkosten an Mieter weitergeben.',
    posten: [
      {
        name: 'Grundsteuer',
        betrag: daten.grundsteuer[JAHR],
        ganzes: { name: 'Steuern und Abgaben', betrag: gesamt(ZEILE.steuern) },
      },
    ],
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
    posten: [
      {
        name: 'Gewerbesteuer',
        betrag: daten.gewerbesteuer[JAHR],
        ganzes: { name: 'Ordentliche Erträge', betrag: gesamt(ZEILE.ertraege) },
      },
    ],
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
    wissen: `Die Eintrittsgelder decken nur rund ${anteil(produktgruppe('0802', ZEILE.privateEntgelte), produktgruppe('0802', ZEILE.aufwendungen))} ihrer Kosten. Den Rest zahlt die Stadt aus dem allgemeinen Haushalt.`,
    posten: [anteilKosten('Eintrittsgelder', '0802', ZEILE.privateEntgelte, 'Kosten Bäder')],
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
    posten: [
      { name: 'Abwassergebühren', betrag: produktgruppe('1101', ZEILE.oeffentlicheEntgelte) },
    ],
    annahme:
      'Die Gebühren decken schon die zulässigen Kosten. Mehreinnahmen müssten in den Folgejahren über niedrigere Gebühren ausgeglichen werden.',
    quelle: 'Haushaltsplan Band 1, S. 445 (PDF), Zeile 04',
  },
  {
    id: 'stadtwerke',
    gruppe: 'einnehmen',
    titel: 'Stadtwerke sollen mehr abführen',
    text: 'Die Stadtwerke Münster zahlen der Stadt 50 % mehr von ihrem Gewinn aus.',
    // Ausschüttungen sind Finanzerträge (Zeile 19) und zählen nicht zum ordentlichen Ergebnis.
    wirkung: 0,
    wissen: `Die Stadtwerke Münster GmbH gehört der Stadt und schüttet 2026 voraussichtlich ${euroKurz(daten.stadtwerkeAusschuettung[JAHR])} an sie aus. Solche Ausschüttungen bucht die Stadt wie Zinsen als Finanzerträge, getrennt vom laufenden Betrieb. Sie ändern das ordentliche Ergebnis deshalb nicht. Mit Gewinnen aus dem Energiegeschäft gleichen die Stadtwerke außerdem Verluste im Busverkehr aus (Querverbund).`,
    posten: [{ name: 'Ausschüttung Stadtwerke', betrag: daten.stadtwerkeAusschuettung[JAHR] }],
    annahme: `Auch 50 % mehr Ausschüttung (rund ${euroKurz(0.5 * daten.stadtwerkeAusschuettung[JAHR])}) landen im Finanzergebnis. Das Planspiel zählt nur das ordentliche Ergebnis.`,
    quelle:
      'Haushaltsplan Band 2, S. 143 (PDF), Übersicht zur Wirtschaftslage der Unternehmen; Band 1, S. 516 (PDF), Zeile 19; Querverbund: ms-aktuell.de, 2026 (https://ms-aktuell.de/muenster/oepnv-mit-millionenpublikum-muenster-plant/)',
  },
  {
    id: 'vhs-musikschule',
    gruppe: 'einnehmen',
    titel: 'VHS und Musikschule teurer',
    text: 'Kurse der Volkshochschule und Unterricht an der Musikschule werden 20 % teurer.',
    wirkung:
      0.2 *
      (produktgruppe('0402', ZEILE.privateEntgelte) +
        produktgruppe('0403', ZEILE.oeffentlicheEntgelte)),
    wissen: `Die Kursentgelte decken rund ${anteil(produktgruppe('0402', ZEILE.privateEntgelte), produktgruppe('0402', ZEILE.aufwendungen))} der Kosten der Volkshochschule, die Gebühren der Westfälischen Schule für Musik rund ${anteil(produktgruppe('0403', ZEILE.oeffentlicheEntgelte), produktgruppe('0403', ZEILE.aufwendungen))}. Höhere Preise können dazu führen, dass weniger Menschen teilnehmen.`,
    posten: [
      anteilKosten('Entgelte VHS', '0402', ZEILE.privateEntgelte, 'Kosten VHS'),
      anteilKosten(
        'Gebühren Musikschule',
        '0403',
        ZEILE.oeffentlicheEntgelte,
        'Kosten Musikschule',
      ),
    ],
    annahme:
      'Die privatrechtlichen Leistungsentgelte der Produktgruppe 04 02 (Volkshochschule) und die öffentlich-rechtlichen Leistungsentgelte der Produktgruppe 04 03 (Westfälische Schule für Musik) steigen um 20 %. Es kommen gleich viele Teilnehmende wie bisher.',
    quelle: 'Haushaltsplan Band 1, S. 226 (PDF), Zeile 05; S. 236 (PDF), Zeile 04',
  },
  {
    id: 'blitzer',
    gruppe: 'einnehmen',
    titel: 'Mehr Blitzer aufstellen',
    text: 'Die Stadt kontrolliert häufiger, wie schnell gefahren wird.',
    wirkung: 0.1 * produktgruppe('0203', ZEILE.sonstigeErtraege),
    wissen:
      'Bußgelder sind eine Strafe für Verstöße und sollen die Verkehrssicherheit erhöhen. Wirken die Kontrollen, fahren mehr Menschen langsamer, und die Einnahmen sinken wieder.',
    posten: [
      {
        name: 'Sonstige Erträge Straßenverkehr',
        betrag: produktgruppe('0203', ZEILE.sonstigeErtraege),
      },
    ],
    annahme:
      'Die sonstigen ordentlichen Erträge der Produktgruppe 02 03 (Straßenverkehrsrechtliche Angelegenheiten) steigen um 10 %. Dazu zählen vermutlich vor allem Verwarnungs- und Bußgelder aus der Verkehrsüberwachung (auch für Parkverstöße), der Plan schlüsselt das nicht auf. Kosten für Geräte und Personal sind nicht eingerechnet. Ob die Einnahmen wirklich steigen, ist unsicher, weil sich die Menschen anpassen.',
    quelle: 'Haushaltsplan Band 1, S. 120 (PDF), Zeile 07; Produktbeschreibung S. 119 (PDF)',
  },
  {
    id: 'hundesteuer',
    gruppe: 'einnehmen',
    titel: 'Hundesteuer erhöhen',
    text: 'Die Hundesteuer steigt um 20 %, bei einem Hund von 120 € auf 144 € im Jahr.',
    wirkung: 0.2 * hundesteuer,
    wissen: `Die Hundesteuer ist eine kleine örtliche Steuer. Den Steuersatz legt der Rat in einer Satzung fest. Sie bringt rund ${euroKurz(hundesteuer)} im Jahr, die Grundsteuer zum Vergleich ${euroKurz(daten.grundsteuer[JAHR])}.`,
    posten: [
      {
        name: 'Hundesteuer (gerundet)',
        betrag: hundesteuer,
        ganzes: { name: 'Sonstige kommunale Steuern', betrag: daten.sonstigeSteuern[JAHR] },
      },
    ],
    annahme:
      'Die Einnahmen steigen im selben Verhältnis wie der Steuersatz, und es werden gleich viele Hunde angemeldet. Der Haushaltsplan weist die Hundesteuer nicht einzeln aus, deshalb gilt die gerundete Angabe der Stadt.',
    quelle:
      'Stadt Münster, Hundesteuer: Stadt führt Bestandsaufnahme durch, 2026 (https://www.stadt-muenster.de/aktuelles/newsdetail/hundesteuer-stadt-fuehrt-bestandsaufnahme-durch); Steuersätze: Stadt Münster, Hundesteuer, 2026 (https://www.stadt-muenster.de/finanzen/steuern-und-gebuehren/hundesteuer)',
  },
  {
    id: 'wiederbesetzungssperre',
    gruppe: 'sparen',
    titel: 'Wiederbesetzungssperre',
    text: 'Frei werdende Stellen in der Verwaltung bleiben eine Zeit lang unbesetzt.',
    wirkung: 0.02 * gesamt(ZEILE.personal),
    wissen: `Personal ist einer der größten Posten: 2026 rund ${anteil(gesamt(ZEILE.personal), gesamt(ZEILE.aufwendungen))} aller ordentlichen Aufwendungen. Bleiben Stellen frei, spart das Geld, aber Aufgaben bleiben liegen oder dauern länger.`,
    posten: [personalPosten],
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
    posten: [
      {
        name: 'Freiwillige Zuschüsse',
        betrag: daten.freiwilligeZuschuesse[JAHR],
        ganzes: { name: 'Alle Zuschüsse an Vereine', betrag: daten.zuschuesseGesamt[JAHR] },
      },
    ],
    annahme:
      'Gekürzt werden nur Zuschüsse, die im Zuschussbericht als „freiwillig“ gekennzeichnet sind.',
    quelle: 'Haushaltsplan Band 2, S. 349-362 (PDF), Zuschussbericht',
  },
  {
    id: 'theater',
    gruppe: 'sparen',
    titel: 'Zuschuss für das Theater kürzen',
    text: 'Das Theater Münster bekommt 10 % weniger Geld von der Stadt.',
    wirkung: 0.1 * theaterZuschuss,
    wissen: `Die Stadt gibt dem Theater Münster 2026 rund ${euroKurz(theaterZuschuss)}. Im Haushalt steht dafür nur dieser eine Zuschuss. Kultur gehört zu den freiwilligen Aufgaben der Stadt.`,
    posten: [
      {
        name: 'Zuschuss Theater',
        betrag: theaterZuschuss,
        ganzes: { name: 'Kultur und Wissenschaft', betrag: aufwendungenProduktbereich('04') },
      },
    ],
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
    posten: [
      anteilKosten(
        'Sach- und Dienstleistungen',
        '1201',
        ZEILE.sachleistungen,
        'Kosten Verkehrsflächen',
      ),
    ],
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
    posten: [
      anteilKosten('Erträge, v. a. Erstattungen', '0501', ZEILE.ertraege, 'Kosten Grundsicherung'),
    ],
    annahme:
      'Die Stadt muss die gesetzlichen Leistungen in voller Höhe zahlen. Ein Ratsbeschluss kann sie nicht kürzen.',
    quelle: 'Haushaltsplan Band 1, S. 282 (PDF), Zeile 17',
  },
  {
    id: 'tarif',
    gruppe: 'sparen',
    titel: 'Tariferhöhung ablehnen',
    text: 'Die Beschäftigten der Stadt bekommen keine Lohnerhöhung.',
    wirkung: 0,
    wissen: `Die Löhne der Tarifbeschäftigten handeln Gewerkschaften, Bund und kommunale Arbeitgeberverbände für ganz Deutschland im TVöD aus. Die Besoldung der Beamtinnen und Beamten legt das Land NRW per Gesetz fest. Die Stadt muss beides zahlen, und Personal macht 2026 rund ${anteil(gesamt(ZEILE.personal), gesamt(ZEILE.aufwendungen))} aller ordentlichen Aufwendungen aus.`,
    posten: [personalPosten],
    annahme:
      'Die Stadt ist an Tarifvertrag und Besoldungsgesetz gebunden. Ein Ratsbeschluss kann Lohnerhöhungen nicht verhindern.',
    quelle: 'Haushaltsplan Band 1, S. 9 (PDF), Zeilen 11 und 17',
  },
  {
    id: 'feuerwehr',
    gruppe: 'sparen',
    titel: 'Feuerwehr verkleinern',
    text: 'Die Feuerwehr bekommt weniger Personal und Fahrzeuge.',
    wirkung: 0,
    wissen:
      'Brandschutz ist eine Pflichtaufgabe. Nach dem Brandschutzgesetz NRW (BHKG) muss die Stadt eine leistungsfähige Feuerwehr unterhalten. Wie schnell und mit wie vielen Kräften sie am Einsatzort sein soll, legt der Brandschutzbedarfsplan fest, den der Rat beschließt.',
    posten: [kosten('Kosten Feuerwehr', '0209')],
    annahme: `Die Feuerwehr erfüllt gerade die Vorgaben des Brandschutzbedarfsplans. Kürzen ließe sich erst, wenn der Plan geändert wird. 2026 sind für Brandschutz und Hilfeleistung ${euroKurz(produktgruppe('0209', ZEILE.aufwendungen))} eingeplant.`,
    quelle:
      'Haushaltsplan Band 1, S. 163 (PDF), Zeile 17; BHKG NRW, § 3, 2021 (https://recht.nrw.de/lrgv/gesetz/01072021-gesetz-ueber-den-brandschutz-die-hilfeleistung-und-den-katastrophenschutz-bhkg/)',
  },
  {
    id: 'kita-beitragsfrei',
    gruppe: 'ausgeben',
    titel: 'Kita-Beiträge abschaffen',
    text: 'Eltern zahlen keine Beiträge mehr für die Kindertagesbetreuung.',
    wirkung: -produktgruppe('0601', ZEILE.oeffentlicheEntgelte),
    wissen: `Die Elternbeiträge decken nur rund ${anteil(produktgruppe('0601', ZEILE.oeffentlicheEntgelte), kitaKosten)} der Kosten der Kindertagesbetreuung. Rund ${anteil(produktgruppe('0601', ZEILE.zuwendungen), kitaKosten)} kommen als Zuwendungen, vor allem vom Land. Rund ${anteil(kitaKosten - produktgruppe('0601', ZEILE.ertraege), kitaKosten)} zahlt die Stadt aus dem allgemeinen Haushalt.`,
    posten: [
      anteilKosten(
        'Elternbeiträge',
        '0601',
        ZEILE.oeffentlicheEntgelte,
        'Kosten Kindertagesbetreuung',
      ),
    ],
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
    posten: [kosten('Kosten Jugendarbeit', '0602')],
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
    posten: [
      { name: 'Personal Bürgerbüro', betrag: buergeramtPersonal },
      { name: 'Stellen (Vollzeit)', betrag: buergeramtStellen, einheit: 'Stellen' },
    ],
    annahme:
      'Die zehn neuen Stellen kosten so viel wie der Durchschnitt der bisherigen (Personalaufwendungen der Produktgruppe 02 04 geteilt durch ihre Stellen laut Stellenplan). Zusätzliche Gebühreneinnahmen gibt es nicht.',
    quelle: 'Haushaltsplan Band 1, S. 129 (PDF), Zeile 11; Band 2, S. 42 und 46 (PDF), Stellenplan',
  },
  {
    id: 'bus-kostenlos',
    gruppe: 'ausgeben',
    titel: 'Busfahren kostenlos',
    text: 'In den Stadtbussen fahren alle umsonst. Die Stadt ersetzt den Stadtwerken die fehlenden Einnahmen.',
    wirkung: -busUmsatz,
    wissen:
      'Die Stadtbusse fahren die Stadtwerke Münster, eine Tochter der Stadt. Verluste im Busverkehr gleichen die Stadtwerke mit Gewinnen aus dem Energiegeschäft aus (Querverbund). Im Haushalt der Stadt tauchen die Busse deshalb kaum auf.',
    // Der Busumsatz steht nicht im Haushalt, sondern im Beteiligungsbericht (siehe Annahme).
    posten: [],
    annahme: `Die Stadt ersetzt den Stadtwerken den ganzen Umsatz der Verkehrsbetriebe 2024 (${euroKurz(busUmsatz)}). Darin steckt neben Fahrgeld auch Geld, das schon heute von der Stadt kommt, etwa für Schülertickets, sowie Ausgleichszahlungen für das Deutschlandticket. Die echten Mehrkosten wären deshalb niedriger. Zusätzliche Busse für mehr Fahrgäste sind nicht eingerechnet.`,
    quelle:
      'Stadt Münster, Beteiligungsbericht 2024, S. 102 (https://www.stadt-muenster.de/fileadmin/user_upload/stadt-muenster/20_finanzen_und_beteiligungen/pdf/Beteiligungen/BB2024_Master_Beteiligungsbericht_-_Internetversion.pdf)',
  },
  {
    id: 'buecherei',
    gruppe: 'ausgeben',
    titel: 'Stadtbücherei kostenlos',
    text: 'Die Stadtbücherei verlangt keine Gebühren mehr.',
    wirkung: -produktgruppe('0404', ZEILE.oeffentlicheEntgelte),
    wissen: `Die Gebühren decken nur rund ${anteil(produktgruppe('0404', ZEILE.oeffentlicheEntgelte), produktgruppe('0404', ZEILE.aufwendungen))} der Kosten der Stadtbücherei. Rund ${anteil(produktgruppe('0404', ZEILE.aufwendungen) - produktgruppe('0404', ZEILE.ertraege), produktgruppe('0404', ZEILE.aufwendungen))} zahlt die Stadt aus dem allgemeinen Haushalt.`,
    posten: [
      anteilKosten(
        'Gebühren Stadtbücherei',
        '0404',
        ZEILE.oeffentlicheEntgelte,
        'Kosten Stadtbücherei',
      ),
    ],
    annahme:
      'Die öffentlich-rechtlichen Leistungsentgelte der Produktgruppe 04 04 (Stadtbücherei) fallen vollständig weg. Mehrkosten durch zusätzliche Nutzer sind nicht eingerechnet.',
    quelle: 'Haushaltsplan Band 1, S. 244 (PDF), Zeile 04',
  },
  {
    id: 'stadtgruen',
    gruppe: 'ausgeben',
    titel: 'Mehr Pflege für Parks und Grün',
    text: 'Parks und Grünanlagen werden häufiger gepflegt.',
    wirkung: -0.1 * produktgruppe('1301', ZEILE.aufwendungen),
    wissen: `Pflege kostet jedes Jahr wieder Geld. 2026 sind für Grün- und Freiflächen ${euroKurz(produktgruppe('1301', ZEILE.aufwendungen))} eingeplant, rund ${anteil(produktgruppe('1301', ZEILE.personal), produktgruppe('1301', ZEILE.aufwendungen))} davon für Personal.`,
    posten: [kosten('Kosten Grün- und Freiflächen', '1301')],
    annahme:
      'Die ordentlichen Aufwendungen der Produktgruppe 13 01 (Grün- und Freiflächen) steigen um 10 %.',
    quelle: 'Haushaltsplan Band 1, S. 469 (PDF), Zeile 17',
  },
  {
    id: 'bezirksvertretungen',
    gruppe: 'ausgeben',
    titel: 'Mehr Geld für die Bezirksvertretungen',
    text: 'Die Bezirksvertretungen bekommen doppelt so viel Geld zur freien Verfügung.',
    wirkung: -produktgruppe('0101', ZEILE.aufwendungen),
    wissen: `Münster hat sechs Stadtbezirke mit je einer gewählten Bezirksvertretung. Sie entscheiden über Angelegenheiten ihres Bezirks, etwa die Gestaltung von Grünanlagen oder die Unterstützung örtlicher Vereine. 2026 haben sie zusammen ${euroKurz(produktgruppe('0101', ZEILE.aufwendungen))} zur freien Verfügung.`,
    posten: [kosten('Frei verfügbare Mittel', '0101')],
    annahme:
      'Die ordentlichen Aufwendungen der Produktgruppe 01 01 (Bezirksvertretungen, frei verfügbare Mittel) verdoppeln sich.',
    quelle: 'Haushaltsplan Band 1, S. 19 und 22 (PDF), Zeile 17',
  },
  {
    id: 'kredit',
    gruppe: 'investieren',
    titel: 'Kredit aufnehmen',
    text: 'Die Stadt leiht sich Geld, um das Minus zu stopfen.',
    wirkung: 0,
    wissen:
      'Ein Kredit bringt Geld in die Kasse, ist aber kein Ertrag. Das Minus im Ergebnis bleibt, und die Zinsen belasten die folgenden Jahre. In NRW darf die Stadt Kredite nur für Investitionen aufnehmen, für laufende Ausgaben nur Kredite zur Liquiditätssicherung, die Zahlungsengpässe überbrücken sollen.',
    posten: [{ name: 'Zinsen und Finanzaufwand', betrag: daten.zinsaufwand[JAHR] }],
    annahme: 'Ein Kredit ändert das ordentliche Ergebnis nicht, er steht nur im Finanzplan.',
    quelle:
      'Gemeindeordnung NRW, §§ 86 und 89, 2026 (https://recht.nrw.de/lrgv/gesetz/01012026-gemeindeordnung-fuer-das-land-nordrhein-westfalen-bekanntmachung-der/)',
  },
  {
    id: 'schule',
    gruppe: 'investieren',
    titel: 'Neue Grundschule bauen',
    text: `Die Stadt baut eine neue Grundschule mit Sporthalle für ${euroKurz(schulKosten)}.`,
    wirkung: -schulKosten / schulNutzungsdauer,
    wissen: `Eine Investition belastet das Ergebnis nicht auf einmal. Der Wert des Gebäudes wird über seine Nutzungsdauer verteilt abgeschrieben, hier ${euroKurz(schulKosten / schulNutzungsdauer)} im Jahr. Deshalb wirken große Bauprojekte im ordentlichen Ergebnis klein. Zinsen für Kredite kommen im Finanzergebnis hinzu.`,
    posten: [{ name: 'Abschreibungen gesamt', betrag: gesamt(ZEILE.abschreibungen) }],
    annahme: `Die Schule kostet so viel wie die neue vierzügige Grundschule im York-Quartier und ist 2026 ein volles Jahr in Betrieb. Die Stadt schreibt sie gleichmäßig über ${schulNutzungsdauer} Jahre ab (in NRW sind für Schulgebäude 40 bis 80 Jahre erlaubt). Fördermittel und Betriebskosten sind nicht eingerechnet. Zinsen zählen im Planspiel nicht mit, weil sie außerhalb des ordentlichen Ergebnisses stehen. Bei einem Kredit zu ${zahl(schulZins * 100)} % wären es im ersten Jahr rund ${euroKurz(schulZins * schulKosten)}.`,
    quelle:
      'Stadt Münster, Neue Grundschule York, 2024 (https://www.presse-service.de/data.aspx/static/1170051.html); NKF-Rahmentabelle der Gesamtnutzungsdauer, 2025 (https://recht.nrw.de/system/files/BA/54831-53146-smbl_6300_20250312_a_anlage18.pdf)',
  },
  {
    id: 'grundstuecke',
    gruppe: 'investieren',
    titel: 'Städtische Grundstücke verkaufen',
    text: 'Die Stadt verkauft Grundstücke, um das Minus zu verkleinern.',
    wirkung: 0,
    wissen:
      'Der Kaufpreis fließt in die Kasse. Im Ergebnis zählt aber nur der Teil, der über dem Wert des Grundstücks in der Bilanz liegt, und das nur einmal. Im nächsten Jahr ist das Minus wieder da, und das Grundstück fehlt, etwa für Wohnungen oder Schulen.',
    posten: [{ name: 'Verkauf von Sachanlagen', betrag: daten.verkaufSachanlagen[JAHR] }],
    annahme:
      'Wie hoch die Bilanzwerte der Grundstücke sind, steht nicht im Haushaltsplan. Deshalb wird kein Gewinn angesetzt. Für 2026 plant die Stadt nur geringe Einzahlungen aus dem Verkauf von Sachanlagen.',
    quelle: 'Haushaltsplan Band 1, S. 11 (PDF), Finanzplan Zeile 19',
  },
]

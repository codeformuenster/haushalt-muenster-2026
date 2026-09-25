/**
 * Produktdaten aus `daten/produkte.json` — die Beschreibungen und Ziele, mit
 * denen der Haushaltsplan seine 184 Produkte erklärt.
 *
 * Die Datei liegt bewusst weiter in `daten/` und wird nicht ins JS-Bundle
 * gepackt: `?url` lässt Vite sie als eigene Datei ausliefern, geladen wird sie
 * erst, wenn jemand das Glossar öffnet.
 */
import produkteUrl from '../../../daten/produkte.json?url'

/** Ein Datensatz aus daten/produkte.json, Feldnamen wie dort. */
export interface Produkt {
  /** Sechsstellige Produktnummer: PB (2) + laufende Nummer der PG (2) + laufende Nummer des Produkts (2). */
  pnummer: string
  name: string
  produktbereich: string
  produktbereich_name: string
  produktgruppe: string
  produktgruppe_name: string
  dezernat: string | null
  ausschuss: string | null
  amt: string | null
  beschreibung: string
  besonderheiten_in_den_planjahren: string
  ziele_produktgruppe: string
  /**
   * Auf welcher Ebene der Haushaltsplan den Text führt: bei `produktgruppe`
   * beschreibt der Text die ganze Gruppe, das Produkt heißt dann wie sie.
   */
  quelle_ebene: 'produkt' | 'produktgruppe'
  /** PDF-Seiten in Band 1, kommagetrennt. */
  pdf_seiten: string
  beschreibung_einfach: string
  besonderheiten_einfach: string
  ziele_einfach: string
}

export interface Produktgruppe {
  nummer: string
  name: string
  /** Ziele stehen im Haushaltsplan je Produktgruppe, nicht je Produkt. */
  ziele: string
  zieleEinfach: string
  produkte: Produkt[]
  /**
   * Gruppe, die nur aus einem gleichnamigen Produkt besteht — dann wird der
   * Text direkt in der Gruppe gezeigt statt noch einmal darunter.
   */
  einzelprodukt: boolean
}

export interface Produktbereich {
  nummer: string
  name: string
  gruppen: Produktgruppe[]
  anzahlProdukte: number
}

/**
 * Die 17 Produktbereiche als feste Liste — gleicher Wortlaut wie in
 * produkte.json, aber ohne Ladevorgang. Für alles, was nur die Beschriftung zu
 * einer PB-Nummer braucht (Diagrammachsen, Filter, Tabellen), reicht das; wer
 * die Produkte selbst braucht, nimmt `ladeProduktbereiche()`.
 */
export const PRODUKTBEREICHE: { nummer: string; name: string }[] = [
  { nummer: '01', name: 'Innere Verwaltung' },
  { nummer: '02', name: 'Sicherheit und Ordnung' },
  { nummer: '03', name: 'Schulträgeraufgaben' },
  { nummer: '04', name: 'Kultur und Wissenschaft' },
  { nummer: '05', name: 'Soziale Leistungen' },
  { nummer: '06', name: 'Kinder-, Jugend- und Familienhilfe' },
  { nummer: '07', name: 'Gesundheitsdienste' },
  { nummer: '08', name: 'Sportförderung' },
  { nummer: '09', name: 'Räumliche Planung und Entwicklung/Geoinformationen' },
  { nummer: '10', name: 'Bauen und Wohnen' },
  { nummer: '11', name: 'Ver- und Entsorgung' },
  { nummer: '12', name: 'Verkehrsflächen und –anlagen, ÖPNV' },
  { nummer: '13', name: 'Natur- und Landschaftspflege' },
  { nummer: '14', name: 'Umweltschutz' },
  { nummer: '15', name: 'Wirtschaft und Tourismus' },
  { nummer: '16', name: 'Allgemeine Finanzwirtschaft' },
  { nummer: '17', name: 'Stiftungen' },
]

/** Platzhalter, mit denen der Haushaltsplan leere Felder füllt. */
const LEER = ['', 'keine', '---', '-', 'entfällt']

/** Ist in dem Feld überhaupt etwas drin, oder steht da nur „Keine"? */
export function hatInhalt(text: string | null | undefined): boolean {
  return text != null && !LEER.includes(text.trim().toLowerCase())
}

/**
 * Zerlegt einen Text in Absätze. Die Felder mischen Fließtext und nummerierte
 * Ziele („1. …"), deshalb bleibt jede Zeile so stehen, wie sie im Plan steht.
 */
export function absaetze(text: string): string[] {
  return text
    .split('\n')
    .map((zeile) => zeile.trim())
    .filter((zeile) => zeile.length > 0)
}

function gruppiere(produkte: Produkt[]): Produktbereich[] {
  const bereiche = new Map<string, Produktbereich>()
  const gruppen = new Map<string, Produktgruppe>()

  for (const produkt of [...produkte].sort((a, b) => a.pnummer.localeCompare(b.pnummer))) {
    let bereich = bereiche.get(produkt.produktbereich)
    if (!bereich) {
      bereich = {
        nummer: produkt.produktbereich,
        name: produkt.produktbereich_name,
        gruppen: [],
        anzahlProdukte: 0,
      }
      bereiche.set(bereich.nummer, bereich)
    }

    let gruppe = gruppen.get(produkt.produktgruppe)
    if (!gruppe) {
      gruppe = {
        nummer: produkt.produktgruppe,
        name: produkt.produktgruppe_name,
        ziele: produkt.ziele_produktgruppe,
        zieleEinfach: produkt.ziele_einfach,
        produkte: [],
        einzelprodukt: false,
      }
      gruppen.set(gruppe.nummer, gruppe)
      bereich.gruppen.push(gruppe)
    }

    gruppe.produkte.push(produkt)
    bereich.anzahlProdukte += 1
  }

  for (const gruppe of gruppen.values()) {
    const einziges = gruppe.produkte.length === 1 ? gruppe.produkte[0] : undefined
    gruppe.einzelprodukt = einziges?.quelle_ebene === 'produktgruppe'
  }

  return [...bereiche.values()].sort((a, b) => a.nummer.localeCompare(b.nummer))
}

/** Einmal geladen, danach aus dem Cache — mehrere Aufrufe holen die Datei nicht erneut. */
let geladen: Promise<Produktbereich[]> | undefined

export function ladeProduktbereiche(): Promise<Produktbereich[]> {
  geladen ??= fetch(produkteUrl)
    .then((antwort) => {
      if (!antwort.ok) throw new Error(`produkte.json: HTTP ${antwort.status}`)
      return antwort.json() as Promise<Produkt[]>
    })
    .then(gruppiere)
    .catch((fehler: unknown) => {
      // Sonst bliebe der fehlgeschlagene Versuch für immer im Cache stehen.
      geladen = undefined
      throw fehler
    })

  return geladen
}

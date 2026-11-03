/**
 * Zugriff auf den Gesamtergebnisplan und die Teilergebnispläne in src/data/planspiel.json
 * (erzeugt von scripts/pipeline/planspiel_daten.py). Hier stehen die Zeilennummern und die
 * Namen der Produktbereiche an einer Stelle für alle Seiten.
 */
import daten from '@/data/planspiel.json'

/** Index in den Wertelisten: Zeilennummer im Ergebnisplan − 1 (Zeile 01 steht an Stelle 0). */
export const ZEILE = {
  steuern: 0,
  zuwendungen: 1,
  oeffentlicheEntgelte: 3,
  privateEntgelte: 4,
  sonstigeErtraege: 6,
  ertraege: 9,
  personal: 10,
  versorgung: 11,
  sachleistungen: 12,
  abschreibungen: 13,
  transfers: 14,
  sonstigeAufwendungen: 15,
  aufwendungen: 16,
  ordentlichesErgebnis: 17,
  finanzertraege: 18,
  zinsen: 19,
  finanzergebnis: 20,
  ausserordentlichesErgebnis: 24,
  jahresergebnis: 25,
} as const

/** Planjahr als Schlüssel in planspiel.json, '2024' bis '2030'. */
export type Jahr = keyof typeof daten.gesamt

/** Produktbereiche mit Code und vollem Namen, z. B. { code: '01', name: 'Innere Verwaltung' }. */
export const PRODUKTBEREICHE = daten.produktbereiche

/** Betrag einer Zeile im Gesamtergebnisplan. */
export function gesamt(jahr: Jahr, zeile: number): number {
  return daten.gesamt[jahr][zeile] ?? 0
}

/** Betrag einer Zeile im Teilergebnisplan einer Produktgruppe, z. B. '0601'. */
export function produktgruppe(code: string, jahr: Jahr, zeile: number): number {
  return daten.produktgruppen.find((pg) => pg.code === code)?.werte[jahr][zeile] ?? 0
}

/** Betrag einer Zeile für einen Produktbereich, z. B. '04': Summe seiner Produktgruppen. */
export function produktbereich(code: string, jahr: Jahr, zeile: number): number {
  return daten.produktgruppen
    .filter((pg) => pg.code.startsWith(code))
    .reduce((summe, pg) => summe + (pg.werte[jahr][zeile] ?? 0), 0)
}

/** Voller Name eines Produktbereichs; unbekannte Codes kommen unverändert zurück. */
export function produktbereichName(code: string): string {
  return PRODUKTBEREICHE.find((pb) => pb.code === code)?.name ?? code
}

/**
 * Einheitliche Zahlenformate für alle Seiten. Bitte nutzen statt eigener
 * `toLocaleString`-Aufrufe — sonst steht auf jeder Seite ein anderes Format.
 */

const EURO = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const MILLIONEN = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 1,
})

const ZAHL = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

/** 12345678 -> "12.345.678 €" — für Tooltips und Tabellen. */
export function euro(wert: number): string {
  return EURO.format(wert)
}

/** 12345678 -> "12,3 Mio. €" — für Achsen und Beschriftungen am Diagramm. */
export function euroKurz(wert: number): string {
  if (Math.abs(wert) >= 1_000_000) return `${MILLIONEN.format(wert / 1_000_000)} Mio. €`
  if (Math.abs(wert) >= 1_000) return `${MILLIONEN.format(wert / 1_000)} Tsd. €`
  return EURO.format(wert)
}

/** 1234.5 -> "1.234,5" — für Stellenzahlen und andere Nicht-Geldwerte. */
export function zahl(wert: number): string {
  return ZAHL.format(wert)
}

/** Stellenanteile mit zwei Nachkommastellen, damit kleine Änderungen sichtbar bleiben. */
const VZAE = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function vzae(wert: number): string {
  return VZAE.format(wert)
}

/** 0.1234 -> "12,3 %" — für Anteile in Tooltips und Beschriftungen. */
export function prozent(anteil: number): string {
  return `${ZAHL.format(anteil * 100)} %`
}

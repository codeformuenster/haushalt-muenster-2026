/**
 * Minimaler CSV-Leser nach RFC 4180 — bewusst ohne Abhängigkeit, damit das
 * Preprocessing mit blankem `node` läuft.
 *
 * Kann, was unsere Dateien brauchen: Felder in Anführungszeichen, Kommas und
 * Zeilenumbrüche darin, verdoppelte `""` als ein `"`. Kein Semikolon-Trenner,
 * keine Kommentarzeilen — das braucht hier niemand.
 */

/** Eine Datenzeile: Spaltenname -> Wert (immer Text, nie umgewandelt). */
export type CsvZeile = Record<string, string>

/** Zerlegt CSV-Text in Zeilen aus Feldern, ohne die Kopfzeile zu deuten. */
function felder(text: string): string[][] {
  const zeilen: string[][] = []
  let zeile: string[] = []
  let feld = ''
  let inAnfuehrung = false

  for (let i = 0; i < text.length; i++) {
    const zeichen = text[i]

    if (inAnfuehrung) {
      if (zeichen === '"') {
        // Verdoppeltes "" steht für ein einzelnes " im Feld.
        if (text[i + 1] === '"') {
          feld += '"'
          i++
        } else {
          inAnfuehrung = false
        }
      } else {
        feld += zeichen
      }
      continue
    }

    if (zeichen === '"') {
      inAnfuehrung = true
    } else if (zeichen === ',') {
      zeile.push(feld)
      feld = ''
    } else if (zeichen === '\n' || zeichen === '\r') {
      // \r\n zählt als ein Umbruch.
      if (zeichen === '\r' && text[i + 1] === '\n') i++
      zeile.push(feld)
      zeilen.push(zeile)
      zeile = []
      feld = ''
    } else {
      feld += zeichen
    }
  }

  // Letzte Zeile ohne abschließenden Umbruch nicht verlieren.
  if (feld !== '' || zeile.length > 0) {
    zeile.push(feld)
    zeilen.push(zeile)
  }

  return zeilen
}

/**
 * Liest CSV-Text als Liste von Objekten; die erste Zeile ist die Kopfzeile.
 * Fehlende Felder am Zeilenende werden zu leeren Strings.
 */
export function parseCsv(text: string): CsvZeile[] {
  // Ein BOM aus Excel-Exporten würde sonst am ersten Spaltennamen kleben.
  const roh = felder(text.replace(/^﻿/, ''))
  const kopf = roh[0]
  if (!kopf) return []

  return roh.slice(1).map((werte) => {
    const zeile: CsvZeile = {}
    kopf.forEach((name, i) => {
      zeile[name] = werte[i] ?? ''
    })
    return zeile
  })
}

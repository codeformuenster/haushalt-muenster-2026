/**
 * Links in die Original-PDFs des Haushaltsplans 2026/2027 der Stadt Münster.
 *
 * Seitenangaben sind PDF-Seiten, nicht die gedruckten Seitenzahlen
 * (PDF-Seite = Seitenzahl + 6 in Band 1, + 4 in Band 2).
 */
const BASIS =
  'https://www.stadt-muenster.de/fileadmin/user_upload/stadt-muenster/20_finanzen_und_beteiligungen/pdf/Haushalt/Haushalt_2026_2027/'

const HAUSHALTSPLAN_PDF = {
  1: `${BASIS}Haushaltsplan_2026-2027_Band_1_Stand_20.05.2026.pdf`,
  2: `${BASIS}Haushaltsplan_2026-2027_Band_2_Stand_20.05.2026.pdf`,
} as const

/** Link auf eine PDF-Seite eines Bandes, z. B. pdfLink(2, 71). */
export function pdfLink(band: 1 | 2, seite: number): string {
  return `${HAUSHALTSPLAN_PDF[band]}#page=${seite}`
}

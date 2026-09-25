import { BIS_APRIL_2026, AB_MAI_2026 } from '../data/tvoed'

/** Keine Ersatzstufe: Nicht vorhandene Tabellenfelder bleiben unbewertet. */
export function jahresentgelt(key: string, year: string, stufe: number): number | null {
  if (!Number.isInteger(stufe) || stufe < 1 || stufe > 6)
    throw new RangeError('Stufe muss 1–6 sein')
  if (year !== '2026' && year !== '2027') throw new RangeError('Unbekanntes Planjahr')
  if (!key.startsWith('Tarif_')) return null
  const gruppe = key.slice(6)
  const neu = AB_MAI_2026[gruppe]?.[stufe - 1]
  const alt = BIS_APRIL_2026[gruppe]?.[stufe - 1]
  if (neu == null || alt == null) return null
  // Centbeträge, 2026 vier alte + acht neue Monate; 2027 konstantes Tarifszenario.
  return (
    (year === '2026'
      ? 4 * Math.round(alt * 100) + 8 * Math.round(neu * 100)
      : 12 * Math.round(neu * 100)) / 100
  )
}

export function schaetzung(grades: Record<string, number>, year: string, stufe: number) {
  let euro = 0,
    bewertet = 0,
    unbewertet = 0
  for (const [key, vzae] of Object.entries(grades)) {
    const betrag = jahresentgelt(key, year, stufe)
    if (betrag == null) unbewertet += vzae
    else {
      euro += betrag * vzae
      bewertet += vzae
    }
  }
  return { euro: Math.round(euro * 100) / 100, bewertet, unbewertet }
}

export function grundOhneBewertung(key: string, stufe: number): string {
  if (key.startsWith('Beamte_')) return 'Beamtenbesoldung nicht im TVöD'
  if (key === 'Tarif_S10') return 'S10 in Anlage C nicht besetzt; Überleitungsfall ungeklärt'
  if (key === 'Tarif_TVOEDFEST') return 'Individuelles Festentgelt unbekannt'
  if (key.startsWith('Tarif_P') && stufe === 1) return 'P7–P9 haben keine Stufe 1'
  return 'Keine passende Tabelle hinterlegt'
}

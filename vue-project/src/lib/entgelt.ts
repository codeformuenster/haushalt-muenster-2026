import { BESOLDUNG_A, BESOLDUNG_B } from '../data/besoldung'
import { BIS_APRIL_2026, AB_MAI_2026 } from '../data/tvoed'

function pruefeStufen(tarifStufe: number, besoldungsStufe: number) {
  if (!Number.isInteger(tarifStufe) || tarifStufe < 1 || tarifStufe > 6)
    throw new RangeError('TVöD-Stufe muss 1–6 sein')
  if (!Number.isInteger(besoldungsStufe) || besoldungsStufe < 3 || besoldungsStufe > 12)
    throw new RangeError('Besoldungsstufe muss 3–12 sein')
}

function beamtenGruppe(key: string) {
  return key.slice('Beamte_'.length).replace('_LG2E1', '').replace('_LG2E2', '').replace('A9Z', 'A9')
}

function naechsteBesoldungsstufe(gruppe: string, gewuenscht: number) {
  const stufen = Object.keys(BESOLDUNG_A[gruppe] ?? {}).map(Number)
  return stufen.sort((a, b) => Math.abs(a - gewuenscht) - Math.abs(b - gewuenscht) || a - b)[0]
}

/** Jährliches Grund-/Tabellenentgelt je VZÄ. TVÖDFEST braucht einen lokalen Mittelwert. */
export function jahresentgelt(
  key: string,
  year: string,
  tarifStufe: number,
  besoldungsStufe = 6,
): number | null {
  pruefeStufen(tarifStufe, besoldungsStufe)
  if (year !== '2026' && year !== '2027') throw new RangeError('Unbekanntes Planjahr')

  if (key.startsWith('Tarif_')) {
    const gruppe = key.slice(6)
    if (gruppe === 'TVOEDFEST') return null
    const neu = AB_MAI_2026[gruppe]?.[tarifStufe - 1]
    const alt = BIS_APRIL_2026[gruppe]?.[tarifStufe - 1]
    if (neu == null || alt == null) return null
    return (
      (year === '2026'
        ? 4 * Math.round(alt * 100) + 8 * Math.round(neu * 100)
        : 12 * Math.round(neu * 100)) / 100
    )
  }

  if (key.startsWith('Beamte_')) {
    const gruppe = beamtenGruppe(key)
    const festbetrag = BESOLDUNG_B[gruppe]
    if (festbetrag != null) return festbetrag * 12
    const stufe = naechsteBesoldungsstufe(gruppe, besoldungsStufe)
    const monatsbetrag = stufe == null ? undefined : BESOLDUNG_A[gruppe]?.[stufe]
    // Der ab April 2026 gültige Betrag wird für beide Planjahre annualisiert.
    return monatsbetrag == null ? null : monatsbetrag * 12
  }

  return null
}

export function schaetzung(
  grades: Record<string, number>,
  year: string,
  tarifStufe: number,
  besoldungsStufe = 6,
) {
  let euro = 0
  let bewertet = 0
  let unbewertet = 0
  let angenahert = 0
  let tarifEuro = 0
  let tarifVzae = 0

  for (const [key, vzae] of Object.entries(grades)) {
    if (key === 'Tarif_TVOEDFEST') continue
    const betrag = jahresentgelt(key, year, tarifStufe, besoldungsStufe)
    if (betrag == null) {
      unbewertet += vzae
      continue
    }
    euro += betrag * vzae
    bewertet += vzae
    if (key.startsWith('Tarif_')) {
      tarifEuro += betrag * vzae
      tarifVzae += vzae
    }
    if (hinweisZumWert(key, tarifStufe, besoldungsStufe)) angenahert += vzae
  }

  const durchschnittTarif = tarifVzae ? tarifEuro / tarifVzae : 0
  const festVzae = grades.Tarif_TVOEDFEST ?? 0
  if (festVzae && durchschnittTarif) {
    euro += durchschnittTarif * festVzae
    bewertet += festVzae
    angenahert += festVzae
  } else {
    unbewertet += festVzae
  }

  return {
    euro: Math.round(euro * 100) / 100,
    bewertet,
    unbewertet,
    angenahert,
    durchschnittTarif,
  }
}

export function hinweisZumWert(
  key: string,
  tarifStufe: number,
  besoldungsStufe: number,
): string | null {
  if (key === 'Tarif_TVOEDFEST') return 'Mittelwert der übrigen Tarifstellen dieser Produktgruppe'
  if (key === 'Tarif_S10') return 'Mittelwert aus S9 und S11b'
  if (key.startsWith('Tarif_P') && tarifStufe === 1)
    return 'Stufe 1 aus dem Abstand zwischen Stufe 2 und 3 zurückgerechnet'
  if (key === 'Beamte_A9Z') return 'A9-Grundgehalt; Amtszulage nicht enthalten'
  if (key.startsWith('Beamte_A')) {
    const gruppe = beamtenGruppe(key)
    const verwendeteStufe = naechsteBesoldungsstufe(gruppe, besoldungsStufe)
    if (verwendeteStufe !== besoldungsStufe)
      return `Nächstgelegene vorhandene Erfahrungsstufe: ${verwendeteStufe}`
  }
  return null
}

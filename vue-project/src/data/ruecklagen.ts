/**
 * Rücklagen und Jahresergebnisse 2024-2030 aus src/data/ruecklagen.json (Vorbericht, Band 2,
 * S. 18). Die JSON-Datei hält Mio. € wie der Vorbericht; hier stehen die Reihen in €.
 */
import ruecklagen from '@/data/ruecklagen.json'

const MIO = 1_000_000
// inanspruchnahmeProzent ist schon eine Prozentzahl und bleibt außen vor.
const { jahre, inanspruchnahmeProzent: _prozent, ...reihen } = ruecklagen

type Reihe = keyof typeof reihen

/** Alle Reihen aus ruecklagen.json in €, außer jahre und inanspruchnahmeProzent. */
export const RUECKLAGEN = Object.fromEntries(
  Object.entries(reihen).map(([name, werte]) => [name, werte.map((wert) => wert * MIO)]),
) as Record<Reihe, number[]>

/** Wert einer Reihe im Jahr, z. B. imJahr(RUECKLAGEN.jahresergebnis, 2026); 0, wenn es fehlt. */
export function imJahr(reihe: number[], jahr: number): number {
  return reihe[jahre.indexOf(jahr)] ?? 0
}

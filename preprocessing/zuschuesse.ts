/**
 * Zuschussbericht (Haushaltsplan 2026/27, Band 2, S. 341–362) aufbereiten.
 *
 *   node preprocessing/zuschuesse.ts
 *
 * Liest  daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027.csv,
 * bereinigt die Extraktionsfehler aus dem PDF-Export und schreibt
 * vue-project/public/daten/zuschuesse-2026-2027.json.
 *
 * Am Ende prüft sich das Skript gegen die Soll-Werte aus plan.md, Abschnitt 5,
 * und bricht mit Exit-Code 1 ab, wenn eine Zahl nicht stimmt. Die Rohdaten in
 * daten/ bleiben unangetastet — Quelle der Wahrheit.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseCsv, type CsvZeile } from './csv.ts'

const WURZEL = fileURLToPath(new URL('..', import.meta.url))
const QUELLE_DETAIL = `${WURZEL}daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027.csv`
const QUELLE_GRUPPEN = `${WURZEL}daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027_nach_Produktgruppe.csv`
const ZIEL = `${WURZEL}vue-project/public/daten/zuschuesse-2026-2027.json`

/** Die vier Werte der Spalte `verpflichtend_freiwillig`, von frei nach gebunden. */
const GRADE = ['freiwillig', 'dem Grunde nach', 'der Höhe nach', 'Höhe und Grund nach'] as const
type Grad = (typeof GRADE)[number]

interface Posten {
  nr: number
  produktgruppe: string
  produktbereich: string
  empfaenger: string
  zweck: string
  grad: Grad
  eur2026: number
  eur2027: number
  /** Jahreszahl als Text ("2030") oder der Originaltext ("jährlich", "Schuljahr"). */
  befristetBis: string
}

// ---------------------------------------------------------------- Bereinigung

/** `"46000.0"` -> `46000`. Zahlen stehen in der CSV als Strings. */
function zahl(text: string, wo: string): number {
  const wert = Number(text)
  if (!Number.isFinite(wert)) throw new Error(`Keine Zahl in ${wo}: ${JSON.stringify(text)}`)
  return wert
}

/** Der Produktbereich steckt in den ersten zwei Ziffern der Produktgruppe. */
function produktbereichVon(produktgruppe: string): string {
  return produktgruppe.slice(0, 2)
}

/**
 * Beim PDF-Export sind Silbentrennungen als `"- "` stehen geblieben
 * ("Musikschul- arbeit", "Münster- Gievenbeck").
 *
 * Aufpassen: `"- "` allein trifft auch 40+ korrekte Stellen — einmal das
 * deutsche Auslassungs-Bindestrich ("Kinder- und Jugendhilfe"), einmal den
 * Gedankenstrich mit Leerzeichen auf beiden Seiten ("Die Linse - Verein ...").
 * Beide dürfen nicht angefasst werden. Zwei Bedingungen trennen die Fälle:
 *
 *   1. kein Leerzeichen VOR dem Bindestrich (sonst ist es ein Gedankenstrich)
 *   2. und dann entweder das nächste Wort beginnt groß  -> Bindestrich behalten
 *      oder es beginnt klein und ist kein Auslassungswort -> ganz zusammenziehen
 */
const AUSLASSUNG = /^(und|oder|bzw\.|u\.)$/
let trennstricheGeheilt = 0

function trennstricheHeilen(text: string): string {
  return text.replace(/(\S)- (\S+)/gu, (treffer, davor: string, danach: string) => {
    if (/^\p{Lu}/u.test(danach)) {
      trennstricheGeheilt++
      return `${davor}-${danach}`
    }
    if (AUSLASSUNG.test(danach)) return treffer
    trennstricheGeheilt++
    return `${davor}${danach}`
  })
}

/** Mehrfache Leerzeichen aus dem Spaltenumbruch des PDF zusammenziehen. */
function text(roh: string): string {
  return trennstricheHeilen(roh.replace(/\s+/gu, ' ').trim())
}

/**
 * Die Spalte ist mal ein Datum, mal Freitext. Aus dem Datum interessiert nur
 * das Jahr — der Tag sagt nichts, den Freitext ("jährlich", "Schuljahr",
 * "10 Jahre") behalten wir wörtlich, statt ihn in ein Jahr zu pressen.
 */
function befristungVon(roh: string): string {
  const datum = /^\d{2}\.\d{2}\.(\d{4})$/.exec(roh.trim())
  return datum?.[1] ?? roh.trim()
}

function istGrad(wert: string): wert is Grad {
  return (GRADE as readonly string[]).includes(wert)
}

function postenAus(zeile: CsvZeile, nr: number): Posten {
  const grad = zeile.verpflichtend_freiwillig?.trim() ?? ''
  if (!istGrad(grad)) throw new Error(`Unbekannter Verpflichtungsgrad in Zeile ${nr}: "${grad}"`)

  const produktgruppe = zeile.Produktgruppe?.trim() ?? ''
  return {
    nr,
    produktgruppe,
    produktbereich: produktbereichVon(produktgruppe),
    empfaenger: text(zeile.Empfaenger ?? ''),
    zweck: text(zeile.Verwendungszweck_Zielsetzung ?? ''),
    grad,
    eur2026: zahl(zeile.Zuschuss_2026_EUR ?? '', `Zeile ${nr}, 2026`),
    eur2027: zahl(zeile.Zuschuss_2027_EUR ?? '', `Zeile ${nr}, 2027`),
    befristetBis: befristungVon(zeile.zeitliche_Befristung ?? ''),
  }
}

function einlesen(): Posten[] {
  return parseCsv(readFileSync(QUELLE_DETAIL, 'utf8'))
    // Die angehängte `Gesamtsumme`-Zeile hat keine LfdNr; bliebe sie drin,
    // zählte der ganze Bericht doppelt.
    .filter((zeile) => (zeile.LfdNr ?? '').trim() !== '')
    .map((zeile, i) => postenAus(zeile, zahl(zeile.LfdNr ?? '', `LfdNr in Datenzeile ${i + 1}`)))
}

// ------------------------------------------------------------------- Prüfung

let fehler = 0

function pruefe(was: string, ist: number | string, soll: number | string): void {
  const gut = ist === soll
  if (!gut) fehler++
  console.log(`  ${gut ? '✓' : '✗'} ${was}: ${ist}${gut ? '' : `  (erwartet: ${soll})`}`)
}

const summe = (posten: Posten[], jahr: 'eur2026' | 'eur2027' = 'eur2026'): number =>
  posten.reduce((s, p) => s + p[jahr], 0)

function mitGrad(posten: Posten[], grad: Grad): Posten[] {
  return posten.filter((p) => p.grad === grad)
}

/**
 * Gegenprobe gegen die zweite CSV: aggregiert man die Detailzeilen nach
 * Produktgruppe und Produktbereich, muss exakt dasselbe herauskommen. Die
 * Datei selbst wird nicht ausgeliefert — sie enthält nur Klartextnamen und
 * Summen, die wir hier ohnehin ausrechnen.
 */
function gegenprobe(posten: Posten[]): void {
  const gruppen = parseCsv(readFileSync(QUELLE_GRUPPEN, 'utf8'))
  let geprueft = 0
  let abweichungen = 0

  for (const zeile of gruppen) {
    const ebene = zeile.Ebene ?? ''
    const code = (zeile.Code ?? '').trim()
    if (ebene !== 'PG' && ebene !== 'Produktbereich-Summe') continue

    const eigene = posten.filter((p) =>
      ebene === 'PG' ? p.produktgruppe === code : p.produktbereich === code,
    )
    const soll = {
      anzahl: zahl(zeile.AnzahlZuschuesse ?? '', `${code} Anzahl`),
      eur2026: zahl(zeile.Zuschuss_2026_EUR ?? '', `${code} 2026`),
      eur2027: zahl(zeile.Zuschuss_2027_EUR ?? '', `${code} 2027`),
    }
    geprueft++

    if (
      eigene.length !== soll.anzahl ||
      summe(eigene) !== soll.eur2026 ||
      summe(eigene, 'eur2027') !== soll.eur2027
    ) {
      abweichungen++
      console.log(
        `  ✗ ${ebene} ${code}: ${eigene.length}/${summe(eigene)}/${summe(eigene, 'eur2027')} ` +
          `statt ${soll.anzahl}/${soll.eur2026}/${soll.eur2027}`,
      )
    }
  }

  pruefe('geprüfte Zeilen der zweiten CSV (29 PG + 12 PB)', geprueft, 41)
  pruefe('Abweichungen zur zweiten CSV', abweichungen, 0)
}

function pruefungen(posten: Posten[]): void {
  console.log('\nGesamt')
  pruefe('Posten', posten.length, 339)
  pruefe('Summe 2026', summe(posten), 225_778_621)
  pruefe('Summe 2027', summe(posten, 'eur2027'), 232_902_814)

  console.log('\nNach Verpflichtungsgrad (2026)')
  const soll: Record<Grad, [number, number]> = {
    'Höhe und Grund nach': [3, 160_905_315],
    'dem Grunde nach': [183, 51_786_119],
    freiwillig: [151, 12_868_687],
    'der Höhe nach': [2, 218_500],
  }
  for (const grad of GRADE) {
    const teil = mitGrad(posten, grad)
    pruefe(`${grad} — Posten`, teil.length, soll[grad][0])
    pruefe(`${grad} — Summe 2026`, summe(teil), soll[grad][1])
  }

  const verhandelbar = posten.filter(
    (p) => p.grad === 'freiwillig' || p.grad === 'dem Grunde nach',
  )
  console.log('\nAbgeleitet')
  pruefe('verhandelbar — Posten', verhandelbar.length, 334)
  pruefe('verhandelbar — Summe 2026', summe(verhandelbar), 64_654_806)
  pruefe('gebunden — Summe 2026', summe(posten) - summe(verhandelbar), 161_123_815)

  console.log('\nNach Produktbereich (2026, Auszug aus plan.md)')
  const sollPb: Array<[string, number, number, number]> = [
    // [PB, gesamt, freiwillig, dem Grunde nach]
    ['08', 5_086_430, 5_086_430, 0],
    ['04', 4_276_770, 4_276_770, 0],
    ['06', 202_104_295, 0, 40_995_480],
    ['05', 5_141_575, 496_630, 4_644_945],
    ['03', 4_653_770, 124_610, 4_514_160],
  ]
  for (const [pb, gesamt, frei, grund] of sollPb) {
    const teil = posten.filter((p) => p.produktbereich === pb)
    pruefe(`PB ${pb} — gesamt`, summe(teil), gesamt)
    pruefe(`PB ${pb} — freiwillig`, summe(mitGrad(teil, 'freiwillig')), frei)
    pruefe(`PB ${pb} — dem Grunde nach`, summe(mitGrad(teil, 'dem Grunde nach')), grund)
  }
  const bereicheMitGeld = new Set(posten.filter((p) => p.eur2026 > 0).map((p) => p.produktbereich))
  pruefe('Produktbereiche mit Zuschüssen > 0', bereicheMitGeld.size, 12)

  console.log('\nBefristung (alle Posten, 2026)')
  const sollBefristung: Array<[string[], number, number]> = [
    [['2026'], 8, 202_570],
    [['2027'], 15, 318_515],
    [['2028'], 87, 168_485_170],
    [['2029'], 56, 4_781_452],
    [['2030'], 82, 12_061_523],
    [['2031'], 33, 31_876_982],
    [['2032', '2033', '2034'], 42, 4_120_829],
    [['jährlich'], 10, 450_750],
    [['Schuljahr', 'Schuljahr bzw. teilweise Haushaltsjahr'], 4, 3_459_310],
    [['10 Jahre'], 2, 21_520],
  ]
  let erfasst = 0
  for (const [werte, anzahl, betrag] of sollBefristung) {
    const teil = posten.filter((p) => werte.includes(p.befristetBis))
    erfasst += teil.length
    pruefe(`bis ${werte.join(' / ')} — Posten`, teil.length, anzahl)
    pruefe(`bis ${werte.join(' / ')} — Summe 2026`, summe(teil), betrag)
  }
  pruefe('alle Posten in einer Befristungs-Kategorie', erfasst, 339)

  console.log('\nTextbereinigung')
  pruefe('geheilte Trennstriche', trennstricheGeheilt, 21)
  const alleTexte = posten.map((p) => `${p.empfaenger} ${p.zweck}`).join('\n')
  pruefe('verbliebene Trennungs-Artefakte', (alleTexte.match(/\S- \p{Lu}/gu) ?? []).length, 0)
  pruefe(
    'unversehrte Auslassungsstriche ("Kinder- und ...")',
    (alleTexte.match(/\S- (und|oder|bzw\.|u\.)(?=\s|$)/gu) ?? []).length,
    49,
  )

  console.log('\nVollständigkeit')
  const luecken = posten.filter(
    (p) =>
      !p.produktgruppe ||
      !p.produktbereich ||
      !p.empfaenger ||
      !p.befristetBis ||
      !Number.isFinite(p.eur2026) ||
      !Number.isFinite(p.eur2027),
  )
  pruefe('Posten mit leerem Feld oder NaN', luecken.length, 0)

  console.log('\nGegenprobe gegen die zweite CSV')
  gegenprobe(posten)
}

// ----------------------------------------------------------------------- Lauf

const posten = einlesen()
pruefungen(posten)

if (fehler > 0) {
  console.error(`\n${fehler} Soll-Wert(e) nicht getroffen — nichts geschrieben.`)
  process.exit(1)
}

writeFileSync(
  ZIEL,
  `${JSON.stringify(
    {
      quelle: 'Haushaltsplan 2026/27, Band 2, S. 341–362 (Zuschussbericht)',
      erzeugtAm: new Date().toISOString().slice(0, 10),
      posten,
    },
    null,
    2,
  )}\n`,
  'utf8',
)

console.log(`\nAlle Soll-Werte getroffen. ${posten.length} Posten geschrieben nach`)
console.log(`  ${ZIEL.replace(WURZEL, '')}`)

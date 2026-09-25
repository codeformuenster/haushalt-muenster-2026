/**
 * Bezirksbezogene Haushaltsangaben (Haushaltsplan 2026/27, Band 2, S. 143–324)
 * und die Geometrie der sechs Stadtbezirke aufbereiten.
 *
 *   node preprocessing/bezirke.ts
 *
 * Liest  daten/agg_tables/Bezirksvertretungen_Investitionsmassnahmen_2026_2027.csv
 *        daten/geo/stadtbezirke-muenster.geojson
 * Schreibt vue-project/public/daten/bezirke-2026-2027.json
 *          vue-project/public/daten/stadtbezirke.geojson
 *
 * Am Ende prüft sich das Skript gegen Soll-Werte und bricht mit Exit-Code 1 ab,
 * wenn eine Zahl nicht stimmt. Die Rohdaten in daten/ bleiben unangetastet.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseCsv, type CsvZeile } from './csv.ts'

const WURZEL = fileURLToPath(new URL('..', import.meta.url))
const QUELLE_CSV = `${WURZEL}daten/agg_tables/Bezirksvertretungen_Investitionsmassnahmen_2026_2027.csv`
const QUELLE_GEO = `${WURZEL}daten/geo/stadtbezirke-muenster.geojson`
const ZIEL_JSON = `${WURZEL}vue-project/public/daten/bezirke-2026-2027.json`
const ZIEL_GEO = `${WURZEL}vue-project/public/daten/stadtbezirke.geojson`

/**
 * Die sechs Bezirke unter einem gemeinsamen Kurznamen. Nötig, weil CSV und
 * GeoJSON je eigene Schreibweisen mitbringen: die CSV umschreibt den Umlaut
 * ("Muenster-Suedost"), das GeoJSON nicht ("Münster-Südost") und nennt Mitte
 * ohne Präfix ("Mitte"). Der Kurzname ist zugleich die Beschriftung im UI —
 * auf einer Karte von Münster muss nicht sechsmal "Münster-" davorstehen.
 *
 * Die Reihenfolge ist die amtliche Bezirksnummer, nicht alphabetisch.
 */
const BEZIRKE = [
  { name: 'Mitte', nr: '1', csv: 'Muenster-Mitte', geo: 'Mitte' },
  { name: 'West', nr: '5', csv: 'Muenster-West', geo: 'Münster-West' },
  { name: 'Nord', nr: '6', csv: 'Muenster-Nord', geo: 'Münster-Nord' },
  { name: 'Ost', nr: '7', csv: 'Muenster-Ost', geo: 'Münster-Ost' },
  { name: 'Südost', nr: '8', csv: 'Muenster-Suedost', geo: 'Münster-Südost' },
  { name: 'Hiltrup', nr: '9', csv: 'Muenster-Hiltrup', geo: 'Münster-Hiltrup' },
] as const

interface Posten {
  bezirk: string
  fachthema: string
  /**
   * Falsch bei Posten, die in jeder Bezirksvertretung mit demselben Betrag
   * auftauchen — sie sind gesamtstädtisch und nur nachrichtlich im Bezirk
   * abgedruckt. Die Seite weist sie deshalb gesondert aus.
   */
  bezirksspezifisch: boolean
  ein2026: number
  aus2026: number
  ein2027: number
  aus2027: number
}

// ---------------------------------------------------------------- Bereinigung

/** `"800000.0"` -> `800000`. Zahlen stehen in der CSV als Strings. */
function zahl(text: string, wo: string): number {
  const wert = Number(text)
  if (!Number.isFinite(wert)) throw new Error(`Keine Zahl in ${wo}: ${JSON.stringify(text)}`)
  return wert
}

/**
 * Die Spalte `BezirksspezifischGeprueft` ist entweder `JA` oder ein Satz, der
 * mit `NEIN` beginnt und den Grund nennt. Uns interessiert nur das Ja/Nein.
 */
function istBezirksspezifisch(text: string, wo: string): boolean {
  if (text === 'JA') return true
  if (text.startsWith('NEIN')) return false
  throw new Error(`Unerwarteter Prüfvermerk in ${wo}: ${JSON.stringify(text)}`)
}

function kurznameVon(csvName: string): string {
  const treffer = BEZIRKE.find((b) => b.csv === csvName)
  if (!treffer) throw new Error(`Unbekannte Bezirksvertretung: ${JSON.stringify(csvName)}`)
  return treffer.name
}

function einlesen(): Posten[] {
  const zeilen: CsvZeile[] = parseCsv(readFileSync(QUELLE_CSV, 'utf8'))

  return zeilen.map((z, i) => {
    const wo = `Zeile ${i + 2}`
    return {
      bezirk: kurznameVon(z.Bezirksvertretung ?? ''),
      fachthema: (z.Fachthema ?? '').trim(),
      bezirksspezifisch: istBezirksspezifisch(z.BezirksspezifischGeprueft ?? '', wo),
      ein2026: zahl(z.Einzahlungen_2026_EUR ?? '', `${wo} Einzahlungen 2026`),
      aus2026: zahl(z.Auszahlungen_2026_EUR ?? '', `${wo} Auszahlungen 2026`),
      ein2027: zahl(z.Einzahlungen_2027_EUR ?? '', `${wo} Einzahlungen 2027`),
      aus2027: zahl(z.Auszahlungen_2027_EUR ?? '', `${wo} Auszahlungen 2027`),
    }
  })
}

// -------------------------------------------------------------------- Geodaten

/**
 * Nachkommastellen der Koordinaten. Fünf entsprechen gut einem Meter — mehr
 * als eine Übersichtskarte je auflöst, und es drittelt die Dateigröße.
 */
const STELLEN = 5

type Ring = [number, number][]

/**
 * Rundet die Koordinaten und wirft Punkte weg, die dadurch auf ihrem Vorgänger
 * landen. Die ursprüngliche Datei kommt aus einem Shapefile und enthält viele
 * Stützpunkte im Zentimeterabstand.
 */
function ringVereinfachen(ring: Ring): Ring {
  const gerundet = ring.map(
    ([laenge, breite]) =>
      [Number(laenge.toFixed(STELLEN)), Number(breite.toFixed(STELLEN))] as [number, number],
  )
  const knapp = gerundet.filter(
    (punkt, i) => i === 0 || punkt[0] !== gerundet[i - 1]?.[0] || punkt[1] !== gerundet[i - 1]?.[1],
  )
  // Ein Polygonring muss geschlossen bleiben: letzter Punkt gleich erstem.
  const erster = knapp[0]
  const letzter = knapp[knapp.length - 1]
  if (erster && letzter && (erster[0] !== letzter[0] || erster[1] !== letzter[1])) {
    knapp.push([erster[0], erster[1]])
  }
  return knapp
}

interface GeoFeature {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: { type: 'Polygon'; coordinates: Ring[] }
}

/**
 * Baut aus dem amtlichen GeoJSON eine schlanke Fassung für die Karte: nur der
 * Kurzname als Eigenschaft (ECharts ordnet Daten über `properties.name` zu),
 * gerundete Koordinaten, Bezirke in amtlicher Nummernfolge.
 */
function geoAufbereiten(): { geo: unknown; punkteVorher: number; punkteNachher: number } {
  const roh = JSON.parse(readFileSync(QUELLE_GEO, 'utf8')) as {
    features: GeoFeature[]
  }

  let punkteVorher = 0
  let punkteNachher = 0

  const features = BEZIRKE.map((bezirk) => {
    const treffer = roh.features.filter((f) => f.properties.NAME_STADT === bezirk.geo)
    if (treffer.length !== 1) {
      throw new Error(`${treffer.length} Geometrien für ${bezirk.geo} statt genau einer`)
    }
    const quelle = treffer[0] as GeoFeature
    if (quelle.geometry.type !== 'Polygon') {
      throw new Error(`${bezirk.geo}: Geometrie ist ${quelle.geometry.type}, erwartet Polygon`)
    }

    const ringe = quelle.geometry.coordinates.map((ring) => {
      punkteVorher += ring.length
      const schlank = ringVereinfachen(ring)
      punkteNachher += schlank.length
      return schlank
    })

    return {
      type: 'Feature' as const,
      // ECharts liest den Gebietsnamen aus properties.name.
      properties: { name: bezirk.name, nr: bezirk.nr },
      geometry: { type: 'Polygon' as const, coordinates: ringe },
    }
  })

  return {
    geo: { type: 'FeatureCollection', features },
    punkteVorher,
    punkteNachher,
  }
}

// -------------------------------------------------------------------- Prüfung

let fehler = 0

function pruefe(was: string, ist: number, soll: number): void {
  const gut = ist === soll
  if (!gut) fehler++
  const zeichen = gut ? '  ok' : 'FEHL'
  console.log(`${zeichen}  ${was}: ${ist}${gut ? '' : ` (erwartet ${soll})`}`)
}

const summe = (liste: Posten[], feld: keyof Posten): number =>
  liste.reduce((s, p) => s + (p[feld] as number), 0)

/**
 * Soll-Werte, von Hand aus der CSV nachgerechnet. Ändert sich die CSV, müssen
 * die Zahlen hier bewusst nachgezogen werden — genau das ist der Zweck.
 */
function pruefungen(posten: Posten[], punkteNachher: number): void {
  console.log('Umfang')
  pruefe('Zeilen', posten.length, 83)
  pruefe('Bezirke', new Set(posten.map((p) => p.bezirk)).size, 6)
  pruefe('Fachthemen', new Set(posten.map((p) => p.fachthema)).size, 19)

  console.log('\nSummen über alle Bezirke')
  pruefe('Auszahlungen 2026', summe(posten, 'aus2026'), 306_110_070)
  pruefe('Auszahlungen 2027', summe(posten, 'aus2027'), 383_225_740)
  pruefe('Einzahlungen 2026', summe(posten, 'ein2026'), 23_168_190)
  pruefe('Einzahlungen 2027', summe(posten, 'ein2027'), 21_635_670)

  console.log('\nAuszahlungen 2026 je Bezirk')
  const sollBezirk: [string, number][] = [
    ['Mitte', 80_836_100],
    ['West', 74_699_920],
    ['Nord', 34_719_520],
    ['Ost', 35_103_580],
    ['Südost', 37_240_560],
    ['Hiltrup', 43_510_390],
  ]
  for (const [name, betrag] of sollBezirk) {
    pruefe(name, summe(posten.filter((p) => p.bezirk === name), 'aus2026'), betrag)
  }

  console.log('\nDie drei größten Fachthemen 2026')
  const sollThema: [string, number][] = [
    ['Leistungen für Schulen', 184_977_520],
    ['Bereitstellung von Verkehrsflächen und -anlagen', 38_525_000],
    ['Förderung von Kindern in Tagesbetreuung', 24_152_250],
  ]
  for (const [name, betrag] of sollThema) {
    pruefe(name, summe(posten.filter((p) => p.fachthema === name), 'aus2026'), betrag)
  }

  console.log('\nGesamtstädtische Posten')
  const gesamtstaedtisch = posten.filter((p) => !p.bezirksspezifisch)
  pruefe('Zeilen ohne Bezirksbezug', gesamtstaedtisch.length, 6)
  pruefe('deren Auszahlungen 2026', summe(gesamtstaedtisch, 'aus2026'), 379_620)

  console.log('\nVollständigkeit')
  const luecken = posten.filter(
    (p) =>
      !p.bezirk ||
      !p.fachthema ||
      ![p.ein2026, p.aus2026, p.ein2027, p.aus2027].every((w) => Number.isFinite(w)),
  )
  pruefe('Posten mit leerem Feld oder NaN', luecken.length, 0)
  // Jeder Bezirk muss in der Karte wie in den Zahlen vorkommen, sonst bleibt
  // ein Gebiet grau, ohne dass es jemandem auffällt.
  pruefe(
    'Bezirke ohne Auszahlungen 2026',
    BEZIRKE.filter((b) => summe(posten.filter((p) => p.bezirk === b.name), 'aus2026') === 0).length,
    0,
  )

  console.log('\nGeometrie')
  // Untere Schranke statt exaktem Wert: die Rundung darf die Umrisse ausdünnen,
  // aber nicht zu Dreiecken zusammenfallen lassen.
  const genugPunkte = punkteNachher > 3000
  if (!genugPunkte) fehler++
  console.log(
    `${genugPunkte ? '  ok' : 'FEHL'}  Stützpunkte nach Rundung: ${punkteNachher} (erwartet > 3000)`,
  )
}

// ----------------------------------------------------------------------- Lauf

const posten = einlesen()
const { geo, punkteVorher, punkteNachher } = geoAufbereiten()

pruefungen(posten, punkteNachher)

if (fehler > 0) {
  console.error(`\n${fehler} Soll-Wert(e) nicht getroffen — nichts geschrieben.`)
  process.exit(1)
}

writeFileSync(
  ZIEL_JSON,
  `${JSON.stringify(
    {
      quelle: 'Haushaltsplan 2026/27, Band 2, S. 143–324 (Bezirksbezogene Haushaltsangaben)',
      erzeugtAm: new Date().toISOString().slice(0, 10),
      bezirke: BEZIRKE.map((b) => ({ name: b.name, nr: b.nr })),
      posten,
    },
    null,
    2,
  )}\n`,
  'utf8',
)

// Ohne Einrückung: die Datei besteht fast nur aus Koordinatenpaaren.
writeFileSync(ZIEL_GEO, `${JSON.stringify(geo)}\n`, 'utf8')

console.log(`\nAlle Soll-Werte getroffen. ${posten.length} Posten geschrieben nach`)
console.log(`  ${ZIEL_JSON.replace(WURZEL, '')}`)
console.log(`Geometrie: ${punkteVorher} -> ${punkteNachher} Stützpunkte, geschrieben nach`)
console.log(`  ${ZIEL_GEO.replace(WURZEL, '')}`)

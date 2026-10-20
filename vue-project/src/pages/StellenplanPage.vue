<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import { RouterLink, useRoute } from 'vue-router'
import PageIntro from '@/components/ui/PageIntro.vue'
import GlossarBegriff from '@/components/ui/GlossarBegriff.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import { KATEGORIE_FARBEN, POL_FARBEN } from '@/charts/echartsTheme'
import { euro, euroKurz, prozent, vzae } from '@/charts/format'
import { BESOLDUNG_QUELLE } from '@/data/besoldung'
import daten from '@/data/stellenplan.json'
import { TARIF_QUELLEN } from '@/data/tvoed'
import { hinweisZumWert, jahresentgelt, schaetzung } from '@/lib/entgelt'

type Ansicht = 'map' | 'change'
type Kennzahl = 'vzae' | 'entgelt'
type Stelle = {
  code: string
  name: string
  year: string
  total: number
  grades: Record<string, number>
}
const stellen: Stelle[] = daten.rows.map((row) => {
  const grades: Record<string, number> = {}
  for (const [key, value] of Object.entries(row.grades)) {
    if (typeof value === 'number') grades[key] = value
  }
  return { ...row, grades }
})
type RangZeile = {
  code: string
  name: string
  value: number
  kind: 'area' | 'group'
}

const route = useRoute()
const jahr = ref(route.query.jahr === '2027' ? '2027' : '2026')
const bereich = ref('all')
const ansicht = ref<Ansicht>('map')
const kennzahl = ref<Kennzahl>(route.query.kennzahl === 'entgelt' ? 'entgelt' : 'vzae')
const auswahl = ref('')
const stufe = ref(3)
const besoldungsStufe = ref(6)
/** Der gewählte Wert eines <wa-select>-change-Events. */
const auswahlWert = (ereignis: Event) => (ereignis.target as HTMLInputElement).value
const ansichten: { id: Ansicht; name: string }[] = [
  { id: 'map', name: 'Bestand' },
  { id: 'change', name: 'Veränderungen' },
]
const index = new Map(stellen.map((r) => [`${r.year}:${r.code}`, r]))
const differenz = (code: string) =>
  Math.round(
    ((index.get(`2027:${code}`)?.total ?? 0) - (index.get(`2026:${code}`)?.total ?? 0)) * 100,
  ) / 100
const entgelt = (row: Stelle | undefined) =>
  row ? schaetzung(row.grades, row.year, stufe.value, besoldungsStufe.value).euro : 0
const entgeltDifferenz = (code: string) =>
  entgelt(index.get(`2027:${code}`)) - entgelt(index.get(`2026:${code}`))
const wert = (row: Stelle) => (kennzahl.value === 'vzae' ? row.total : entgelt(row))
const veraenderung = (code: string) =>
  kennzahl.value === 'vzae' ? differenz(code) : entgeltDifferenz(code)
const vorzeichen = (wert: number) => `${wert > 0 ? '+' : ''}${vzae(wert)}`
const geldVorzeichen = (wert: number) => `${wert > 0 ? '+' : ''}${euroKurz(wert)}`
const wertFormat = (value: number) =>
  kennzahl.value === 'vzae' ? `${vzae(value)} VZÄ` : euroKurz(value)
const deltaFormat = (value: number) =>
  kennzahl.value === 'vzae' ? `${vorzeichen(value)} VZÄ` : geldVorzeichen(value)
const anzeigeName = (name: string) =>
  name
    .toLocaleLowerCase('de-DE')
    .replace(/(^|[\s/-])\p{L}/gu, (treffer) => treffer.toLocaleUpperCase('de-DE'))
const auswahlZeilen = computed(() =>
  stellen.filter(
    (r) => r.year === jahr.value && (bereich.value === 'all' || r.code.startsWith(bereich.value)),
  ),
)
const bereiche = computed<RangZeile[]>(() =>
  Object.entries(daten.areas)
    .map(([code, name]) => ({
      code,
      name,
      value: stellen
        .filter((row) => row.year === jahr.value && row.code.startsWith(code))
        .reduce((summe, row) => summe + wert(row), 0),
      kind: 'area' as const,
    }))
    .filter((row) => row.value > 0),
)
const sortiert = computed<RangZeile[]>(() => {
  if (ansicht.value === 'map' && bereich.value === 'all')
    return [...bereiche.value].sort((a, b) => b.value - a.value)
  return auswahlZeilen.value
    .map((row) => ({
      code: row.code,
      name: anzeigeName(row.name),
      value: ansicht.value === 'change' ? veraenderung(row.code) : wert(row),
      kind: 'group' as const,
    }))
    .filter((row) => ansicht.value !== 'change' || row.value !== 0)
    .sort((a, b) =>
      ansicht.value === 'change' ? Math.abs(b.value) - Math.abs(a.value) : b.value - a.value,
    )
})
const balken = computed(() => [...sortiert.value].filter((row) => row.kind === 'group').reverse())
const topListe = computed(() => sortiert.value.slice(0, 7))
const aktuell = computed(() =>
  stellen.find((row) => row.year === jahr.value && row.code === auswahl.value),
)
watch([bereich, jahr], () => {
  if (aktuell.value && (bereich.value === 'all' || aktuell.value.code.startsWith(bereich.value)))
    return
  auswahl.value = ''
})
const gesamt = computed(() =>
  stellen.filter((r) => r.year === jahr.value).reduce((sum, r) => sum + r.total, 0),
)
const gesamtDelta = stellen
  .filter((r) => r.year === '2027')
  .reduce((sum, r) => sum + differenz(r.code), 0)
const gruppen = computed(() =>
  Object.entries(aktuell.value?.grades ?? {})
    .filter(([, wert]) => wert > 0)
    .sort((a, b) => b[1] - a[1]),
)
const aktuelleSchaetzung = computed(() =>
  schaetzung(aktuell.value?.grades ?? {}, jahr.value, stufe.value, besoldungsStufe.value),
)
const stadtSchaetzung = computed(() =>
  stellen
    .filter((r) => r.year === jahr.value)
    .reduce(
      (summe, r) => {
        const wert = schaetzung(r.grades, jahr.value, stufe.value, besoldungsStufe.value)
        summe.euro += wert.euro
        summe.bewertet += wert.bewertet
        summe.unbewertet += wert.unbewertet
        summe.angenahert += wert.angenahert
        return summe
      },
      { euro: 0, bewertet: 0, unbewertet: 0, angenahert: 0 },
    ),
)
const bewertungsquote = computed(() => {
  const summe = stadtSchaetzung.value.bewertet + stadtSchaetzung.value.unbewertet
  return summe === 0 ? 0 : (stadtSchaetzung.value.bewertet / summe) * 100
})
const kennzahlGesamt = computed(() =>
  kennzahl.value === 'vzae' ? gesamt.value : stadtSchaetzung.value.euro,
)
const kennzahlDelta = computed(() =>
  kennzahl.value === 'vzae'
    ? gesamtDelta
    : stellen
        .filter((r) => r.year === '2027')
        .reduce((summe, r) => summe + entgeltDifferenz(r.code), 0),
)
const gruppenJahresentgelt = (key: string, value: number) => {
  const betrag =
    key === 'Tarif_TVOEDFEST'
      ? aktuelleSchaetzung.value.durchschnittTarif
      : jahresentgelt(key, jahr.value, stufe.value, besoldungsStufe.value)
  return betrag == null ? null : betrag * value
}
const gruppenHinweis = (key: string) => hinweisZumWert(key, stufe.value, besoldungsStufe.value)
const gruppenName = (key: string) =>
  key
    .replace('Beamte_', '')
    .replace('Tarif_', '')
    .replace('_LG2E2', ' (LG 2.2)')
    .replace('_LG2E1', ' (LG 2.1)')
    .replace('TVOEDFEST', 'TVöD fest')
const quelle = 'Haushaltsplan 2026/27, Band 2 · Stellenplan nach Besoldungsgruppen'
const bereichName = computed(() =>
  bereich.value === 'all'
    ? ''
    : ((daten.areas as Record<string, string>)[bereich.value] ?? 'Produktbereich'),
)
const titel = computed(() =>
  ansicht.value === 'change'
    ? 'Wo verändert sich der Stellenplan?'
    : bereich.value === 'all'
      ? 'Wo stecken die Stellen?'
      : bereichName.value,
)
const beschreibung = computed(() =>
  ansicht.value === 'change'
    ? '2027 minus 2026 · Änderungen nach Größe sortiert · Balken auswählen'
    : [
        kennzahl.value === 'vzae'
          ? 'Länge = Stellenumfang · Violett: Anteil der Beamtinnen und Beamten'
          : 'Länge = geschätztes Tabellenentgelt · Violett: Anteil der Beamtinnen und Beamten an diesen Kosten',
        bereich.value === 'all' ? 'Themenbereich auswählen' : 'Produktgruppe auswählen',
      ].join(' · '),
)
const ohneVeraenderung = computed(() => ansicht.value === 'change' && !balken.value.length)
const hauptHoehe = computed(() =>
  ansicht.value === 'map'
    ? `${bestandZeilen.value.length * bestandLayout.value.zeile + 8}px`
    : `${Math.max(240, balken.value.length * 40 + 75)}px`,
)
const detailZeilen = computed(() =>
  [...gruppen.value]
    .map(([key, value]) => ({
      key,
      value: kennzahl.value === 'vzae' ? value : (gruppenJahresentgelt(key, value) ?? undefined),
    }))
    .filter((row): row is { key: string; value: number } => row.value != null)
    .reverse(),
)
const detailHoehe = computed(() => `${Math.max(180, detailZeilen.value.length * 38 + 70)}px`)
const tooltip = { renderMode: 'richText' as const, confine: true }
/** Textfarbe und Rahmen der gewählten Produktgruppe, wie TEXT_NORMAL aus echartsTheme.ts. */
const TEXT_FARBE = '#31333d'
/** Breite des Diagrammrahmens in Pixeln, gemessen per ResizeObserver (auf 10 px gerundet). */
const chartRahmen = ref<HTMLElement | null>(null)
const chartBreite = ref(800)
let rahmenBeobachter: ResizeObserver | undefined
watch(chartRahmen, (element) => {
  rahmenBeobachter?.disconnect()
  if (!element) return
  rahmenBeobachter = new ResizeObserver(([eintrag]) => {
    const breite = Math.round((eintrag?.contentRect.width ?? 0) / 10) * 10
    if (breite > 0) chartBreite.value = breite
  })
  rahmenBeobachter.observe(element)
})
onBeforeUnmount(() => rahmenBeobachter?.disconnect())
/** Unter dieser Breite steht der Name über dem Balken statt links daneben. */
const schmal = computed(() => chartBreite.value < 560)
const SCHRIFT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
let messKontext: CanvasRenderingContext2D | null | undefined
/** Textbreite in Pixeln mit der Diagrammschrift – für Umbruch und Platz der Beschriftung. */
const textBreite = (text: string, groesse: number, gewicht = 400) => {
  if (messKontext === undefined) messKontext = document.createElement('canvas').getContext('2d')
  if (!messKontext) return Math.ceil(text.length * groesse * 0.6)
  messKontext.font = `${gewicht} ${groesse}px ${SCHRIFT}`
  return Math.ceil(messKontext.measureText(text).width) + 1
}
/** Bricht einen Namen in Zeilen bis `breite` Pixel um, notfalls im Wort – gekürzt wird nichts. */
const umbrechen = (text: string, breite: number, groesse: number, gewicht = 400) => {
  const passt = (t: string) => textBreite(t, groesse, gewicht) <= breite
  const zeilen: string[] = []
  let zeile = ''
  for (const wort of text.split(' ')) {
    const versuch = zeile ? `${zeile} ${wort}` : wort
    if (passt(versuch)) {
      zeile = versuch
      continue
    }
    if (zeile) zeilen.push(zeile)
    let rest = wort
    while (!passt(rest) && rest.length > 1) {
      let n = rest.length - 1
      while (n > 1 && !passt(rest.slice(0, n))) n--
      zeilen.push(rest.slice(0, n))
      rest = rest.slice(n)
    }
    zeile = rest
  }
  if (zeile) zeilen.push(zeile)
  return zeilen
}
/** Anteil als ganze Prozentzahl für die Beschriftung; Randwerte nicht auf 0 % oder 100 % runden. */
const ganzProzent = (anteil: number) => {
  if (anteil > 0 && anteil < 0.005) return '< 1 %'
  if (anteil < 1 && anteil > 0.995) return '> 99 %'
  return `${Math.round(anteil * 100)} %`
}
/**
 * Stellen und geschätzte Kosten von Stellenplanzeilen, getrennt nach Beamten und
 * Tarif. Die Tarifkosten sind der Rest der Schätzung (samt TVöD-Festentgelt),
 * damit beide Teile zusammen genau die Balkenlänge ergeben. `beamte`, `tarif` und
 * `anteil` folgen der gewählten Kennzahl.
 */
const aufteilung = (rows: Stelle[]) => {
  let beamteVzae = 0
  let tarifVzae = 0
  let beamteEuro = 0
  let euro = 0
  for (const row of rows) {
    euro += entgelt(row)
    for (const [key, value] of Object.entries(row.grades)) {
      if (key.startsWith('Tarif_')) tarifVzae += value
      else if (key.startsWith('Beamte_')) {
        beamteVzae += value
        beamteEuro +=
          (jahresentgelt(key, row.year, stufe.value, besoldungsStufe.value) ?? 0) * value
      }
    }
  }
  const tarifEuro = euro - beamteEuro
  const [beamte, tarif] =
    kennzahl.value === 'vzae' ? [beamteVzae, tarifVzae] : [beamteEuro, tarifEuro]
  return {
    beamteVzae,
    tarifVzae,
    beamteEuro,
    tarifEuro,
    beamte,
    tarif,
    anteil: beamte + tarif === 0 ? 0 : beamte / (beamte + tarif),
  }
}
const stellenVon = (row: RangZeile) =>
  stellen.filter(
    (r) =>
      r.year === jahr.value &&
      (row.kind === 'area' ? r.code.startsWith(row.code) : r.code === row.code),
  )
/** Beamtenanteil einer Tabellenzeile in der gewählten Kennzahl, genauer als im Diagramm. */
const beamtenAnteilZeile = (row: RangZeile) => aufteilung(stellenVon(row)).anteil
/** Zeilen der Bestandsansicht: dieselbe Rangfolge wie die Tabelle, dazu die Aufteilung. */
const bestandZeilen = computed(() =>
  ansicht.value === 'map'
    ? sortiert.value.map((row) => ({ ...row, ...aufteilung(stellenVon(row)) }))
    : [],
)
type BestandZeile = (typeof bestandZeilen.value)[number]
const BALKEN_HOEHE = 14
/**
 * Namenszeilen, Beschriftung am Balkenende und Zeilenhöhe für die aktuelle Breite.
 * Breit: Name links an der Achse, Wert rechts am Balken. Schmal: Name und Wert
 * über dem Balken, der dann die volle Breite hat.
 */
const bestandLayout = computed(() => {
  const zeilen = bestandZeilen.value
  const etiketten = zeilen.map((z) => `${wertFormat(z.value)} · ${ganzProzent(z.anteil)} Beamte`)
  if (schmal.value) {
    const namen = zeilen.map((z) => umbrechen(z.name, chartBreite.value - 4, 13, 600))
    const kopf = Math.max(1, ...namen.map((n) => n.length)) * 17 + 18
    return { namen, etiketten, kopf, zeile: kopf + BALKEN_HOEHE + 14, rechts: 0 }
  }
  const namen = zeilen.map((z) =>
    umbrechen(z.name, Math.min(260, Math.round(chartBreite.value * 0.28)), 12),
  )
  return {
    namen,
    etiketten,
    kopf: 0,
    zeile: Math.max(30, Math.max(1, ...namen.map((n) => n.length)) * 15 + 14),
    rechts: Math.max(0, ...etiketten.map((e) => textBreite(e, 12))) + 20,
  }
})
const bestandTooltip = (z: BestandZeile) =>
  [
    z.kind === 'area' ? z.name : `${z.code} · ${z.name}`,
    `Stellen: ${vzae(z.beamteVzae + z.tarifVzae)} VZÄ`,
    `  Beamte ${vzae(z.beamteVzae)} · Tarif ${vzae(z.tarifVzae)}`,
    `Geschätzte Kosten (TVöD ${stufe.value}, Besoldung ${besoldungsStufe.value}): ${euroKurz(z.beamteEuro + z.tarifEuro)}`,
    `  Beamte ${euroKurz(z.beamteEuro)} · Tarif ${euroKurz(z.tarifEuro)}`,
  ].join('\n')
/**
 * Bestand als waagerechte Balken: Länge = gewählte Kennzahl, links der Teil der
 * Beamtinnen und Beamten (violett), rechts der Tarifteil (blau) wie in der Detailkarte.
 */
const bestandOption = computed<EChartsOption>(() => {
  const zeilen = bestandZeilen.value
  const layout = bestandLayout.value
  const max = Math.max(0, ...zeilen.map((z) => z.value))
  const ziel = (z: BestandZeile) => (z.kind === 'area' ? { areaCode: z.code } : { code: z.code })
  const segment = (z: BestandZeile, wert: number, farbe: string, rundung: number[]) => ({
    value: wert,
    ...ziel(z),
    itemStyle:
      z.code === auswahl.value
        ? { color: farbe, borderRadius: rundung, borderColor: TEXT_FARBE, borderWidth: 2 }
        : { color: farbe, borderRadius: rundung },
  })
  return {
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const erster = (params as { dataIndex?: number }[])[0]
        const zeile = zeilen[erster?.dataIndex ?? 0]
        return zeile ? bestandTooltip(zeile) : ''
      },
    },
    grid: schmal.value
      ? { left: 0, right: 0, top: 4, bottom: 4 }
      : { left: 0, right: layout.rechts, top: 4, bottom: 4, containLabel: true },
    xAxis: { type: 'value', show: false, max },
    yAxis: {
      type: 'category',
      inverse: true,
      data: zeilen.map((z) => z.name),
      axisTick: { show: false },
      axisLine: { show: !schmal.value },
      axisLabel: schmal.value
        ? { show: false }
        : {
            interval: 0,
            fontSize: 12,
            lineHeight: 15,
            formatter: (_wert: string, index: number) => layout.namen[index]?.join('\n') ?? '',
          },
    },
    series: [
      // Schmal: eine unsichtbare Spalte je Zeile trägt Name und Wert über dem Balken.
      ...(schmal.value
        ? [
            {
              type: 'bar' as const,
              barWidth: layout.kopf,
              barGap: '0%',
              cursor: 'pointer',
              itemStyle: { color: 'transparent' },
              emphasis: { disabled: true },
              data: zeilen.map((z) => ({ value: max, ...ziel(z) })),
              label: {
                show: true,
                // Unten links in der unsichtbaren Spalte, also direkt über dem Balken.
                position: ['0%', '100%'],
                align: 'left' as const,
                verticalAlign: 'bottom' as const,
                // Ohne feste Farbe wählt ECharts für Text „im“ Balken eine helle Farbe.
                color: TEXT_FARBE,
                formatter: (p: { dataIndex: number }) =>
                  [
                    ...(layout.namen[p.dataIndex] ?? []).map((zeile) => `{name|${zeile}}`),
                    `{wert|${layout.etiketten[p.dataIndex] ?? ''}}`,
                  ].join('\n'),
                rich: {
                  name: { fontSize: 13, fontWeight: 600, lineHeight: 17 },
                  wert: { fontSize: 12, lineHeight: 18 },
                },
              },
            },
          ]
        : []),
      {
        type: 'bar',
        name: 'Beamtinnen / Beamte',
        stack: 'bestand',
        barWidth: BALKEN_HOEHE,
        cursor: 'pointer',
        data: zeilen.map((z) => segment(z, z.beamte, KATEGORIE_FARBEN[3], [3, 0, 0, 3])),
      },
      {
        type: 'bar',
        name: 'Tarifbeschäftigte',
        stack: 'bestand',
        barWidth: BALKEN_HOEHE,
        cursor: 'pointer',
        data: zeilen.map((z) => segment(z, z.tarif, KATEGORIE_FARBEN[0], [0, 3, 3, 0])),
        label: schmal.value
          ? { show: false }
          : {
              show: true,
              position: 'right',
              fontSize: 12,
              formatter: (p) => layout.etiketten[p.dataIndex] ?? '',
            },
      },
    ],
  }
})
const hauptOption = computed<EChartsOption>(() => {
  if (ansicht.value === 'map') return bestandOption.value
  return {
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) => deltaFormat(Number(value)),
    },
    grid: { left: 4, right: 68, top: 20, bottom: 40, containLabel: true },
    xAxis: {
      type: 'value',
      name: kennzahl.value === 'vzae' ? 'Δ VZÄ' : 'Δ Euro/Jahr',
      nameLocation: 'middle',
      nameGap: 28,
    },
    yAxis: {
      type: 'category',
      data: balken.value.map((r) => `${r.code} ${r.name}`),
      axisLabel: { interval: 0, width: 125, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        label: {
          show: true,
          position: 'right',
          formatter: (p) => deltaFormat(Number(p.value)),
        },
        data: balken.value.map((r) => ({
          value: r.value,
          code: r.code,
          itemStyle: {
            color: r.value < 0 ? POL_FARBEN.negativ : KATEGORIE_FARBEN[0],
          },
        })),
      },
    ],
  }
})
const detailOption = computed<EChartsOption>(() => {
  const rows = detailZeilen.value
  return {
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      valueFormatter: (value) => wertFormat(Number(value)),
    },
    grid: { left: 4, right: 60, top: 15, bottom: 40, containLabel: true },
    xAxis: {
      type: 'value',
      name: kennzahl.value === 'vzae' ? 'VZÄ' : 'Euro/Jahr',
      nameLocation: 'middle',
      nameGap: 28,
    },
    yAxis: {
      type: 'category',
      data: rows.map((row) => gruppenName(row.key)),
      axisLabel: { interval: 0 },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        label: { show: true, position: 'right', formatter: (p) => wertFormat(Number(p.value)) },
        data: rows.map((row) => ({
          value: row.value,
          itemStyle: {
            color: row.key.startsWith('Beamte_') ? KATEGORIE_FARBEN[3] : KATEGORIE_FARBEN[0],
          },
        })),
      },
    ],
  }
})
/* Ein kurzer, dauerhaft vorhandener Status für Screenreader. Entprellt, damit
   schnelle Wechsel (Stufen, Jahr) nicht jeweils einzeln angesagt werden. */
const statusMeldung = ref('')
let statusTimer: ReturnType<typeof setTimeout> | undefined
function melden(text: string) {
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    statusMeldung.value = text
  }, 450)
}
onBeforeUnmount(() => clearTimeout(statusTimer))
watch([kennzahl, jahr, stufe, besoldungsStufe], () =>
  melden(`Stadt insgesamt ${jahr.value}: ${wertFormat(kennzahlGesamt.value)}`),
)

/* Fokusziele: Überschrift der Produktgruppen-Karte, der Rangliste (nur bei den
   Veränderungen), der Pfad und als letzter Halt die Bereichsauswahl. */
const detailTitel = ref<HTMLElement | null>(null)
const toplisteTitel = ref<HTMLElement | null>(null)
const pfadTitel = ref<HTMLElement | null>(null)
const bereichAuswahl = ref<HTMLElement | null>(null)
async function produktgruppeWaehlen(code: string) {
  auswahl.value = code
  // Die Karte erscheint weiter unten: Fokus auf ihre Überschrift.
  await nextTick()
  detailTitel.value?.focus()
}
/** Nach einem Bereichswechsel verschwindet der gewählte Eintrag – Fokus neu setzen. */
async function bereichFokussieren() {
  await nextTick()
  ;(toplisteTitel.value ?? pfadTitel.value ?? bereichAuswahl.value)?.focus()
}
function auswahlAendern(ereignis: Event) {
  auswahl.value = auswahlWert(ereignis)
  if (aktuell.value)
    melden(`${anzeigeName(aktuell.value.name)}: ${wertFormat(wert(aktuell.value))}, ${jahr.value}`)
}
function waehlen(event: unknown) {
  if (typeof event !== 'object' || !event || !('data' in event)) return
  const data = event.data
  if (typeof data !== 'object' || !data) return
  if ('code' in data && typeof data.code === 'string' && data.code) {
    void produktgruppeWaehlen(data.code)
    return
  }
  if ('areaCode' in data && typeof data.areaCode === 'string') bereich.value = data.areaCode
}
function rangWaehlen(row: RangZeile) {
  if (row.kind === 'area') {
    bereich.value = row.code
    void bereichFokussieren()
  } else void produktgruppeWaehlen(row.code)
}
function zurUebersicht() {
  bereich.value = 'all'
  auswahl.value = ''
  void bereichFokussieren()
}
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Stellenatlas Münster"
      beschreibung="Wo arbeitet die Stadt? Der Stellenatlas zeigt geplante Stellen in Vollzeitäquivalenten (VZÄ)."
    />
    <p class="mm-visually-hidden" role="status">{{ statusMeldung }}</p>
    <wa-card class="mm-kennzahlen-band">
      <dl class="mm-kennzahlen">
        <div class="mm-kennzahl">
          <dt>Stadt insgesamt · {{ jahr }}</dt>
          <dd v-if="kennzahl === 'vzae'">
            {{ vzae(kennzahlGesamt) }} <GlossarBegriff id="vzae">VZÄ</GlossarBegriff>
          </dd>
          <dd v-else>{{ euroKurz(kennzahlGesamt) }}</dd>
        </div>
        <div class="mm-kennzahl">
          <dt>Veränderung 2026 → 2027 · Stadt insgesamt</dt>
          <dd>
            {{
              kennzahl === 'vzae'
                ? `${vorzeichen(kennzahlDelta)} VZÄ`
                : geldVorzeichen(kennzahlDelta)
            }}
          </dd>
        </div>
        <div v-if="kennzahl === 'vzae'" class="mm-kennzahl">
          <dt>Aufgaben der Stadt</dt>
          <dd>
            63
            <a class="stellen-produktgruppen-link" href="#/glossar#mm-produkte-titel">
              Produktgruppen
            </a>
          </dd>
        </div>
        <div v-else class="mm-kennzahl">
          <dt>Davon mit Näherungswert</dt>
          <dd>{{ vzae(stadtSchaetzung.angenahert) }} VZÄ</dd>
          <dd class="mm-kennzahl__zusatz">{{ vzae(bewertungsquote) }} % der Stellen bewertet</dd>
        </div>
      </dl>
    </wa-card>

    <div class="stellen-filter" role="group" aria-label="Darstellung filtern">
      <div class="stellen-metrik" role="group" aria-label="Kennzahl">
        <button type="button" :aria-pressed="kennzahl === 'vzae'" @click="kennzahl = 'vzae'">
          VZÄ
        </button>
        <button type="button" :aria-pressed="kennzahl === 'entgelt'" @click="kennzahl = 'entgelt'">
          Gehaltskosten
        </button>
      </div>
      <div class="stellen-ansichten" role="group" aria-label="Zeitraumvergleich">
        <button
          v-for="view in ansichten"
          :key="view.id"
          type="button"
          :aria-pressed="ansicht === view.id"
          @click="ansicht = view.id"
        >
          {{ view.name }}
        </button>
      </div>
      <wa-select
        v-if="kennzahl === 'entgelt'"
        class="stellen-stufe"
        label="TVöD-Stufe"
        :value="String(stufe)"
        @change="stufe = Number(auswahlWert($event))"
      >
        <wa-option v-for="nr in 6" :key="nr" :value="String(nr)">Stufe {{ nr }}</wa-option>
      </wa-select>
      <wa-select
        v-if="kennzahl === 'entgelt'"
        class="stellen-stufe"
        label="Besoldungsstufe"
        :value="String(besoldungsStufe)"
        @change="besoldungsStufe = Number(auswahlWert($event))"
      >
        <wa-option v-for="nr in 10" :key="nr + 2" :value="String(nr + 2)">
          Stufe {{ nr + 2 }}
        </wa-option>
      </wa-select>
      <div class="stellen-filter__rechts">
        <wa-select label="Planjahr" :value="jahr" @change="jahr = auswahlWert($event)">
          <wa-option value="2026">2026</wa-option>
          <wa-option value="2027">2027</wa-option>
        </wa-select>
        <wa-select
          ref="bereichAuswahl"
          class="stellen-bereich"
          label="Produktbereich"
          :value="bereich"
          @change="bereich = auswahlWert($event)"
        >
          <wa-option value="all">Alle Produktbereiche</wa-option>
          <wa-option v-for="(name, code) in daten.areas" :key="code" :value="code">
            {{ name }}
          </wa-option>
        </wa-select>
      </div>
    </div>
    <ChartCard
      :titel="titel"
      :beschreibung="beschreibung"
      :quelle="quelle"
      :pdf="{ band: 2, seite: 41 }"
    >
      <!-- Pfad und Legende teilen sich eine Zeile. -->
      <div v-if="bereich !== 'all' || ansicht === 'map'" class="stellen-kopfzeile">
        <nav v-if="bereich !== 'all'" class="stellen-pfad" aria-label="Pfad">
          <button type="button" class="stellen-zurueck" @click="zurUebersicht">
            <span aria-hidden="true">←</span> Alle Themenbereiche
          </button>
          <!-- Trenner und Ziel brechen gemeinsam um, damit „›“ nicht allein am Zeilenende steht. -->
          <span class="stellen-pfad__ziel">
            <span aria-hidden="true">›</span>
            <strong ref="pfadTitel" tabindex="-1" aria-current="location">{{ bereichName }}</strong>
          </span>
        </nav>
        <p v-if="ansicht === 'map'" class="stellen-legende stellen-legende--haupt">
          <span class="mm-visually-hidden">Balkenfarben: </span>
          <span><i :style="{ background: KATEGORIE_FARBEN[3] }"></i>Beamtinnen / Beamte</span>
          <span><i :style="{ background: KATEGORIE_FARBEN[0] }"></i>Tarifbeschäftigte</span>
        </p>
      </div>
      <!-- Status bleibt im DOM, nur der Text erscheint bei Bedarf. -->
      <p class="stellen-leermeldung" role="status">
        <template v-if="ohneVeraenderung"
          >In diesem Produktbereich ändert sich die Gesamtstellenzahl keiner
          Produktgruppe.</template
        >
      </p>
      <!-- Im Bestand nimmt das Balkendiagramm die volle Breite; die Rangliste gibt es nur
           bei den Veränderungen. Tastaturweg im Bestand: Bereichsauswahl und Tabelle. -->
      <div
        v-if="!ohneVeraenderung"
        class="stellen-visualisierung"
        :class="{ 'stellen-visualisierung--mit-liste': ansicht === 'change' }"
      >
        <div ref="chartRahmen">
          <BaseChart
            :key="`${ansicht}-${bereich}`"
            :option="hauptOption"
            :hoehe="hauptHoehe"
            @chart-click="waehlen"
          />
        </div>
        <aside
          v-if="ansicht === 'change'"
          class="stellen-topliste"
          aria-labelledby="stellen-topliste-titel"
        >
          <h3 id="stellen-topliste-titel" ref="toplisteTitel" tabindex="-1">
            Größte Veränderungen
          </h3>
          <ol role="list">
            <li v-for="row in topListe" :key="row.code">
              <button type="button" @click="rangWaehlen(row)">
                <span>{{ row.kind === 'area' ? row.name : `${row.code} · ${row.name}` }}</span>
                <strong>{{
                  ansicht === 'change' ? deltaFormat(row.value) : wertFormat(row.value)
                }}</strong>
              </button>
            </li>
          </ol>
        </aside>
      </div>
      <details>
        <summary>Alle Werte als Tabelle</summary>
        <DatenTabelle :beschriftung="`${titel} · ${jahr}`">
          <thead>
            <tr>
              <th scope="col">
                {{ bereich === 'all' && ansicht === 'map' ? 'Themenbereich' : 'Produktgruppe' }}
              </th>
              <th scope="col" class="mm-zahl">
                {{
                  kennzahl === 'vzae'
                    ? ansicht === 'change'
                      ? 'Δ VZÄ'
                      : 'VZÄ'
                    : ansicht === 'change'
                      ? 'Δ Tabellenentgelt/Jahr'
                      : 'Tabellenentgelt/Jahr'
                }}
              </th>
              <th v-if="ansicht === 'map'" scope="col" class="mm-zahl">Beamtenanteil</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortiert" :key="row.code">
              <th scope="row">
                <button type="button" class="stellen-textbutton" @click="rangWaehlen(row)">
                  {{ row.code }} · {{ row.name }}
                </button>
              </th>
              <td class="mm-zahl">
                {{ ansicht === 'change' ? deltaFormat(row.value) : wertFormat(row.value) }}
              </td>
              <td v-if="ansicht === 'map'" class="mm-zahl">
                {{ prozent(beamtenAnteilZeile(row)) }}
              </td>
            </tr>
          </tbody>
        </DatenTabelle>
      </details>
    </ChartCard>

    <ChartCard
      v-if="aktuell"
      titel="Ausgewählte Produktgruppe"
      beschreibung="Alle Entgelt- und Besoldungsgruppen mit Stellenanteilen in der Auswahl."
      :quelle="quelle"
      :pdf="{ band: 2, seite: 41 }"
    >
      <wa-select
        label="Produktgruppe"
        placeholder="Produktgruppe auswählen"
        :value="auswahl"
        @change="auswahlAendern($event)"
      >
        <wa-option v-for="row in auswahlZeilen" :key="row.code" :value="row.code">
          {{ row.code }} · {{ anzeigeName(row.name) }}
        </wa-option>
      </wa-select>
      <div>
        <h3 ref="detailTitel" tabindex="-1">{{ anzeigeName(aktuell.name) }}</h3>
        <p class="stellen-detailzahl">
          {{
            kennzahl === 'vzae'
              ? `${vzae(aktuell.total)} VZÄ`
              : `${euroKurz(aktuelleSchaetzung.euro)} · TVöD ${stufe} / Besoldung ${besoldungsStufe}`
          }}
          · {{ jahr }}
        </p>
        <p>{{ deltaFormat(veraenderung(aktuell.code)) }} von 2026 auf 2027</p>
      </div>
      <div v-if="kennzahl === 'vzae'" class="stellen-legende">
        <span><i :style="{ background: KATEGORIE_FARBEN[0] }"></i>Tarifbeschäftigte</span
        ><span><i :style="{ background: KATEGORIE_FARBEN[3] }"></i>Beamtinnen / Beamte</span>
      </div>
      <p v-else class="stellen-hinweis">
        Alle Gruppen sind bewertet; Näherungen sind in der Tabelle gekennzeichnet.
      </p>
      <BaseChart :option="detailOption" :hoehe="detailHoehe" />
      <details>
        <summary>Besoldungsgruppen als Tabelle</summary>
        <DatenTabelle
          :beschriftung="`Besoldungs- und Entgeltgruppen: ${aktuell.code} ${anzeigeName(aktuell.name)}, ${jahr}`"
        >
          <thead>
            <tr>
              <th scope="col">Gruppe</th>
              <th scope="col" class="mm-zahl">VZÄ</th>
              <th scope="col" class="mm-zahl">Geschätzte Kosten/Jahr</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[key, value] in gruppen" :key="key">
              <th scope="row">{{ gruppenName(key) }}</th>
              <td class="mm-zahl">{{ vzae(value) }}</td>
              <td class="mm-zahl">
                <template v-if="gruppenJahresentgelt(key, value) != null">
                  {{ euro(gruppenJahresentgelt(key, value)!) }}
                  <small v-if="gruppenHinweis(key)" class="stellen-leise">
                    {{ gruppenHinweis(key) }}
                  </small>
                </template>
                <span v-else class="stellen-leise">Kein Wert verfügbar</span>
              </td>
            </tr>
          </tbody>
        </DatenTabelle>
      </details>
    </ChartCard>

    <section class="stellen-gesamt" aria-labelledby="gesamtuebersicht-titel">
      <div>
        <h2 id="gesamtuebersicht-titel">Alle Themenbereiche und Produktgruppen</h2>
        <p>
          Der ganze Stellenplan in einem Diagramm, von der Stadt über die Themenbereiche bis zu den
          Produktgruppen.
        </p>
      </div>
      <RouterLink
        class="stellen-gesamt__link"
        :to="{ name: 'stellenplan-gesamt', query: { jahr, kennzahl } }"
      >
        Gesamtübersicht öffnen <span aria-hidden="true">→</span>
      </RouterLink>
    </section>
    <ChartCard
      v-if="kennzahl === 'entgelt'"
      titel="Zur Gehaltskostenschätzung"
      beschreibung="Szenario bei vollständiger Besetzung der Planstellen mit den gewählten TVöD- und Besoldungsstufen."
      quelle="VKA-Entgelttabellen und Grundgehaltstabellen NRW"
    >
      <div class="entgelt-kopf">
        <p>
          2026 wird monatsgenau mit vier Monaten des vorherigen und acht Monaten des neuen
          Tarifstands berechnet. Für 2027 wird der Stand ab Mai 2026 unverändert fortgeschrieben.
          Die NRW-Grundgehälter ab April 2026 werden für beide Planjahre mit zwölf Monaten
          angesetzt.
        </p>
      </div>
      <dl class="mm-kennzahlen entgelt-kennzahlen">
        <div class="mm-kennzahl">
          <dt>Stadt insgesamt · {{ jahr }}</dt>
          <dd>{{ euro(stadtSchaetzung.euro) }}</dd>
          <dd class="mm-kennzahl__zusatz">{{ vzae(stadtSchaetzung.bewertet) }} bewertete VZÄ</dd>
        </div>
        <div class="mm-kennzahl">
          <dt>Ausgewählte Produktgruppe</dt>
          <dd>{{ euro(aktuelleSchaetzung.euro) }}</dd>
          <dd class="mm-kennzahl__zusatz" v-if="aktuell">
            {{ aktuell.code }} · {{ anzeigeName(aktuell.name) }}
          </dd>
        </div>
        <div class="mm-kennzahl">
          <dt>Näherungswerte</dt>
          <dd>{{ vzae(stadtSchaetzung.angenahert) }} VZÄ</dd>
          <dd class="mm-kennzahl__zusatz">{{ vzae(bewertungsquote) }} % der Stellen bewertet</dd>
        </div>
      </dl>
      <p class="stellen-hinweis">
        Enthalten ist nur das monatliche Tabellenentgelt × 12 beziehungsweise der monatsgenaue
        Tarifwechsel 2026. Jahressonderzahlung, Zulagen, Zuschläge, Arbeitgeberanteile und
        Versorgungskosten sind nicht enthalten. TVöD-Festentgelte erhalten den gewichteten
        Tarifmittelwert ihrer Produktgruppe. S10 ist der Mittelwert aus S9 und S11b; fehlende
        Stufe-1-Werte von P7–P9 werden aus dem Abstand von Stufe 2 zu 3 zurückgerechnet. Bei
        A-Besoldungsgruppen ohne die gewählte Stufe gilt die nächstgelegene vorhandene Stufe. A9Z
        enthält nur A9 ohne Amtszulage.
      </p>
      <details>
        <summary>Tarifquellen</summary>
        <ul>
          <li v-for="tarifquelle in TARIF_QUELLEN" :key="tarifquelle.url">
            <a :href="tarifquelle.url" target="_blank" rel="noopener noreferrer">
              {{ tarifquelle.name }}
              <span class="mm-visually-hidden">(öffnet in neuem Tab)</span>
            </a>
          </li>
          <li>
            <a :href="BESOLDUNG_QUELLE.url" target="_blank" rel="noopener noreferrer">
              {{ BESOLDUNG_QUELLE.name }}
              <span class="mm-visually-hidden">(öffnet in neuem Tab)</span>
            </a>
          </li>
        </ul>
      </details>
    </ChartCard>
    <p class="stellen-hinweis">
      Die Summen werden aus den Besoldungsgruppen berechnet. Sie weichen leicht von der
      Stellenübersicht im Plan ab (2026: 0,06 VZÄ; 2027: 0,07 VZÄ).
    </p>
  </div>
</template>

<style scoped>
/* Die großen Zahlen als Blickfang über der Seite — wie auf der Zuschüsse-Seite. */
.mm-kennzahlen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: var(--wa-space-l);
  margin: 0;
}

.mm-kennzahl dt {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-kennzahl dd {
  margin: var(--wa-space-3xs) 0 0;
  font-size: var(--wa-font-size-2xl);
  font-weight: var(--wa-font-weight-bold);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

/* Erläuterung unter der Zahl. Als zweites <dd> statt <p>: In einer <dl> sind
   nur dt und dd erlaubt, sonst geht die Zuordnung für Screenreader verloren. */
.mm-kennzahl .mm-kennzahl__zusatz {
  margin: var(--wa-space-2xs) 0 0;
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  font-weight: var(--wa-font-weight-normal);
  line-height: 1.4;
}

.stellen-hinweis {
  color: var(--wa-color-text-quiet);
}
.stellen-detailzahl {
  font-size: var(--wa-font-size-xl);
  font-variant-numeric: tabular-nums;
}
.stellen-filter,
.stellen-ansichten,
.stellen-metrik,
.stellen-filter__rechts {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--wa-space-s);
}
.stellen-filter {
  flex-wrap: wrap;
}
/* Planjahr und Produktbereich bleiben als Paar am rechten Rand. */
.stellen-filter__rechts {
  margin-left: auto;
}
.stellen-filter wa-select {
  flex: 0 1 auto;
  width: 8rem;
  min-width: 0;
  max-width: 100%;
}
.stellen-filter .stellen-bereich {
  flex: 0 1 16rem;
  width: auto;
  max-width: min(22rem, 36vw);
}
.stellen-filter > .stellen-stufe {
  width: 10rem;
}
.stellen-metrik {
  padding-right: var(--wa-space-s);
  border-right: 1px solid var(--wa-color-surface-border);
}
button {
  font: inherit;
  color: inherit;
  background: var(--wa-color-surface-default);
  border: 1px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-m);
  padding: var(--wa-space-s);
  min-height: 44px;
  max-width: 100%;
  cursor: pointer;
}
/* Ausgewählter Filter: leicht orange hinterlegt statt vollflächig laut. */
button[aria-pressed='true'] {
  background: var(--mm-auswahl-flaeche);
  border-color: var(--mm-auswahl-rand);
  color: var(--mm-auswahl-text);
  font-weight: var(--wa-font-weight-semibold);
}
.stellen-visualisierung {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--wa-space-l);
  align-items: start;
}
.stellen-visualisierung--mit-liste {
  grid-template-columns: minmax(0, 1fr) minmax(15rem, 0.3fr);
}
/* Luft zwischen Diagramm und Tabellen-Aufklapper. */
.stellen-visualisierung + details {
  margin-top: var(--wa-space-m);
}
.stellen-visualisierung > * {
  min-width: 0;
}
.stellen-pfad {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--wa-space-xs);
  color: var(--wa-color-text-quiet);
}
.stellen-pfad__ziel {
  display: inline-flex;
  align-items: center;
  gap: var(--wa-space-xs);
  min-width: 0;
}
.stellen-zurueck {
  min-height: 36px;
  padding: var(--wa-space-xs) var(--wa-space-s);
  color: var(--wa-color-text-link);
}
h3 {
  overflow-wrap: anywhere;
  font-size: var(--wa-font-size-m);
}
.stellen-legende {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wa-space-s);
  font-size: var(--wa-font-size-s);
}
.stellen-legende i {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  margin-right: 0.35rem;
  border-radius: 50%;
}
/* Legende über dem Bestandsdiagramm: Felder in den Balkenfarben. */
.stellen-legende--haupt {
  margin: 0;
  color: var(--wa-color-text-quiet);
}
.stellen-pfad + .stellen-legende--haupt {
  margin-left: auto;
}
.stellen-legende--haupt i {
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 3px;
  vertical-align: -0.15em;
}
.stellen-kopfzeile {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--wa-space-xs) var(--wa-space-l);
  margin-bottom: var(--wa-space-s);
}
.stellen-topliste {
  border-left: 1px solid var(--wa-color-surface-border);
  padding-left: var(--wa-space-l);
}
.stellen-topliste h3 {
  margin: var(--wa-space-s) 0;
}
.stellen-topliste ol {
  display: grid;
  gap: var(--wa-space-2xs);
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: topliste;
}
.stellen-topliste li {
  counter-increment: topliste;
}
.stellen-topliste button {
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 1fr);
  gap: 0 var(--wa-space-xs);
  width: 100%;
  padding: var(--wa-space-xs) 0;
  min-height: 48px;
  text-align: left;
  border: 0;
  border-radius: 0;
  border-bottom: 1px solid var(--wa-color-surface-border);
}
.stellen-topliste button::before {
  content: counter(topliste) '.';
  grid-row: 1 / span 2;
  color: var(--wa-color-text-quiet);
}
.stellen-topliste button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stellen-topliste button strong {
  font-size: var(--wa-font-size-s);
  font-variant-numeric: tabular-nums;
}
.stellen-gesamt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--wa-space-l);
  padding: var(--wa-space-xl);
  border: 1px solid var(--wa-color-brand-border-quiet);
  border-radius: var(--wa-border-radius-l);
  background: var(--wa-color-brand-fill-quiet);
}
.stellen-gesamt h2,
.stellen-gesamt p {
  margin: 0;
}
.stellen-gesamt h2 {
  font-size: var(--wa-font-size-l);
}
.stellen-gesamt p {
  margin-top: var(--wa-space-xs);
  color: var(--wa-color-text-quiet);
}
.stellen-gesamt__link {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: var(--wa-space-s) var(--wa-space-m);
  border-radius: var(--wa-border-radius-m);
  color: var(--wa-color-brand-on-loud);
  background: var(--wa-color-brand-fill-loud);
  font-weight: var(--wa-font-weight-semibold);
  text-decoration: none;
}
summary {
  cursor: pointer;
  padding-block: var(--wa-space-s);
}
.stellen-textbutton {
  text-align: left;
  border: 0;
  padding: 0;
  color: var(--wa-color-text-link);
}
.stellen-produktgruppen-link {
  padding: 0 0.1em;
  border-radius: var(--wa-border-radius-s);
  color: inherit;
  background-color: var(--wa-color-brand-fill-quiet);
  text-decoration: underline dotted var(--wa-color-brand-on-quiet);
  text-decoration-thickness: 0.1em;
  text-underline-offset: 0.15em;
  cursor: help;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
.stellen-produktgruppen-link:hover,
.stellen-produktgruppen-link:focus-visible {
  background-color: var(--wa-color-brand-border-quiet);
}
.stellen-produktgruppen-link:focus-visible {
  outline: var(--wa-focus-ring);
  outline-offset: var(--wa-focus-ring-offset);
}
.stellen-leise,
.entgelt-kopf p {
  color: var(--wa-color-text-quiet);
}
td .stellen-leise {
  display: block;
  max-width: 22rem;
  white-space: normal;
}
.entgelt-kopf {
  display: flex;
  align-items: end;
  gap: var(--wa-space-l);
  margin-bottom: var(--wa-space-l);
}
.entgelt-kopf p {
  max-width: var(--mm-lesebreite);
  margin: 0;
}
.entgelt-kennzahlen {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.stellen-leermeldung:empty {
  margin: 0;
}
@media (max-width: 850px) {
  .stellen-visualisierung--mit-liste {
    grid-template-columns: minmax(0, 1fr);
  }
  /* Schmal: Legende in eine eigene Zeile unter den Pfad. */
  .stellen-pfad + .stellen-legende--haupt {
    flex-basis: 100%;
    margin-left: 0;
  }
  .stellen-topliste {
    border-left: 0;
    border-top: 1px solid var(--wa-color-surface-border);
    padding: var(--wa-space-m) 0 0;
  }
  .stellen-filter {
    flex-wrap: wrap;
  }
  .stellen-filter__rechts {
    flex: 1 1 100%;
    margin-left: 0;
  }
  .stellen-filter__rechts > wa-select {
    flex: 1 1 8rem;
  }
  .stellen-filter > label,
  .stellen-filter > label:last-child {
    flex: 1 1 12rem;
    width: auto;
  }
  .entgelt-kopf {
    align-items: stretch;
    flex-direction: column;
  }
  .entgelt-kennzahlen {
    grid-template-columns: minmax(0, 1fr);
  }
  .stellen-gesamt {
    align-items: stretch;
    flex-direction: column;
  }
  .stellen-gesamt__link {
    justify-content: center;
  }
}
</style>

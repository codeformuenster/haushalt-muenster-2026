<script setup lang="ts">
/**
 * Zuschüsse an Vereine und Verbände — der Zuschussbericht aus Band 2.
 *
 * Erste Seite mit echten Zahlen. Die Daten kommen aus
 * public/daten/zuschuesse-2026-2027.json, erzeugt von preprocessing/zuschuesse.ts
 * aus daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027.csv. Hier wird
 * nur dargestellt und aggregiert, nicht bereinigt — das passiert im Skript.
 */
import { computed, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import QuelleSeitenleiste, { type Quelle } from '@/components/ui/QuelleSeitenleiste.vue'
import { euro, euroKurz, zahl } from '@/charts/format'
import { KATEGORIE_FARBEN } from '@/charts/echartsTheme'

const QUELLE = 'Haushaltsplan 2026/27, Band 2, S. 341–362 (Zuschussbericht)'

/**
 * Die vier Werte der Spalte `verpflichtend_freiwillig`, geordnet von frei nach
 * gebunden. Die Reihenfolge ist auch die Farbreihenfolge (Regel aus dem README:
 * KATEGORIE_FARBEN werden der Reihe nach vergeben) — bitte nicht umsortieren.
 */
const GRADE = ['freiwillig', 'dem Grunde nach', 'der Höhe nach', 'Höhe und Grund nach'] as const
type Grad = (typeof GRADE)[number]

const GRAD_FARBE: Record<Grad, string> = {
  freiwillig: KATEGORIE_FARBEN[0],
  'dem Grunde nach': KATEGORIE_FARBEN[1],
  'der Höhe nach': KATEGORIE_FARBEN[2],
  'Höhe und Grund nach': KATEGORIE_FARBEN[3],
}

/** Über diese zwei Stufen kann der Rat mitentscheiden. */
const VERHANDELBAR: readonly Grad[] = ['freiwillig', 'dem Grunde nach']

/** Klartextnamen zu den PB-Nummern — wie in GlossarPage.vue, nicht aus den Daten. */
const PRODUKTBEREICHE: Record<string, string> = {
  '01': 'Innere Verwaltung',
  '02': 'Sicherheit und Ordnung',
  '03': 'Schulträgeraufgaben',
  '04': 'Kultur und Wissenschaft',
  '05': 'Soziale Leistungen',
  '06': 'Kinder-, Jugend- und Familienhilfe',
  '07': 'Gesundheitsdienste',
  '08': 'Sportförderung',
  '09': 'Räumliche Planung und Entwicklung/Geoinformationen',
  '10': 'Bauen und Wohnen',
  '11': 'Ver- und Entsorgung',
  '12': 'Verkehrsflächen und -anlagen, ÖPNV',
  '13': 'Natur- und Landschaftspflege',
  '14': 'Umweltschutz',
  '15': 'Wirtschaft und Tourismus',
  '16': 'Allgemeine Finanzwirtschaft',
  '17': 'Stiftungen',
}

interface Posten {
  nr: number
  produktgruppe: string
  produktbereich: string
  empfaenger: string
  zweck: string
  grad: Grad
  eur2026: number
  eur2027: number
  befristetBis: string
}

// ------------------------------------------------------------------ Laden

const posten = ref<Posten[] | null>(null)
const ladefehler = ref(false)

onMounted(async () => {
  try {
    // BASE_URL statt "/", damit es auch unter einem Unterpfad deployt funktioniert.
    const antwort = await fetch(`${import.meta.env.BASE_URL}daten/zuschuesse-2026-2027.json`)
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`)
    posten.value = (await antwort.json()).posten as Posten[]
  } catch {
    ladefehler.value = true
  }
})

const alle = computed<Posten[]>(() => posten.value ?? [])

// --------------------------------------------------------------- Aggregate

const summe = (liste: Posten[]): number => liste.reduce((s, p) => s + p.eur2026, 0)
const mitGrad = (liste: Posten[], grad: Grad): Posten[] => liste.filter((p) => p.grad === grad)

/** 0.286 -> "28,6 %" */
const prozent = (anteil: number): string => `${zahl(anteil * 100)} %`

const gesamt = computed(() => summe(alle.value))
const verhandelbar = computed(() => summe(alle.value.filter((p) => VERHANDELBAR.includes(p.grad))))
const frei = computed(() => summe(mitGrad(alle.value, 'freiwillig')))

const kennzahlen = computed(() => [
  {
    wert: euroKurz(gesamt.value),
    titel: 'Zuschüsse insgesamt',
    zusatz: `${zahl(alle.value.length)} Posten im Zuschussbericht`,
  },
  {
    wert: euroKurz(verhandelbar.value),
    titel: 'davon verhandelbar',
    zusatz: `${prozent(verhandelbar.value / gesamt.value)} — der Rat entscheidet mindestens über die Höhe`,
  },
  {
    wert: euroKurz(frei.value),
    titel: 'davon völlig frei',
    zusatz: `${prozent(frei.value / gesamt.value)} — weder Grund noch Höhe sind vorgeschrieben`,
  },
])

/** Ein Posten-Haufen, aufgeschlüsselt nach den vier Stufen. */
const jeStufe = (liste: Posten[]): number[] => GRADE.map((grad) => summe(mitGrad(liste, grad)))

/** Kurzform für die 2×2-Tabelle: "151 Posten · 12,9 Mio. €". */
const gradInfo = (grad: Grad): string => {
  const teil = mitGrad(alle.value, grad)
  return `${zahl(teil.length)} Posten · ${euroKurz(summe(teil))}`
}

/** Nur Produktbereiche, in denen überhaupt Zuschüsse stehen. Größter zuerst. */
const nachBereich = computed(() =>
  [...new Set(alle.value.map((p) => p.produktbereich))]
    .map((nr) => {
      const teil = alle.value.filter((p) => p.produktbereich === nr)
      return {
        nr,
        name: PRODUKTBEREICHE[nr] ?? nr,
        gesamt: summe(teil),
        frei: summe(mitGrad(teil, 'freiwillig')),
        grund: summe(mitGrad(teil, 'dem Grunde nach')),
      }
    })
    .filter((b) => b.gesamt > 0)
    .sort((a, b) => b.gesamt - a.gesamt),
)

/**
 * Für das Tortendiagramm: die sieben größten Bereiche einzeln, der Rest als
 * "Sonstige". Das ist die Regel aus dem README — es gibt acht Kategoriefarben,
 * und Farben werden nicht im Kreis wiederverwendet.
 */
const MAX_STUECKE = 7

const verteilungDaten = computed(() => {
  const gross = nachBereich.value.slice(0, MAX_STUECKE)
  const rest = nachBereich.value.slice(MAX_STUECKE)
  const stuecke = gross.map((b) => ({ name: `${b.nr} ${b.name}`, value: b.gesamt }))
  if (rest.length > 0) {
    stuecke.push({
      name: `Sonstige (${zahl(rest.length)} Bereiche)`,
      value: rest.reduce((s, b) => s + b.gesamt, 0),
    })
  }
  return stuecke
})

/**
 * Welche Ringstücke über die Legende abgewählt sind. Die Auswahl selbst
 * verwaltet ECharts; wir merken sie uns mit, damit die Summe in der Mitte des
 * Rings zeigt, was gerade ausgewählt ist, statt stur das Gesamtergebnis.
 */
const abgewaehlt = ref<string[]>([])

function legendeGeaendert(ereignis: unknown): void {
  const { selected } = ereignis as { selected?: Record<string, boolean> }
  if (!selected) return
  abgewaehlt.value = Object.entries(selected)
    .filter(([, sichtbar]) => !sichtbar)
    .map(([name]) => name)
}

const ausgewaehlt = computed(() =>
  verteilungDaten.value.filter((stueck) => !abgewaehlt.value.includes(stueck.name)),
)

const ausgewaehlteSumme = computed(() =>
  ausgewaehlt.value.reduce((wert, stueck) => wert + stueck.value, 0),
)

/** Aufsteigend, weil die Kategorieachse liegender Balken von unten nach oben läuft. */
const nachSpielraum = computed(() =>
  [...nachBereich.value].sort((a, b) => a.frei + a.grund - (b.frei + b.grund)),
)

/** Für die Auswahlliste über der Tabelle ist die PB-Nummer die natürliche Ordnung. */
const bereichsAuswahl = computed(() =>
  [...nachBereich.value].sort((a, b) => a.nr.localeCompare(b.nr)),
)

const JAHRESANGABE = /^\d{4}$/

/**
 * Wie viel Geld ist nach Ende eines Jahres noch zugesagt? Die Kurve beginnt
 * links bei allem, was ein Enddatum hat, und fällt mit jedem Jahr um die
 * Zusagen, die dann auslaufen — bis rechts nichts mehr übrig ist.
 */
const befristungRest = computed(() => {
  const mitJahr = alle.value.filter((p) => JAHRESANGABE.test(p.befristetBis))
  const jahre = [...new Set(mitJahr.map((p) => p.befristetBis))].sort()
  let rest = jeStufe(mitJahr)
  const reihen = [{ jahr: 'heute', werte: rest }]
  for (const jahr of jahre) {
    const imJahr = mitJahr.filter((p) => p.befristetBis === jahr)
    rest = jeStufe(imJahr).map((auslaufend, i) => (rest[i] ?? 0) - auslaufend)
    reihen.push({ jahr, werte: rest })
  }
  return reihen
})

/** Zusagen ohne Enddatum ("jährlich", "Schuljahr", "10 Jahre") — nicht in der Kurve. */
const ohneEnddatum = computed(() => alle.value.filter((p) => !JAHRESANGABE.test(p.befristetBis)))

// --------------------------------------------------------------- Diagramme

const stufen = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (info: unknown) => {
      const { seriesName, value } = info as { seriesName: string; value: number }
      return `<strong>${seriesName}</strong><br>${euro(value)}<br>${prozent(value / gesamt.value)} der Zuschüsse`
    },
  },
  legend: { bottom: 0 },
  grid: { left: 0, right: 0, top: 8, bottom: 64 },
  xAxis: { type: 'value', max: gesamt.value, show: false },
  yAxis: { type: 'category', data: [''], show: false },
  series: GRADE.map((grad) => ({
    name: grad,
    type: 'bar' as const,
    stack: 'stufen',
    barWidth: 64,
    data: [summe(mitGrad(alle.value, grad))],
    itemStyle: { color: GRAD_FARBE[grad], borderRadius: 0 },
  })),
}))

const verteilung = computed<EChartsOption>(() => ({
  /*
   * Responsive über ECharts' eigene Media-Queries: breit genug steht die
   * Legende als vollständige Liste rechts neben dem Ring, auf Handybreite
   * rutscht sie darunter. Die Legende trägt die Namen, die Beschriftungen am
   * Ring nur noch die Prozente — sonst kollidieren beide.
   */
  baseOption: {
    title: {
      // Zeigt immer die Summe der ausgewählten Stücke, nicht stur das Ganze.
      text: euroKurz(ausgewaehlteSumme.value),
      subtext:
        abgewaehlt.value.length === 0
          ? 'Zuschüsse gesamt'
          : `${prozent(ausgewaehlteSumme.value / gesamt.value)} von ${euroKurz(gesamt.value)}`,
      textAlign: 'center',
      textStyle: { fontSize: 22 },
      subtextStyle: { fontSize: 12 },
    },
    // Auswahl mitschicken, damit ein Neuzeichnen sie nicht zurücksetzt.
    legend: {
      selected: Object.fromEntries(
        verteilungDaten.value.map((stueck) => [
          stueck.name,
          !abgewaehlt.value.includes(stueck.name),
        ]),
      ),
    },
    tooltip: {
      trigger: 'item',
      formatter: (info: unknown) => {
        const { name, value } = info as { name: string; value: number }
        return `<strong>${name}</strong><br>${euro(value)}<br>${prozent(value / gesamt.value)} der Zuschüsse`
      },
    },
    series: [
      {
        type: 'pie',
        data: verteilungDaten.value,
        avoidLabelOverlap: true,
        // Unter ~1,5 % überlagern sich die Beschriftungen; diese Bereiche
        // stehen weiterhin in der Legende und im Tooltip.
        minShowLabelAngle: 5,
        label: {
          formatter: (info: unknown) => prozent((info as { percent: number }).percent / 100),
        },
        labelLine: { length: 10, length2: 8 },
      },
    ],
  },
  media: [
    {
      query: { minWidth: 560 },
      option: {
        legend: {
          orient: 'vertical',
          right: 0,
          top: 'middle',
          itemGap: 14,
          // Lange Bereichsnamen dürfen die Liste nicht in die Breite ziehen.
          textStyle: { width: 200, overflow: 'truncate' },
        },
        title: { left: '33%', top: '43%' },
        series: [{ radius: ['42%', '64%'], center: ['33%', '50%'] }],
      },
    },
    {
      query: { maxWidth: 559 },
      option: {
        legend: { orient: 'horizontal', bottom: 0, type: 'scroll' },
        title: { left: '50%', top: '34%' },
        series: [{ radius: ['40%', '62%'], center: ['50%', '42%'] }],
      },
    },
  ],
}))

const spielraum = computed<EChartsOption>(() => {
  const reihen = nachSpielraum.value
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (wert) => euro(Number(wert)),
    },
    legend: { bottom: 0 },
    grid: { left: 8, right: 24, top: 8, bottom: 48, containLabel: true },
    xAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
    yAxis: {
      type: 'category',
      data: reihen.map((b) => `${b.nr} ${b.name}`),
      axisLabel: { width: 210, overflow: 'truncate' },
    },
    series: [
      {
        name: 'freiwillig',
        type: 'bar',
        stack: 'spielraum',
        data: reihen.map((b) => b.frei),
        itemStyle: { color: GRAD_FARBE.freiwillig, borderRadius: 0 },
      },
      {
        name: 'dem Grunde nach',
        type: 'bar',
        stack: 'spielraum',
        data: reihen.map((b) => b.grund),
        itemStyle: { color: GRAD_FARBE['dem Grunde nach'], borderRadius: 0 },
      },
    ],
  }
})

const befristung = computed<EChartsOption>(() => {
  const reihen = befristungRest.value
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: (info: unknown) => {
        const teile = info as Array<{
          axisValue: string
          marker: string
          seriesName: string
          value: number
        }>
        const erste = teile[0]
        if (!erste) return ''
        const kopf =
          erste.axisValue === 'heute' ? 'noch zugesagt' : `nach Ende ${erste.axisValue} noch zugesagt`
        const zeilen = teile.map((t) => `${t.marker} ${t.seriesName}: ${euro(t.value)}`).join('<br>')
        const rest = teile.reduce((s, t) => s + t.value, 0)
        return `<strong>${kopf}</strong><br>${zeilen}<br><br>zusammen: ${euro(rest)}`
      },
    },
    legend: { bottom: 0 },
    grid: { left: 8, right: 16, top: 16, bottom: 56, containLabel: true },
    xAxis: {
      type: 'category',
      // Ohne boundaryGap klebt die Fläche am Rand statt in der Mitte zu schweben.
      boundaryGap: false,
      data: reihen.map((r) => r.jahr),
    },
    yAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
    series: GRADE.map((grad, i) => ({
      name: grad,
      type: 'line' as const,
      stack: 'befristung',
      data: reihen.map((r) => r.werte[i] ?? 0),
      showSymbol: true,
      symbolSize: 6,
      lineStyle: { width: 1, color: GRAD_FARBE[grad] },
      itemStyle: { color: GRAD_FARBE[grad] },
      areaStyle: { color: GRAD_FARBE[grad], opacity: 0.85 },
    })),
  }
})

// ----------------------------------------------------------------- Tabelle

const suche = ref('')
const gradFilter = ref('alle')
const bereichFilter = ref('alle')

const wert = (ereignis: Event): string => (ereignis.target as HTMLInputElement).value

const gefiltert = computed(() => {
  const begriff = suche.value.trim().toLocaleLowerCase('de')
  return alle.value
    .filter((p) => gradFilter.value === 'alle' || p.grad === gradFilter.value)
    .filter((p) => bereichFilter.value === 'alle' || p.produktbereich === bereichFilter.value)
    .filter(
      (p) =>
        !begriff ||
        p.empfaenger.toLocaleLowerCase('de').includes(begriff) ||
        p.zweck.toLocaleLowerCase('de').includes(begriff),
    )
    .sort((a, b) => b.eur2026 - a.eur2026)
})

const filterAktiv = computed(
  () => suche.value !== '' || gradFilter.value !== 'alle' || bereichFilter.value !== 'alle',
)

/**
 * Der Zuschussbericht widerspricht sich an einer Stelle selbst: ein Posten ist
 * als gebunden eingestuft, nennt sich im Zweck aber "Freiwillige Zuschüsse".
 * Aus den Daten gesucht statt fest eingetippt — fällt der Widerspruch in einer
 * künftigen Fassung weg, verschwindet auch die Fußnote.
 */
const widerspruch = computed(() =>
  alle.value.find(
    (p) => !VERHANDELBAR.includes(p.grad) && /freiwillige zuschüsse/i.test(p.zweck),
  ),
)

function filterZuruecksetzen(): void {
  suche.value = ''
  gradFilter.value = 'alle'
  bereichFilter.value = 'alle'
}

// ------------------------------------------------------------------ Quelle

/** public/daten/zuschuesse-quellen.json, erzeugt von scripts/pipeline/quellen_zuschuesse.py. */
interface Quellen {
  pdf: string
  band: number
  seiten: Record<string, { bild: string; breite: number; hoehe: number }>
  posten: Record<
    string,
    {
      seite: number
      box: [number, number, number, number]
      csv: string
      zeile: number
      zellen: string[]
    }
  >
}

const ROHDATEN_URL =
  'https://github.com/codeformuenster/haushalt-muenster-2026/blob/main/daten/raw_table_extraction/'

const quelleOffen = ref(false)
const quelle = ref<Quelle | null>(null)
const quellenFehler = ref(false)
/** Erst beim ersten Klick geladen und dann behalten. */
let quellen: Promise<Quellen> | null = null

function ladeQuellen(): Promise<Quellen> {
  quellen ??= fetch(`${import.meta.env.BASE_URL}daten/zuschuesse-quellen.json`).then((antwort) => {
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`)
    return antwort.json() as Promise<Quellen>
  })
  return quellen
}

async function zeigeQuelle(p: Posten): Promise<void> {
  quelle.value = null
  quellenFehler.value = false
  quelleOffen.value = true
  try {
    const q = await ladeQuellen()
    const eintrag = q.posten[String(p.nr)]
    const seite = eintrag && q.seiten[String(eintrag.seite)]
    if (!eintrag || !seite) throw new Error(`Keine Quelle für Nr. ${p.nr}`)
    quelle.value = {
      titel: p.empfaenger,
      betrag: `${euro(p.eur2026)} in 2026`,
      band: q.band,
      seite: eintrag.seite,
      bild: `${import.meta.env.BASE_URL}${seite.bild}`,
      bildBreite: seite.breite,
      bildHoehe: seite.hoehe,
      box: eintrag.box,
      pdfUrl: q.pdf,
      csv: {
        datei: eintrag.csv,
        zeile: eintrag.zeile,
        zellen: eintrag.zellen,
        url: `${ROHDATEN_URL}${eintrag.csv}?plain=1#L${eintrag.zeile}`,
      },
    }
  } catch {
    // Ein fehlgeschlagener Abruf soll beim nächsten Klick neu versucht werden.
    quellen = null
    quellenFehler.value = true
  }
}
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Zuschüsse an Vereine und Verbände"
      beschreibung="Die Stadt gibt jedes Jahr Geld an Vereine, Verbände und andere Träger weiter. Für diese Zuschüsse — und nur für sie — sagt der Haushaltsplan selbst, wie stark die Stadt dabei gesetzlich gebunden ist. Deshalb lässt sich hier genau zeigen, worüber der Rat tatsächlich entscheiden kann und worüber nicht."
    />

    <wa-callout variant="brand" appearance="outlined">
      <strong>Das ist nicht der ganze Haushalt.</strong> Der Zuschussbericht umfasst nur die
      Zuwendungen an Dritte. Personal, Bau, Sozialtransfers und der Betrieb der Verwaltung stehen
      nicht darin — sie machen den weitaus größten Teil des Haushalts aus. Für sie weist der Plan
      die Freiwilligkeit nicht aus.
    </wa-callout>

    <p v-if="!posten && !ladefehler" class="mm-laden">Zahlen werden geladen …</p>

    <wa-callout v-if="ladefehler" variant="danger" appearance="outlined">
      <strong>Die Zahlen konnten nicht geladen werden.</strong> Die Datei
      <code>daten/zuschuesse-2026-2027.json</code> fehlt oder ist nicht lesbar. Sie entsteht mit
      <code>node preprocessing/zuschuesse.ts</code>.
    </wa-callout>

    <template v-if="posten">
      <ChartCard
        titel="Worüber kann der Rat entscheiden?"
        beschreibung="Der Haushaltsplan unterscheidet, ob eine Zuwendung dem Grunde nach vorgeschrieben ist (die Stadt muss zahlen) und ob auch ihre Höhe feststeht. Daraus ergeben sich vier Stufen zwischen völlig frei und vollständig gebunden."
        :quelle="QUELLE"
      >
        <dl class="mm-kennzahlen">
          <div v-for="k in kennzahlen" :key="k.titel" class="mm-kennzahl">
            <dt>{{ k.titel }}</dt>
            <dd>{{ k.wert }}</dd>
            <p>{{ k.zusatz }}</p>
          </div>
        </dl>

        <BaseChart :option="stufen" hoehe="200px" />

        <wa-details summary="Was heißt „dem Grunde nach“?">
          <p>
            Das Kommunalrecht trennt beim Pflichtgrad einer Aufgabe zwei Fragen: das <em>Ob</em> —
            muss die Stadt überhaupt tätig werden? — und das <em>Wie</em> — steht auch der Betrag
            schon fest? Die vier Stufen sind die vier Kombinationen daraus.
          </p>
          <table class="mm-tabelle">
            <thead>
              <tr>
                <th></th>
                <th>Höhe frei</th>
                <th>Höhe gesetzlich bestimmt</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Ob frei</th>
                <td><strong>freiwillig</strong><br />{{ gradInfo('freiwillig') }}</td>
                <td><strong>der Höhe nach</strong><br />{{ gradInfo('der Höhe nach') }}</td>
              </tr>
              <tr>
                <th scope="row">Ob gesetzlich vorgegeben</th>
                <td><strong>dem Grunde nach</strong><br />{{ gradInfo('dem Grunde nach') }}</td>
                <td>
                  <strong>Höhe und Grund nach</strong><br />{{ gradInfo('Höhe und Grund nach') }}
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            In der gebundenen Ecke rechts unten stehen Zuwendungen wie die nach dem KiBiz: Das
            Gesetz schreibt sowohl den Betrieb von Kindertageseinrichtungen als auch die
            Kindpauschalen vor, der Rat entscheidet darüber nichts. Bei „dem Grunde nach“ — etwa
            OGS, offene Kinder- und Jugendarbeit oder Schulsozialarbeit — muss die Stadt tätig
            werden, entscheidet aber selbst, mit wie viel Geld. <strong>Verhandelbar sind also nur
            die beiden linken Stufen „freiwillig“ und „dem Grunde nach“.</strong>
          </p>
        </wa-details>
      </ChartCard>

      <ChartCard
        titel="Alle Zuschüsse nach Produktbereich"
        beschreibung="Wohin das Geld überhaupt fließt. Der Ring zeigt die Aufteilung auf die Produktbereiche des Haushalts — die sieben größten einzeln, die übrigen zusammengefasst. Hier geht es nur um den Betrag, nicht darum, wie frei die Stadt darüber entscheiden kann; das steht im nächsten Diagramm."
        :quelle="QUELLE"
      >
        <BaseChart :option="verteilung" hoehe="420px" @legendselectchanged="legendeGeaendert" />
      </ChartCard>

      <ChartCard
        titel="Wo der Spielraum liegt"
        beschreibung="Nur die verhandelbaren Stufen „freiwillig“ und „dem Grunde nach“, je Produktbereich. Ein Bereich kann viel Geld bewegen und hier trotzdem kurz ausfallen — dass ein Balken klein ist, heißt also nicht, dass der Bereich klein ist, sondern dass wenig davon zur Entscheidung steht. Der Vergleich zum vorigen Diagramm lohnt sich."
        :quelle="QUELLE"
      >
        <BaseChart :option="spielraum" hoehe="440px" />
      </ChartCard>

      <ChartCard
        titel="Bis wann ist das Geld zugesagt?"
        beschreibung="Zusagen laufen aus, und erst dann wird wieder über das Geld entschieden. Die Fläche zeigt, wie viel nach Ende des jeweiligen Jahres noch zugesagt ist: links alles, was ein Enddatum hat, und dann von Jahr zu Jahr weniger, bis rechts nichts mehr läuft. Wo die Fläche steil abfällt, wird in dem Jahr besonders viel neu verhandelt — jedenfalls bei den Stufen „freiwillig“ und „dem Grunde nach“; die gebundenen Mittel laufen zwar auch aus, werden aber gesetzlich fortgeschrieben."
        :quelle="QUELLE"
      >
        <BaseChart :option="befristung" hoehe="400px" />
        <p class="mm-fussnote">
          Nicht in der Kurve: {{ zahl(ohneEnddatum.length) }} Posten über zusammen
          {{ euroKurz(summe(ohneEnddatum)) }} nennen kein Enddatum, sondern eine Laufzeitregel wie
          „jährlich“, „Schuljahr“ oder „10 Jahre“. In der Tabelle unten stehen sie mit dieser Angabe.
        </p>
      </ChartCard>

      <ChartCard
        titel="Alle Posten einzeln"
        beschreibung="Der vollständige Zuschussbericht, sortiert nach dem Betrag für 2026."
        :quelle="QUELLE"
      >
        <div class="mm-filter">
          <wa-input
            label="Suche in Empfänger und Zweck"
            placeholder="z. B. Sport"
            :value="suche"
            clearable
            @input="suche = wert($event)"
          ></wa-input>

          <wa-select
            label="Verpflichtungsgrad"
            :value="gradFilter"
            @change="gradFilter = wert($event)"
          >
            <wa-option value="alle">alle</wa-option>
            <wa-option v-for="grad in GRADE" :key="grad" :value="grad">{{ grad }}</wa-option>
          </wa-select>

          <wa-select
            label="Produktbereich"
            :value="bereichFilter"
            @change="bereichFilter = wert($event)"
          >
            <wa-option value="alle">alle</wa-option>
            <wa-option v-for="b in bereichsAuswahl" :key="b.nr" :value="b.nr">
              {{ b.nr }} {{ b.name }}
            </wa-option>
          </wa-select>
        </div>

        <p class="mm-treffer" aria-live="polite">
          {{ zahl(gefiltert.length) }} von {{ zahl(alle.length) }} Posten ·
          {{ euroKurz(summe(gefiltert)) }} in 2026
          <wa-button v-if="filterAktiv" size="small" appearance="plain" @click="filterZuruecksetzen">
            Filter zurücksetzen
          </wa-button>
        </p>

        <div class="mm-tabelle-rahmen">
          <table class="mm-tabelle">
            <thead>
              <tr>
                <th>Empfänger und Zweck</th>
                <th>Produktbereich</th>
                <th>Verpflichtungsgrad</th>
                <th class="mm-zahl">2026</th>
                <th class="mm-zahl">2027</th>
                <th>bis</th>
                <th><span class="mm-unsichtbar">Quelle</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in gefiltert" :key="p.nr">
                <td>
                  {{ p.empfaenger }}
                  <span class="mm-zweck">{{ p.zweck }}</span>
                </td>
                <td>{{ p.produktbereich }} {{ PRODUKTBEREICHE[p.produktbereich] }}</td>
                <td>
                  <span class="mm-punkt" :style="{ background: GRAD_FARBE[p.grad] }"></span>
                  {{ p.grad }}
                </td>
                <td class="mm-zahl">{{ euro(p.eur2026) }}</td>
                <td class="mm-zahl">{{ euro(p.eur2027) }}</td>
                <td>{{ p.befristetBis }}</td>
                <td class="mm-quelle-spalte">
                  <wa-button
                    appearance="plain"
                    size="small"
                    title="Quelle anzeigen"
                    @click="zeigeQuelle(p)"
                  >
                    <wa-icon name="file-lines" label="Quelle anzeigen"></wa-icon>
                  </wa-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="gefiltert.length === 0" class="mm-treffer">
          Kein Posten passt zu diesen Filtern.
        </p>

        <p v-if="widerspruch" class="mm-fussnote">
          <strong>Ein Widerspruch in der Quelle:</strong> Der Posten „{{ widerspruch.zweck }}“
          ({{ euro(widerspruch.eur2026) }}, Produktgruppe {{ widerspruch.produktgruppe }}) ist als
          <em>{{ widerspruch.grad }}</em> eingestuft, nennt sich im Verwendungszweck aber
          ausdrücklich „Freiwillige Zuschüsse“. Beides steht so im Haushaltsplan. Wir haben es nicht
          stillschweigend korrigiert.
        </p>
      </ChartCard>
    </template>

    <QuelleSeitenleiste v-model:offen="quelleOffen" :quelle="quelle" :fehler="quellenFehler" />
  </div>
</template>

<style scoped>
.mm-laden {
  color: var(--wa-color-text-quiet);
}

/* Die drei großen Zahlen über dem ersten Diagramm. */
.mm-kennzahlen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: var(--wa-space-l);
  margin: 0 0 var(--wa-space-l);
}

.mm-kennzahl dt {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-kennzahl dd {
  margin: var(--wa-space-3xs) 0 0;
  font-size: var(--wa-font-size-2xl);
  font-weight: var(--wa-font-weight-bold);
  line-height: 1.1;
}

.mm-kennzahl p {
  margin: var(--wa-space-2xs) 0 0;
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-filter {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  gap: var(--wa-space-m);
  margin-bottom: var(--wa-space-m);
}

.mm-treffer {
  margin: 0 0 var(--wa-space-s);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

/* Auf schmalen Fenstern darf die Tabelle scrollen statt die Seite zu sprengen. */
.mm-tabelle-rahmen {
  overflow-x: auto;
}

/*
 * Bewusste Kopie aus GlossarPage.vue statt eines gemeinsamen Stils in main.css:
 * dort ist seitenspezifisches CSS ausdrücklich unerwünscht. Beim dritten
 * Vorkommen lohnt das Gespräch im Team.
 */
.mm-tabelle {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--wa-font-size-s);
}

.mm-tabelle th,
.mm-tabelle td {
  padding: var(--wa-space-2xs) var(--wa-space-s);
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--wa-color-surface-border);
}

.mm-tabelle th {
  color: var(--wa-color-text-quiet);
  font-weight: var(--wa-font-weight-bold);
}

.mm-tabelle .mm-zahl {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Der Zweck wird bis zu 180 Zeichen lang — leise zweite Zeile statt eigener Spalte. */
.mm-zweck {
  display: block;
  max-width: 44ch;
  color: var(--wa-color-text-quiet);
}

.mm-punkt {
  display: inline-block;
  width: 0.5em;
  height: 0.5em;
  border-radius: 50%;
  vertical-align: 0.1em;
}

/* Schmale Spalte mit dem Quellen-Knopf; der Knopf bringt sein eigenes Polster mit. */
.mm-tabelle .mm-quelle-spalte {
  padding: 0;
}

/* Spaltenkopf nur für Screenreader. */
.mm-unsichtbar {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.mm-fussnote {
  margin: var(--wa-space-l) 0 0;
  max-width: var(--mm-lesebreite);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}
</style>

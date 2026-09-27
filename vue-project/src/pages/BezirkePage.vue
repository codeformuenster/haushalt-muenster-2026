<script setup lang="ts">
/**
 * Die Bezirke — bezirksbezogene Haushaltsangaben aus Band 2.
 *
 * Die Daten kommen aus public/daten/bezirke-2026-2027.json und
 * public/daten/stadtbezirke.geojson, beide erzeugt von
 * preprocessing/bezirke.ts. Hier wird nur dargestellt und aggregiert,
 * nicht bereinigt — das passiert im Skript.
 */
import { computed, onMounted, ref } from 'vue'
import { registerMap } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import { euro, euroKurz, zahl } from '@/charts/format'
import { SEQUENZ_FARBEN } from '@/charts/echartsTheme'
import { useSchmalerBildschirm } from '@/lib/bildschirm'

const QUELLE = 'Haushaltsplan 2026/27, Band 2, S. 143–324 (Bezirksbezogene Haushaltsangaben)'

/** Name, unter dem die Geometrie bei ECharts angemeldet wird. */
const KARTE = 'muenster-bezirke'

/**
 * Breitengrad-Korrektur. ECharts rechnet Längen- und Breitengrade sonst 1:1 in
 * Pixel um; auf Münsters Breite (52°) wird die Stadt dadurch spürbar zu breit.
 * cos(52°) ≈ 0,62 rückt die Umrisse wieder ins richtige Verhältnis.
 */
const BREITEN_KORREKTUR = 0.62

/**
 * Lage und Zuschnitt der Karte. Beide Kartenebenen — Einfärbung und Umrandung —
 * verwenden dieselben Werte; nur dann liegen sie deckungsgleich übereinander.
 */
const LAGE = {
  map: KARTE,
  roam: false,
  aspectScale: BREITEN_KORREKTUR,
  top: 8,
  bottom: 56,
} as const

interface Posten {
  bezirk: string
  fachthema: string
  bezirksspezifisch: boolean
  ein2026: number
  aus2026: number
  ein2027: number
  aus2027: number
}

interface Daten {
  quelle: string
  bezirke: { name: string; nr: string }[]
  posten: Posten[]
}

// ------------------------------------------------------------------ Laden

const daten = ref<Daten | null>(null)
const karteBereit = ref(false)
const ladefehler = ref(false)

onMounted(async () => {
  try {
    // BASE_URL statt "/", damit es auch unter einem Unterpfad deployt funktioniert.
    const basis = import.meta.env.BASE_URL
    const [zahlen, geo] = await Promise.all([
      hole(`${basis}daten/bezirke-2026-2027.json`),
      hole(`${basis}daten/stadtbezirke.geojson`),
    ])
    // Erst anmelden, dann die Daten setzen — sonst zeichnet die Karte ins Leere.
    // registerMap erwartet ein GeoJSON-Objekt; aus fetch kommt es als unknown.
    registerMap(KARTE, geo as Parameters<typeof registerMap>[1])
    karteBereit.value = true
    daten.value = zahlen as Daten
    bezirk.value = daten.value.bezirke[0]?.name ?? null
  } catch {
    ladefehler.value = true
  }
})

async function hole(pfad: string): Promise<unknown> {
  const antwort = await fetch(pfad)
  if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`)
  return antwort.json()
}

// ------------------------------------------------------------- Auswahl

const JAHRE = ['2026', '2027'] as const
type Jahr = (typeof JAHRE)[number]

const jahr = ref<Jahr>('2026')

/**
 * Immer genau ein Bezirk, nach dem Laden der erste. Eine Ansicht für die ganze
 * Stadt gibt es nicht: Bezirksübergreifende Maßnahmen stehen im Plan unter jedem
 * betroffenen Bezirk mit dem vollen Betrag, eine Summe über alle Bezirke zählt
 * sie mehrfach.
 */
const bezirk = ref<string | null>(null)

const alle = computed<Posten[]>(() => daten.value?.posten ?? [])
const bezirke = computed(() => daten.value?.bezirke.map((b) => b.name) ?? [])

const aus = (p: Posten): number => (jahr.value === '2026' ? p.aus2026 : p.aus2027)
const ein = (p: Posten): number => (jahr.value === '2026' ? p.ein2026 : p.ein2027)

const summeAus = (liste: Posten[]): number => liste.reduce((s, p) => s + aus(p), 0)
const summeEin = (liste: Posten[]): number => liste.reduce((s, p) => s + ein(p), 0)

const imBezirk = (name: string): Posten[] => alle.value.filter((p) => p.bezirk === name)

/** Die Posten des gewählten Bezirks. */
const auswahl = computed<Posten[]>(() => (bezirk.value === null ? [] : imBezirk(bezirk.value)))

const auswahlName = computed(() => bezirk.value ?? '–')

// --------------------------------------------------------------- Aggregate

const jeBezirk = computed(() =>
  bezirke.value.map((name) => ({ name, wert: summeAus(imBezirk(name)) })),
)

const groesster = computed(
  () => [...jeBezirk.value].sort((a, b) => b.wert - a.wert)[0] ?? { name: '–', wert: 0 },
)

/** Fachthemen der aktuellen Auswahl, größtes zuerst, leere weggelassen. */
const jeFachthema = computed(() => {
  const themen = [...new Set(auswahl.value.map((p) => p.fachthema))]
  return themen
    .map((name) => {
      const teil = auswahl.value.filter((p) => p.fachthema === name)
      return { name, wert: summeAus(teil), ein: summeEin(teil) }
    })
    .filter((t) => t.wert > 0)
    .sort((a, b) => b.wert - a.wert)
})

const groesstesThema = computed(() => jeFachthema.value[0] ?? { name: '–', wert: 0 })

/** Für den Kartentooltip: das stärkste Fachthema eines einzelnen Bezirks. */
function spitzenthema(name: string): { name: string; wert: number } {
  const teil = imBezirk(name)
  const themen = [...new Set(teil.map((p) => p.fachthema))]
    .map((thema) => ({ name: thema, wert: summeAus(teil.filter((p) => p.fachthema === thema)) }))
    .sort((a, b) => b.wert - a.wert)
  return themen[0] ?? { name: '–', wert: 0 }
}

const kennzahlen = computed(() => [
  {
    titel: `Investitionen ${jahr.value} in ${auswahlName.value}`,
    wert: euroKurz(summeAus(auswahl.value)),
    zusatz: `verteilt auf ${zahl(jeFachthema.value.length)} Fachthemen`,
  },
  {
    titel: 'davon gegenfinanziert',
    wert: euroKurz(summeEin(auswahl.value)),
    zusatz: 'Zuwendungen und Beiträge Dritter, die dagegen stehen',
  },
  {
    titel: 'größter Posten',
    wert: euroKurz(groesstesThema.value.wert),
    zusatz: groesstesThema.value.name,
  },
])

// --------------------------------------------------------------- Diagramme

/**
 * Die Umrandung des gewählten Bezirks, als eigene Kartenebene über der
 * eingefärbten.
 *
 * Warum nicht einfach ein dicker Rand am Gebiet selbst: ECharts zeichnet die
 * Gebiete in der Reihenfolge des GeoJSON, und eine Konturlinie liegt zur Hälfte
 * außerhalb ihres Gebiets. Jeder später gezeichnete Nachbar übermalt sie dort
 * mit seinem weißen Rand — die Umrandung bekam dadurch Lücken, und zwar je nach
 * Bezirk an anderen Kanten.
 *
 * Und warum eine `geo`-Ebene statt einer zweiten `map`-Serie: zwei map-Serien
 * mit derselben Karte legt ECharts zusammen, statt sie übereinanderzulegen —
 * die zweite Serie wäre unsichtbar.
 */
const umrandung = computed(() => ({
  ...LAGE,
  // Eigene Zeichenebene, damit die Linie über der eingefärbten Karte liegt.
  zlevel: 1,
  // Diese Ebene ist nur Linie: Tooltip und Klick gehören der Karte darunter.
  silent: true,
  itemStyle: { areaColor: 'transparent', borderColor: 'transparent', borderWidth: 0 },
  // Ohne Auswahl bleibt die Ebene leer. Sie ganz wegzulassen hinge davon ab, wie
  // vue-echarts alte und neue Option zusammenführt — eine leere Liste ist eindeutig.
  regions:
    bezirk.value === null
      ? []
      : [
          {
            name: bezirk.value,
            itemStyle: {
              areaColor: 'transparent',
              borderColor: '#1a1c23',
              borderWidth: 3,
              // Runde Ecken statt spitzer Gehrungen: die Bezirksgrenzen knicken
              // tausendfach, dort franst eine dicke Linie sonst in Zacken aus.
              borderJoin: 'round' as const,
            },
          },
        ],
}))

const karte = computed<EChartsOption>(() => {
  const werte = jeBezirk.value.map((b) => b.wert)
  return {
    tooltip: {
      trigger: 'item',
      formatter: (info: unknown) => {
        const { name, value } = info as { name: string; value: number }
        if (!Number.isFinite(value)) return name
        const spitze = spitzenthema(name)
        return [
          `<strong>${name}</strong>`,
          `${euro(value)} in ${jahr.value}`,
          `<br>größter Posten: ${spitze.name}`,
          euro(spitze.wert),
        ].join('<br>')
      },
    },
    visualMap: {
      min: Math.min(...werte),
      max: Math.max(...werte),
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 14,
      itemHeight: 140,
      // Bei waagerechter Skala steht text[0] rechts, also der große Wert.
      text: [euroKurz(Math.max(...werte)), euroKurz(Math.min(...werte))],
      inRange: { color: [...SEQUENZ_FARBEN] },
      // Nur die eingefärbte Ebene, nicht die Umrandung darüber.
      seriesIndex: 0,
    },
    series: [
      {
        ...LAGE,
        type: 'map',
        // Die Auswahl verwalten wir selbst, damit sie zu den Schaltflächen passt.
        selectedMode: false,
        itemStyle: { borderColor: '#ffffff', borderWidth: 1.5 },
        // Dunkle Schrift mit weißem Rand bleibt auf jeder Stufe der Skala lesbar.
        label: {
          show: true,
          color: '#1a1c23',
          fontSize: 13,
          fontWeight: 'bold',
          textBorderColor: '#ffffff',
          textBorderWidth: 3,
        },
        emphasis: {
          label: { color: '#1a1c23', textBorderColor: '#ffffff', textBorderWidth: 3 },
        },
        data: jeBezirk.value.map((b) => ({ name: b.name, value: b.wert })),
      },
    ],
    geo: umrandung.value,
  }
})

/**
 * Das Fachthemen-Diagramm besteht immer aus liegenden Balken, größtes Thema
 * oben. Auf breiten Bildschirmen stehen die Themennamen links an der Achse.
 * Auf Handybreite wäre dort kein Platz mehr für den Balken — dann steht der
 * Name in voller Länge (bei Bedarf zweizeilig) über seinem Balken, und das
 * Diagramm wird entsprechend höher. Gedrehte, abgeschnittene Beschriftungen
 * gibt es so nicht.
 */
const schmal = useSchmalerBildschirm()

/** Höhe einer Zeile (Name über Balken) in der schmalen Ansicht, in Pixeln. */
const ZEILE_SCHMAL = 48

const fachthemenHoehe = computed(() =>
  schmal.value ? `${jeFachthema.value.length * ZEILE_SCHMAL + 40}px` : '480px',
)

const fachthemen = computed<EChartsOption>(() => {
  // jeFachthema ist absteigend sortiert. Die Kategorieachse liegender Balken
  // läuft von unten nach oben — die Reihenfolge muss kippen, damit das größte
  // Thema oben steht.
  const reihen = [...jeFachthema.value].reverse()

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (info: unknown) => {
        const teile = info as Array<{ axisValue: string; value: number }>
        const erste = teile[0]
        if (!erste) return ''
        return `<strong>${erste.axisValue}</strong><br>${euro(erste.value)}`
      },
    },
    // containLabel rechnet den Platz der Achsenbeschriftungen selbst dazu.
    grid: schmal.value
      ? { left: 0, right: 16, top: 32, bottom: 8, containLabel: true }
      : { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (wert: number) => euroKurz(wert) },
    },
    yAxis: {
      type: 'category',
      data: reihen.map((t) => t.name),
      axisLabel: schmal.value ? { show: false } : { width: 210, overflow: 'truncate' as const },
      axisTick: { show: !schmal.value },
    },
    series: [
      {
        name: 'Auszahlungen',
        type: 'bar',
        data: reihen.map((t) => t.wert),
        // Nur die Kante am Wertende runden.
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        ...(schmal.value
          ? {
              barWidth: 12,
              // Der Themenname steht über dem Balken, von dessen linker Kante
              // aus, und wächst bei zwei Zeilen nach oben.
              label: {
                show: true,
                position: [0, -4],
                align: 'left' as const,
                verticalAlign: 'bottom' as const,
                formatter: '{b}',
                fontSize: 12,
                lineHeight: 15,
                color: '#1a1c23',
                width: 240,
                overflow: 'break' as const,
              },
            }
          : {}),
      },
    ],
  }
})

/* Textalternativen für die beiden Diagramme: Kernaussage plus Verweis auf die Tabelle. */
const karteBeschreibung = computed(
  () =>
    `Karte der Stadtbezirke, eingefärbt nach den Investitionen ${jahr.value}: je dunkler, desto mehr. ` +
    `Am meisten ist in ${groesster.value.name} vorgesehen (${euroKurz(groesster.value.wert)}). ` +
    `Die Werte je Bezirk stehen in der Tabelle „Alle Zahlen“ weiter unten.`,
)

const fachthemenBeschreibung = computed(
  () =>
    `Balkendiagramm der Investitionen ${jahr.value} in ${auswahlName.value} nach Fachthema. ` +
    `Größter Posten ist ${groesstesThema.value.name} mit ${euroKurz(groesstesThema.value.wert)}. ` +
    `Alle Werte stehen in der Tabelle „Alle Zahlen“ weiter unten.`,
)

// ----------------------------------------------------------------- Tabelle

/**
 * Alle Fachthemen je Bezirk, die Karte als Zahlen. Sortiert nach dem größten
 * Einzelbetrag in einem Bezirk; eine Zeilensumme würde Mehrfachnennungen addieren.
 */
const matrix = computed(() => {
  const themen = [...new Set(alle.value.map((p) => p.fachthema))]
  return themen
    .map((name) => {
      const teil = alle.value.filter((p) => p.fachthema === name)
      const werte = bezirke.value.map((b) => summeAus(teil.filter((p) => p.bezirk === b)))
      return {
        name,
        werte,
        hoechster: Math.max(0, ...werte),
        nurGesamtstaedtisch: teil.every((p) => !p.bezirksspezifisch),
      }
    })
    .sort((a, b) => b.hoechster - a.hoechster)
})

// ------------------------------------------------------------ Interaktion

/** Kurze Ansage für Screenreader, wenn Bezirk oder Jahr wechseln. */
const ansage = ref('')

function sageAuswahlAn(): void {
  ansage.value = `${auswahlName.value}, ${jahr.value}: Investitionen ${euroKurz(summeAus(auswahl.value))}.`
}

function waehle(name: string): void {
  bezirk.value = name
  sageAuswahlAn()
}

function kartenKlick(ereignis: unknown): void {
  const { name } = ereignis as { name?: string }
  if (name && bezirke.value.includes(name)) waehle(name)
}

function jahrGewaehlt(ereignis: Event): void {
  const gewaehlt = (ereignis.target as HTMLInputElement).value
  if (JAHRE.includes(gewaehlt as Jahr)) {
    jahr.value = gewaehlt as Jahr
    sageAuswahlAn()
  }
}
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Die Bezirke"
      beschreibung="Münster hat sechs Stadtbezirke mit eigenen Bezirksvertretungen. Für jeden von ihnen weist der Haushaltsplan aus, welche Investitionen im Bezirk geplant sind — von der Schulsanierung über den Kanalbau bis zum Spielplatz. Die Karte zeigt die Investitionen je Bezirk und wofür sie vorgesehen sind."
    />

    <wa-callout variant="brand" appearance="filled">
      <wa-icon slot="icon" name="info" aria-hidden="true"></wa-icon>
      <strong>Investitionen im Bezirk, nicht Geld der Bezirksvertretung.</strong> Gezeigt werden
      Bauvorhaben und Anschaffungen, die der Haushaltsplan einem Bezirk zuordnet.
      Bezirksübergreifende Maßnahmen (z. B. Velorouten, Schulerweiterungen) stehen dort unter jedem
      betroffenen Bezirk mit dem vollen Betrag. Bezahlt und beschlossen werden die Investitionen
      überwiegend gesamtstädtisch. Über die frei verfügbaren Mittel der Bezirksvertretungen selbst
      entscheidet der Haushalt an anderer Stelle; das sind erheblich kleinere Beträge. Nicht
      enthalten ist außerdem der laufende Betrieb: Personal, Sozialleistungen und Zuschüsse sind
      räumlich nicht aufgeteilt.
    </wa-callout>

    <!-- Bleibt immer im DOM; nur der Text wechselt. -->
    <p class="mm-visually-hidden" role="status">{{ ansage }}</p>

    <p v-if="!daten && !ladefehler" class="mm-laden" role="status">Zahlen werden geladen …</p>

    <wa-callout v-if="ladefehler" variant="danger" appearance="outlined" role="alert">
      <strong>Die Zahlen konnten nicht geladen werden.</strong> Die Dateien
      <code>daten/bezirke-2026-2027.json</code> und <code>daten/stadtbezirke.geojson</code> fehlen
      oder sind nicht lesbar. Sie entstehen mit <code>node preprocessing/bezirke.ts</code>.
    </wa-callout>

    <template v-if="daten">
      <ChartCard
        titel="Wo investiert die Stadt?"
        beschreibung="Je dunkler ein Bezirk, desto mehr Geld ist dort für Investitionen vorgesehen. Ein Klick auf einen Bezirk zeigt unten, wofür."
        :quelle="QUELLE"
        :pdf="{ band: 2, seite: 147 }"
      >
        <div class="mm-steuerung">
          <wa-select label="Haushaltsjahr" :value="jahr" @change="jahrGewaehlt">
            <wa-option v-for="j in JAHRE" :key="j" :value="j">{{ j }}</wa-option>
          </wa-select>

          <div class="mm-bezirkswahl" role="group" aria-label="Bezirk auswählen">
            <wa-button
              v-for="b in bezirke"
              :key="b"
              size="small"
              :appearance="bezirk === b ? 'filled-outlined' : 'outlined'"
              :class="{ 'mm-aktiv': bezirk === b }"
              :aria-pressed="bezirk === b"
              @click="waehle(b)"
            >
              {{ b }}
            </wa-button>
          </div>
        </div>

        <dl class="mm-kennzahlen">
          <div v-for="k in kennzahlen" :key="k.titel" class="mm-kennzahl">
            <dt>{{ k.titel }}</dt>
            <dd>{{ k.wert }}</dd>
            <dd class="mm-kennzahl__zusatz">{{ k.zusatz }}</dd>
          </div>
        </dl>

        <BaseChart
          v-if="karteBereit"
          :option="karte"
          hoehe="440px"
          :beschreibung="karteBeschreibung"
          @chart-click="kartenKlick"
        />

        <p class="mm-fussnote">
          Die Bezirke sind unterschiedlich groß und unterschiedlich dicht bewohnt — dass in
          {{ groesster.name }} am meisten investiert wird ({{ euroKurz(groesster.wert) }}), heißt
          für sich genommen wenig. Aussagekräftiger ist, <em>wofür</em> das Geld vorgesehen ist: ein
          einzelnes Schulbauvorhaben verschiebt die Verteilung um zweistellige Millionenbeträge.
        </p>
      </ChartCard>

      <ChartCard
        :titel="`Wofür — ${auswahlName}`"
        beschreibung="Die Investitionen der Auswahl nach Fachthema. Über der Karte lässt sich der Bezirk wechseln."
        :quelle="QUELLE"
        :pdf="{ band: 2, seite: 147 }"
      >
        <BaseChart
          :key="schmal ? 'schmal' : 'breit'"
          :option="fachthemen"
          :hoehe="fachthemenHoehe"
          :beschreibung="fachthemenBeschreibung"
        />
      </ChartCard>

      <ChartCard
        titel="Alle Zahlen"
        :beschreibung="`Auszahlungen ${jahr} je Fachthema und Bezirk, größtes Thema zuerst.`"
        :quelle="QUELLE"
        :pdf="{ band: 2, seite: 147 }"
      >
        <DatenTabelle :beschriftung="`Investitionen ${jahr} je Fachthema und Bezirk`">
          <thead>
            <tr>
              <th scope="col">Fachthema</th>
              <th v-for="b in bezirke" :key="b" scope="col" class="mm-zahl">{{ b }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="zeile in matrix" :key="zeile.name">
              <th scope="row">
                {{ zeile.name }}
                <span v-if="zeile.nurGesamtstaedtisch" class="mm-zweck">
                  gesamtstädtisch, je Bezirk nachrichtlich
                </span>
              </th>
              <td v-for="(wert, i) in zeile.werte" :key="i" class="mm-zahl">
                <template v-if="wert === 0">
                  <span aria-hidden="true">–</span
                  ><span class="mm-visually-hidden">kein Betrag</span>
                </template>
                <template v-else>{{ euro(wert) }}</template>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Summe im Bezirk</th>
              <td v-for="b in bezirke" :key="b" class="mm-zahl">
                {{ euro(summeAus(imBezirk(b))) }}
              </td>
            </tr>
          </tfoot>
        </DatenTabelle>

        <p class="mm-fussnote">
          <strong>Keine Stadtsumme:</strong> Bezirksübergreifende Maßnahmen (z. B. Velorouten,
          Schulerweiterungen) stehen im Haushaltsplan unter jedem betroffenen Bezirk mit dem vollen
          Betrag. Sie sind deshalb in mehreren Bezirkssummen enthalten. Die Bezirkssummen lassen
          sich nicht zu einer Stadtsumme addieren.
        </p>
      </ChartCard>

      <p class="mm-fussnote">
        Kartengrundlage: Stadtbezirke Münster, Stadt Münster, Open-Data-Portal, Lizenz
        <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>.
      </p>
    </template>
  </div>
</template>

<style scoped>
.mm-laden {
  color: var(--wa-color-text-quiet);
}

.mm-steuerung {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--wa-space-m);
  margin-bottom: var(--wa-space-l);
}

.mm-bezirkswahl {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wa-space-2xs);
}

/* Der gewählte Bezirk: leicht orange hinterlegt mit passendem Rand. Web
   Awesome liest diese Tokens im Shadow DOM, deshalb hier am Host setzen. */
.mm-bezirkswahl .mm-aktiv {
  --wa-color-fill-normal: var(--mm-auswahl-flaeche);
  --wa-color-border-normal: var(--mm-auswahl-rand);
  --wa-color-on-normal: var(--mm-auswahl-text);
  font-weight: var(--wa-font-weight-semibold);
}

/* Die drei großen Zahlen über der Karte. */
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

.mm-kennzahl .mm-kennzahl__zusatz {
  margin: var(--wa-space-2xs) 0 0;
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  font-weight: var(--wa-font-weight-normal);
  line-height: var(--wa-line-height-normal);
}

.mm-zweck {
  display: block;
  max-width: 44ch;
  color: var(--wa-color-text-quiet);
}

.mm-fussnote {
  margin: var(--wa-space-l) 0 0;
  max-width: var(--mm-lesebreite);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}
</style>

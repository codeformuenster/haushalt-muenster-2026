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

/** Kein Bezirk gewählt heißt: die ganze Stadt. */
const bezirk = ref<string | null>(null)

const alle = computed<Posten[]>(() => daten.value?.posten ?? [])
const bezirke = computed(() => daten.value?.bezirke.map((b) => b.name) ?? [])

const aus = (p: Posten): number => (jahr.value === '2026' ? p.aus2026 : p.aus2027)
const ein = (p: Posten): number => (jahr.value === '2026' ? p.ein2026 : p.ein2027)

const summeAus = (liste: Posten[]): number => liste.reduce((s, p) => s + aus(p), 0)
const summeEin = (liste: Posten[]): number => liste.reduce((s, p) => s + ein(p), 0)

const imBezirk = (name: string): Posten[] => alle.value.filter((p) => p.bezirk === name)

/** Die Posten, um die es gerade geht: ein Bezirk oder die ganze Stadt. */
const auswahl = computed<Posten[]>(() =>
  bezirk.value === null ? alle.value : imBezirk(bezirk.value),
)

const auswahlName = computed(() => bezirk.value ?? 'allen sechs Bezirken')

const gesamt = computed(() => summeAus(alle.value))

// --------------------------------------------------------------- Aggregate

/** 0.286 -> "28,6 %" */
const prozent = (anteil: number): string => `${zahl(anteil * 100)} %`

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
    zusatz:
      bezirk.value === null
        ? `verteilt auf ${zahl(jeFachthema.value.length)} Fachthemen`
        : `${prozent(summeAus(auswahl.value) / gesamt.value)} der Investitionen im Stadtgebiet`,
  },
  {
    titel: 'davon gegenfinanziert',
    wert: euroKurz(summeEin(auswahl.value)),
    zusatz: 'Zuwendungen und Beiträge Dritter, die dagegen stehen',
  },
  {
    titel: 'größter Posten',
    wert: euroKurz(groesstesThema.value.wert),
    zusatz: `${groesstesThema.value.name} — ${prozent(groesstesThema.value.wert / summeAus(auswahl.value))}`,
  },
])

/** Gesamtstädtische Posten, die in jeder Bezirksvertretung gleich auftauchen. */
const gesamtstaedtisch = computed(() => alle.value.filter((p) => !p.bezirksspezifisch))

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
          `${prozent(value / gesamt.value)} der Investitionen im Stadtgebiet`,
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

const fachthemen = computed<EChartsOption>(() => {
  // Aufsteigend, weil die Kategorieachse liegender Balken von unten nach oben läuft.
  const reihen = [...jeFachthema.value].reverse()
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (info: unknown) => {
        const teile = info as Array<{ axisValue: string; value: number }>
        const erste = teile[0]
        if (!erste) return ''
        const anteil = prozent(erste.value / summeAus(auswahl.value))
        return `<strong>${erste.axisValue}</strong><br>${euro(erste.value)}<br>${anteil} der Auswahl`
      },
    },
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
    yAxis: {
      type: 'category',
      data: reihen.map((t) => t.name),
      axisLabel: { width: 210, overflow: 'truncate' },
    },
    series: [
      {
        name: 'Auszahlungen',
        type: 'bar',
        data: reihen.map((t) => t.wert),
        itemStyle: { borderRadius: [0, 4, 4, 0] },
      },
    ],
  }
})

// ----------------------------------------------------------------- Tabelle

/** Alle Fachthemen über alle Bezirke — die Karte als Zahlen, größtes zuerst. */
const matrix = computed(() => {
  const themen = [...new Set(alle.value.map((p) => p.fachthema))]
  return themen
    .map((name) => {
      const teil = alle.value.filter((p) => p.fachthema === name)
      return {
        name,
        werte: bezirke.value.map((b) => summeAus(teil.filter((p) => p.bezirk === b))),
        gesamt: summeAus(teil),
        nurGesamtstaedtisch: teil.every((p) => !p.bezirksspezifisch),
      }
    })
    .sort((a, b) => b.gesamt - a.gesamt)
})

// ------------------------------------------------------------ Interaktion

function waehle(name: string | null): void {
  bezirk.value = bezirk.value === name ? null : name
}

function kartenKlick(ereignis: unknown): void {
  const { name } = ereignis as { name?: string }
  if (name && bezirke.value.includes(name)) waehle(name)
}

function jahrGewaehlt(ereignis: Event): void {
  const gewaehlt = (ereignis.target as HTMLInputElement).value
  if (JAHRE.includes(gewaehlt as Jahr)) jahr.value = gewaehlt as Jahr
}
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Die Bezirke"
      beschreibung="Münster hat sechs Stadtbezirke mit eigenen Bezirksvertretungen. Für jeden von ihnen weist der Haushaltsplan aus, welche Investitionen im Bezirk geplant sind — von der Schulsanierung über den Kanalbau bis zum Spielplatz. Die Karte zeigt, wie sich diese Investitionen über das Stadtgebiet verteilen, und wofür sie vorgesehen sind."
    />

    <wa-callout variant="brand" appearance="filled">
      <wa-icon slot="icon" name="info"></wa-icon>
      <strong>Investitionen im Bezirk, nicht Geld der Bezirksvertretung.</strong> Gezeigt werden
      Bauvorhaben und Anschaffungen, die räumlich in einem Bezirk liegen — bezahlt und beschlossen
      werden sie überwiegend gesamtstädtisch. Über die frei verfügbaren Mittel der
      Bezirksvertretungen selbst entscheidet der Haushalt an anderer Stelle; das sind erheblich
      kleinere Beträge. Nicht enthalten ist außerdem der laufende Betrieb: Personal,
      Sozialleistungen und Zuschüsse sind räumlich nicht aufgeteilt.
    </wa-callout>

    <p v-if="!daten && !ladefehler" class="mm-laden">Zahlen werden geladen …</p>

    <wa-callout v-if="ladefehler" variant="danger" appearance="outlined">
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
              size="small"
              :appearance="bezirk === null ? 'filled' : 'outlined'"
              @click="waehle(null)"
            >
              ganze Stadt
            </wa-button>
            <wa-button
              v-for="b in bezirke"
              :key="b"
              size="small"
              :appearance="bezirk === b ? 'filled' : 'outlined'"
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
            <p>{{ k.zusatz }}</p>
          </div>
        </dl>

        <BaseChart v-if="karteBereit" :option="karte" hoehe="440px" @chart-click="kartenKlick" />

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
        <BaseChart :option="fachthemen" hoehe="480px" />
      </ChartCard>

      <ChartCard
        titel="Alle Zahlen"
        :beschreibung="`Auszahlungen ${jahr} je Fachthema und Bezirk, größtes Thema zuerst.`"
        :quelle="QUELLE"
        :pdf="{ band: 2, seite: 147 }"
      >
        <DatenTabelle>
          <thead>
            <tr>
              <th>Fachthema</th>
              <th v-for="b in bezirke" :key="b" class="mm-zahl">{{ b }}</th>
              <th class="mm-zahl">gesamt</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="zeile in matrix" :key="zeile.name">
              <td>
                {{ zeile.name }}
                <span v-if="zeile.nurGesamtstaedtisch" class="mm-zweck">
                  gesamtstädtisch, je Bezirk nachrichtlich
                </span>
              </td>
              <td v-for="(wert, i) in zeile.werte" :key="i" class="mm-zahl">
                {{ wert === 0 ? '–' : euro(wert) }}
              </td>
              <td class="mm-zahl">{{ zeile.gesamt === 0 ? '–' : euro(zeile.gesamt) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">gesamt</th>
              <th v-for="b in bezirke" :key="b" class="mm-zahl">
                {{ euro(summeAus(imBezirk(b))) }}
              </th>
              <th class="mm-zahl">{{ euro(gesamt) }}</th>
            </tr>
          </tfoot>
        </DatenTabelle>

        <p class="mm-fussnote">
          <strong>Eine Unschärfe der Quelle:</strong> {{ zahl(gesamtstaedtisch.length) }} Posten
          über zusammen {{ euroKurz(summeAus(gesamtstaedtisch)) }} stehen in jeder Bezirksvertretung
          mit demselben Betrag. Sie sind gesamtstädtisch und dem Bezirk nur nachrichtlich zugeordnet
          — in den Summen oben zählen sie deshalb mehrfach. Gemessen an {{ euroKurz(gesamt) }} fällt
          das kaum ins Gewicht, wir lassen es aber nicht unerwähnt.
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

.mm-kennzahl p {
  margin: var(--wa-space-2xs) 0 0;
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
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

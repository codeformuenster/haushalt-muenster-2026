<script setup lang="ts">
/** Pflichtige gegen freiwillige Leistungen: Wo hat die Stadt Spielraum? */
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import DemoHinweis from '@/components/ui/DemoHinweis.vue'
import { euro, euroKurz } from '@/charts/format'
import { KATEGORIE_FARBEN } from '@/charts/echartsTheme'

// TODO: echte Daten. Die Abgrenzung freiwillig/pflichtig steht so noch in keiner
// unserer Quellen und muss fachlich geklärt werden — siehe README.
const anteile = [
  { name: 'Pflichtige Leistungen', value: 1_183_000_000 },
  { name: 'Freiwillige Leistungen', value: 278_000_000 },
]

const bereiche = [
  { name: 'Kultur', value: 71_000_000 },
  { name: 'Sport und Bäder', value: 58_000_000 },
  { name: 'Jugendarbeit', value: 49_000_000 },
  { name: 'Stadtentwicklung', value: 38_000_000 },
  { name: 'Wirtschaftsförderung', value: 31_000_000 },
  { name: 'Sonstige', value: 31_000_000 },
]

const gesamt = anteile.reduce((summe, a) => summe + a.value, 0)

const verteilung = computed<EChartsOption>(() => ({
  tooltip: {
    formatter: (info: unknown) => {
      const { name, value } = info as { name: string; value: number }
      const anteil = ((value / gesamt) * 100).toFixed(1).replace('.', ',')
      return `<strong>${name}</strong><br>${euro(value)}<br>${anteil} % des Haushalts`
    },
  },
  legend: { bottom: 0 },
  series: [
    {
      name: 'Anteil am Haushalt',
      type: 'pie',
      radius: ['52%', '76%'],
      data: anteile,
      label: { show: false },
      color: [KATEGORIE_FARBEN[0], KATEGORIE_FARBEN[1]],
    },
  ],
}))

const nachBereich = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (wert) => euro(Number(wert)),
  },
  grid: { left: 170, right: 32, top: 16, bottom: 32 },
  xAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
  yAxis: { type: 'category', data: [...bereiche].map((b) => b.name).reverse() },
  series: [
    {
      name: 'Freiwillige Leistungen',
      type: 'bar',
      data: [...bereiche].map((b) => b.value).reverse(),
      itemStyle: { color: KATEGORIE_FARBEN[1], borderRadius: [0, 4, 4, 0] },
    },
  ],
}))
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Freiwillige Leistungen"
      beschreibung="Den größten Teil ihres Haushalts muss die Stadt für gesetzlich vorgeschriebene Aufgaben ausgeben. Freiwillige Leistungen sind der Rest — Kultur, Sport, Jugendarbeit und anderes, worüber der Rat tatsächlich frei entscheiden kann."
    />

    <DemoHinweis />

    <div class="mm-raster">
      <ChartCard
        titel="Pflichtig oder freiwillig?"
        beschreibung="Anteil am gesamten Haushaltsvolumen 2026."
        quelle="Haushaltsplan 2026/27, Band 1"
      >
        <BaseChart :option="verteilung" hoehe="320px" />
      </ChartCard>

      <ChartCard
        titel="Freiwillige Leistungen nach Bereich"
        beschreibung="Wohin die frei verfügbaren Mittel fließen."
        quelle="Haushaltsplan 2026/27, Band 1"
      >
        <BaseChart :option="nachBereich" hoehe="320px" />
      </ChartCard>
    </div>

    <wa-callout variant="warning" appearance="outlined">
      <strong>Fachlich zu klären:</strong> Der Haushaltsplan kennzeichnet nicht selbst, welche
      Leistung freiwillig ist. Wir brauchen eine belastbare Zuordnung, bevor diese Seite echte
      Zahlen zeigen kann.
    </wa-callout>
  </div>
</template>

<script setup lang="ts">
/** Räumliche Verteilung: Was passiert in welchem Stadtbezirk? */
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import DemoHinweis from '@/components/ui/DemoHinweis.vue'
import { euro, euroKurz } from '@/charts/format'

// TODO: echte Daten. Im Haushaltsquerschnitt gibt es die Produktgruppe
// "Bezirksvertretungen/frei verfügb. Mittel" — von dort aus weitersuchen.
const bezirke = [
  { name: 'Mitte', value: 4_120_000 },
  { name: 'Nord', value: 2_480_000 },
  { name: 'Ost', value: 2_140_000 },
  { name: 'West', value: 1_960_000 },
  { name: 'Süd-Ost', value: 1_730_000 },
  { name: 'Hiltrup', value: 1_510_000 },
]

const nachBezirk = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (wert) => euro(Number(wert)),
  },
  grid: { left: 90, right: 32, top: 16, bottom: 32 },
  xAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
  yAxis: { type: 'category', data: [...bezirke].map((b) => b.name).reverse() },
  series: [
    {
      name: 'Mittel je Bezirk',
      type: 'bar',
      data: [...bezirke].map((b) => b.value).reverse(),
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    },
  ],
}))
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Die Bezirke"
      beschreibung="Münster hat sechs Stadtbezirke mit eigenen Bezirksvertretungen, die über einen Teil der Mittel selbst entscheiden. Diese Seite zeigt, wie sich Geld über das Stadtgebiet verteilt."
    />

    <DemoHinweis />

    <ChartCard
      titel="Mittel nach Stadtbezirk"
      beschreibung="Bis die Karte steht, als Balkendiagramm."
      quelle="Haushaltsplan 2026/27, Band 2, Haushaltsquerschnitt"
    >
      <BaseChart :option="nachBezirk" hoehe="320px" />
    </ChartCard>

    <wa-callout variant="brand" appearance="outlined">
      <strong>Noch offen:</strong> die Karte. Dafür brauchen wir ein GeoJSON der Münsteraner
      Stadtbezirke; ECharts kann es über <code>registerMap</code> einbinden, die Chart-Typen sind
      in <code>src/charts/echartsTheme.ts</code> schon registriert.
    </wa-callout>
  </div>
</template>

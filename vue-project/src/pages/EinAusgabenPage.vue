<script setup lang="ts">
/** Erträge und Aufwendungen gegenübergestellt. */
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import DemoHinweis from '@/components/ui/DemoHinweis.vue'
import { euro, euroKurz } from '@/charts/format'
import { POL_FARBEN } from '@/charts/echartsTheme'

// TODO: echte Daten aus daten/haushaltsquerschnitt.csv
// (ordentliche_ertraege / ordentliche_aufwendungen je Jahr).
const jahre = ['2024', '2025', '2026', '2027']
const ertraege = [1_284_000_000, 1_331_000_000, 1_402_000_000, 1_448_000_000]
const aufwendungen = [1_312_000_000, 1_389_000_000, 1_461_000_000, 1_496_000_000]

const gegenueberstellung = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (wert) => euro(Number(wert)),
  },
  legend: { bottom: 0 },
  grid: { left: 80, right: 24, top: 24, bottom: 56 },
  xAxis: { type: 'category', data: jahre },
  yAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
  series: [
    { name: 'Erträge', type: 'bar', data: ertraege, itemStyle: { color: POL_FARBEN.positiv } },
    {
      name: 'Aufwendungen',
      type: 'bar',
      data: aufwendungen,
      itemStyle: { color: POL_FARBEN.negativ },
    },
  ],
}))

const saldo = computed<EChartsOption>(() => {
  const werte = ertraege.map((wert, i) => wert - (aufwendungen[i] ?? 0))
  return {
    tooltip: { trigger: 'axis', valueFormatter: (wert) => euro(Number(wert)) },
    grid: { left: 80, right: 24, top: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: jahre,
      // Ohne onZero: false säßen die Jahreszahlen auf der Nulllinie und damit
      // mitten in den Balken, sobald das Ergebnis negativ ist.
      axisLine: { onZero: false },
    },
    yAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
    series: [
      {
        name: 'Jahresergebnis',
        type: 'bar',
        data: werte.map((wert) => ({
          value: wert,
          itemStyle: {
            color: wert >= 0 ? POL_FARBEN.positiv : POL_FARBEN.negativ,
            // Rundung gehört ans freie Ende des Balkens, nicht an die Nulllinie.
            borderRadius: wert >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
          },
        })),
      },
    ],
  }
})
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Ein- und Ausgaben"
      beschreibung="Was nimmt die Stadt ein, was gibt sie aus — und bleibt am Ende etwas übrig? Erträge stammen vor allem aus Steuern und Zuweisungen, Aufwendungen aus Personal, Sachkosten und Transferleistungen."
    />

    <DemoHinweis />

    <ChartCard
      titel="Erträge und Aufwendungen im Vergleich"
      beschreibung="Gegenüberstellung je Haushaltsjahr."
      quelle="Haushaltsplan 2026/27, Band 2, Ergebnisplanung"
    >
      <BaseChart :option="gegenueberstellung" hoehe="380px" />
    </ChartCard>

    <ChartCard
      titel="Jahresergebnis"
      beschreibung="Erträge minus Aufwendungen. Balken nach unten bedeuten ein Defizit."
      quelle="Haushaltsplan 2026/27, Band 2, Ergebnisplanung"
    >
      <BaseChart :option="saldo" hoehe="320px" />
    </ChartCard>
  </div>
</template>

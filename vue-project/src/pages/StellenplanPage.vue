<script setup lang="ts">
/** Stellen der Stadtverwaltung nach Beschäftigtengruppe und Besoldung. */
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import DemoHinweis from '@/components/ui/DemoHinweis.vue'
import { zahl } from '@/charts/format'

// TODO: echte Daten aus daten/stellenplan-beta.csv (Spalten group, grade, year, value).
const gruppen = [
  { name: 'Tariflich Beschäftigte', stellen: 3421 },
  { name: 'Beamte und Beamtinnen', stellen: 1287 },
  { name: 'Nachwuchskräfte', stellen: 312 },
  { name: 'Wahlbeamte und Wahlbeamtinnen', stellen: 9 },
]

const nachGruppe = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (wert) => `${zahl(Number(wert))} Stellen`,
  },
  grid: { left: 200, right: 64, top: 16, bottom: 32 },
  xAxis: { type: 'value', axisLabel: { formatter: (wert: number) => zahl(wert) } },
  yAxis: {
    type: 'category',
    // Von unten nach oben aufsteigend, damit die größte Gruppe oben steht.
    data: [...gruppen].map((g) => g.name).reverse(),
  },
  series: [
    {
      name: 'Stellen',
      type: 'bar',
      data: [...gruppen].map((g) => g.stellen).reverse(),
      // Balken direkt beschriften — bei nur einer Serie spart das die Legende.
      label: { show: true, position: 'right', formatter: ({ value }) => zahl(Number(value)) },
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    },
  ],
}))
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Stellenplan"
      beschreibung="Der Stellenplan legt fest, wie viele Stellen die Stadtverwaltung besetzen darf — getrennt nach Beamtinnen und Beamten, Tarifbeschäftigten und Nachwuchskräften. Er sagt nichts über die tatsächlich besetzten Stellen aus."
    />

    <DemoHinweis />

    <ChartCard
      titel="Stellen nach Beschäftigtengruppe"
      beschreibung="Geplante Stellen 2026 in der Kernverwaltung."
      quelle="Haushaltsplan 2026/27, Band 2, Stellenplan, S. 33 ff."
    >
      <BaseChart :option="nachGruppe" hoehe="320px" />
    </ChartCard>

    <wa-callout variant="brand" appearance="outlined">
      <strong>Noch offen:</strong> Aufschlüsselung nach Besoldungs- und Entgeltgruppen sowie der
      Vergleich Plan gegen Ist — beides steckt schon in
      <code>daten/stellenplan-beta.csv</code>.
    </wa-callout>
  </div>
</template>

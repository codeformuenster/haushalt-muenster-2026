<script setup lang="ts">
/**
 * Das große Ganze: Einstieg in den Haushalt mit Drilldown in die einzelnen
 * Bereiche. Diese Seite ist der Ausgangspunkt für alle anderen.
 */
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import DemoHinweis from '@/components/ui/DemoHinweis.vue'
import { euro } from '@/charts/format'

// TODO: echte Daten aus daten/haushaltsquerschnitt.csv (Spalte ordentliche_aufwendungen,
// aggregiert je Produktbereich). Bis dahin nur Platzhalter, damit das Layout steht.
const bereiche = [
  { name: 'Kinder, Jugend und Familie', value: 412_000_000 },
  { name: 'Soziales', value: 298_000_000 },
  { name: 'Schule und Bildung', value: 186_000_000 },
  { name: 'Verkehr und Mobilität', value: 121_000_000 },
  { name: 'Kultur und Sport', value: 94_000_000 },
  { name: 'Sicherheit und Ordnung', value: 77_000_000 },
  { name: 'Umwelt und Grün', value: 63_000_000 },
  { name: 'Zentrale Verwaltung', value: 58_000_000 },
]

const gesamt = computed(() => bereiche.reduce((summe, b) => summe + b.value, 0))

const treemap = computed<EChartsOption>(() => ({
  tooltip: {
    formatter: (info: unknown) => {
      const { name, value } = info as { name: string; value: number }
      const anteil = ((value / gesamt.value) * 100).toFixed(1).replace('.', ',')
      return `<strong>${name}</strong><br>${euro(value)}<br>${anteil} % des Haushalts`
    },
  },
  series: [
    {
      type: 'treemap',
      data: bereiche,
      // Fläche der Karte ausnutzen; den Abstand gibt schon die Karte vor.
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      roam: false,
      breadcrumb: { show: false },
      nodeClick: false,
      label: { show: true, formatter: '{b}', fontSize: 13, color: '#fff' },
      itemStyle: { borderColor: 'transparent', borderWidth: 2, gapWidth: 2 },
    },
  ],
}))
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Der Haushalt im Überblick"
      beschreibung="Die Stadt Münster plant für 2026 Ausgaben in mehreren Aufgabenbereichen. Je größer die Fläche, desto mehr Geld fließt in den Bereich. Von hier aus geht es in die einzelnen Themen."
    />

    <DemoHinweis />

    <ChartCard
      titel="Ausgaben nach Aufgabenbereich"
      beschreibung="Geplante Aufwendungen 2026, aufgeteilt auf die Aufgabenbereiche der Stadt."
      quelle="Haushaltsplan 2026/27, Band 2, Haushaltsquerschnitt, S. 67 ff."
    >
      <BaseChart :option="treemap" hoehe="480px" />
    </ChartCard>

    <wa-callout variant="brand" appearance="outlined">
      <strong>Noch offen:</strong> der Drilldown. Ein Klick auf einen Bereich soll künftig eine
      Ebene tiefer führen — vom Aufgabenbereich in die einzelnen Produktgruppen.
    </wa-callout>
  </div>
</template>

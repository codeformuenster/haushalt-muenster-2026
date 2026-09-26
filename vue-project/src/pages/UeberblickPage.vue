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
import { euro } from '@/charts/format'
import daten from '@/data/planspiel.json'

const JAHR = '2026'
const ZEILE_AUFWENDUNGEN = daten.zeilen.indexOf('Ordentliche Aufwendungen')

/** Ordentliche Aufwendungen 2026 je Produktbereich, aus den Produktgruppen aufsummiert. */
const bereiche = daten.produktbereiche.map((bereich) => ({
  name: bereich.name,
  value: daten.produktgruppen
    .filter((pg) => pg.code.startsWith(bereich.code))
    .reduce((summe, pg) => summe + (pg.werte[JAHR][ZEILE_AUFWENDUNGEN] ?? 0), 0),
}))

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

    <ChartCard
      titel="Ausgaben nach Aufgabenbereich"
      beschreibung="Geplante Aufwendungen 2026, aufgeteilt auf die Aufgabenbereiche der Stadt."
      quelle="Haushaltsplan 2026/27, Band 2, Haushaltsquerschnitt, S. 67 ff."
      :pdf="{ band: 2, seite: 71 }"
    >
      <BaseChart :option="treemap" hoehe="480px" />
    </ChartCard>

    <wa-callout variant="brand" appearance="outlined">
      <strong>Noch offen:</strong> der Drilldown. Ein Klick auf einen Bereich soll künftig eine
      Ebene tiefer führen — vom Aufgabenbereich in die einzelnen Produktgruppen.
    </wa-callout>
  </div>
</template>

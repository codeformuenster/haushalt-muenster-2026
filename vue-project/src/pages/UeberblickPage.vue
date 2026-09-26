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
import { euro, euroKurz, prozent } from '@/charts/format'
import daten from '@/data/planspiel.json'

const JAHR = '2026'
const ZEILE_AUFWENDUNGEN = daten.zeilen.indexOf('Ordentliche Aufwendungen')

/**
 * Ordentliche Aufwendungen 2026 in zwei Ebenen: Produktbereiche mit ihren
 * Produktgruppen als Kinder. Die Zuordnung steckt im Code — die Gruppe "0101"
 * gehört zum Bereich "01".
 */
const bereiche = daten.produktbereiche.map((bereich) => {
  const gruppen = daten.produktgruppen
    .filter((gruppe) => gruppe.code.startsWith(bereich.code))
    .map((gruppe) => ({
      name: gruppe.name,
      value: gruppe.werte[JAHR][ZEILE_AUFWENDUNGEN] ?? 0,
    }))
    // Gruppen ohne Aufwand (z. B. die eigenwirtschaftliche Abfallwirtschaft)
    // hätten keine Fläche und stünden im Drilldown nur als leere Kachel herum.
    .filter((gruppe) => gruppe.value > 0)

  return {
    name: bereich.name,
    value: gruppen.reduce((summe, gruppe) => summe + gruppe.value, 0),
    children: gruppen,
  }
})

const gesamt = computed(() => bereiche.reduce((summe, bereich) => summe + bereich.value, 0))

const treemap = computed<EChartsOption>(() => ({
  tooltip: {
    formatter: (info: unknown) => {
      const { name, value, treePathInfo } = info as {
        name: string
        value: number
        treePathInfo: { name: string; value: number }[]
      }
      // treePathInfo ist [Wurzel, Bereich] bzw. [Wurzel, Bereich, Gruppe] —
      // bei einer Produktgruppe steht ihr Bereich also an Position 1.
      const bereich = treePathInfo.length > 2 ? treePathInfo.at(1) : undefined

      return [
        `<strong>${name}</strong>`,
        bereich ? `in ${bereich.name}` : undefined,
        euro(value),
        `${prozent(value / gesamt.value)} des Haushalts`,
        bereich ? `${prozent(value / bereich.value)} des Bereichs` : undefined,
      ]
        .filter(Boolean)
        .join('<br>')
    },
  },
  series: [
    {
      type: 'treemap',
      data: bereiche,
      // Fläche der Karte ausnutzen; den Abstand gibt schon die Karte vor.
      // Unten bleibt Platz für die Brotkrumen-Navigation.
      left: 0,
      right: 0,
      top: 0,
      bottom: 26,
      roam: false,
      /*
       * Zuerst nur die Produktbereiche; ein Klick zoomt in den Bereich und
       * zeigt dessen Produktgruppen. Zurück geht es über die Brotkrumen.
       */
      leafDepth: 1,
      nodeClick: 'zoomToNode',
      breadcrumb: {
        show: true,
        left: 0,
        bottom: 0,
        height: 22,
        emptyItemWidth: 20,
        itemStyle: {
          color: '#eef0f3',
          borderColor: 'transparent',
          textStyle: { color: '#31333d', fontSize: 12 },
        },
        emphasis: { itemStyle: { color: '#dfe2e7' } },
      },
      label: { show: true, color: '#fff', overflow: 'truncate' },
      itemStyle: { borderColor: 'transparent', borderWidth: 2, gapWidth: 2 },
      /*
       * levels[i] gilt für die Knoten der Tiefe i — levels[0] ist die
       * unsichtbare Wurzel und verteilt von dort die Farbpalette des Themes
       * auf die Produktbereiche. Die Produktgruppen behalten die Farbe ihres
       * Bereichs: eine eigene Abstufung würde den Kontrast zur weißen
       * Beschriftung verlieren, die Kacheln trennen die Zwischenräume.
       */
      levels: [
        {},
        { label: { fontSize: 13, formatter: '{b}' } },
        {
          label: {
            fontSize: 12,
            lineHeight: 16,
            formatter: (params) => `${params.name}\n${euroKurz(params.value as number)}`,
          },
          itemStyle: { gapWidth: 2 },
        },
      ],
    },
  ],
}))
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Der Haushalt im Überblick"
      beschreibung="Die Stadt Münster plant für 2026 Ausgaben in mehreren Aufgabenbereichen. Je größer die Fläche, desto mehr Geld fließt in den Bereich. Ein Klick auf einen Bereich führt eine Ebene tiefer — von dort aus geht es in die einzelnen Themen."
    />

    <ChartCard
      titel="Ausgaben nach Aufgabenbereich"
      beschreibung="Geplante Aufwendungen 2026, aufgeteilt auf die Aufgabenbereiche der Stadt. Ein Klick auf einen Bereich zeigt seine Produktgruppen, über die Leiste unten geht es zurück."
      quelle="Haushaltsplan 2026/27, Band 2, Haushaltsquerschnitt, S. 67 ff."
      :pdf="{ band: 2, seite: 71 }"
    >
      <BaseChart :option="treemap" hoehe="480px" />
    </ChartCard>
  </div>
</template>

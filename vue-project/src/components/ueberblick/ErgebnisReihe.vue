<script setup lang="ts">
/**
 * Ergebnis (Zeile 26 der Teilergebnispläne) eines Aufgabenbereichs oder einer seiner
 * Produktgruppen von 2024 bis 2030, mit Auswahl der Produktgruppe. Ein Minus heißt:
 * Der Bereich kostet mehr, als er einbringt.
 */
import { computed, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'
import { euro, euroKurz } from '@/charts/format'
import daten from '@/data/planspiel.json'

const props = defineProps<{ bereichCode: string; bereichName: string; farbe?: string }>()

const ZEILE_ERGEBNIS = daten.zeilen.indexOf('Jahresergebnis')
type Jahr = keyof (typeof daten.produktgruppen)[number]['werte']

const gruppen = computed(() =>
  daten.produktgruppen.filter((gruppe) => gruppe.code.startsWith(props.bereichCode)),
)

const auswahl = ref('alle')
function gruppeGewaehlt(ereignis: Event): void {
  auswahl.value = (ereignis.target as HTMLSelectElement).value
}

const titel = computed(
  () => gruppen.value.find((gruppe) => gruppe.code === auswahl.value)?.name ?? props.bereichName,
)

const reihe = computed(() => {
  const gewaehlt = gruppen.value.filter(
    (gruppe) => auswahl.value === 'alle' || gruppe.code === auswahl.value,
  )
  return daten.jahre.map(({ jahr, art }) => ({
    jahr,
    art,
    wert: gewaehlt.reduce(
      (summe, gruppe) => summe + (gruppe.werte[jahr as Jahr][ZEILE_ERGEBNIS] ?? 0),
      0,
    ),
  }))
})

const option = computed<EChartsOption>(() => ({
  grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (wert) => euroKurz(Number(wert)),
  },
  xAxis: { type: 'category', data: reihe.value.map(({ jahr, art }) => `${jahr}\n${art}`) },
  yAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
  series: [
    {
      type: 'bar',
      name: 'Ergebnis',
      itemStyle: { color: props.farbe },
      data: reihe.value.map(({ wert }) => wert),
    },
  ],
}))
</script>

<template>
  <ChartCard
    :titel="`Entwicklung 2024 bis 2030: ${titel}`"
    beschreibung="Ergebnis vor internen Leistungsbeziehungen: Erträge minus Aufwendungen. Ein Minus ist der Betrag, den die Stadt für diesen Bereich aus allgemeinen Mitteln wie Steuern zuschießt. 2024 ist das tatsächliche Ergebnis, 2025 bis 2027 sind Haushaltsansätze, 2028 bis 2030 Planungen."
    quelle="Haushaltsplan 2026/27, Band 1, Teilergebnispläne der Produktgruppen (S. 15-558), Zeile 26; Summe im Gesamtergebnisplan S. 9"
    :pdf="{ band: 1, seite: 9 }"
  >
    <wa-select
      class="mm-gruppenwahl"
      label="Produktgruppe"
      :value="auswahl"
      @change="gruppeGewaehlt"
    >
      <wa-option value="alle">Ganzer Bereich</wa-option>
      <wa-option v-for="gruppe in gruppen" :key="gruppe.code" :value="gruppe.code">
        {{ gruppe.name }}
      </wa-option>
    </wa-select>

    <BaseChart :option="option" hoehe="320px" />

    <p class="mm-fussnote">
      Summiert über alle Bereiche ergeben diese Werte das Jahresergebnis des Gesamtergebnisplans.
      Die Seite Jahresergebnis zeigt für 2025 den fortgeschriebenen Ansatz (−30,3 Mio. € statt −47,3
      Mio. €) und für 2028 bis 2030 das Ergebnis nach dem globalen Minderaufwand, einer pauschal
      eingeplanten Kürzung (2030: −37,0 Mio. € statt −46,0 Mio. €). Deshalb weichen ihre Gesamtwerte
      für diese Jahre ab.
    </p>

    <wa-details summary="Werte als Tabelle" class="mm-tabelle-details">
      <DatenTabelle :beschriftung="`Ergebnis 2024 bis 2030: ${titel}`">
        <thead>
          <tr>
            <th scope="col">Jahr</th>
            <th scope="col">Art</th>
            <th scope="col" class="mm-zahl">Ergebnis</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ jahr, art, wert } in reihe" :key="jahr">
            <th scope="row">{{ jahr }}</th>
            <td>{{ art }}</td>
            <td class="mm-zahl">{{ euro(wert) }}</td>
          </tr>
        </tbody>
      </DatenTabelle>
    </wa-details>
  </ChartCard>
</template>

<style scoped>
.mm-gruppenwahl {
  max-width: min(100%, 28rem);
  margin-bottom: var(--wa-space-m);
}

.mm-fussnote {
  margin: var(--wa-space-s) 0;
  font-size: var(--wa-font-size-s);
  color: var(--wa-color-text-quiet);
}
</style>

<script setup lang="ts">
/**
 * Investitionen aus dem Finanzplan: Auszahlungen und Einzahlungen aus Investitionstätigkeit je
 * Produktbereich. Ein Klick auf einen Bereich (oder die Auswahl) zeigt seine Produktgruppen.
 */
import { computed, nextTick, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/ui/BaseChart.vue'
import { euro, euroKurz } from '@/charts/format'
import { KATEGORIE_FARBEN } from '@/charts/echartsTheme'
import { asNumber, gruppenNamen, produkte } from '@/data/einAusgaben'

const props = defineProps<{ selectedYear: 2026 | 2027 }>()

type Balken = { code: string; name: string; aus: number; ein: number }

const bereich = ref<string | null>(null)
const auswahl = ref<HTMLElement | null>(null)

const gruppen = computed<Balken[]>(() => {
  const jahr = props.selectedYear
  return produkte.map((row) => ({
    code: row.Code,
    name: row.Bezeichnung,
    aus: asNumber(jahr === 2026 ? row.AuszInvest_2026 : row.AuszInvest_2027),
    ein: asNumber(jahr === 2026 ? row.EinzInvest_2026 : row.EinzInvest_2027),
  }))
})

const bereiche = computed<Balken[]>(() =>
  Array.from(gruppenNamen, ([code, name]) => {
    const teile = gruppen.value.filter((g) => g.code.startsWith(code))
    return {
      code,
      name,
      aus: teile.reduce((s, g) => s + g.aus, 0),
      ein: teile.reduce((s, g) => s + g.ein, 0),
    }
  }),
)

const balken = computed<Balken[]>(() =>
  (bereich.value
    ? gruppen.value.filter((g) => g.code.startsWith(bereich.value ?? ''))
    : bereiche.value
  )
    .filter((b) => b.aus > 0 || b.ein > 0)
    .sort((a, b) => b.aus - a.aus),
)

const summen = computed(() => ({
  aus: balken.value.reduce((s, b) => s + b.aus, 0),
  ein: balken.value.reduce((s, b) => s + b.ein, 0),
}))

const titel = computed(() =>
  bereich.value ? `${bereich.value} ${gruppenNamen.get(bereich.value) ?? ''}` : 'Stadt Münster',
)

const beschreibung = computed(
  () =>
    `Balkendiagramm Investitionen ${props.selectedYear}, ${titel.value}: ` +
    balken.value
      .map((b) => `${b.code} ${b.name}: Auszahlungen ${euroKurz(b.aus)}, Einzahlungen ${euroKurz(b.ein)}`)
      .join('; '),
)

const option = computed<EChartsOption>(() => {
  const liste = balken.value
  return {
    color: [KATEGORIE_FARBEN[0], KATEGORIE_FARBEN[1]],
    legend: { top: 0 },
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (wert) => euro(Number(wert)),
    },
    xAxis: { type: 'value', axisLabel: { formatter: (v: number) => euroKurz(v) } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: liste.map((b) => `${b.code} ${b.name}`),
      axisLabel: { width: 220, overflow: 'truncate' },
      triggerEvent: true,
    },
    series: [
      { name: 'Auszahlungen für Investitionen', type: 'bar', data: liste.map((b) => b.aus) },
      { name: 'Einzahlungen (z. B. Fördermittel)', type: 'bar', data: liste.map((b) => b.ein) },
    ],
  }
})

const hoehe = computed(() => `${80 + balken.value.length * 44}px`)

/** Klick auf Balken oder Achsenbeschriftung eines Bereichs öffnet dessen Produktgruppen. */
function onChartClick(params: unknown): void {
  if (bereich.value) return
  const p = params as { dataIndex?: number; componentType?: string; value?: string }
  const code =
    p.componentType === 'yAxis'
      ? String(p.value ?? '').slice(0, 2)
      : balken.value[p.dataIndex ?? -1]?.code
  if (code && gruppenNamen.has(code)) bereich.value = code
}

function onSelect(event: Event): void {
  const wert = (event.target as HTMLInputElement).value
  bereich.value = wert && wert !== 'gesamt' ? wert : null
}

async function zurueck(): Promise<void> {
  bereich.value = null
  await nextTick()
  auswahl.value?.focus()
}
</script>

<template>
  <div class="toolbar">
    <wa-select
      ref="auswahl"
      class="auswahl"
      label="Produktbereich"
      :value="bereich ?? 'gesamt'"
      @change="onSelect"
    >
      <wa-option value="gesamt">Alle Produktbereiche</wa-option>
      <wa-option v-for="b in bereiche" :key="b.code" :value="b.code"
        >{{ b.code }} {{ b.name }}</wa-option
      >
    </wa-select>
    <wa-button v-if="bereich" appearance="outlined" @click="zurueck">
      <wa-icon slot="start" name="arrow-left" aria-hidden="true"></wa-icon>
      Zurück zu allen Bereichen
    </wa-button>
  </div>
  <BaseChart
    :option="option"
    :hoehe="hoehe"
    :beschreibung="beschreibung"
    @chart-click="onChartClick"
  />
  <p class="summe">
    {{ titel }} {{ selectedYear }}: Auszahlungen {{ euro(summen.aus) }} · Einzahlungen
    {{ euro(summen.ein) }} · Saldo {{ euro(summen.ein - summen.aus) }}
  </p>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--wa-space-m);
}

.auswahl {
  flex: 1 1 20rem;
  max-width: 32rem;
}

.summe {
  margin: var(--wa-space-s) 0 0;
  font-size: var(--wa-font-size-s);
}
</style>

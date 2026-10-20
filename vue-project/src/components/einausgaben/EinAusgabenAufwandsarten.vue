<script setup lang="ts">
/**
 * Wofür wird das Geld ausgegeben? Ordentliche Aufwendungen nach Art (Zeilen 11 bis 16 der
 * Teilergebnispläne) als gestapelte Anteile: oben die ganze Stadt, darunter je Produktbereich
 * oder, wenn ein Bereich gewählt ist, je Produktgruppe dieses Bereichs.
 */
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/ui/BaseChart.vue'
import { euro, prozent } from '@/charts/format'
import { KATEGORIE_FARBEN } from '@/charts/echartsTheme'
import daten from '@/data/planspiel.json'

const props = defineProps<{
  selectedYear: 2026 | 2027
  /** Code des gewählten Produktbereichs, z. B. "03"; null zeigt alle Bereiche. */
  groupCode: string | null
}>()

/** Aufwandsarten in der Reihenfolge des Ergebnisplans, mit kurzer Beschriftung. */
const ARTEN = [
  { zeile: 'Personalaufwendungen', label: 'Personal' },
  { zeile: 'Versorgungsaufwendungen', label: 'Versorgung (Pensionen)' },
  { zeile: 'Aufwendungen für Sach- und Dienstleistungen', label: 'Sach- und Dienstleistungen' },
  { zeile: 'Bilanzielle Abschreibungen', label: 'Abschreibungen' },
  { zeile: 'Transferaufwendungen', label: 'Transfers (Sozialleistungen, Zuschüsse)' },
  { zeile: 'Sonstige ordentliche Aufwendungen', label: 'Sonstige' },
].map((art) => ({ ...art, index: daten.zeilen.indexOf(art.zeile) }))

type Balken = { name: string; werte: number[] }

function arten(zeilen: (number | null)[]): number[] {
  return ARTEN.map((art) => zeilen[art.index] ?? 0)
}

function summe(werte: number[][]): number[] {
  return ARTEN.map((_, i) => werte.reduce((s, w) => s + (w[i] ?? 0), 0))
}

const balken = computed<Balken[]>(() => {
  const jahr = String(props.selectedYear) as '2026' | '2027'
  const stadt = { name: 'Stadt Münster gesamt', werte: arten(daten.gesamt[jahr]) }
  const gruppen = daten.produktgruppen.map((g) => ({
    code: g.code,
    name: g.name,
    werte: arten(g.werte[jahr]),
  }))

  const einzeln: Balken[] = props.groupCode
    ? gruppen
        .filter((g) => g.code.startsWith(props.groupCode ?? ''))
        .map((g) => ({ name: `${g.code} ${g.name}`, werte: g.werte }))
    : daten.produktbereiche.map((b) => ({
        name: `${b.code} ${b.name}`,
        werte: summe(gruppen.filter((g) => g.code.startsWith(b.code)).map((g) => g.werte)),
      }))

  // Ohne Aufwand (z. B. die Abfallwirtschaft) gäbe es keinen Balken.
  return [stadt, ...einzeln.filter((b) => b.werte.some((w) => w > 0))]
})

function gesamt(b: Balken): number {
  return b.werte.reduce((s, w) => s + w, 0)
}

const beschreibung = computed(() => {
  const stadt = balken.value[0]
  if (!stadt) return ''
  const teile = ARTEN.map(
    (art, i) => `${art.label} ${prozent((stadt.werte[i] ?? 0) / gesamt(stadt))}`,
  ).join(', ')
  return `Gestapelte Balken, Anteile der Aufwandsarten ${props.selectedYear}. Stadt gesamt: ${teile}.`
})

const option = computed<EChartsOption>(() => {
  const liste = balken.value
  return {
    color: [...KATEGORIE_FARBEN],
    legend: { top: 0 },
    grid: { left: 8, right: 16, top: 56, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const punkte = params as { dataIndex: number; seriesIndex: number; marker: string }[]
        const b = liste[punkte[0]?.dataIndex ?? 0]
        if (!b) return ''
        const zeilen = punkte.map((p) => {
          const wert = b.werte[p.seriesIndex] ?? 0
          return `${p.marker}${ARTEN[p.seriesIndex]?.label}: ${euro(wert)} (${prozent(wert / gesamt(b))})`
        })
        return [`<strong>${b.name}</strong>`, ...zeilen, `Summe: ${euro(gesamt(b))}`].join('<br>')
      },
    },
    xAxis: { type: 'value', max: 1, axisLabel: { formatter: (v: number) => prozent(v) } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: liste.map((b) => b.name),
      axisLabel: { width: 220, overflow: 'truncate' },
    },
    series: ARTEN.map((art, i) => ({
      name: art.label,
      type: 'bar',
      stack: 'arten',
      data: liste.map((b) => (gesamt(b) > 0 ? (b.werte[i] ?? 0) / gesamt(b) : 0)),
    })),
  }
})

const hoehe = computed(() => `${120 + balken.value.length * 30}px`)
</script>

<template>
  <BaseChart :option="option" :hoehe="hoehe" :beschreibung="beschreibung" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/ui/BaseChart.vue'
import { euro, euroKurz } from '@/charts/format'
import { POL_FARBEN } from '@/charts/echartsTheme'

type DetailRow = {
  Code: string
  Bezeichnung: string
  Gruppe: string
  Gruppenbezeichnung: string
  Ertraege2026Num: number
  Aufwendungen2026Num: number
}

const props = defineProps<{
  rows: DetailRow[]
  groupCode: string
  groupName: string
}>()

const option = computed<EChartsOption>(() => {
  const products = props.rows
    .filter((row) => row.Gruppe === props.groupCode)
    .sort((a, b) => b.Aufwendungen2026Num - a.Aufwendungen2026Num)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => euro(Number(v)),
    },
    legend: { bottom: 0 },
    grid: { left: 72, right: 24, top: 24, bottom: 56 },
    xAxis: {
      type: 'category',
      data: products.map((p) => `${p.Code} ${p.Bezeichnung}`),
      axisLabel: { interval: 0, rotate: 45 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => euroKurz(v) },
    },
    series: [
      {
        name: 'Einnahmen 2026',
        type: 'bar',
        data: products.map((p) => p.Ertraege2026Num),
        itemStyle: { color: POL_FARBEN.positiv },
      },
      {
        name: 'Aufwendungen 2026',
        type: 'bar',
        data: products.map((p) => p.Aufwendungen2026Num),
        itemStyle: { color: POL_FARBEN.negativ },
      },
    ],
  }
})
</script>

<template>
  <BaseChart :option="option" hoehe="760px" />
</template>

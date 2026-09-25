<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/ui/BaseChart.vue'
import { euro } from '@/charts/format'
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

  const mitteNode = "Mitte"
  const ueberschussNode = `Überschuss ${props.groupName}`
  const subventionNode = `Subvention aus anderen Bereichen`

  const sumErtraege = products.reduce((sum, row) => sum + row.Ertraege2026Num, 0)
  const sumAufwendungen = products.reduce((sum, row) => sum + row.Aufwendungen2026Num, 0)
  const saldo = sumErtraege - sumAufwendungen

  const productNodes = products.map((p) => `${p.Code} ${p.Bezeichnung}`)
  const nodes: Array<{ name: string; itemStyle?: { color: string } }> = [
    { name: mitteNode, itemStyle: { color: POL_FARBEN.positiv } },
    ...productNodes.map((name) => ({ name })),
	...productNodes.map((name) => ({ name: "E " + name })),
  ]

  if (saldo > 0) {
    nodes.push({ name: ueberschussNode, itemStyle: { color: POL_FARBEN.positiv } })
  }
  if (saldo < 0) {
    nodes.push({ name: subventionNode, itemStyle: { color: POL_FARBEN.neutral } })
  }

  const links: Array<{ source: string; target: string; value: number }> = [
    ...products
      .filter((p) => p.Ertraege2026Num > 0)
      .map((p) => ({
        target: mitteNode,
        source: `E ${p.Code} ${p.Bezeichnung}`,
        value: p.Ertraege2026Num,
      })),
    ...products
      .filter((p) => p.Aufwendungen2026Num > 0)
      .map((p) => ({
        target: `${p.Code} ${p.Bezeichnung}`,
        source: mitteNode,
        value: p.Aufwendungen2026Num,
      })),
  ]

  if (saldo > 0) {
    links.push({
      source: mitteNode,
      target: ueberschussNode,
      value: saldo,
    })
  }

  if (saldo < 0) {
    links.push({
      source: subventionNode,
      target: mitteNode,
      value: Math.abs(saldo),
    })
  }

  return {
    tooltip: {
      trigger: 'item',
      valueFormatter: (v) => euro(Number(v)),
    },
    series: [
      {
        type: 'sankey',
        left: 16,
        right: 24,
        top: 24,
        bottom: 24,
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'justify',
        nodeGap: 14,
        lineStyle: { color: 'source', curveness: 0.5 },
        label: { formatter: ({ name }: { name: string }) => name },
        data: nodes,
        links,
      },
    ],
  }
})
</script>

<template>
  <BaseChart :option="option" hoehe="760px" />
</template>

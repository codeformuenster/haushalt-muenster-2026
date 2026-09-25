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
  ErtraegeNum: number
  AufwendungenNum: number
}

const props = defineProps<{
  rows: DetailRow[]
  groupCode: string
  groupName: string
  selectedYear: 2026 | 2027
}>()

const option = computed<EChartsOption>(() => {
  const products = props.rows
    .filter((row) => row.Gruppe === props.groupCode)
    .sort((a, b) => b.AufwendungenNum - a.AufwendungenNum)

  const mitteNode = `Haushalt ${props.selectedYear}`
  const ueberschussNode = `Überschuss ${props.groupName}`
  const subventionNode = `Subvention aus anderen Bereichen`

  const sumErtraege = products.reduce((sum, row) => sum + row.ErtraegeNum, 0)
  const sumAufwendungen = products.reduce((sum, row) => sum + row.AufwendungenNum, 0)
  const saldo = sumErtraege - sumAufwendungen

  const productNodes = products.map((p) => `${p.Bezeichnung} (${p.Code})`)
  const nodes: Array<{ name: string; itemStyle?: { color: string } }> = [
    { name: mitteNode, itemStyle: { color: POL_FARBEN.positiv } },
    ...productNodes.map((name) => ({ name: "Ausgaben für " + name })),
	...productNodes.map((name) => ({ name: "Einnahmen aus " + name })),
  ]

  if (saldo > 0) {
    nodes.push({ name: ueberschussNode, itemStyle: { color: POL_FARBEN.positiv } })
  }
  if (saldo < 0) {
    nodes.push({ name: subventionNode, itemStyle: { color: POL_FARBEN.neutral } })
  }

  const links: Array<{ source: string; target: string; value: number }> = [
    ...products
      .filter((p) => p.ErtraegeNum > 0)
      .map((p) => ({
        target: mitteNode,
        source: `Einnahmen aus ${p.Bezeichnung} (${p.Code})`,
        value: p.ErtraegeNum,
      })),
    ...products
      .filter((p) => p.AufwendungenNum > 0)
      .map((p) => ({
        target: `Ausgaben für ${p.Bezeichnung} (${p.Code})`,
        source: mitteNode,
        value: p.AufwendungenNum,
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

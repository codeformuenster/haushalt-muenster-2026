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

function formatProductNodeLabel(name: string): string {
  if (name.startsWith('Einnahmen aus ')) return name.replace('Einnahmen aus ', '')
  if (name.startsWith('Ausgaben für ')) return name.replace('Ausgaben für ', '')
  return name
}

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
      triggerOn: 'mousemove',
      formatter: (params: unknown) => {
        const data = params as { dataType?: string; name?: string; data?: unknown }

        if (data?.dataType === 'edge') {
          const edge = data.data as { source?: string; target?: string; value?: number } | undefined
          const source = edge?.source ?? ''
          const target = edge?.target ?? ''
          const name = source === mitteNode ? target : source
          return `${formatProductNodeLabel(name)}<br>${euro(Number(edge?.value) || 0)}`
        }
        return formatProductNodeLabel(data?.name ?? '')
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeGap: 12,
        lineStyle: { color: 'source', curveness: 0.5 },
        label: {
          fontSize: 11,
          formatter: ({ name }: { name: string }) => formatProductNodeLabel(name),
        },
        data: nodes,
        links,
        levels: [
          { depth: 0, itemStyle: { color: '#ccebc5' }, lineStyle: { color: 'source', opacity: 0.6 } },
          { depth: 1, itemStyle: { color: '#fbb4ae' }, lineStyle: { color: 'source', opacity: 0.6 } },
          { depth: 2, itemStyle: { color: '#fbb4ae' }, lineStyle: { color: 'source', opacity: 0.6 } },
        ],
        nodeWidth: 14,
      },
    ],
  }
})
</script>

<template>
  <BaseChart :option="option" hoehe="760px" />
</template>

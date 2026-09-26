<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/ui/BaseChart.vue'
import { euro } from '@/charts/format'
import { POL_FARBEN } from '@/charts/echartsTheme'
import { useSchmalerBildschirm } from '@/lib/bildschirm'

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

const schmal = useSchmalerBildschirm()

function formatProductNodeLabel(name: string): string {
  if (name.startsWith('Einnahmen aus ')) return name.replace('Einnahmen aus ', '')
  if (name.startsWith('Ausgaben für ')) return name.replace('Ausgaben für ', '')
  return name
}

const option = computed<EChartsOption>(() => {
  const products = props.rows
    .filter((row) => row.Gruppe === props.groupCode)
    .sort((a, b) => b.AufwendungenNum - a.AufwendungenNum)
  const istSchmal = schmal.value

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

  const mobileLabelForNode = (name: string) => {
    const isAusgabe = name.startsWith('Ausgaben für ')
    const isEinnahme = name.startsWith('Einnahmen aus ')
    const position: 'left' | 'right' = isAusgabe ? 'left' : 'right'

    if (isAusgabe || isEinnahme) {
      const baseLabel = {
        position,
        align: isAusgabe ? ('right' as const) : ('left' as const),
        distance: 4,
      }

      if (!istSchmal) return baseLabel

      return {
        ...baseLabel,
        width: 96,
        overflow: 'break' as const,
        lineHeight: 12,
      }
    }

    if (!istSchmal) return undefined

    if (!isAusgabe && !isEinnahme) {
      return {
        position: 'inside' as const,
        align: 'center' as const,
        distance: 4,
        width: 96,
        overflow: 'break' as const,
        lineHeight: 12,
      }
    }

    return undefined
  }

  const nodeData = nodes.map((node) => {
    if (node.name === mitteNode) {
      return {
        ...node,
        label: { show: false },
      }
    }

    const mobileLabel = mobileLabelForNode(node.name)
    if (!mobileLabel) return node
    return { ...node, label: mobileLabel }
  })

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
        left: istSchmal ? 6 : undefined,
        right: istSchmal ? 6 : undefined,
        emphasis: { focus: 'adjacency' },
        nodeGap: istSchmal ? 8 : 12,
        lineStyle: { color: 'source', curveness: 0.5 },
        label: {
          fontSize: istSchmal ? 10 : 12,
          formatter: ({ name }: { name: string }) => formatProductNodeLabel(name),
        },
        data: nodeData,
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

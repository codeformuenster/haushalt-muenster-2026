<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/ui/BaseChart.vue'
import { euro } from '@/charts/format'

type SankeyInputRow = {
  Gruppe: string
  Gruppenbezeichnung: string
  Ertraege2026Num: number
  Aufwendungen2026Num: number
}

const props = defineProps<{
  rows: SankeyInputRow[]
}>()

const emit = defineEmits<{
  groupSelect: [groupCode: string]
}>()

function onChartClick(params: unknown): void {
  const data = (params as { dataType?: string; data?: { nodeType?: string; groupCode?: string } })
  if (data?.dataType !== 'node') return
  if (data?.data?.nodeType !== 'group') return
  if (!data.data.groupCode) return
  emit('groupSelect', data.data.groupCode)
}

const sankeyOption = computed<EChartsOption>(() => {
  const totalEinnahmenNode = 'Einnahmen 2026 gesamt'
  const totalAusgabenNode = 'Ausgaben 2026 gesamt'

  const links: Array<{ source: string; target: string; value: number }> = []
  const einnahmenProGruppe = new Map<string, number>()
  const ausgabenProGruppe = new Map<string, number>()

  props.rows.forEach((row) => {
    const gruppeLabel = `${row.Gruppe} ${row.Gruppenbezeichnung}`
    const gruppeEinnahmenNode = `Einnahmen Gruppe: ${gruppeLabel}`
    const gruppeAusgabenNode = `Ausgaben Gruppe: ${gruppeLabel}`

    if (row.Ertraege2026Num > 0) {
      einnahmenProGruppe.set(
        gruppeEinnahmenNode,
        (einnahmenProGruppe.get(gruppeEinnahmenNode) ?? 0) + row.Ertraege2026Num,
      )
    }

    if (row.Aufwendungen2026Num > 0) {
      ausgabenProGruppe.set(
        gruppeAusgabenNode,
        (ausgabenProGruppe.get(gruppeAusgabenNode) ?? 0) + row.Aufwendungen2026Num,
      )
    }
  })

  let einnahmenGesamt = 0
  einnahmenProGruppe.forEach((summe, gruppeNode) => {
    if (summe > 0) {
      links.push({ source: gruppeNode, target: totalEinnahmenNode, value: summe })
      einnahmenGesamt += summe
    }
  })

  let ausgabenGesamt = 0
  ausgabenProGruppe.forEach((summe, gruppeNode) => {
    if (summe > 0) {
      links.push({ source: totalAusgabenNode, target: gruppeNode, value: summe })
      ausgabenGesamt += summe
    }
  })

  links.push({
    source: totalEinnahmenNode,
    target: totalAusgabenNode,
    value: Math.max(0, Math.min(einnahmenGesamt, ausgabenGesamt)),
  })

  const nodeNames = new Set<string>([totalEinnahmenNode, totalAusgabenNode])
  links.forEach((link) => {
    nodeNames.add(link.source)
    nodeNames.add(link.target)
  })

  return {
    title: { text: 'Einnahmen und Ausgaben 2026 (Sankey)' },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: any) => {
        if (params?.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}<br>${euro(Number(params.data.value) || 0)}`
        }
        return `${params?.name ?? ''}`
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        data: Array.from(nodeNames).map((name) => {
          const isEinnahmenGroup = name.startsWith('Einnahmen Gruppe: ')
          const isAusgabenGroup = name.startsWith('Ausgaben Gruppe: ')
          const isGroup = isEinnahmenGroup || isAusgabenGroup
          const prefix = isEinnahmenGroup ? 'Einnahmen Gruppe: ' : 'Ausgaben Gruppe: '
          const groupCode = isGroup ? name.replace(prefix, '').slice(0, 2) : undefined

          return {
            name,
            nodeType: isGroup ? 'group' : 'other',
            groupCode,
          }
        }),
        links,
        levels: [
          { depth: 0, itemStyle: { color: '#fbb4ae' }, lineStyle: { color: 'source', opacity: 0.6 } },
          { depth: 1, itemStyle: { color: '#b3cde3' }, lineStyle: { color: 'source', opacity: 0.6 } },
          { depth: 2, itemStyle: { color: '#ccebc5' }, lineStyle: { color: 'source', opacity: 0.6 } },
          { depth: 3, itemStyle: { color: '#decbe4' }, lineStyle: { color: 'source', opacity: 0.6 } },
        ],
        lineStyle: { color: 'source', curveness: 0.5 },
        nodeWidth: 14,
        nodeGap: 12,
        label: { fontSize: 11 },
      },
    ],
  }
})
</script>

<template>
  <BaseChart :option="sankeyOption" hoehe="700px" @chart-click="onChartClick" />
</template>

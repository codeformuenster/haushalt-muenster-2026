<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/ui/BaseChart.vue'
import { euro } from '@/charts/format'

type SankeyInputRow = {
  Gruppe: string
  Gruppenbezeichnung: string
  ErtraegeNum: number
  AufwendungenNum: number
}

const props = defineProps<{
  rows: SankeyInputRow[]
  selectedYear: 2026 | 2027
}>()

const emit = defineEmits<{
  groupSelect: [groupCode: string]
}>()

function formatGroupNodeLabel(name: string): string {
  if (name.startsWith('Einnahmen ')) return name.replace('Einnahmen ', '')
  if (name.startsWith('Ausgaben ')) return name.replace('Ausgaben ', '')
  return name
}

function onChartClick(params: unknown): void {
  const data = (params as { dataType?: string; data?: { nodeType?: string; groupCode?: string } })
  if (data?.dataType !== 'node') return
  if (data?.data?.nodeType !== 'group') return
  if (!data.data.groupCode) return
  
  emit('groupSelect', data.data.groupCode)
}

const sankeyOption = computed<EChartsOption>(() => {
  const totalAusgabenNode = `Haushalt ${props.selectedYear}`

  const links: Array<{ source: string; target: string; value: number }> = []
  const einnahmenProGruppe = new Map<string, number>()
  const ausgabenProGruppe = new Map<string, number>()

  props.rows.forEach((row) => {
    const gruppeLabel = `${row.Gruppenbezeichnung}`
    const gruppeEinnahmenNode = `Einnahmen ${gruppeLabel}`
    const gruppeAusgabenNode = `Ausgaben ${gruppeLabel}`

    if (row.ErtraegeNum > 0) {
      einnahmenProGruppe.set(
        gruppeEinnahmenNode,
        (einnahmenProGruppe.get(gruppeEinnahmenNode) ?? 0) + row.ErtraegeNum,
      )
    }

    if (row.AufwendungenNum > 0) {
      ausgabenProGruppe.set(
        gruppeAusgabenNode,
        (ausgabenProGruppe.get(gruppeAusgabenNode) ?? 0) + row.AufwendungenNum,
      )
    }
  })

  einnahmenProGruppe.forEach((summe, gruppeNode) => {
    if (summe > 0) {
      links.push({ source: gruppeNode, target: totalAusgabenNode, value: summe })
    }
  })

  ausgabenProGruppe.forEach((summe, gruppeNode) => {
    if (summe > 0) {
      links.push({ source: totalAusgabenNode, target: gruppeNode, value: summe })
    }
  })

  const nodeNames = new Set<string>([totalAusgabenNode])
  links.forEach((link) => {
    nodeNames.add(link.source)
    nodeNames.add(link.target)
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
          const name = source === totalAusgabenNode ? target : source
          return `${formatGroupNodeLabel(name)}<br>${euro(Number(edge?.value) || 0)}`
        }
        return formatGroupNodeLabel(data?.name ?? '')
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        data: Array.from(nodeNames).map((name) => {
          const isEinnahmenGroup = name.startsWith('Einnahmen ')
          const isAusgabenGroup = name.startsWith('Ausgaben ')
          const isGroup = isEinnahmenGroup || isAusgabenGroup
          const prefix = isEinnahmenGroup ? 'Einnahmen ' : 'Ausgaben '
          const groupCode = isGroup ? name.replace(prefix, '').slice(0, 2) : undefined

          return {
            name,
            label: {
              formatter: (params: { name: string }) => formatGroupNodeLabel(params.name),
            },
            nodeType: isGroup ? 'group' : 'other',
            groupCode,
          }
        }),
        links,
        levels: [
          { depth: 0, itemStyle: { color: '#ccebc5' }, lineStyle: { color: 'source', opacity: 0.6 } },
          { depth: 1, itemStyle: { color: '#fbb4ae' }, lineStyle: { color: 'source', opacity: 0.6 } },
          { depth: 2, itemStyle: { color: '#fbb4ae' }, lineStyle: { color: 'source', opacity: 0.6 } },
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

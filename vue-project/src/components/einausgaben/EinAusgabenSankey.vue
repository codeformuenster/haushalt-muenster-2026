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

function onChartClick(params: unknown): void {
  const data = (params as { dataType?: string; data?: { nodeType?: string; groupCode?: string } })
  if (data?.dataType !== 'node') return
  if (data?.data?.nodeType !== 'group') return
  if (!data.data.groupCode) return
  emit('groupSelect', data.data.groupCode)
}

const sankeyOption = computed<EChartsOption>(() => {
  //const totalEinnahmenNode = `Einnahmen ${props.selectedYear} gesamt`
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

  let einnahmenGesamt = 0
  einnahmenProGruppe.forEach((summe, gruppeNode) => {
    if (summe > 0) {
      links.push({ source: gruppeNode, target: totalAusgabenNode, value: summe })
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

  const nodeNames = new Set<string>([totalAusgabenNode])
  links.forEach((link) => {
    nodeNames.add(link.source)
    nodeNames.add(link.target)
  })

  return {
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
          const isEinnahmenGroup = name.startsWith('Einnahmen ')
          const isAusgabenGroup = name.startsWith('Ausgaben ')
          const isGroup = isEinnahmenGroup || isAusgabenGroup
          const prefix = isEinnahmenGroup ? 'Einnahmen ' : 'Ausgaben '
          const groupCode = isGroup ? name.replace(prefix, '').slice(0, 2) : undefined

          return {
            name,
			label: {
			formatter: params => {
				if (params.name.startsWith("Einnahmen")) {
					return params.name.replace("Einnahmen ", "")
				} else if (params.name.startsWith("Ausgaben")) {
					return params.name.replace("Ausgaben ", "")
				}
			}
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

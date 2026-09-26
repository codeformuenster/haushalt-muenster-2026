<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/ui/BaseChart.vue'
import { euro } from '@/charts/format'

type SankeyInputRow = {
  Gruppe: string
  Gruppenbezeichnung: string
  ErtraegeNum: number
  AufwendungenNum: number
}

type Richtung = 'einnahme' | 'ausgabe'

type GroupAggregate = {
  code: string
  displayName: string
  einnahmen: number
  ausgaben: number
}

type SankeyNodeModel = {
  name: string
  displayName: string
  code?: string
  direction?: Richtung
  nodeType: 'group' | 'haushalt'
}

type SankeyLinkModel = {
  source: string
  target: string
  value: number
  code: string
  direction: Richtung
  displayName: string
}

type SankeyGraphModel = {
  nodes: SankeyNodeModel[]
  links: SankeyLinkModel[]
}

type ChartEventPayload = {
  dataType?: 'node' | 'edge' | string
  data?: unknown
}

const props = defineProps<{
  rows: SankeyInputRow[]
  selectedYear: 2026 | 2027
}>()

const emit = defineEmits<{
  groupSelect: [groupCode: string]
}>()

const hoveredGroupCode = ref<string | null>(null)

function buildGroupAggregates(rows: SankeyInputRow[]): GroupAggregate[] {
  const map = new Map<string, GroupAggregate>()

  rows.forEach((row) => {
    const existing = map.get(row.Gruppe)
    if (!existing) {
      map.set(row.Gruppe, {
        code: row.Gruppe,
        displayName: row.Gruppenbezeichnung,
        einnahmen: row.ErtraegeNum > 0 ? row.ErtraegeNum : 0,
        ausgaben: row.AufwendungenNum > 0 ? row.AufwendungenNum : 0,
      })
      return
    }

    if (!existing.displayName && row.Gruppenbezeichnung) {
      existing.displayName = row.Gruppenbezeichnung
    }

    if (row.ErtraegeNum > 0) existing.einnahmen += row.ErtraegeNum
    if (row.AufwendungenNum > 0) existing.ausgaben += row.AufwendungenNum
  })

  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code, 'de'))
}

function groupNodeName(code: string, direction: Richtung): string {
  return `group:${code}:${direction}`
}

function buildSankeyGraph(rows: SankeyInputRow[], selectedYear: 2026 | 2027): SankeyGraphModel {
  const groupAggregates = buildGroupAggregates(rows)
  const haushaltNodeName = `haushalt:${selectedYear}`
  const haushaltDisplayName = `Haushalt ${selectedYear}`

  const nodes: SankeyNodeModel[] = [
    {
      name: haushaltNodeName,
      displayName: haushaltDisplayName,
      nodeType: 'haushalt',
    },
  ]
  const links: SankeyLinkModel[] = []

  groupAggregates.forEach((group) => {
    if (group.einnahmen > 0) {
      const name = groupNodeName(group.code, 'einnahme')
      nodes.push({
        name,
        displayName: group.displayName,
        code: group.code,
        direction: 'einnahme',
        nodeType: 'group',
      })

      links.push({
        source: name,
        target: haushaltNodeName,
        value: group.einnahmen,
        code: group.code,
        direction: 'einnahme',
        displayName: group.displayName,
      })
    }

    if (group.ausgaben > 0) {
      const name = groupNodeName(group.code, 'ausgabe')
      nodes.push({
        name,
        displayName: group.displayName,
        code: group.code,
        direction: 'ausgabe',
        nodeType: 'group',
      })

      links.push({
        source: haushaltNodeName,
        target: name,
        value: group.ausgaben,
        code: group.code,
        direction: 'ausgabe',
        displayName: group.displayName,
      })
    }
  })

  return { nodes, links }
}

function getGroupCodeFromChartEvent(params: unknown): string | null {
  const payload = params as ChartEventPayload

  if (payload?.dataType === 'node') {
    const node = payload.data as { nodeType?: string; code?: string } | undefined
    if (node?.nodeType !== 'group') return null
    return node.code ?? null
  }

  if (payload?.dataType === 'edge') {
    const edge = payload.data as { code?: string } | undefined
    return edge?.code ?? null
  }

  return null
}

function onChartClick(params: unknown): void {
  const groupCode = getGroupCodeFromChartEvent(params)
  if (!groupCode) return

  emit('groupSelect', groupCode)
}

function onChartMouseover(params: unknown): void {
  const payload = params as ChartEventPayload
  if (payload?.dataType !== 'edge') {
    hoveredGroupCode.value = null
    return
  }

  hoveredGroupCode.value = getGroupCodeFromChartEvent(params)
}

function onChartMouseout(): void {
  hoveredGroupCode.value = null
}

const sankeyOption = computed<EChartsOption>(() => {
  const graph = buildSankeyGraph(props.rows, props.selectedYear)
  const hoveredCode = hoveredGroupCode.value

  const links = graph.links.map((link) => ({
    ...link,
    lineStyle:
      hoveredCode === null
        ? undefined
        : link.code === hoveredCode
          ? { opacity: 0.95, width: 2 }
          : { opacity: 0.18 },
  }))

  return {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: unknown) => {
        const payload = params as { dataType?: string; data?: unknown }

        if (payload?.dataType === 'edge') {
          const edge = payload.data as SankeyLinkModel | undefined
          return `${edge?.displayName ?? ''}<br>${euro(Number(edge?.value) || 0)}`
        }

        const node = payload.data as SankeyNodeModel | undefined
        return node?.displayName ?? ''
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        data: graph.nodes,
        links,
        levels: [
          { depth: 0, itemStyle: { color: '#ccebc5' }, lineStyle: { color: 'source', opacity: 0.6 } },
          { depth: 1, itemStyle: { color: '#fbb4ae' }, lineStyle: { color: 'source', opacity: 0.6 } },
          { depth: 2, itemStyle: { color: '#fbb4ae' }, lineStyle: { color: 'source', opacity: 0.6 } },
        ],
        lineStyle: { color: 'source', curveness: 0.5 },
        nodeWidth: 14,
        nodeGap: 12,
        label: {
          fontSize: 11,
          formatter: (params: unknown) => {
            const payload = params as { data?: { displayName?: string } }
            return payload.data?.displayName ?? ''
          },
        },
      },
    ],
  }
})
</script>

<template>
  <BaseChart
    :option="sankeyOption"
    hoehe="700px"
    @chart-click="onChartClick"
    @mouseover="onChartMouseover"
    @mouseout="onChartMouseout"
  />
</template>

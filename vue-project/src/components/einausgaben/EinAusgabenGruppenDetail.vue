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

/* Die hellen Knotenfarben heben sich kaum vom weißen Grund ab (1,3 bzw. 1,7:1).
   Ein dunkler Rand macht die Knoten trotzdem erkennbar (Nicht-Text-Kontrast ≥ 3:1).
   Die Farben der Saldo-Knoten stehen am Datenpunkt; ECharts gibt diesen Vorrang
   vor den `levels`, sie werden also nicht überschrieben. */
const KNOTEN_RAND = { borderColor: '#31333d', borderWidth: 1 }

const products = computed(() =>
  props.rows
    .filter((row) => row.Gruppe === props.groupCode)
    .sort((a, b) => b.AufwendungenNum - a.AufwendungenNum),
)

const summen = computed(() => {
  const sumErtraege = products.value.reduce((sum, row) => sum + row.ErtraegeNum, 0)
  const sumAufwendungen = products.value.reduce((sum, row) => sum + row.AufwendungenNum, 0)
  return { sumErtraege, sumAufwendungen, saldo: sumErtraege - sumAufwendungen }
})

/** Der Saldo steht sonst nur im Diagramm – hier als Text. */
const saldoText = computed(() => {
  const { saldo } = summen.value
  if (saldo > 0) return `Überschuss: ${euro(saldo)}`
  if (saldo < 0) return `Subvention aus anderen Bereichen: ${euro(Math.abs(saldo))}`
  return 'Erträge und Aufwendungen gleichen sich aus'
})

const beschreibung = computed(
  () =>
    `Flussdiagramm für ${props.groupName} ${props.selectedYear}: links die Erträge der Produkte (${euro(summen.value.sumErtraege)}), ` +
    `rechts die Aufwendungen (${euro(summen.value.sumAufwendungen)}). ${saldoText.value}. ` +
    'Die Werte je Produkt stehen in der tabellarischen Übersicht unten.',
)

const option = computed<EChartsOption>(() => {
  const produkte = products.value
  const istSchmal = schmal.value

  const mitteNode = `Haushalt ${props.selectedYear}`
  const ueberschussNode = `Überschuss ${props.groupName}`
  const subventionNode = `Subvention aus anderen Bereichen`

  const { saldo } = summen.value

  const productNodes = produkte.map((p) => `${p.Bezeichnung} (${p.Code})`)
  const nodes: Array<{ name: string; itemStyle?: { color: string } }> = [
    { name: mitteNode, itemStyle: { color: POL_FARBEN.positiv } },
    ...productNodes.map((name) => ({ name: 'Ausgaben für ' + name })),
    ...productNodes.map((name) => ({ name: 'Einnahmen aus ' + name })),
  ]

  if (saldo > 0) {
    nodes.push({ name: ueberschussNode, itemStyle: { color: POL_FARBEN.positiv } })
  }
  if (saldo < 0) {
    nodes.push({ name: subventionNode, itemStyle: { color: POL_FARBEN.neutral } })
  }

  const links: Array<{ source: string; target: string; value: number }> = [
    ...produkte
      .filter((p) => p.ErtraegeNum > 0)
      .map((p) => ({
        target: mitteNode,
        source: `Einnahmen aus ${p.Bezeichnung} (${p.Code})`,
        value: p.ErtraegeNum,
      })),
    ...produkte
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
        labelLayout: { hideOverlap: true },
        label: {
          fontSize: istSchmal ? 10 : 12,
          formatter: ({ name }: { name: string }) => formatProductNodeLabel(name),
        },
        data: nodeData,
        links,
        levels: [
          {
            depth: 0,
            itemStyle: { color: '#ccebc5', ...KNOTEN_RAND },
            lineStyle: { color: 'source', opacity: 0.6 },
          },
          {
            depth: 1,
            itemStyle: { color: '#fbb4ae', ...KNOTEN_RAND },
            lineStyle: { color: 'source', opacity: 0.6 },
          },
          {
            depth: 2,
            itemStyle: { color: '#fbb4ae', ...KNOTEN_RAND },
            lineStyle: { color: 'source', opacity: 0.6 },
          },
        ],
        nodeWidth: 14,
      },
    ],
  }
})
</script>

<template>
  <BaseChart :option="option" hoehe="760px" :beschreibung="beschreibung" />
  <p class="saldo">
    Erträge: {{ euro(summen.sumErtraege) }} · Aufwendungen: {{ euro(summen.sumAufwendungen) }} ·
    {{ saldoText }}
  </p>
</template>

<style scoped>
.saldo {
  margin: var(--wa-space-s) 0 0;
  color: var(--wa-color-text-normal);
  font-size: var(--wa-font-size-s);
}
</style>

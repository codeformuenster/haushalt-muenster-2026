<script setup lang="ts">
import { computed, ref } from 'vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import EinAusgabenSankey from '@/components/einausgaben/EinAusgabenSankey.vue'
import EinAusgabenGruppenDetail from '@/components/einausgaben/EinAusgabenGruppenDetail.vue'
import { euro } from '@/charts/format'
import rawData from '@/assets/data/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027_preprocessed.csv?raw'
import rawGroups from '@/assets/data/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027_gruppen.csv?raw'

type DataRow = {
  Code: string
  Bezeichnung: string
  Ertraege_2026: string
  Aufwendungen_2026: string
  Ertraege_2027: string
  Aufwendungen_2027: string
  Gruppe: string
}

type GroupRow = {
  Gruppe: string
  Gruppenbezeichnung: string
}

type ViewRow = DataRow & {
  Gruppenbezeichnung: string
  Ertraege2026Num: number
  Aufwendungen2026Num: number
}

type TableGroup = {
  code: string
  name: string
  rows: ViewRow[]
  sumErtraege: number
  sumAufwendungen: number
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      const next = text[i + 1]
      if (inQuotes && next === '"') {
        value += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0))
}

function toObjects<T extends Record<string, string>>(text: string): T[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const [header = [], ...data] = rows

  return data.map((values) => {
    const obj: Record<string, string> = {}
    header.forEach((key, idx) => {
      obj[key] = values[idx] ?? ''
    })
    return obj as T
  })
}

function asNumber(value: string): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const groupMap = new Map(
  toObjects<GroupRow>(rawGroups).map((g) => [g.Gruppe, g.Gruppenbezeichnung] as const),
)

const rows = computed<ViewRow[]>(() =>
  toObjects<DataRow>(rawData)
    .map((row) => ({
      ...row,
      Gruppenbezeichnung: groupMap.get(row.Gruppe) ?? row.Gruppe,
      Ertraege2026Num: asNumber(row.Ertraege_2026),
      Aufwendungen2026Num: asNumber(row.Aufwendungen_2026),
    }))
    .filter((row) => row.Ertraege2026Num > 0 || row.Aufwendungen2026Num > 0),
)

const selectedGroup = ref<string | null>(null)

const selectedGroupName = computed(() => {
  if (!selectedGroup.value) return ''
  return groupMap.get(selectedGroup.value) ?? selectedGroup.value
})

function onGroupSelect(groupCode: string): void {
  selectedGroup.value = groupCode
}

function clearSelection(): void {
  selectedGroup.value = null
}
</script>

<template>
  <div class="mm-seite">
    <PageIntro titel="Ein- und Ausgaben" beschreibung="Einträge und Ausgaben" />

    <ChartCard
      titel="Erträge und Aufwendungen"
    >
      <div class="eingaben-ausgaben-toolbar">
        <wa-tag v-if="selectedGroup" size="m" with-remove @wa-remove="clearSelection"
          >{{ groupMap.get(selectedGroup) }}</wa-tag
        >
        <wa-tag v-else size="m" disabled>Gesamt</wa-tag>
        <div class="year-toggle">2026<wa-switch size="l"></wa-switch>2027</div>
      </div>
      <template v-if="selectedGroup">
        <EinAusgabenGruppenDetail
          :rows="rows"
          :group-code="selectedGroup"
          :group-name="selectedGroupName"
        />
      </template>
      <EinAusgabenSankey v-else :rows="rows" @group-select="onGroupSelect" />
    </ChartCard>
  </div>
</template>

<style scoped>
.eingaben-ausgaben-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.year-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
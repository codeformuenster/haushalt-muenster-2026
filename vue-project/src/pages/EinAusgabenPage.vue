<script setup lang="ts">
import { computed, ref } from 'vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import EinAusgabenSankey from '@/components/einausgaben/EinAusgabenSankey.vue'
import EinAusgabenGruppenDetail from '@/components/einausgaben/EinAusgabenGruppenDetail.vue'
import EinAusgabenGruppenTabelle from '@/components/einausgaben/EinAusgabenGruppenTabelle.vue'
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
  ErtraegeNum: number
  AufwendungenNum: number
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

const selectedYear = ref<2026 | 2027>(2026)

const rows = computed<ViewRow[]>(() => {
  const ertraegeField: 'Ertraege_2026' | 'Ertraege_2027' =
    selectedYear.value === 2026 ? 'Ertraege_2026' : 'Ertraege_2027'
  const aufwendungenField: 'Aufwendungen_2026' | 'Aufwendungen_2027' =
    selectedYear.value === 2026 ? 'Aufwendungen_2026' : 'Aufwendungen_2027'

  return toObjects<DataRow>(rawData)
    .map((row) => ({
      ...row,
      Gruppenbezeichnung: groupMap.get(row.Gruppe) ?? row.Gruppe,
      ErtraegeNum: asNumber(row[ertraegeField]),
      AufwendungenNum: asNumber(row[aufwendungenField]),
    }))
    .filter((row) => row.ErtraegeNum > 0 || row.AufwendungenNum > 0)
})

const tableGroups = computed<TableGroup[]>(() => {
  const groups = new Map<string, TableGroup>()

  rows.value.forEach((row) => {
    const existing = groups.get(row.Gruppe)
    if (!existing) {
      groups.set(row.Gruppe, {
        code: row.Gruppe,
        name: row.Gruppenbezeichnung,
        rows: [row],
        sumErtraege: row.ErtraegeNum,
        sumAufwendungen: row.AufwendungenNum,
      })
      return
    }

    existing.rows.push(row)
    existing.sumErtraege += row.ErtraegeNum
    existing.sumAufwendungen += row.AufwendungenNum
  })

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      rows: [...group.rows].sort((a, b) => a.Code.localeCompare(b.Code, 'de')),
    }))
    .sort((a, b) => a.code.localeCompare(b.code, 'de'))
})

function onYearToggle(event: Event): void {
  const target = event.target as { checked?: boolean }
  selectedYear.value = target.checked ? 2027 : 2026
}

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
        <div class="year-toggle">
          2026
          <wa-switch
            size="l"
            :checked="selectedYear === 2027"
            @change="onYearToggle"
          ></wa-switch>
          2027
        </div>
      </div>
      <template v-if="selectedGroup">
        <EinAusgabenGruppenDetail
          :rows="rows"
          :group-code="selectedGroup"
          :group-name="selectedGroupName"
          :selected-year="selectedYear"
        />
      </template>
      <EinAusgabenSankey
        v-else
        :rows="rows"
        :selected-year="selectedYear"
        @group-select="onGroupSelect"
      />
    </ChartCard>

    <ChartCard :titel="`Tabellarische Übersicht nach Produktgruppe (${selectedYear})`">
      <EinAusgabenGruppenTabelle
        :groups="tableGroups"
        :selected-year="selectedYear"
        @year-change="onYearToggle"
      />
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
<script setup lang="ts">
import { computed, ref } from 'vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import EinAusgabenSankey from '@/components/einausgaben/EinAusgabenSankey.vue'
import EinAusgabenGruppenDetail from '@/components/einausgaben/EinAusgabenGruppenDetail.vue'
import EinAusgabenGruppenTabelle from '@/components/einausgaben/EinAusgabenGruppenTabelle.vue'
import { asNumber, gruppenNamen as groupMap, produkte, type DataRow } from '@/data/einAusgaben'

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

const selectedYear = ref<2026 | 2027>(2026)

const rows = computed<ViewRow[]>(() => {
  const ertraegeField: 'Ertraege_2026' | 'Ertraege_2027' =
    selectedYear.value === 2026 ? 'Ertraege_2026' : 'Ertraege_2027'
  const aufwendungenField: 'Aufwendungen_2026' | 'Aufwendungen_2027' =
    selectedYear.value === 2026 ? 'Aufwendungen_2026' : 'Aufwendungen_2027'

  return produkte
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
    <PageIntro titel="Ein- und Ausgaben" beschreibung="Wo nimmt die Stadt Geld ein und wo gibt sie es aus?" />

    <ChartCard
      titel="Erträge und Aufwendungen"
    >
      <div class="eingaben-ausgaben-toolbar">
        <wa-tag v-if="selectedGroup" size="m" with-remove @wa-remove="clearSelection"
          >{{ groupMap.get(selectedGroup) }}</wa-tag
        >
        <div style="visibility: hidden;"></div>
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
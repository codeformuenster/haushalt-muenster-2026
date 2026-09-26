<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
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

/** Haushaltsjahr aus einem <wa-select> übernehmen. */
function onYearSelect(event: Event): void {
  selectedYear.value = (event.target as HTMLInputElement).value === '2027' ? 2027 : 2026
}

const selectedGroup = ref<string | null>(null)

const selectedGroupName = computed(() => {
  if (!selectedGroup.value) return ''
  return groupMap.get(selectedGroup.value) ?? selectedGroup.value
})

/** Auswahl „Produktgruppe“: Tastatur-Alternative zum Klick auf einen Sankey-Knoten. */
const gruppenAuswahl = ref<HTMLElement | null>(null)

/** Text der Live-Region, die Ansichtswechsel für Screenreader ansagt. */
const ansichtAnsage = ref('')

watch(selectedGroup, (code) => {
  ansichtAnsage.value = code ? `Detailansicht: ${selectedGroupName.value}` : 'Gesamtansicht'
})

function onGroupSelect(groupCode: string): void {
  selectedGroup.value = groupCode
}

/** Produktgruppe aus dem <wa-select> übernehmen; „gesamt“ heißt: keine Auswahl. */
function onGroupSelectChange(event: Event): void {
  const wert = (event.target as HTMLInputElement).value
  selectedGroup.value = wert && wert !== 'gesamt' ? wert : null
}

/** Zurück zur Gesamtansicht. Der Button verschwindet dabei, also Fokus auf die Auswahl. */
async function clearSelection(): Promise<void> {
  selectedGroup.value = null
  await nextTick()
  gruppenAuswahl.value?.focus()
}
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Ein- und Ausgaben"
      beschreibung="Wo nimmt die Stadt Geld ein und wo gibt sie es aus?"
    />

    <ChartCard
      titel="Erträge und Aufwendungen"
      beschreibung="Links stehen die Erträge, rechts die Aufwendungen je Produktgruppe. Wählen Sie eine Produktgruppe aus (oder klicken Sie im Diagramm darauf), um ihre Produkte zu sehen. Alle Werte stehen auch in der Tabelle unten."
    >
      <div class="eingaben-ausgaben-toolbar">
        <wa-select
          ref="gruppenAuswahl"
          class="gruppen-auswahl"
          label="Produktgruppe"
          :value="selectedGroup ?? 'gesamt'"
          @change="onGroupSelectChange"
        >
          <wa-option value="gesamt">Gesamt</wa-option>
          <wa-option v-for="group in tableGroups" :key="group.code" :value="group.code"
            >{{ group.code }} {{ group.name }}</wa-option
          >
        </wa-select>
        <wa-button v-if="selectedGroup" appearance="outlined" @click="clearSelection">
          <wa-icon slot="start" name="arrow-left" aria-hidden="true"></wa-icon>
          Zurück zur Gesamtansicht
        </wa-button>
        <wa-select
          class="jahr-auswahl"
          label="Haushaltsjahr"
          :value="String(selectedYear)"
          @change="onYearSelect"
        >
          <wa-option value="2026">2026</wa-option>
          <wa-option value="2027">2027</wa-option>
        </wa-select>
      </div>
      <p class="mm-visually-hidden" aria-live="polite">{{ ansichtAnsage }}</p>
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
      <EinAusgabenGruppenTabelle :groups="tableGroups" :selected-year="selectedYear" />
    </ChartCard>
  </div>
</template>

<style scoped>
.eingaben-ausgaben-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: var(--wa-space-m);
}

.gruppen-auswahl {
  flex: 1 1 20rem;
  max-width: 32rem;
}

.jahr-auswahl {
  width: 9rem;
}
</style>

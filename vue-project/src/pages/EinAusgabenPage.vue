<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import GlossarBegriff from '@/components/ui/GlossarBegriff.vue'
import EinAusgabenSankey from '@/components/einausgaben/EinAusgabenSankey.vue'
import EinAusgabenGruppenDetail from '@/components/einausgaben/EinAusgabenGruppenDetail.vue'
import EinAusgabenGruppenTabelle from '@/components/einausgaben/EinAusgabenGruppenTabelle.vue'
import { euroKurz } from '@/charts/format'
import { asNumber, gruppenNamen as groupMap, produkte, type DataRow } from '@/data/einAusgaben'
import ergebnisplan from '@/data/planspiel.json'

type ViewRow = DataRow & {
  Gruppenbezeichnung: string
  ErtraegeNum: number
  AufwendungenNum: number
  ErgebnisNum: number
}

type TableGroup = {
  code: string
  name: string
  rows: ViewRow[]
  sumErtraege: number
  sumAufwendungen: number
  sumErgebnis: number
}

const selectedYear = ref<2026 | 2027>(2026)

/** Zeilen 19, 20 und 26 des Gesamtergebnisplans (Band 1, S. 9) als Index in planspiel.json. */
const ZEILE = { finanzertraege: 18, zinsen: 19, jahresergebnis: 25 } as const
// Erste PDF-Seite des Haushaltsquerschnitts Teil 1 (Ergebnisplanung) je Jahr in Band 2.
const QUERSCHNITT_SEITE = { 2026: 71, 2027: 74 } as const
const QUELLE = 'Haushaltsplan Band 2, S. 71–76 (PDF), Haushaltsquerschnitt Teil 1: Ergebnisplanung'

const rows = computed<ViewRow[]>(() => {
  const ertraegeField: 'Ertraege_2026' | 'Ertraege_2027' =
    selectedYear.value === 2026 ? 'Ertraege_2026' : 'Ertraege_2027'
  const aufwendungenField: 'Aufwendungen_2026' | 'Aufwendungen_2027' =
    selectedYear.value === 2026 ? 'Aufwendungen_2026' : 'Aufwendungen_2027'
  const ergebnisField: 'Ergebnis_2026' | 'Ergebnis_2027' =
    selectedYear.value === 2026 ? 'Ergebnis_2026' : 'Ergebnis_2027'

  return (
    produkte
      .map((row) => ({
        ...row,
        Gruppenbezeichnung: groupMap.get(row.Gruppe) ?? row.Gruppe,
        ErtraegeNum: asNumber(row[ertraegeField]),
        AufwendungenNum: asNumber(row[aufwendungenField]),
        ErgebnisNum: asNumber(row[ergebnisField]),
      }))
      // Die Abfallwirtschaft hat nur ein Finanzergebnis und bleibt so in der Tabelle.
      .filter((row) => row.ErtraegeNum > 0 || row.AufwendungenNum > 0 || row.ErgebnisNum !== 0)
  )
})

const ordentlichesErgebnis = computed(() =>
  rows.value.reduce((summe, row) => summe + row.ErtraegeNum - row.AufwendungenNum, 0),
)

/** Finanzerträge, Zinsen und Jahresergebnis der Stadt im gewählten Jahr. */
const finanzen = computed(() => {
  const zeilen = ergebnisplan.gesamt[String(selectedYear.value) as '2026' | '2027']
  return {
    finanzertraege: zeilen[ZEILE.finanzertraege] ?? 0,
    zinsen: zeilen[ZEILE.zinsen] ?? 0,
    jahresergebnis: zeilen[ZEILE.jahresergebnis] ?? 0,
  }
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
        sumErgebnis: row.ErgebnisNum,
      })
      return
    }

    existing.rows.push(row)
    existing.sumErtraege += row.ErtraegeNum
    existing.sumAufwendungen += row.AufwendungenNum
    existing.sumErgebnis += row.ErgebnisNum
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

    <wa-callout variant="brand" appearance="filled">
      <wa-icon slot="icon" name="info" aria-hidden="true"></wa-icon>
      Das Diagramm zeigt alle Erträge und Aufwendungen {{ selectedYear }} aus dem Ergebnisplan. Der
      laufende Betrieb ergibt ein
      <GlossarBegriff id="ordentliches-ergebnis">ordentliches Ergebnis</GlossarBegriff> von
      {{ euroKurz(ordentlichesErgebnis) }}. Dazu kommen Finanzerträge von
      {{ euroKurz(finanzen.finanzertraege) }} und Zinsen von {{ euroKurz(finanzen.zinsen) }}. Unter
      dem Strich steht das <GlossarBegriff id="jahresergebnis">Jahresergebnis</GlossarBegriff>:
      {{ euroKurz(finanzen.jahresergebnis) }}. Das Minus deckt die Stadt aus ihren Rücklagen, im
      Diagramm der Zufluss „Minus, gedeckt aus Rücklagen“.
      <RouterLink to="/jahresergebnis">Mehr dazu auf der Seite Jahresergebnis</RouterLink>.
    </wa-callout>

    <ChartCard
      titel="Erträge und Aufwendungen"
      beschreibung="Links stehen die Erträge, rechts die Aufwendungen je Produktgruppe, dazu Finanzerträge, Zinsen und das Minus der ganzen Stadt. Wählen Sie eine Produktgruppe aus (oder klicken Sie im Diagramm darauf), um ihre Produkte zu sehen. Alle Werte stehen auch in der Tabelle unten."
      :quelle="QUELLE"
      :pdf="{ band: 2, seite: QUERSCHNITT_SEITE[selectedYear] }"
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
        :finanzen="finanzen"
        @group-select="onGroupSelect"
      />
    </ChartCard>

    <ChartCard
      :titel="`Tabellarische Übersicht nach Produktgruppe (${selectedYear})`"
      :quelle="QUELLE"
      :pdf="{ band: 2, seite: QUERSCHNITT_SEITE[selectedYear] }"
    >
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

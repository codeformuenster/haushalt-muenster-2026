<script setup lang="ts">
import { computed } from 'vue'
import PageIntro from '@/components/ui/PageIntro.vue'
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

const tableRows = computed(() =>
  toObjects<DataRow>(rawData)
    .map((row) => {
      const ertraege2026 = asNumber(row.Ertraege_2026)
      const aufwendungen2026 = asNumber(row.Aufwendungen_2026)
      const ertraege2027 = asNumber(row.Ertraege_2027)
      const aufwendungen2027 = asNumber(row.Aufwendungen_2027)
      return {
        ...row,
        Gruppenbezeichnung: groupMap.get(row.Gruppe) ?? row.Gruppe,
        Ertraege2026Num: ertraege2026,
        Aufwendungen2026Num: aufwendungen2026,
        Ertraege2027Num: ertraege2027,
        Aufwendungen2027Num: aufwendungen2027,
      }
    })
    .sort((a, b) => a.Code.localeCompare(b.Code)),
)
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Ein- und Ausgaben"
      beschreibung="Tabelle der Produktgruppen mit Erträgen und Aufwendungen für 2026 und 2027. Die Gruppenbezeichnungen werden aus der separaten Gruppendatei aufgelöst."
    />

    <div class="tabelle-wrapper">
      <table class="ein-ausgaben-tabelle">
        <thead>
          <tr>
            <th>Code</th>
            <th>Bezeichnung</th>
            <th>Gruppe</th>
            <th>Erträge 2026</th>
            <th>Aufwendungen 2026</th>
            <th>Erträge 2027</th>
            <th>Aufwendungen 2027</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.Code">
            <td>{{ row.Code }}</td>
            <td>{{ row.Bezeichnung }}</td>
            <td>{{ row.Gruppenbezeichnung }}</td>
            <td>{{ euro(row.Ertraege2026Num) }}</td>
            <td>{{ euro(row.Aufwendungen2026Num) }}</td>
            <td>{{ euro(row.Ertraege2027Num) }}</td>
            <td>{{ euro(row.Aufwendungen2027Num) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.tabelle-wrapper {
  overflow-x: auto;
}

.ein-ausgaben-tabelle {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.ein-ausgaben-tabelle th,
.ein-ausgaben-tabelle td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  white-space: nowrap;
}

.ein-ausgaben-tabelle th {
  font-weight: 700;
  position: sticky;
  top: 0;
  background: #f8fafc;
}
</style>

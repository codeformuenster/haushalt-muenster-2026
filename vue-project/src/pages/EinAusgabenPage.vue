<script setup lang="ts">
import { computed } from 'vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import EinAusgabenSankey from '@/components/einausgaben/EinAusgabenSankey.vue'
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

const rows = computed(() =>
  toObjects<DataRow>(rawData)
    .map((row) => ({
      ...row,
      Gruppenbezeichnung: groupMap.get(row.Gruppe) ?? row.Gruppe,
      Ertraege2026Num: asNumber(row.Ertraege_2026),
      Aufwendungen2026Num: asNumber(row.Aufwendungen_2026),
    }))
    .filter((row) => row.Ertraege2026Num > 0 || row.Aufwendungen2026Num > 0),
)

</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Ein- und Ausgaben"
      beschreibung="Sankey-Diagramm für 2026: Detaillierte Einnahmen werden zu Gruppen und zur Gesamtsumme aggregiert, dann über die Gesamtausgaben wieder auf Gruppen und Details verteilt."
    />

    <ChartCard
      titel="Erträge und Aufwendungen als Sankey (2026)"
      beschreibung="Gruppenansicht ohne Drilldown: aggregierte Einnahmen und Ausgaben je Gruppe."
      quelle="Haushaltsplan 2026/27, Gesamtübersicht Einnahmen/Ausgaben"
    >
      <EinAusgabenSankey :rows="rows" />
    </ChartCard>
  </div>
</template>

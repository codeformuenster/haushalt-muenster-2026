<script setup lang="ts">
import { euro } from '@/charts/format'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'

type TableRow = {
  Code: string
  Bezeichnung: string
  ErtraegeNum: number
  AufwendungenNum: number
}

type TableGroup = {
  code: string
  name: string
  rows: TableRow[]
  sumErtraege: number
  sumAufwendungen: number
}

const props = defineProps<{
  groups: TableGroup[]
  selectedYear: 2026 | 2027
}>()
</script>

<template>
  <!-- Das Haushaltsjahr wird oben auf der Seite gewählt und gilt auch hier. -->
  <DatenTabelle
    :beschriftung="`Erträge und Aufwendungen je Produkt, gruppiert nach Produktgruppe (${props.selectedYear})`"
  >
    <thead>
      <tr>
        <th scope="col">Code</th>
        <th scope="col">Bezeichnung</th>
        <th scope="col" class="mm-zahl">Erträge</th>
        <th scope="col" class="mm-zahl">Aufwendungen</th>
      </tr>
    </thead>
    <!-- Je Produktgruppe ein eigener <tbody>, damit die Gruppenüberschrift als
         Kopf ihrer Zeilengruppe gilt. -->
    <tbody v-for="group in props.groups" :key="group.code">
      <tr class="mm-gruppe-trenner">
        <th colspan="4" scope="rowgroup">{{ group.code }} {{ group.name }}</th>
      </tr>
      <tr v-for="row in group.rows" :key="`${group.code}-${row.Code}`">
        <td>{{ row.Code }}</td>
        <th scope="row">{{ row.Bezeichnung }}</th>
        <td class="mm-zahl">{{ euro(row.ErtraegeNum) }}</td>
        <td class="mm-zahl">{{ euro(row.AufwendungenNum) }}</td>
      </tr>
      <tr class="mm-summe">
        <th colspan="2" scope="row">Summe {{ group.code }}</th>
        <td class="mm-zahl">{{ euro(group.sumErtraege) }}</td>
        <td class="mm-zahl">{{ euro(group.sumAufwendungen) }}</td>
      </tr>
    </tbody>
  </DatenTabelle>
</template>

<style scoped>
.mm-gruppe-trenner th {
  background: var(--wa-color-surface-lowered);
  color: var(--wa-color-text-normal);
  text-align: left;
  border-top: 2px solid var(--wa-color-surface-border);
}
</style>

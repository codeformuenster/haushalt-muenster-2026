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

const emit = defineEmits<{
  yearChange: [event: Event]
}>()
</script>

<template>
  <div class="mm-tabellen-toolbar">
    <div class="year-toggle">
      2026
      <wa-switch
        size="l"
        :checked="props.selectedYear === 2027"
        @change="emit('yearChange', $event)"
      ></wa-switch>
      2027
    </div>
  </div>

  <DatenTabelle>
    <thead>
      <tr>
        <th scope="col">Code</th>
        <th scope="col">Bezeichnung</th>
        <th scope="col" class="mm-zahl">Erträge</th>
        <th scope="col" class="mm-zahl">Aufwendungen</th>
      </tr>
    </thead>
    <tbody>
      <template v-for="group in props.groups" :key="group.code">
        <tr class="mm-gruppe-trenner">
          <th colspan="4" scope="colgroup">{{ group.code }} {{ group.name }}</th>
        </tr>
        <tr v-for="row in group.rows" :key="`${group.code}-${row.Code}`">
          <td>{{ row.Code }}</td>
          <td>{{ row.Bezeichnung }}</td>
          <td class="mm-zahl">{{ euro(row.ErtraegeNum) }}</td>
          <td class="mm-zahl">{{ euro(row.AufwendungenNum) }}</td>
        </tr>
        <tr class="mm-gruppen-summe">
          <th colspan="2" scope="row">Summe {{ group.code }}</th>
          <th class="mm-zahl">{{ euro(group.sumErtraege) }}</th>
          <th class="mm-zahl">{{ euro(group.sumAufwendungen) }}</th>
        </tr>
      </template>
    </tbody>
  </DatenTabelle>
</template>

<style scoped>
.year-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mm-tabellen-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.mm-gruppe-trenner th {
  background: var(--wa-color-surface-lowered);
  color: var(--wa-color-text-normal);
  text-align: left;
  border-top: 2px solid var(--wa-color-surface-border);
}

.mm-gruppen-summe th,
.mm-gruppen-summe td {
  font-weight: var(--wa-font-weight-semibold);
  background: color-mix(in srgb, var(--wa-color-surface-lowered) 55%, transparent);
}
</style>

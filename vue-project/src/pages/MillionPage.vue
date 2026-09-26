<script setup lang="ts">
import { computed, ref } from 'vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'
import { euro, euroKurz, prozent } from '@/charts/format'
import { asNumber, gruppenNamen, produkte } from '@/data/einAusgaben'

type Position = {
  code: string
  bezeichnung: string
  bereich: string
  bedarf: number
}

/**
 * Der Slider läuft intern von 0 bis 1000 und wird logarithmisch auf
 * 100.000 € … 100 Mio. € abgebildet — linear wäre der untere Bereich
 * nicht treffbar. Gerundet auf zwei signifikante Stellen (1,2 Mio., 35 Mio. …).
 */
const SLIDER_MAX = 1000
const MIN_EXP = 5
const MAX_EXP = 8

function sliderZuBetrag(v: number): number {
  const roh = 10 ** (MIN_EXP + ((MAX_EXP - MIN_EXP) * v) / SLIDER_MAX)
  const stelle = 10 ** (Math.floor(Math.log10(roh)) - 1)
  return Math.round(roh / stelle) * stelle
}

const sliderWert = ref(SLIDER_MAX / 3) // 10^6 = 1 Mio. €
const betrag = computed(() => sliderZuBetrag(sliderWert.value))

function onSlider(event: Event): void {
  sliderWert.value = Number((event.target as { value?: number }).value ?? 0)
}

const selectedYear = ref<2026 | 2027>(2026)

/** Haushaltsjahr aus einem <wa-select> übernehmen. */
function onYearSelect(event: Event): void {
  selectedYear.value = (event.target as HTMLInputElement).value === '2027' ? 2027 : 2026
}

/** Alle Produkte mit Zuschussbedarf (Aufwendungen > Erträge) im gewählten Jahr. */
const defizitProdukte = computed<Position[]>(() => {
  const jahr = selectedYear.value
  return produkte
    .map((row) => ({
      code: row.Code,
      bezeichnung: row.Bezeichnung,
      bereich: gruppenNamen.get(row.Gruppe) ?? row.Gruppe,
      bedarf: asNumber(row[`Aufwendungen_${jahr}`]) - asNumber(row[`Ertraege_${jahr}`]),
    }))
    .filter((p) => p.bedarf > 0)
    .sort((a, b) => b.bedarf - a.bedarf)
})

const finanzierbar = computed(() => defizitProdukte.value.filter((p) => p.bedarf <= betrag.value))

const guenstigstes = computed(() => defizitProdukte.value.at(-1))
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Was könnte man mit 1 Million Euro machen?"
      beschreibung="Viele Aufgaben der Stadt kosten mehr, als sie einbringen. Die Differenz – der Zuschussbedarf – wird aus allgemeinen Mitteln wie Steuern bezahlt. Wählen Sie einen Betrag und sehen Sie, welche Aufgaben sich damit ein ganzes Jahr lang finanzieren ließen."
    />

    <ChartCard titel="Betrag wählen">
      <div class="betrag-kopf">
        <output class="betrag-anzeige" for="betrag-slider">{{ euro(betrag) }}</output>
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
      <wa-slider
        id="betrag-slider"
        label="Betrag"
        :min="0"
        :max="SLIDER_MAX"
        :step="1"
        :value="sliderWert"
        :value-formatter="(v: number) => euroKurz(sliderZuBetrag(v))"
        with-tooltip
        @input="onSlider"
      ></wa-slider>
      <div class="skala" aria-hidden="true">
        <span>100 Tsd. €</span><span>1 Mio. €</span><span>10 Mio. €</span><span>100 Mio. €</span>
      </div>
    </ChartCard>

    <ChartCard
      :titel="`Das ließe sich mit ${euroKurz(betrag)} finanzieren (${selectedYear})`"
      quelle="Haushaltsplan 2026/27, Gesamtübersicht der Erträge und Aufwendungen"
    >
      <template v-if="finanzierbar.length > 0">
        <p class="fazit">
          Damit ließe sich der Zuschussbedarf von
          <strong>{{ finanzierbar.length }} von {{ defizitProdukte.length }}</strong>
          Produkten für ein ganzes Jahr decken.
        </p>
        <DatenTabelle>
          <thead>
            <tr>
              <th scope="col">Produkt</th>
              <th scope="col">Bezeichnung</th>
              <th scope="col">Produktbereich</th>
              <th scope="col" class="mm-zahl">Zuschussbedarf</th>
              <th scope="col" class="mm-zahl">Anteil am Betrag</th>
              <th scope="col" class="mm-zahl">Wie oft?</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in finanzierbar" :key="p.code">
              <td>{{ p.code }}</td>
              <td>{{ p.bezeichnung }}</td>
              <td>{{ p.bereich }}</td>
              <td class="mm-zahl">{{ euro(p.bedarf) }}</td>
              <td class="mm-zahl">{{ prozent(p.bedarf / betrag) }}</td>
              <td class="mm-zahl">{{ Math.floor(betrag / p.bedarf) }}×</td>
            </tr>
          </tbody>
        </DatenTabelle>
      </template>
      <p v-else class="fazit">
        Dafür reicht es noch für kein ganzes Produkt.
        <template v-if="guenstigstes">
          Das günstigste – {{ guenstigstes.bezeichnung }} – braucht
          {{ euro(guenstigstes.bedarf) }} im Jahr.
        </template>
      </p>
    </ChartCard>
  </div>
</template>

<style scoped>
.betrag-kopf {
  display: flex;
  /* Unterkanten auf eine Linie: der Betrag ist deutlich höher als das
     Auswahlfeld, zentriert würde dessen Beschriftung darüber schweben. */
  align-items: end;
  justify-content: space-between;
  gap: var(--wa-space-m);
  flex-wrap: wrap;
  margin-bottom: var(--wa-space-m);
}

.betrag-anzeige {
  font-size: var(--wa-font-size-3xl);
  font-weight: var(--wa-font-weight-bold);
  font-variant-numeric: tabular-nums;
}

.jahr-auswahl {
  width: 9rem;
}

.skala {
  display: flex;
  justify-content: space-between;
  margin-top: var(--wa-space-2xs);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-xs);
}

.fazit {
  margin: 0 0 var(--wa-space-m);
}
</style>

<script setup lang="ts">
/**
 * Das große Ganze: Einstieg in den Haushalt mit Drilldown in die einzelnen
 * Bereiche. Diese Seite ist der Ausgangspunkt für alle anderen.
 */
import { computed, nextTick, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'
import { euro, euroKurz, prozent, zahl } from '@/charts/format'
import { KATEGORIE_FARBEN } from '@/charts/echartsTheme'
import daten from '@/data/planspiel.json'

const JAHR = '2026'
const ZEILE_AUFWENDUNGEN = daten.zeilen.indexOf('Ordentliche Aufwendungen')

/**
 * Ordentliche Aufwendungen 2026 in zwei Ebenen: Produktbereiche mit ihren
 * Produktgruppen als Kinder. Die Zuordnung steckt im Code — die Gruppe "0101"
 * gehört zum Bereich "01".
 *
 * Die Farbe setzen wir je Bereich selbst (Palette der Reihe nach, wie ECharts
 * sie sonst auch verteilen würde). So behalten die Produktgruppen im Drilldown
 * die Farbe ihres Bereichs, obwohl der Bereich dort die Wurzel ist.
 */
const bereiche = daten.produktbereiche.map((bereich, index) => {
  const gruppen = daten.produktgruppen
    .filter((gruppe) => gruppe.code.startsWith(bereich.code))
    .map((gruppe) => ({
      name: gruppe.name,
      value: gruppe.werte[JAHR][ZEILE_AUFWENDUNGEN] ?? 0,
    }))
    // Gruppen ohne Aufwand (z. B. die eigenwirtschaftliche Abfallwirtschaft)
    // hätten keine Fläche und stünden im Drilldown nur als leere Kachel herum.
    .filter((gruppe) => gruppe.value > 0)

  return {
    name: bereich.name,
    value: gruppen.reduce((summe, gruppe) => summe + gruppe.value, 0),
    farbe: KATEGORIE_FARBEN[index % KATEGORIE_FARBEN.length],
    children: gruppen,
  }
})

const gesamt = computed(() => bereiche.reduce((summe, bereich) => summe + bereich.value, 0))

// ------------------------------------------------------------- Drilldown

/*
 * Welcher Bereich aufgeklappt ist, hält die Seite selbst — nicht der
 * Treemap-Zoom von ECharts. So wirken Klick ins Diagramm, die Schaltflächen
 * und die Brotkrumen über der Karte alle auf denselben Zustand, und alles
 * davon ist auch per Tastatur bedienbar.
 */
const ausgewaehlterBereich = ref<string | null>(null)
const bereichDaten = computed(() =>
  bereiche.find((bereich) => bereich.name === ausgewaehlterBereich.value),
)

/** Text für die Live-Region: sagt den Wechsel für Screenreader an. */
const ansage = ref('')

const alleBereicheKnopf = ref<HTMLElement | null>(null)

function waehleBereich(name: string | null): void {
  ausgewaehlterBereich.value = name
  const bereich = bereichDaten.value
  ansage.value = bereich
    ? `${bereich.name}: ${zahl(bereich.children.length)} Produktgruppen, zusammen ${euroKurz(bereich.value)}.`
    : `Alle ${zahl(bereiche.length)} Aufgabenbereiche, zusammen ${euroKurz(gesamt.value)}.`
}

/** Brotkrume „Alle Bereiche“: verschwindet beim Klick, der Fokus springt zur Schaltfläche. */
async function zurueckZurGesamtansicht(): Promise<void> {
  waehleBereich(null)
  await nextTick()
  alleBereicheKnopf.value?.focus()
}

function diagrammKlick(ereignis: unknown): void {
  // In der Gesamtansicht öffnet ein Klick den Bereich; eine Produktgruppe
  // hat keine weitere Ebene.
  if (ausgewaehlterBereich.value !== null) return
  const { name } = ereignis as { name?: string }
  if (name && bereiche.some((bereich) => bereich.name === name)) waehleBereich(name)
}

// --------------------------------------------------------------- Diagramm

const treemap = computed<EChartsOption>(() => {
  const bereich = bereichDaten.value

  /*
   * levels[i] gilt für die Knoten der Tiefe i — levels[0] ist die unsichtbare
   * Wurzel. Die Produktgruppen behalten die Farbe ihres Bereichs: eine eigene
   * Abstufung würde den Kontrast zur weißen Beschriftung verlieren, die
   * Kacheln trennen die Zwischenräume.
   */
  const bereichsEbene = { label: { fontSize: 13, formatter: '{b}' } }
  const gruppenEbene = {
    label: {
      fontSize: 12,
      lineHeight: 16,
      formatter: (params: { name: string; value: unknown }) =>
        `${params.name}\n${euroKurz(params.value as number)}`,
    },
    itemStyle: { gapWidth: 2 },
  }

  return {
    tooltip: {
      formatter: (info: unknown) => {
        const { name, value } = info as { name: string; value: number }
        return [
          `<strong>${name}</strong>`,
          bereich ? `in ${bereich.name}` : undefined,
          euro(value),
          `${prozent(value / gesamt.value)} des Haushalts`,
          bereich ? `${prozent(value / bereich.value)} des Bereichs` : undefined,
        ]
          .filter(Boolean)
          .join('<br>')
      },
    },
    series: [
      {
        type: 'treemap',
        // Gesamtansicht: die Bereiche. Drilldown: nur die Gruppen des Bereichs.
        data: bereich
          ? bereich.children.map((gruppe) => ({ ...gruppe, itemStyle: { color: bereich.farbe } }))
          : bereiche.map(({ name, value, farbe }) => ({
              name,
              value,
              itemStyle: { color: farbe },
            })),
        // Fläche der Karte ausnutzen; den Abstand gibt schon die Karte vor.
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        roam: false,
        // Zoomen übernimmt die Seite (siehe oben), die Brotkrumen stehen als
        // HTML über dem Diagramm.
        nodeClick: false,
        breadcrumb: { show: false },
        label: { show: true, color: '#fff', overflow: 'truncate' },
        itemStyle: { borderColor: 'transparent', borderWidth: 2, gapWidth: 2 },
        levels: [{}, bereich ? gruppenEbene : bereichsEbene],
      },
    ],
  }
})
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Der Haushalt im Überblick"
      beschreibung="Die Stadt Münster plant für 2026 Ausgaben in mehreren Aufgabenbereichen. Je größer die Fläche, desto mehr Geld fließt in den Bereich. Ein Klick auf einen Bereich — oder auf seine Schaltfläche über dem Diagramm — führt eine Ebene tiefer, zu den einzelnen Themen."
    />

    <ChartCard
      titel="Ausgaben nach Aufgabenbereich"
      beschreibung="Geplante Aufwendungen 2026, aufgeteilt auf die Aufgabenbereiche der Stadt. Ein Klick auf eine Fläche oder eine Schaltfläche zeigt die Produktgruppen des Bereichs, „Alle Bereiche“ führt zurück. Alle Werte stehen unter dem Diagramm auch als Tabelle."
      quelle="Haushaltsplan 2026/27, Band 2, Haushaltsquerschnitt, S. 67 ff."
      :pdf="{ band: 2, seite: 71 }"
    >
      <div class="mm-bereichswahl" role="group" aria-label="Aufgabenbereich anzeigen">
        <wa-button
          ref="alleBereicheKnopf"
          size="s"
          :appearance="ausgewaehlterBereich === null ? 'filled-outlined' : 'outlined'"
          :class="{ 'mm-aktiv': ausgewaehlterBereich === null }"
          :aria-pressed="ausgewaehlterBereich === null"
          @click="waehleBereich(null)"
        >
          Alle Bereiche
        </wa-button>
        <wa-button
          v-for="bereich in bereiche"
          :key="bereich.name"
          size="s"
          :appearance="ausgewaehlterBereich === bereich.name ? 'filled-outlined' : 'outlined'"
          :class="{ 'mm-aktiv': ausgewaehlterBereich === bereich.name }"
          :aria-pressed="ausgewaehlterBereich === bereich.name"
          @click="waehleBereich(bereich.name)"
        >
          {{ bereich.name }}
        </wa-button>
      </div>

      <nav class="mm-brotkrumen" aria-label="Ebene im Diagramm">
        <ol>
          <li>
            <button v-if="ausgewaehlterBereich" type="button" @click="zurueckZurGesamtansicht">
              Alle Bereiche
            </button>
            <span v-else aria-current="location">Alle Bereiche</span>
          </li>
          <li v-if="ausgewaehlterBereich">
            <span aria-current="location">{{ ausgewaehlterBereich }}</span>
          </li>
        </ol>
      </nav>

      <BaseChart :option="treemap" hoehe="480px" @chart-click="diagrammKlick" />

      <!-- Bleibt immer im DOM; nur der Text wechselt. -->
      <p class="mm-visually-hidden" role="status">{{ ansage }}</p>

      <wa-details summary="Werte als Tabelle" class="mm-tabelle-details">
        <DatenTabelle
          beschriftung="Geplante Aufwendungen 2026 nach Aufgabenbereich und Produktgruppe"
        >
          <thead>
            <tr>
              <th scope="col">Bereich / Produktgruppe</th>
              <th scope="col" class="mm-zahl">Aufwendungen 2026</th>
              <th scope="col" class="mm-zahl">Anteil am Haushalt</th>
            </tr>
          </thead>
          <tbody v-for="bereich in bereiche" :key="bereich.name">
            <tr class="mm-summe">
              <th scope="row">{{ bereich.name }}</th>
              <td class="mm-zahl">{{ euro(bereich.value) }}</td>
              <td class="mm-zahl">{{ prozent(bereich.value / gesamt) }}</td>
            </tr>
            <tr v-for="gruppe in bereich.children" :key="gruppe.name">
              <th scope="row" class="mm-gruppe">{{ gruppe.name }}</th>
              <td class="mm-zahl">{{ euro(gruppe.value) }}</td>
              <td class="mm-zahl">{{ prozent(gruppe.value / gesamt) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Gesamt</th>
              <td class="mm-zahl">{{ euro(gesamt) }}</td>
              <td class="mm-zahl">{{ prozent(1) }}</td>
            </tr>
          </tfoot>
        </DatenTabelle>
      </wa-details>
    </ChartCard>
  </div>
</template>

<style scoped>
.mm-bereichswahl {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wa-space-2xs);
  margin-bottom: var(--wa-space-m);
}

/* Lange Bereichsnamen dürfen auf dem Handy umbrechen, statt die Seite zu verbreitern. */
.mm-bereichswahl wa-button {
  max-width: 100%;
}

.mm-bereichswahl wa-button::part(base) {
  height: auto;
  min-height: var(--wa-form-control-height);
}

.mm-bereichswahl wa-button::part(label) {
  white-space: normal;
  text-align: start;
}

/* Der gewählte Bereich: leicht orange hinterlegt mit passendem Rand. Web
   Awesome liest diese Tokens im Shadow DOM, deshalb hier am Host setzen. */
.mm-bereichswahl .mm-aktiv {
  --wa-color-fill-normal: var(--mm-auswahl-flaeche);
  --wa-color-border-normal: var(--mm-auswahl-rand);
  --wa-color-on-normal: var(--mm-auswahl-text);
  font-weight: var(--wa-font-weight-semibold);
}

.mm-brotkrumen ol {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wa-space-2xs);
  margin: 0 0 var(--wa-space-s);
  padding: 0;
  list-style: none;
  font-size: var(--wa-font-size-s);
}

.mm-brotkrumen li + li::before {
  content: '›';
  margin-right: var(--wa-space-2xs);
  color: var(--wa-color-text-quiet);
}

.mm-brotkrumen button {
  padding: 0;
  border: none;
  background: none;
  color: var(--wa-color-text-link);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.mm-brotkrumen button:focus-visible {
  outline: var(--wa-focus-ring);
  outline-offset: 2px;
}

.mm-brotkrumen [aria-current] {
  font-weight: var(--wa-font-weight-semibold);
}

.mm-tabelle-details {
  margin-top: var(--wa-space-l);
}

/* Produktgruppen eingerückt unter ihrem Bereich. */
.mm-gruppe {
  padding-left: var(--wa-space-xl);
}
</style>

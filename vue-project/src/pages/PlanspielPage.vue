<script setup lang="ts">
/**
 * Planspiel: Wer den Haushalt 2026 ausgleichen will, dreht an Einnahmen und
 * Ausgaben und sieht sofort, wie sich das ordentliche Ergebnis verändert.
 */
import { computed, reactive } from 'vue'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import { euro, euroKurz } from '@/charts/format'
import { POL_FARBEN } from '@/charts/echartsTheme'
import {
  aufwendungenProduktbereich,
  ERTRAGSARTEN,
  gesamt,
  GRUPPEN,
  KARTEN,
  PRODUKTBEREICHE,
  ZEILE,
} from '@/components/planspiel/karten'

const ertraege = ERTRAGSARTEN.map((name, i) => ({ name, betrag: gesamt(i) }))
const bereiche = PRODUKTBEREICHE.map((pb) => ({
  ...pb,
  betrag: aufwendungenProduktbereich(pb.code),
}))

// Kurze Erklärungen zu den Ertragsarten, in der Reihenfolge der Zeilen 01 bis 08.
const ERTRAG_HILFE = [
  'Gewerbesteuer, Grundsteuer, Anteile an Einkommen- und Umsatzsteuer',
  'Geld von Land und Bund, z. B. Schlüsselzuweisungen (legt das Land fest)',
  'z. B. Rückzahlungen von Sozialleistungen',
  'Gebühren, z. B. für Müllabfuhr oder Kita',
  'Mieten, Eintrittsgelder, Verkäufe',
  'Andere Stellen erstatten der Stadt Kosten (kaum beeinflussbar)',
  'z. B. Bußgelder und Konzessionsabgaben',
  'Eigene Arbeit der Verwaltung, z. B. an Bauprojekten',
]
// Keine echten Stellschrauben: Zeile 08 ist eine Buchungsgröße, PB 17 (Stiftungen) ist winzig.
const ERTRAG_REGLER = ertraege.map((_, i) => i).filter((i) => i !== 7)
const BEREICH_REGLER = bereiche.map((_, i) => i).filter((i) => bereiche[i]?.code !== '17')

const START = gesamt(ZEILE.ertraege) - gesamt(ZEILE.aufwendungen)
const GRENZE = 20

const ertragProzent = reactive<number[]>(ertraege.map(() => 0))
const bereichProzent = reactive<number[]>(bereiche.map(() => 0))
const kartenAktiv = reactive<Record<string, boolean>>({})

const ertragDelta = (i: number) => ((ertraege[i]?.betrag ?? 0) * (ertragProzent[i] ?? 0)) / 100
const bereichDelta = (i: number) => ((bereiche[i]?.betrag ?? 0) * (bereichProzent[i] ?? 0)) / 100

const veraenderung = computed(
  () =>
    ertraege.reduce((summe, _, i) => summe + ertragDelta(i), 0) -
    bereiche.reduce((summe, _, i) => summe + bereichDelta(i), 0) +
    KARTEN.filter((k) => kartenAktiv[k.id]).reduce((summe, k) => summe + k.wirkung, 0),
)
const ergebnis = computed(() => START + veraenderung.value)
const geschafft = computed(() => ergebnis.value >= 0)
// Anteil des Wegs vom Planwert bis zur Null, für den Fortschrittsbalken.
const fortschritt = computed(() => Math.min(1, Math.max(0, veraenderung.value / -START)))

const kartenJeGruppe = GRUPPEN.map((g) => ({
  ...g,
  karten: KARTEN.filter((k) => k.gruppe === g.id),
}))

function mitVorzeichen(wert: number): string {
  return `${wert > 0 ? '+' : ''}${euroKurz(wert)}`
}

function prozent(wert: number): string {
  return wert === 0 ? '±0 %' : `${wert > 0 ? '+' : ''}${wert} %`
}

function zuruecksetzen() {
  ertragProzent.fill(0)
  bereichProzent.fill(0)
  for (const id of Object.keys(kartenAktiv)) kartenAktiv[id] = false
}

/** Liegende Balken, größter Posten oben. */
function balken(posten: { name: string; betrag: number }[], farbe: string): EChartsOption {
  const sortiert = [...posten].sort((a, b) => a.betrag - b.betrag)
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (wert) => euro(Number(wert)),
    },
    grid: { left: 150, right: 24, top: 8, bottom: 32 },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (wert: number) => euroKurz(wert), hideOverlap: true },
    },
    yAxis: {
      type: 'category',
      data: sortiert.map((p) => p.name),
      axisLabel: { width: 140, overflow: 'break', lineHeight: 14 },
    },
    series: [
      {
        name: '2026',
        type: 'bar',
        data: sortiert.map((p) => p.betrag),
        itemStyle: { color: farbe, borderRadius: [0, 4, 4, 0] },
      },
    ],
  }
}

const woher = computed(() => balken(ertraege, POL_FARBEN.positiv))
const wohin = computed(() => balken(bereiche, POL_FARBEN.negativ))
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Planspiel: Gleich den Haushalt aus!"
      beschreibung="Im Jahr 2026 plant Münster mehr auszugeben, als es einnimmt. Schaffst du es, das Minus auf null zu bringen? Triff Entscheidungen und sieh sofort, was sich ändert."
    />

    <!-- PLATZHALTER: Text vom Team noch abzustimmen. -->
    <wa-callout variant="neutral" appearance="outlined">
      <strong>Ein Spiel, keine Prognose.</strong> Das Planspiel vereinfacht stark. Die Beträge
      folgen dem Haushaltsplan, die Wirkungen sind aber grobe Rechenbeispiele: Viele Ausgaben sind
      gesetzlich vorgeschrieben, und Folgewirkungen fehlen ganz. Es geht darum, ein Gefühl dafür zu
      bekommen, was die Stadt tut und wie groß die einzelnen Posten sind. Regler und Karten werden
      einfach addiert, jeweils bezogen auf den Plan.
    </wa-callout>

    <div class="mm-raster">
      <ChartCard
        titel="Woher kommt das Geld?"
        beschreibung="Geplante Erträge 2026 nach Art."
        quelle="Haushaltsplan Band 1, S. 9 (PDF), Zeilen 01-08"
      >
        <BaseChart :option="woher" hoehe="400px" />
      </ChartCard>

      <ChartCard
        titel="Wohin geht es?"
        beschreibung="Geplante Aufwendungen 2026 nach Aufgabenbereich."
        quelle="Haushaltsplan Band 1, Teilergebnispläne der Produktgruppen, Zeile 17"
      >
        <BaseChart :option="wohin" hoehe="600px" />
      </ChartCard>
    </div>

    <section
      class="pl-bilanz"
      :class="{ 'pl-bilanz--geschafft': geschafft }"
      aria-label="Ordentliches Ergebnis 2026"
    >
      <div class="pl-bilanz__kopf">
        <div>
          <div class="pl-bilanz__label">Dein Ergebnis 2026</div>
          <div class="pl-bilanz__zahl">{{ mitVorzeichen(ergebnis) }}</div>
        </div>
        <div class="pl-bilanz__info">
          <div>Plan: {{ euroKurz(START) }}</div>
          <div>Deine Änderung: {{ mitVorzeichen(veraenderung) }}</div>
        </div>
      </div>
      <div class="pl-bilanz__balken" role="presentation">
        <div class="pl-bilanz__fuellung" :style="{ width: `${fortschritt * 100}%` }" />
      </div>
      <p class="pl-bilanz__text" aria-live="polite">
        <template v-if="geschafft"> Geschafft! Der Haushalt 2026 ist ausgeglichen. </template>
        <template v-else>Noch {{ euroKurz(-ergebnis) }} bis zur Null.</template>
      </p>
    </section>

    <section class="pl-entscheidungen">
      <div class="pl-kopf">
        <h2>Entscheidungen</h2>
        <p>
          Tippe eine Karte an, um die Entscheidung zu treffen. Noch einmal tippen nimmt sie zurück.
        </p>
      </div>
      <div v-for="gruppe in kartenJeGruppe" :key="gruppe.id" class="pl-gruppe">
        <h3>{{ gruppe.titel }}</h3>
        <div class="mm-raster">
          <article
            v-for="karte in gruppe.karten"
            :key="karte.id"
            class="pl-karte"
            :class="{ 'pl-karte--aktiv': kartenAktiv[karte.id] }"
          >
            <!-- Nur der obere Teil ist Label, damit "Wie gerechnet?" die Karte nicht umschaltet. -->
            <label class="pl-karte__haupt">
              <input
                v-model="kartenAktiv[karte.id]"
                type="checkbox"
                class="pl-karte__schalter"
                :aria-labelledby="`pl-karte-${karte.id}`"
                :aria-describedby="`pl-wirkung-${karte.id}`"
              />
              <span :id="`pl-karte-${karte.id}`" class="pl-karte__titel">{{ karte.titel }}</span>
              <span>{{ karte.text }}</span>
              <span
                :id="`pl-wirkung-${karte.id}`"
                class="pl-karte__wirkung"
                :class="{ gut: karte.wirkung > 0, schlecht: karte.wirkung < 0 }"
              >
                <template v-if="karte.wirkung === 0">
                  0 € <small>keine Wirkung auf den Haushalt</small>
                </template>
                <template v-else>{{ mitVorzeichen(karte.wirkung) }}</template>
              </span>
              <span class="pl-wissen">
                <strong>Gut zu wissen</strong>
                {{ karte.wissen }}
              </span>
            </label>
            <details class="pl-rechnung">
              <summary>Wie gerechnet?</summary>
              <p><strong>Annahme:</strong> {{ karte.annahme }}</p>
              <p class="pl-leise">Quelle: {{ karte.quelle }}</p>
            </details>
          </article>
        </div>
      </div>
    </section>

    <div>
      <wa-button appearance="outlined" @click="zuruecksetzen">Alles zurücksetzen</wa-button>
    </div>

    <details class="pl-fein">
      <summary>Feinsteuerung: alle Posten einzeln</summary>
      <p class="pl-fein__hinweis">
        Zum Ausprobieren: Hier drehst du jede Ertragsart und jeden Aufgabenbereich um bis zu 20 %
        rauf oder runter. Die Regler zählen zusätzlich zu den Karten.
      </p>
      <div class="mm-raster">
        <wa-card>
          <div slot="header" class="pl-kopf">
            <h3>Einnahmen</h3>
            <p>Mehr Einnahmen verkleinern das Minus.</p>
          </div>
          <div class="pl-regler">
            <label v-for="i in ERTRAG_REGLER" :key="i" class="pl-regler__zeile">
              <span :id="`pl-ertrag-${i}`" class="pl-regler__name">
                {{ ertraege[i]?.name }}
                <small>{{ ERTRAG_HILFE[i] }}</small>
              </span>
              <input
                v-model.number="ertragProzent[i]"
                type="range"
                :min="-GRENZE"
                :max="GRENZE"
                step="1"
                :aria-labelledby="`pl-ertrag-${i}`"
                :aria-valuetext="prozent(ertragProzent[i] ?? 0)"
              />
              <span
                class="pl-regler__wert"
                :class="{ gut: ertragDelta(i) > 0, schlecht: ertragDelta(i) < 0 }"
              >
                {{ prozent(ertragProzent[i] ?? 0) }}
                <small>{{ mitVorzeichen(ertragDelta(i)) }}</small>
              </span>
            </label>
          </div>
        </wa-card>

        <wa-card>
          <div slot="header" class="pl-kopf">
            <h3>Ausgaben</h3>
            <p>Weniger Ausgaben verkleinern das Minus.</p>
          </div>
          <div class="pl-regler">
            <label v-for="i in BEREICH_REGLER" :key="i" class="pl-regler__zeile">
              <span :id="`pl-bereich-${i}`" class="pl-regler__name">
                {{ bereiche[i]?.name }}
                <small>{{ euroKurz(bereiche[i]?.betrag ?? 0) }}</small>
              </span>
              <input
                v-model.number="bereichProzent[i]"
                type="range"
                :min="-GRENZE"
                :max="GRENZE"
                step="1"
                :aria-labelledby="`pl-bereich-${i}`"
                :aria-valuetext="prozent(bereichProzent[i] ?? 0)"
              />
              <span
                class="pl-regler__wert"
                :class="{ gut: bereichDelta(i) < 0, schlecht: bereichDelta(i) > 0 }"
              >
                {{ prozent(bereichProzent[i] ?? 0) }}
                <small>{{ mitVorzeichen(bereichDelta(i)) }}</small>
              </span>
            </label>
          </div>
        </wa-card>
      </div>
    </details>
  </div>
</template>

<style scoped>
.gut {
  color: v-bind('POL_FARBEN.positiv');
}

.schlecht {
  color: v-bind('POL_FARBEN.negativ');
}

.pl-leise {
  color: var(--wa-color-text-quiet);
}

.pl-kopf :is(h2, h3) {
  margin: 0;
  font-size: var(--wa-font-size-l);
}

.pl-kopf p {
  margin: var(--wa-space-2xs) 0 0;
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

/* Bleibt beim Scrollen oben stehen, damit man beim Wählen von Karten und Reglern das Ergebnis sieht. */
.pl-bilanz {
  position: sticky;
  /* Unter dem ebenfalls klebenden Seitenkopf von wa-page. */
  top: calc(var(--header-height, 0px) + var(--wa-space-s));
  z-index: 1;
  padding: var(--wa-space-m) var(--wa-space-l);
  border: 2px solid v-bind('POL_FARBEN.negativ');
  border-radius: var(--wa-border-radius-l);
  background-color: var(--wa-color-surface-raised);
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.08);
  transition: border-color 0.3s;
}

.pl-bilanz__kopf {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--wa-space-s) var(--wa-space-l);
}

.pl-bilanz__label {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.pl-bilanz__zahl {
  color: v-bind('POL_FARBEN.negativ');
  font-size: var(--wa-font-size-3xl);
  font-weight: var(--wa-font-weight-bold);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  transition: color 0.3s;
}

.pl-bilanz__info {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  text-align: right;
}

.pl-bilanz__balken {
  height: 0.75rem;
  margin-top: var(--wa-space-s);
  border-radius: 999px;
  background-color: var(--wa-color-neutral-fill-quiet);
  overflow: hidden;
}

.pl-bilanz__fuellung {
  height: 100%;
  border-radius: inherit;
  background-color: v-bind('POL_FARBEN.negativ');
  transition:
    width 0.3s,
    background-color 0.3s;
}

.pl-bilanz__text {
  margin: var(--wa-space-xs) 0 0;
  font-size: var(--wa-font-size-s);
}

.pl-bilanz--geschafft {
  border-color: v-bind('POL_FARBEN.positiv');
  animation: pl-feiern 0.6s ease-out;
}

.pl-bilanz--geschafft .pl-bilanz__zahl {
  color: v-bind('POL_FARBEN.positiv');
}

.pl-bilanz--geschafft .pl-bilanz__fuellung {
  background-color: v-bind('POL_FARBEN.positiv');
}

.pl-bilanz--geschafft .pl-bilanz__text {
  font-weight: var(--wa-font-weight-bold);
  color: v-bind('POL_FARBEN.positiv');
}

/* Auf dem Handy kompakter, damit die klebende Box nicht Karten und Regler verdeckt. */
@media (max-width: 40rem) {
  .pl-bilanz {
    padding: var(--wa-space-s) var(--wa-space-m);
  }

  .pl-bilanz__zahl {
    font-size: var(--wa-font-size-2xl);
  }

  .pl-bilanz__info {
    display: none;
  }
}

@keyframes pl-feiern {
  50% {
    transform: scale(1.02);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pl-bilanz--geschafft {
    animation: none;
  }
}

.pl-regler {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-m);
}

.pl-regler__zeile {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    'name wert'
    'regler regler';
  gap: var(--wa-space-2xs) var(--wa-space-s);
  align-items: center;
}

.pl-regler__name {
  grid-area: name;
  font-size: var(--wa-font-size-s);
  font-weight: var(--wa-font-weight-semibold);
}

.pl-regler__name small {
  display: block;
  color: var(--wa-color-text-quiet);
  font-weight: normal;
}

.pl-regler input {
  grid-area: regler;
  margin: 0;
  width: 100%;
  accent-color: var(--wa-color-brand-fill-loud);
}

.pl-regler__wert {
  grid-area: wert;
  align-self: start;
  min-width: 6.5rem;
  font-size: var(--wa-font-size-s);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.pl-regler__wert small {
  display: block;
}

.pl-entscheidungen {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-xl);
}

.pl-gruppe h3 {
  margin: 0 0 var(--wa-space-s);
  font-size: var(--wa-font-size-l);
}

.pl-karte {
  display: flex;
  flex-direction: column;
  border: 2px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-l);
  background-color: var(--wa-color-surface-raised);
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.pl-karte:hover {
  border-color: var(--wa-color-brand-border-normal);
}

.pl-karte--aktiv {
  border-color: var(--wa-color-brand-border-loud);
  background-color: var(--wa-color-brand-fill-quiet);
}

.pl-karte__haupt {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--wa-space-xs);
  padding: var(--wa-space-l) var(--wa-space-l) var(--wa-space-s);
  cursor: pointer;
}

.pl-karte__schalter {
  position: absolute;
  top: var(--wa-space-l);
  right: var(--wa-space-l);
  width: 1.25rem;
  height: 1.25rem;
  accent-color: var(--wa-color-brand-fill-loud);
}

.pl-karte__titel {
  padding-right: var(--wa-space-2xl);
  font-size: var(--wa-font-size-l);
  font-weight: var(--wa-font-weight-semibold);
}

.pl-karte__wirkung {
  font-size: var(--wa-font-size-xl);
  font-weight: var(--wa-font-weight-bold);
  font-variant-numeric: tabular-nums;
}

.pl-karte__wirkung small {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  font-weight: normal;
}

.pl-wissen {
  margin-top: var(--wa-space-2xs);
  padding: var(--wa-space-s) var(--wa-space-m);
  border-left: 3px solid var(--wa-color-brand-border-loud);
  border-radius: var(--wa-border-radius-s);
  background-color: var(--wa-color-neutral-fill-quiet);
  font-size: var(--wa-font-size-s);
  line-height: 1.5;
}

.pl-wissen strong {
  display: block;
  margin-bottom: var(--wa-space-3xs);
  color: var(--wa-color-brand-on-quiet);
  font-size: var(--wa-font-size-xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Die nativen Stile von Web Awesome machen aus <details> ein Panel; in der Karte soll es ein schlichter Link sein. */
.pl-rechnung,
.pl-rechnung[open] {
  padding: 0 var(--wa-space-l) var(--wa-space-m);
  border: none;
  background: none;
  font-size: var(--wa-font-size-xs);
}

.pl-rechnung summary {
  justify-content: flex-start;
  gap: var(--wa-space-2xs);
  width: fit-content;
  margin: 0;
  padding: 0;
  color: var(--wa-color-brand-on-quiet);
}

.pl-rechnung p {
  margin: var(--wa-space-xs) 0 0;
}

.pl-fein {
  background-color: var(--wa-color-surface-raised);
}

.pl-fein summary {
  font-size: var(--wa-font-size-l);
  font-weight: var(--wa-font-weight-semibold);
}

.pl-fein__hinweis {
  margin: 0 0 var(--wa-space-m);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}
</style>

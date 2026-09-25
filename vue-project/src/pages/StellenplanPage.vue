<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import { KATEGORIE_FARBEN, POL_FARBEN } from '@/charts/echartsTheme'
import { euro, euroKurz, vzae } from '@/charts/format'
import daten from '@/data/stellenplan.json'
import { TARIF_QUELLEN } from '@/data/tvoed'
import { grundOhneBewertung, jahresentgelt, schaetzung } from '@/lib/entgelt'

type Ansicht = 'map' | 'rank' | 'change'
type Stelle = {
  code: string
  name: string
  year: string
  total: number
  grades: Record<string, number>
}
const stellen: Stelle[] = daten.rows.map((row) => {
  const grades: Record<string, number> = {}
  for (const [key, value] of Object.entries(row.grades)) {
    if (typeof value === 'number') grades[key] = value
  }
  return { ...row, grades }
})
const jahr = ref('2026')
const bereich = ref('all')
const ansicht = ref<Ansicht>('map')
const auswahl = ref('0601')
const stufe = ref(3)
const ansichten: { id: Ansicht; name: string }[] = [
  { id: 'map', name: 'Stellenlandschaft' },
  { id: 'rank', name: 'Rangliste' },
  { id: 'change', name: 'Veränderungen' },
]
const index = new Map(stellen.map((r) => [`${r.year}:${r.code}`, r]))
const differenz = (code: string) =>
  Math.round(
    ((index.get(`2027:${code}`)?.total ?? 0) - (index.get(`2026:${code}`)?.total ?? 0)) * 100,
  ) / 100
const vorzeichen = (wert: number) => `${wert > 0 ? '+' : ''}${vzae(wert)}`
const auswahlZeilen = computed(() =>
  stellen.filter(
    (r) => r.year === jahr.value && (bereich.value === 'all' || r.code.startsWith(bereich.value)),
  ),
)
const sortiert = computed(() =>
  [...auswahlZeilen.value].sort((a, b) =>
    ansicht.value === 'change'
      ? Math.abs(differenz(b.code)) - Math.abs(differenz(a.code))
      : b.total - a.total,
  ),
)
const balken = computed(() =>
  [...sortiert.value]
    .filter((r) => ansicht.value !== 'change' || differenz(r.code) !== 0)
    .reverse(),
)
const aktuell = computed(() => auswahlZeilen.value.find((r) => r.code === auswahl.value))
watch(auswahlZeilen, (rows) => {
  if (!rows.some((r) => r.code === auswahl.value)) auswahl.value = rows[0]?.code ?? ''
})
const gesamt = computed(() =>
  stellen.filter((r) => r.year === jahr.value).reduce((sum, r) => sum + r.total, 0),
)
const gesamtDelta = stellen
  .filter((r) => r.year === '2027')
  .reduce((sum, r) => sum + differenz(r.code), 0)
const gruppen = computed(() =>
  Object.entries(aktuell.value?.grades ?? {})
    .filter(([, wert]) => wert > 0)
    .sort((a, b) => b[1] - a[1]),
)
const aktuelleSchaetzung = computed(() =>
  schaetzung(aktuell.value?.grades ?? {}, jahr.value, stufe.value),
)
const stadtSchaetzung = computed(() =>
  stellen
    .filter((r) => r.year === jahr.value)
    .reduce(
      (summe, r) => {
        const wert = schaetzung(r.grades, jahr.value, stufe.value)
        summe.euro += wert.euro
        summe.bewertet += wert.bewertet
        summe.unbewertet += wert.unbewertet
        return summe
      },
      { euro: 0, bewertet: 0, unbewertet: 0 },
    ),
)
const bewertungsquote = computed(() => {
  const summe = stadtSchaetzung.value.bewertet + stadtSchaetzung.value.unbewertet
  return summe === 0 ? 0 : (stadtSchaetzung.value.bewertet / summe) * 100
})
const gruppenJahresentgelt = (key: string, value: number) => {
  const betrag = jahresentgelt(key, jahr.value, stufe.value)
  return betrag == null ? null : betrag * value
}
const gruppenName = (key: string) =>
  key
    .replace('Beamte_', '')
    .replace('Tarif_', '')
    .replace('_LG2E2', ' (LG 2.2)')
    .replace('_LG2E1', ' (LG 2.1)')
    .replace('TVOEDFEST', 'TVöD fest')
const quelle = 'Haushaltsplan 2026/27, Band 2 · Stellenplan nach Besoldungsgruppen'
const titel = computed(() =>
  ansicht.value === 'change'
    ? 'Wo verändert sich der Stellenplan?'
    : ansicht.value === 'rank'
      ? 'Alle Aufgabenbereiche im Vergleich'
      : 'Wo stecken die Stellen?',
)
const beschreibung = computed(() =>
  ansicht.value === 'change'
    ? '2027 minus 2026 · alle Änderungen nach Größe sortiert · Balken auswählen'
    : ansicht.value === 'rank'
      ? 'Alle Produktgruppen der Auswahl · nach Stellenumfang sortiert · Balken auswählen'
      : 'Fläche = Stellenumfang · Produktgruppe auswählen',
)
const hauptHoehe = computed(() =>
  ansicht.value === 'map' ? '480px' : `${Math.max(220, balken.value.length * 40 + 75)}px`,
)
const detailHoehe = computed(() => `${Math.max(180, gruppen.value.length * 38 + 70)}px`)
const tooltip = { renderMode: 'richText' as const, confine: true }
const hauptOption = computed<EChartsOption>(() => {
  if (ansicht.value === 'map')
    return {
      tooltip: { ...tooltip, valueFormatter: (value) => `${vzae(Number(value))} VZÄ` },
      series: [
        {
          type: 'treemap',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          left: 0,
          right: 0,
          top: 12,
          bottom: 0,
          // Eine gemeinsame Farbe statt einer wiederholten Palette für 15 Bereiche.
          color: [KATEGORIE_FARBEN[0]],
          upperLabel: { show: true, height: 26 },
          label: {
            show: true,
            overflow: 'truncate',
            formatter: (p) => `${p.name}\n${vzae(Number(p.value))}`,
          },
          levels: [
            { itemStyle: { borderWidth: 0, gapWidth: 5 } },
            { itemStyle: { borderWidth: 2, gapWidth: 2 }, upperLabel: { show: true } },
            { itemStyle: { borderWidth: 0 }, upperLabel: { show: false } },
          ],
          data: Object.entries(daten.areas)
            .map(([code, name]) => ({
              name,
              children: auswahlZeilen.value
                .filter((r) => r.code.startsWith(code))
                .map((r) => ({ name: r.name, value: r.total, code: r.code })),
            }))
            .filter((r) => r.children.length),
        },
      ],
    }
  return {
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) =>
        `${ansicht.value === 'change' ? vorzeichen(Number(value)) : vzae(Number(value))} VZÄ`,
    },
    grid: { left: 4, right: 68, top: 20, bottom: 40, containLabel: true },
    xAxis: {
      type: 'value',
      name: ansicht.value === 'change' ? 'Δ VZÄ' : 'VZÄ',
      nameLocation: 'middle',
      nameGap: 28,
    },
    yAxis: {
      type: 'category',
      data: balken.value.map((r) => `${r.code} ${r.name}`),
      axisLabel: { interval: 0, width: 125, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        label: {
          show: true,
          position: 'right',
          formatter: (p) =>
            ansicht.value === 'change' ? vorzeichen(Number(p.value)) : vzae(Number(p.value)),
        },
        data: balken.value.map((r) => ({
          value: ansicht.value === 'change' ? differenz(r.code) : r.total,
          code: r.code,
          itemStyle: {
            color:
              ansicht.value === 'change' && differenz(r.code) < 0
                ? POL_FARBEN.negativ
                : KATEGORIE_FARBEN[0],
          },
        })),
      },
    ],
  }
})
const detailOption = computed<EChartsOption>(() => {
  const rows = [...gruppen.value].reverse()
  return {
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      valueFormatter: (value) => `${vzae(Number(value))} VZÄ`,
    },
    grid: { left: 4, right: 60, top: 15, bottom: 40, containLabel: true },
    xAxis: { type: 'value', name: 'VZÄ', nameLocation: 'middle', nameGap: 28 },
    yAxis: {
      type: 'category',
      data: rows.map(([key]) => gruppenName(key)),
      axisLabel: { interval: 0 },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        label: { show: true, position: 'right', formatter: (p) => vzae(Number(p.value)) },
        data: rows.map(([key, value]) => ({
          value,
          itemStyle: {
            color: key.startsWith('Beamte_') ? KATEGORIE_FARBEN[3] : KATEGORIE_FARBEN[0],
          },
        })),
      },
    ],
  }
})
function waehlen(event: unknown) {
  if (typeof event !== 'object' || !event || !('data' in event)) return
  const data = event.data
  if (typeof data === 'object' && data && 'code' in data && typeof data.code === 'string')
    auswahl.value = data.code
}
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Stellenatlas Münster"
      beschreibung="Wo arbeitet die Stadt? Geplante Stellen nach Aufgaben und Besoldung – in Vollzeitäquivalenten (VZÄ). Der Stellenplan zeigt keine tatsächlich besetzten Stellen oder Beschäftigtenzahlen."
    />
    <div class="stellen-kennzahlen" aria-live="polite">
      <div>
        <span>Stadt insgesamt · {{ jahr }}</span
        ><strong>{{ vzae(gesamt) }} VZÄ</strong>
      </div>
      <div>
        <span>Veränderung 2026 → 2027 · Stadt insgesamt</span
        ><strong>{{ vorzeichen(gesamtDelta) }} VZÄ</strong>
      </div>
      <div><span>Aufgaben der Stadt</span><strong>63 Produktgruppen</strong></div>
    </div>
    <div class="stellen-filter">
      <div class="stellen-ansichten" role="group" aria-label="Darstellung">
        <button
          v-for="view in ansichten"
          :key="view.id"
          type="button"
          :aria-pressed="ansicht === view.id"
          @click="ansicht = view.id"
        >
          {{ view.name }}
        </button>
      </div>
      <label
        >Planjahr<select v-model="jahr">
          <option>2026</option>
          <option>2027</option>
        </select></label
      >
      <label
        >Produktbereich<select v-model="bereich">
          <option value="all">Alle Produktbereiche</option>
          <option v-for="(name, code) in daten.areas" :key="code" :value="code">{{ name }}</option>
        </select></label
      >
    </div>
    <div class="stellen-layout">
      <ChartCard :titel="titel" :beschreibung="beschreibung" :quelle="quelle">
        <p v-if="ansicht === 'change' && !balken.length" role="status">
          In diesem Produktbereich ändert sich die Gesamtstellenzahl keiner Produktgruppe.
        </p>
        <BaseChart
          v-else
          :key="ansicht"
          :option="hauptOption"
          :hoehe="hauptHoehe"
          @chart-click="waehlen"
        />
        <details>
          <summary>Alle Werte als Tabelle</summary>
          <table>
            <caption class="sr-only">
              {{
                titel
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">Produktgruppe</th>
                <th scope="col">{{ ansicht === 'change' ? 'Δ VZÄ' : 'VZÄ' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sortiert" :key="row.code">
                <td>
                  <button type="button" class="stellen-textbutton" @click="auswahl = row.code">
                    {{ row.code }} · {{ row.name }}
                  </button>
                </td>
                <td>
                  {{ ansicht === 'change' ? vorzeichen(differenz(row.code)) : vzae(row.total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </details>
      </ChartCard>
      <ChartCard
        titel="Im Detail"
        beschreibung="Alle Entgelt- und Besoldungsgruppen mit Stellenanteilen in der Auswahl."
        :quelle="quelle"
      >
        <label
          >Produktgruppe<select v-model="auswahl">
            <option v-for="row in auswahlZeilen" :key="row.code" :value="row.code">
              {{ row.code }} · {{ row.name }}
            </option>
          </select></label
        >
        <div v-if="aktuell" aria-live="polite">
          <h3>{{ aktuell.name }}</h3>
          <p class="stellen-detailzahl">{{ vzae(aktuell.total) }} VZÄ · {{ jahr }}</p>
          <p>{{ vorzeichen(differenz(aktuell.code)) }} VZÄ von 2026 auf 2027</p>
        </div>
        <div class="stellen-legende">
          <span><i :style="{ background: KATEGORIE_FARBEN[0] }"></i>Tarifbeschäftigte</span
          ><span><i :style="{ background: KATEGORIE_FARBEN[3] }"></i>Beamtinnen / Beamte</span>
        </div>
        <BaseChart :option="detailOption" :hoehe="detailHoehe" />
        <details>
          <summary>Besoldungsgruppen als Tabelle</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">Gruppe</th>
                <th scope="col">VZÄ</th>
                <th scope="col">Tabellenentgelt/Jahr · Stufe {{ stufe }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="[key, value] in gruppen" :key="key">
                <td>{{ gruppenName(key) }}</td>
                <td>{{ vzae(value) }}</td>
                <td>
                  <template v-if="gruppenJahresentgelt(key, value) != null">
                    {{ euro(gruppenJahresentgelt(key, value)!) }}
                  </template>
                  <span v-else class="stellen-leise">{{ grundOhneBewertung(key, stufe) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </details>
      </ChartCard>
    </div>
    <ChartCard
      titel="Geschätztes TVöD-Tabellenentgelt"
      beschreibung="Szenario bei vollständiger Besetzung der Planstellen und gleicher Erfahrungsstufe für alle Tarifbeschäftigten."
      quelle="VKA-Entgelttabellen, Tarifstand ab 1. Mai 2026"
    >
      <div class="entgelt-kopf">
        <label class="entgelt-stufe"
          >Angenommene Erfahrungsstufe
          <select v-model.number="stufe">
            <option v-for="nr in 6" :key="nr" :value="nr">Stufe {{ nr }}</option>
          </select>
        </label>
        <p>
          2026 wird monatsgenau mit vier Monaten des vorherigen und acht Monaten des neuen
          Tarifstands berechnet. Für 2027 wird der Stand ab Mai 2026 unverändert fortgeschrieben.
        </p>
      </div>
      <div class="entgelt-kennzahlen" aria-live="polite">
        <div>
          <span>Stadt insgesamt · {{ jahr }}</span>
          <strong>{{ euroKurz(stadtSchaetzung.euro) }}</strong>
          <small>{{ vzae(stadtSchaetzung.bewertet) }} bewertete VZÄ</small>
        </div>
        <div>
          <span>Ausgewählte Produktgruppe</span>
          <strong>{{ euroKurz(aktuelleSchaetzung.euro) }}</strong>
          <small v-if="aktuell">{{ aktuell.code }} · {{ aktuell.name }}</small>
        </div>
        <div>
          <span>Abdeckung der Stellen</span>
          <strong>{{ vzae(bewertungsquote) }} %</strong>
          <small>{{ vzae(stadtSchaetzung.unbewertet) }} VZÄ nicht bewertet</small>
        </div>
      </div>
      <p class="stellen-hinweis">
        Enthalten ist nur das monatliche Tabellenentgelt × 12 beziehungsweise der monatsgenaue
        Tarifwechsel 2026. Jahressonderzahlung, Zulagen, Zuschläge, Arbeitgeberanteile und
        Versorgungskosten sind nicht enthalten. Beamtenstellen, TVöD-Festentgelte und S10 bleiben
        unbewertet; in Stufe 1 zusätzlich P7–P9, da dort keine Tabellenwerte vorliegen.
      </p>
      <details>
        <summary>Tarifquellen</summary>
        <ul>
          <li v-for="tarifquelle in TARIF_QUELLEN" :key="tarifquelle.url">
            <a :href="tarifquelle.url" target="_blank" rel="noopener noreferrer">
              {{ tarifquelle.name }}
            </a>
          </li>
        </ul>
      </details>
    </ChartCard>
    <p class="stellen-hinweis">
      Die Summen werden aus den Besoldungsgruppen berechnet. Gegenüber der separaten
      Stellenübersicht ergeben sich kleine Abweichungen (2026: 0,06 VZÄ; 2027: 0,07 VZÄ), die noch
      am Originalplan geprüft werden müssen.
    </p>
  </div>
</template>

<style scoped>
.stellen-kennzahlen {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wa-space-xl);
}
.stellen-kennzahlen > div {
  flex: 1;
  min-width: 12rem;
}
.stellen-kennzahlen span,
.stellen-kennzahlen strong {
  display: block;
}
.stellen-kennzahlen span,
.stellen-hinweis {
  color: var(--wa-color-text-quiet);
}
.stellen-kennzahlen strong,
.stellen-detailzahl {
  font-size: var(--wa-font-size-xl);
  font-variant-numeric: tabular-nums;
}
.stellen-filter,
.stellen-ansichten {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--wa-space-s);
}
.stellen-filter {
  flex-wrap: nowrap;
}
.stellen-filter .stellen-ansichten {
  flex: 1 1 auto;
}
.stellen-filter > label {
  flex: 0 1 auto;
  width: auto;
}
.stellen-filter > label:last-child {
  width: min(22rem, 36vw);
}
label {
  display: grid;
  gap: var(--wa-space-2xs);
  min-width: 0;
  max-width: 100%;
}
select,
button {
  font: inherit;
  color: inherit;
  background: var(--wa-color-surface-default);
  border: 1px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-m);
  padding: var(--wa-space-s);
  min-height: 44px;
  max-width: 100%;
}
select {
  width: 100%;
}
button {
  cursor: pointer;
}
button[aria-pressed='true'] {
  background: var(--wa-color-brand-fill-loud);
  color: var(--wa-color-brand-on-loud);
}
.stellen-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: var(--wa-space-l);
  align-items: start;
}
.stellen-layout > * {
  min-width: 0;
}
h3 {
  overflow-wrap: anywhere;
  font-size: var(--wa-font-size-m);
}
.stellen-legende {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wa-space-s);
  font-size: var(--wa-font-size-s);
}
.stellen-legende i {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  margin-right: 0.35rem;
  border-radius: 50%;
}
summary {
  cursor: pointer;
  padding-block: var(--wa-space-s);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--wa-font-size-s);
}
th,
td {
  text-align: left;
  padding-block: var(--wa-space-s);
  border-bottom: 1px solid var(--wa-color-surface-border);
  overflow-wrap: anywhere;
}
th:last-child,
td:last-child {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.stellen-textbutton {
  text-align: left;
  border: 0;
  padding: 0;
  color: var(--wa-color-text-link);
}
.stellen-leise,
.entgelt-kopf p,
.entgelt-kennzahlen small {
  color: var(--wa-color-text-quiet);
}
.entgelt-kopf {
  display: flex;
  align-items: end;
  gap: var(--wa-space-l);
  margin-bottom: var(--wa-space-l);
}
.entgelt-kopf p {
  max-width: var(--mm-lesebreite);
  margin: 0;
}
.entgelt-stufe {
  flex: 0 0 15rem;
  width: 15rem;
}
.entgelt-kennzahlen {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--wa-space-l);
}
.entgelt-kennzahlen span,
.entgelt-kennzahlen strong,
.entgelt-kennzahlen small {
  display: block;
}
.entgelt-kennzahlen strong {
  font-size: var(--wa-font-size-xl);
  font-variant-numeric: tabular-nums;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
@media (max-width: 850px) {
  .stellen-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .stellen-filter {
    flex-wrap: wrap;
  }
  .stellen-filter > label,
  .stellen-filter > label:last-child {
    flex: 1 1 12rem;
    width: auto;
  }
  .entgelt-kopf {
    align-items: stretch;
    flex-direction: column;
  }
  .entgelt-stufe {
    flex-basis: auto;
    width: min(100%, 15rem);
  }
  .entgelt-kennzahlen {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

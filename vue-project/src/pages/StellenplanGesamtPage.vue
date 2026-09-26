<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import PageIntro from '@/components/ui/PageIntro.vue'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'
import { KATEGORIE_FARBEN } from '@/charts/echartsTheme'
import { euroKurz, vzae } from '@/charts/format'
import daten from '@/data/stellenplan.json'
import { schaetzung } from '@/lib/entgelt'

const ICICLE_BLAU = KATEGORIE_FARBEN[0]

type Kennzahl = 'vzae' | 'entgelt'
type Stelle = {
  code: string
  name: string
  year: string
  total: number
  grades: Record<string, number>
}
type Gruppe = { code: string; name: string; value: number }
type Bereich = { code: string; name: string; value: number; gruppen: Gruppe[] }
type Knoten = {
  key: string
  code: string
  name: string
  value: number
  x: number
  width: number
  y: number
  height: number
  level: 'root' | 'area' | 'group'
  areaCode?: string
}

const route = useRoute()
/** Der gewählte Wert eines <wa-select>-change-Events. */
const auswahlWert = (ereignis: Event) => (ereignis.target as HTMLInputElement).value
const stellen: Stelle[] = daten.rows.map((row) => ({
  ...row,
  grades: Object.fromEntries(
    Object.entries(row.grades).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number',
    ),
  ),
}))
const jahr = ref(route.query.jahr === '2027' ? '2027' : '2026')
const kennzahl = ref<Kennzahl>(route.query.kennzahl === 'entgelt' ? 'entgelt' : 'vzae')
const stufe = ref(3)
const besoldungsStufe = ref(6)
const bereich = ref('')
const produktgruppe = ref('')
const zoom = ref(1)
const suche = ref('')

const wert = (row: Stelle) =>
  kennzahl.value === 'vzae'
    ? row.total
    : schaetzung(row.grades, row.year, stufe.value, besoldungsStufe.value).euro
const wertFormat = (value: number) =>
  kennzahl.value === 'vzae' ? `${vzae(value)} VZÄ` : euroKurz(value)
const titelName = (name: string) =>
  name
    .toLocaleLowerCase('de-DE')
    .replace(/(^|[\s/-])\p{L}/gu, (treffer) => treffer.toLocaleUpperCase('de-DE'))

const bereiche = computed<Bereich[]>(() =>
  Object.entries(daten.areas)
    .map(([code, name]) => {
      const gruppen = stellen
        .filter((row) => row.year === jahr.value && row.code.startsWith(code))
        .map((row) => ({ code: row.code, name: titelName(row.name), value: wert(row) }))
        .filter((row) => row.value > 0)
      return {
        code,
        name,
        value: gruppen.reduce((summe, gruppe) => summe + gruppe.value, 0),
        gruppen,
      }
    })
    .filter((row) => row.value > 0),
)
const aktuellerBereich = computed(() => bereiche.value.find((row) => row.code === bereich.value))
const aktuelleGruppe = computed(() =>
  bereiche.value.flatMap((row) => row.gruppen).find((row) => row.code === produktgruppe.value),
)
const gesamt = computed(() => bereiche.value.reduce((summe, row) => summe + row.value, 0))
const diagrammHoehe = computed(() => (bereich.value ? 430 : 500))

const knoten = computed<Knoten[]>(() => {
  const result: Knoten[] = []
  const sichtbar = aktuellerBereich.value ? [aktuellerBereich.value] : bereiche.value
  const summe = sichtbar.reduce((wert, row) => wert + row.value, 0)
  result.push({
    key: 'root',
    code: '',
    name: aktuellerBereich.value?.name ?? 'Stadt Münster',
    value: summe,
    x: 0,
    width: 1000,
    y: 0,
    height: 72,
    level: 'root',
  })

  let x = 0
  for (const area of sichtbar) {
    const breite = (area.value / summe) * 1000
    if (!aktuellerBereich.value) {
      result.push({
        key: `area-${area.code}`,
        code: area.code,
        name: area.name,
        value: area.value,
        x,
        width: breite,
        y: 72,
        height: 170,
        level: 'area',
      })
    }
    let gruppenX = x
    for (const gruppe of area.gruppen) {
      const gruppenBreite = (gruppe.value / summe) * 1000
      result.push({
        key: `group-${gruppe.code}`,
        code: gruppe.code,
        name: gruppe.name,
        value: gruppe.value,
        x: gruppenX,
        width: gruppenBreite,
        y: aktuellerBereich.value ? 72 : 242,
        height: aktuellerBereich.value ? 350 : 250,
        level: 'group',
        areaCode: area.code,
      })
      gruppenX += gruppenBreite
    }
    x += breite
  }
  return result
})

const alleSuchtreffer = computed(() => {
  const query = suche.value.trim().toLocaleLowerCase('de-DE')
  if (!query) return []
  return bereiche.value
    .flatMap((area) =>
      area.gruppen.map((gruppe) => ({ ...gruppe, areaCode: area.code, areaName: area.name })),
    )
    .filter((row) => `${row.code} ${row.name}`.toLocaleLowerCase('de-DE').includes(query))
})
const suchtreffer = computed(() => alleSuchtreffer.value.slice(0, 8))

/* Kurze Ansage für Screenreader, wie viele Produktgruppen die Suche findet.
   Entprellt, damit nicht jeder Tastendruck angesagt wird. */
const trefferMeldung = ref('')
let meldungsTimer: ReturnType<typeof setTimeout> | undefined
watch(alleSuchtreffer, (treffer) => {
  clearTimeout(meldungsTimer)
  meldungsTimer = setTimeout(() => {
    if (!suche.value.trim()) trefferMeldung.value = ''
    else if (!treffer.length) trefferMeldung.value = 'Keine Treffer'
    else if (treffer.length > suchtreffer.value.length)
      trefferMeldung.value = `${treffer.length} Treffer, die ersten ${suchtreffer.value.length} werden angezeigt`
    else trefferMeldung.value = `${treffer.length} Treffer`
  }, 450)
})
onBeforeUnmount(() => clearTimeout(meldungsTimer))

/* Überschrift des Diagramms: Fokusziel, wenn das gewählte Element verschwindet. */
const diagrammTitel = ref<HTMLElement | null>(null)
async function fokusSichern() {
  await nextTick()
  const aktiv = document.activeElement
  if (!aktiv || aktiv === document.body || !aktiv.isConnected) diagrammTitel.value?.focus()
}

function beschriften(name: string, width: number) {
  const laenge = Math.max(3, Math.floor(width / 7.4))
  return name.length > laenge ? `${name.slice(0, Math.max(2, laenge - 1))}…` : name
}
function knotenWaehlen(knoten: Knoten) {
  if (knoten.level === 'root') return
  if (knoten.level === 'area') {
    bereich.value = knoten.code
    produktgruppe.value = ''
    zoom.value = 1
  } else if (knoten.level === 'group') {
    if (!bereich.value && knoten.areaCode) bereich.value = knoten.areaCode
    produktgruppe.value = knoten.code
    zoom.value = 1
  }
  // Die Bereichsknoten verschwinden beim Aufzoomen – dann Fokus auf die Überschrift.
  void fokusSichern()
}
async function gruppeWaehlen(code: string, areaCode: string) {
  bereich.value = areaCode
  produktgruppe.value = code
  suche.value = ''
  zoom.value = 1
  // Die Trefferliste verschwindet mit dem geleerten Suchfeld.
  await nextTick()
  diagrammTitel.value?.focus()
}
function zuruecksetzen() {
  bereich.value = ''
  produktgruppe.value = ''
  zoom.value = 1
}
</script>

<template>
  <div class="mm-seite icicle-seite">
    <RouterLink class="icicle-zurueck" :to="{ name: 'stellenplan', query: { jahr, kennzahl } }">
      <span aria-hidden="true">←</span> Zurück zum Stellenatlas
    </RouterLink>
    <PageIntro
      titel="Gesamtübersicht Stellenplan"
      beschreibung="Das Icicle-Diagramm zeigt die vollständige Hierarchie von der Stadt über die Themenbereiche bis zu den Produktgruppen. Die Breite entspricht dem Stellenumfang."
    />

    <div class="icicle-filter">
      <div role="group" aria-label="Kennzahl">
        <button type="button" :aria-pressed="kennzahl === 'vzae'" @click="kennzahl = 'vzae'">
          VZÄ
        </button>
        <button type="button" :aria-pressed="kennzahl === 'entgelt'" @click="kennzahl = 'entgelt'">
          Gehaltskosten
        </button>
      </div>
      <wa-select label="Planjahr" :value="jahr" @change="jahr = auswahlWert($event)">
        <wa-option value="2026">2026</wa-option>
        <wa-option value="2027">2027</wa-option>
      </wa-select>
      <label class="icicle-suche"
        >Produktgruppe suchen<input v-model="suche" type="search" placeholder="Code oder Name"
      /></label>
    </div>
    <div v-if="kennzahl === 'entgelt'" class="icicle-stufen">
      <wa-select
        label="TVöD-Stufe"
        :value="String(stufe)"
        @change="stufe = Number(auswahlWert($event))"
      >
        <wa-option v-for="nr in 6" :key="nr" :value="String(nr)">Stufe {{ nr }}</wa-option>
      </wa-select>
      <wa-select
        label="Besoldungsstufe"
        :value="String(besoldungsStufe)"
        @change="besoldungsStufe = Number(auswahlWert($event))"
      >
        <wa-option v-for="nr in 10" :key="nr + 2" :value="String(nr + 2)">
          Stufe {{ nr + 2 }}
        </wa-option>
      </wa-select>
    </div>
    <p class="mm-visually-hidden" role="status">{{ trefferMeldung }}</p>
    <ul v-if="suchtreffer.length" class="icicle-treffer" aria-label="Suchergebnisse">
      <li v-for="row in suchtreffer" :key="row.code">
        <button type="button" @click="gruppeWaehlen(row.code, row.areaCode)">
          <span>{{ row.code }} · {{ row.name }}</span
          ><small>{{ row.areaName }} · {{ wertFormat(row.value) }}</small>
        </button>
      </li>
    </ul>

    <section class="icicle-karte" aria-labelledby="icicle-titel">
      <div class="icicle-kopf">
        <div>
          <h2 id="icicle-titel" ref="diagrammTitel" tabindex="-1">
            {{ aktuellerBereich?.name ?? 'Stadt Münster' }}
          </h2>
          <p>{{ wertFormat(aktuellerBereich?.value ?? gesamt) }} · {{ jahr }}</p>
        </div>
        <div class="icicle-zoom" role="group" aria-label="Diagrammgröße">
          <button
            type="button"
            aria-label="Verkleinern"
            :disabled="zoom <= 1"
            @click="zoom = Math.max(1, zoom - 0.5)"
          >
            −
          </button>
          <button type="button" @click="zoom = 1">Zurücksetzen</button>
          <button
            type="button"
            aria-label="Vergrößern"
            :disabled="zoom >= 2.5"
            @click="zoom = Math.min(2.5, zoom + 0.5)"
          >
            +
          </button>
        </div>
      </div>
      <nav class="icicle-pfad" aria-label="Diagrammpfad">
        <button
          type="button"
          :aria-current="bereich ? undefined : 'location'"
          @click="zuruecksetzen"
        >
          Stadt Münster
        </button>
        <template v-if="aktuellerBereich"
          ><span aria-hidden="true">›</span
          ><strong aria-current="location">{{ aktuellerBereich.name }}</strong></template
        >
      </nav>
      <p class="icicle-anleitung">
        Themenbereich auswählen, um seine Produktgruppen über die volle Breite aufzufächern.
      </p>
      <div
        class="icicle-scroll"
        role="region"
        tabindex="0"
        aria-label="Icicle-Diagramm, horizontal scrollbar"
      >
        <svg
          class="icicle-diagramm"
          :class="{ 'icicle-diagramm--gesamt': !bereich }"
          :style="{ width: `${zoom * 100}%` }"
          :viewBox="`0 0 1000 ${diagrammHoehe}`"
          role="group"
          :aria-label="`Hierarchie des Stellenplans ${jahr}: ${aktuellerBereich?.name ?? 'Stadt Münster'}, ${wertFormat(aktuellerBereich?.value ?? gesamt)}`"
        >
          <g
            v-for="node in knoten"
            :key="node.key"
            class="icicle-knoten"
            :class="[
              `icicle-knoten--${node.level}`,
              {
                'icicle-knoten--aktiv': node.level === 'group' && node.code === produktgruppe,
              },
            ]"
            :tabindex="node.level === 'root' ? undefined : 0"
            :role="node.level === 'root' ? undefined : 'button'"
            :aria-label="
              node.level === 'root' ? undefined : `${node.name}: ${wertFormat(node.value)}`
            "
            :aria-current="
              node.level === 'group' && node.code === produktgruppe ? 'true' : undefined
            "
            @click="knotenWaehlen(node)"
            @keydown.enter.prevent="knotenWaehlen(node)"
            @keydown.space.prevent="knotenWaehlen(node)"
          >
            <title>{{ node.name }}: {{ wertFormat(node.value) }}</title>
            <rect
              :x="node.x + 1"
              :y="node.y + 1"
              :width="Math.max(0, node.width - 2)"
              :height="node.height - 2"
              rx="3"
            />
            <text v-if="node.level === 'root'" :x="node.x + 7" :y="node.y + 22">
              <tspan>
                {{ beschriften(node.name, node.width - 12) }}
              </tspan>
              <tspan :x="node.x + 7" dy="18">
                {{ wertFormat(node.value) }}
              </tspan>
            </text>
            <text
              v-else-if="node.width > 14"
              :x="node.x + node.width / 2"
              :y="node.y + 8"
              :transform="`rotate(90 ${node.x + node.width / 2} ${node.y + 8})`"
            >
              <tspan>{{ beschriften(node.name, node.height - 28) }}</tspan>
              <tspan v-if="node.width > 38" :x="node.x + node.width / 2" dy="18">
                {{ wertFormat(node.value) }}
              </tspan>
            </text>
          </g>
        </svg>
      </div>
      <!-- Live-Region bleibt im DOM, nur ihr Inhalt wechselt. -->
      <div aria-live="polite">
        <div v-if="aktuelleGruppe" class="icicle-detail">
          <span>Ausgewählte Produktgruppe</span>
          <strong>{{ aktuelleGruppe.code }} · {{ aktuelleGruppe.name }}</strong>
          <b>{{ wertFormat(aktuelleGruppe.value) }}</b>
        </div>
      </div>
    </section>

    <details>
      <summary>Gesamtübersicht als Tabelle</summary>
      <DatenTabelle :beschriftung="`Stellenplan ${jahr} nach Themenbereichen und Produktgruppen`">
        <thead>
          <tr>
            <th scope="col">Themenbereich / Produktgruppe</th>
            <th scope="col" class="mm-zahl">
              {{ kennzahl === 'vzae' ? 'VZÄ' : 'Tabellenentgelt/Jahr' }}
            </th>
          </tr>
        </thead>
        <tbody v-for="area in bereiche" :key="area.code">
          <tr class="icicle-tabellenbereich">
            <th scope="row">{{ area.code }} · {{ area.name }}</th>
            <td class="mm-zahl">{{ wertFormat(area.value) }}</td>
          </tr>
          <tr v-for="gruppe in area.gruppen" :key="gruppe.code" class="icicle-tabellengruppe">
            <th scope="row">{{ gruppe.code }} · {{ gruppe.name }}</th>
            <td class="mm-zahl">{{ wertFormat(gruppe.value) }}</td>
          </tr>
        </tbody>
      </DatenTabelle>
    </details>
  </div>
</template>

<style scoped>
.icicle-zurueck {
  color: var(--wa-color-text-link);
  width: fit-content;
}
.icicle-filter,
.icicle-filter > div,
.icicle-stufen {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--wa-space-s);
}
.icicle-filter > div {
  flex: 0 0 auto;
}
.icicle-filter label,
.icicle-filter > wa-select {
  width: 10rem;
}
.icicle-filter .icicle-suche {
  flex: 1 1 16rem;
  width: auto;
}
.icicle-stufen > wa-select {
  width: 11rem;
}
label {
  display: grid;
  gap: var(--wa-space-2xs);
}
button,
input {
  min-height: 44px;
  padding: var(--wa-space-s);
  border: 1px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-m);
  background: var(--wa-color-surface-default);
  color: inherit;
  font: inherit;
}
button {
  cursor: pointer;
}
/* Ausgewählter Filter: leicht orange hinterlegt statt vollflächig laut. */
button[aria-pressed='true'] {
  background: var(--mm-auswahl-flaeche);
  border-color: var(--mm-auswahl-rand);
  color: var(--mm-auswahl-text);
  font-weight: var(--wa-font-weight-semibold);
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.icicle-treffer {
  display: grid;
  gap: var(--wa-space-2xs);
  margin: calc(-1 * var(--wa-space-xl)) 0 0;
  padding: var(--wa-space-s);
  list-style: none;
  border: 1px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-m);
  background: var(--wa-color-surface-default);
}
.icicle-treffer button {
  display: grid;
  width: 100%;
  text-align: left;
  border: 0;
}
.icicle-treffer small {
  color: var(--wa-color-text-quiet);
}
.icicle-karte {
  padding: var(--wa-space-l);
  border: 1px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-l);
  background: var(--wa-color-surface-default);
}
.icicle-kopf {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--wa-space-l);
}
.icicle-kopf h2,
.icicle-kopf p {
  margin: 0;
}
.icicle-kopf p,
.icicle-anleitung {
  color: var(--wa-color-text-quiet);
}
.icicle-zoom {
  display: flex;
  gap: var(--wa-space-2xs);
}
.icicle-pfad {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--wa-space-xs);
  margin-top: var(--wa-space-m);
}
.icicle-pfad button {
  min-height: 36px;
  padding: var(--wa-space-xs) var(--wa-space-s);
  color: var(--wa-color-text-link);
}
.icicle-anleitung {
  margin: var(--wa-space-s) 0;
  font-size: var(--wa-font-size-s);
}
.icicle-scroll {
  max-width: 100%;
  overflow-x: auto;
  border-radius: var(--wa-border-radius-m);
}
.icicle-diagramm {
  display: block;
  min-width: 100%;
  height: auto;
}
.icicle-knoten {
  cursor: pointer;
}
/* Der Fokus wird über eine dunkle Kontur am Rechteck gezeigt (siehe unten). */
.icicle-knoten:focus {
  outline: none;
}
.icicle-knoten rect {
  stroke: #fff;
  stroke-width: 2;
  fill: color-mix(in srgb, v-bind(ICICLE_BLAU) 76%, white);
}
.icicle-knoten--root {
  cursor: default;
}
.icicle-knoten--root rect {
  fill: #31333d;
}
.icicle-knoten--area rect {
  fill: v-bind(ICICLE_BLAU);
}
.icicle-knoten--group rect {
  fill: #9dbeec;
}
/* Hover und Auswahl: orange Kontur; die Auswahl zusätzlich mit dickerer Kontur
   und fetter Beschriftung, damit sie nicht nur über die Farbe erkennbar ist. */
.icicle-knoten:not(.icicle-knoten--root):hover rect {
  stroke: var(--mm-princeton-orange);
  stroke-width: 4;
}
.icicle-knoten--aktiv rect {
  stroke: var(--mm-princeton-orange);
  stroke-width: 7;
}
.icicle-knoten--aktiv text {
  font-weight: 700;
}
/* Tastaturfokus: dunkle Kontur, auf allen Füllfarben mindestens 3:1. */
.icicle-knoten:focus-visible rect {
  stroke: var(--mm-deep-twilight);
  stroke-width: 3;
}
.icicle-knoten--aktiv:focus-visible rect {
  stroke-width: 5;
  stroke-dasharray: 8 3;
}
.icicle-knoten text {
  pointer-events: none;
  fill: #1f2937;
  font:
    14px system-ui,
    sans-serif;
}
.icicle-knoten--root text,
.icicle-knoten--area text {
  fill: #fff;
  font-weight: 650;
}
.icicle-detail {
  display: grid;
  gap: var(--wa-space-2xs);
  margin-top: var(--wa-space-m);
  padding: var(--wa-space-m);
  border-left: 4px solid var(--mm-princeton-orange);
  background: var(--wa-color-brand-fill-quiet);
}
.icicle-detail span {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}
.icicle-tabellenbereich {
  background: var(--wa-color-brand-fill-quiet);
}
/* Produktgruppen eingerückt unter ihrem Themenbereich. */
tbody tr.icicle-tabellengruppe > th[scope='row'] {
  padding-left: var(--wa-space-xl);
}
summary {
  cursor: pointer;
  padding-block: var(--wa-space-s);
}
@media (max-width: 700px) {
  .icicle-kopf {
    align-items: stretch;
    flex-direction: column;
  }
  .icicle-zoom button:nth-child(2) {
    flex: 1;
  }
  .icicle-diagramm--gesamt {
    min-width: 56rem;
  }
  .icicle-filter label,
  .icicle-filter .icicle-suche {
    flex: 1 1 100%;
    width: 100%;
  }
}
</style>

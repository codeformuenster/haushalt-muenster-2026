<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import { euro, euroKurz } from '@/charts/format'
import {
  faktor,
  naechsterPosten,
  posten2026,
  startPosten,
  type Posten,
} from '@/lib/mehrOderWeniger'

type Phase = 'frage' | 'aufloesung' | 'ende'
type Tipp = 'mehr' | 'weniger'

const REKORD_KEY = 'mm-mehr-oder-weniger-rekord'

/** localStorage kann fehlen oder gesperrt sein – dann gibt es eben keinen Rekord. */
function ladeRekord(): number {
  try {
    return Number(localStorage.getItem(REKORD_KEY)) || 0
  } catch {
    return 0
  }
}

function speichereRekord(wert: number): void {
  try {
    localStorage.setItem(REKORD_KEY, String(wert))
  } catch {
    // Ohne Speicher gilt der Rekord nur bis zum Neuladen.
  }
}

const pool = posten2026()

const links = ref<Posten | null>(null)
const rechts = ref<Posten | null>(null)
const phase = ref<Phase>('frage')
const serie = ref(0)
const rekord = ref(ladeRekord())
const letzteRichtig = ref(false)
/** Alle Posten sind durch – mehr geht nicht. */
const durchgespielt = ref(false)
let gesehen = new Set<string>()

/* Fokusziele: Die Buttons wechseln per v-if, der Fokus darf dabei nicht verloren gehen. */
const mehrButton = ref<HTMLElement | null>(null)
const weiterButton = ref<HTMLElement | null>(null)
const ergebnis = ref<HTMLElement | null>(null)

/** Nach einem Phasenwechsel den Fokus auf das passende Bedienelement setzen. */
async function fokussierePhase(): Promise<void> {
  await nextTick()
  if (phase.value === 'frage') mehrButton.value?.focus()
  else if (phase.value === 'aufloesung') weiterButton.value?.focus()
  else ergebnis.value?.focus()
}

function neuesSpiel(): void {
  gesehen = new Set()
  serie.value = 0
  durchgespielt.value = false
  links.value = startPosten(pool)
  if (links.value) gesehen.add(links.value.code)
  ziehe()
}

/** Neuen Gegner für die linke Karte ziehen; ohne Gegner endet das Spiel. */
function ziehe(): void {
  rechts.value = links.value ? naechsterPosten(links.value, pool, gesehen) : null
  if (rechts.value) {
    gesehen.add(rechts.value.code)
    phase.value = 'frage'
  } else {
    durchgespielt.value = true
    phase.value = 'ende'
  }
}

function antworten(tipp: Tipp): void {
  if (!links.value || !rechts.value || phase.value !== 'frage') return
  const istMehr = rechts.value.bedarf > links.value.bedarf
  letzteRichtig.value = (tipp === 'mehr') === istMehr
  if (letzteRichtig.value) {
    serie.value += 1
    if (serie.value > rekord.value) {
      rekord.value = serie.value
      speichereRekord(rekord.value)
    }
  }
  phase.value = 'aufloesung'
  fokussierePhase()
}

function weiter(): void {
  if (!letzteRichtig.value) {
    phase.value = 'ende'
  } else {
    links.value = rechts.value
    ziehe()
  }
  fokussierePhase()
}

function nochmal(): void {
  neuesSpiel()
  fokussierePhase()
}

const frageText = computed(() => {
  if (!links.value || !rechts.value) return ''
  return `Kostet „${rechts.value.bezeichnung}“ mehr oder weniger als „${links.value.bezeichnung}“ mit ${euro(links.value.bedarf)}?`
})

const aufloesungText = computed(() => {
  if (!links.value || !rechts.value) return ''
  const teurer = rechts.value.bedarf > links.value.bedarf ? rechts.value : links.value
  return `${teurer.bezeichnung} kostet ${faktor(links.value.bedarf, rechts.value.bedarf)}.`
})

const neuerRekord = computed(() => serie.value > 0 && serie.value === rekord.value)

/** Text der Live-Region: neue Frage, Auflösung mit Serie, Spielende. */
const ansage = computed(() => {
  if (phase.value === 'frage') return frageText.value
  if (phase.value === 'aufloesung') {
    return letzteRichtig.value
      ? `Richtig. ${aufloesungText.value} Serie: ${serie.value}.`
      : `Leider nein. ${aufloesungText.value} Ihre Serie endet bei ${serie.value}.`
  }
  return `Spiel vorbei. Serie: ${serie.value}.`
})

neuesSpiel()
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Mehr oder weniger?"
      beschreibung="Was kostet die Stadt mehr? Links sehen Sie, wie viel eine Aufgabe 2026 aus allgemeinen Mitteln wie Steuern braucht. Schätzen Sie, ob die Aufgabe rechts mehr oder weniger kostet – wie lange hält Ihre Serie?"
    />

    <ChartCard
      :titel="phase === 'ende' ? 'Auswertung' : `Serie: ${serie}`"
      :beschreibung="`Ihr Rekord: ${rekord}`"
      quelle="Haushaltsplan 2026/27, Gesamtübersicht der Erträge und Aufwendungen"
    >
      <template v-if="phase !== 'ende' && links && rechts">
        <div class="duell">
          <div class="karte">
            <span class="karte__bereich">{{ links.bereich }}</span>
            <strong class="karte__name">{{ links.bezeichnung }}</strong>
            <span class="karte__betrag" :title="euro(links.bedarf)"
              ><span aria-hidden="true">{{ euroKurz(links.bedarf) }}</span
              ><span class="mm-visually-hidden">{{ euro(links.bedarf) }}</span></span
            >
          </div>

          <span class="duell__vs" aria-hidden="true">vs.</span>

          <div class="karte" :class="{ 'karte--verdeckt': phase === 'frage' }">
            <span class="karte__bereich">{{ rechts.bereich }}</span>
            <strong class="karte__name">{{ rechts.bezeichnung }}</strong>
            <span v-if="phase === 'frage'" class="karte__betrag"
              ><span aria-hidden="true">?</span
              ><span class="mm-visually-hidden">Betrag verdeckt</span></span
            >
            <span v-else class="karte__betrag" :title="euro(rechts.bedarf)"
              ><span aria-hidden="true">{{ euroKurz(rechts.bedarf) }}</span
              ><span class="mm-visually-hidden">{{ euro(rechts.bedarf) }}</span></span
            >
          </div>
        </div>

        <div v-if="phase === 'frage'" class="aktionen">
          <p id="mow-frage" class="mm-visually-hidden">{{ frageText }}</p>
          <wa-button
            ref="mehrButton"
            variant="brand"
            size="large"
            aria-describedby="mow-frage"
            @click="antworten('mehr')"
          >
            <wa-icon slot="start" name="arrow-up" aria-hidden="true"></wa-icon>
            Mehr
          </wa-button>
          <wa-button
            variant="brand"
            size="large"
            aria-describedby="mow-frage"
            @click="antworten('weniger')"
          >
            <wa-icon slot="start" name="arrow-down" aria-hidden="true"></wa-icon>
            Weniger
          </wa-button>
        </div>

        <div v-else class="aufloesung">
          <wa-callout :variant="letzteRichtig ? 'success' : 'danger'" appearance="outlined">
            <wa-icon
              slot="icon"
              :name="letzteRichtig ? 'check' : 'xmark'"
              aria-hidden="true"
            ></wa-icon>
            <strong>{{ letzteRichtig ? 'Richtig!' : 'Leider nein.' }}</strong>
            {{ aufloesungText }}
          </wa-callout>
          <wa-button ref="weiterButton" variant="brand" size="large" @click="weiter">
            {{ letzteRichtig ? 'Weiter' : 'Zur Auswertung' }}
          </wa-button>
        </div>
      </template>

      <div v-else class="ende">
        <div ref="ergebnis" tabindex="-1">
          <p class="ende__zahl">{{ serie }}</p>
          <p>
            <template v-if="durchgespielt">
              Alle Aufgaben durchgespielt – mehr Vergleiche gibt der Haushalt nicht her.
            </template>
            <template v-else-if="serie === 1">richtige Antwort in Folge.</template>
            <template v-else>richtige Antworten in Folge.</template>
            <template v-if="neuerRekord"> Neuer Rekord!</template>
          </p>
        </div>
        <wa-button variant="brand" size="large" @click="nochmal">Nochmal spielen</wa-button>
        <p class="ende__weiter">
          Alle Beträge im Überblick:
          <RouterLink :to="{ name: 'ein-ausgaben' }">Ein- &amp; Ausgaben</RouterLink>
          ·
          <RouterLink :to="{ name: 'eine-million' }"
            >Was könnte man mit 1 Million Euro machen?</RouterLink
          >
        </p>
      </div>

      <p class="mm-visually-hidden" aria-live="polite">{{ ansage }}</p>
    </ChartCard>
  </div>
</template>

<style scoped>
.duell {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  gap: var(--wa-space-m);
}

.duell__vs {
  align-self: center;
  color: var(--wa-color-text-quiet);
  font-weight: var(--wa-font-weight-bold);
}

.karte {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-xs);
  padding: var(--wa-space-l);
  border-radius: var(--wa-border-radius-l);
  background: var(--wa-color-brand-fill-quiet);
}

.karte--verdeckt {
  background: var(--wa-color-neutral-fill-quiet);
}

.karte__bereich {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.karte__name {
  font-size: var(--wa-font-size-l);
  line-height: 1.3;
}

.karte__betrag {
  margin-top: auto;
  font-size: var(--wa-font-size-2xl);
  font-weight: var(--wa-font-weight-bold);
  font-variant-numeric: tabular-nums;
}

.aktionen,
.aufloesung {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--wa-space-m);
  margin-top: var(--wa-space-l);
}

.aufloesung wa-callout {
  flex: 1 1 100%;
}

.ende {
  text-align: center;
}

.ende__zahl {
  margin: 0;
  font-size: var(--wa-font-size-4xl);
  font-weight: var(--wa-font-weight-bold);
}

.ende__weiter {
  margin-top: var(--wa-space-l);
  color: var(--wa-color-text-quiet);
}

@media (max-width: 600px) {
  .duell {
    grid-template-columns: 1fr;
  }
}
</style>

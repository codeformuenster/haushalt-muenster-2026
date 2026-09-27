<script setup lang="ts">
/**
 * Name einer Produktgruppe im Spiel „Mehr oder weniger?“, klickbar wie ein
 * Fachwort (<GlossarBegriff>). Das Fenster erklärt kurz, was in der Gruppe
 * steckt, und verlinkt auf ihren Eintrag im Glossar (/glossar#pg-<Code>).
 *
 * Solange `aufgedeckt` falsch ist, zeigt das Fenster nichts, was den Betrag
 * verrät: keine Summen, keine Hinweise auf 2027, keine Besonderheiten. Erst nach
 * der Auflösung kommt der Abschnitt „Gut zu wissen“ dazu, mit Notizen aus
 * NOTIZEN, dem Betrag 2027 bei großen Sprüngen und den Besonderheiten aus dem
 * Haushaltsplan.
 *
 * Die Produkttexte (daten/produkte.json, gut 600 kB) lädt die Komponente erst
 * beim ersten Öffnen. Bis dahin oder bei einem Ladefehler stehen nur Titel,
 * Hinweise und der Glossar-Link im Fenster. Aufbau, Tastatur und Teleport wie
 * bei <GlossarBegriff>, siehe dort.
 */
import { computed, ref, shallowRef, useId } from 'vue'
import { RouterLink } from 'vue-router'
import { ladeProduktbereiche, type Produktgruppe } from '@/data/produkte'
import {
  besonderheiten,
  ersteSeite,
  gruppenBeschreibung,
  hinweis2027,
  NOTIZEN,
  type Posten,
} from '@/lib/mehrOderWeniger'

const props = defineProps<{
  posten: Posten
  /** Betrag sichtbar? Sonst keine Hinweise, die ihn verraten. */
  aufgedeckt: boolean
}>()

const knopfId = `mm-produktgruppe-${useId()}`
const offen = ref(false)
/** Alle Produktgruppen nach Code, erst nach dem ersten Öffnen gefüllt. */
const gruppen = shallowRef<Map<string, Produktgruppe> | null>(null)

const gruppe = computed(() => gruppen.value?.get(props.posten.code) ?? null)
const beschreibung = computed(() => (gruppe.value ? gruppenBeschreibung(gruppe.value) : null))
const seite = computed(() => (gruppe.value ? ersteSeite(gruppe.value) : null))

/** Inhalt von „Gut zu wissen“; leer, solange der Betrag verdeckt ist. */
const hinweise = computed(() => {
  if (!props.aufgedeckt) return { notiz: null, texte: [] }
  const notiz = NOTIZEN[props.posten.code] ?? null
  // Eine Notiz nennt den Betrag 2027 schon selbst.
  const sprung = notiz ? null : hinweis2027(props.posten)
  const texte = [...(sprung ? [sprung] : []), ...(gruppe.value ? besonderheiten(gruppe.value) : [])]
  return { notiz, texte }
})

/** Produkttexte einmal laden; ohne sie bleibt das Fenster eben knapper. */
function ladeGruppen() {
  if (gruppen.value) return
  ladeProduktbereiche()
    .then((bereiche) => {
      gruppen.value = new Map(bereiche.flatMap((b) => b.gruppen.map((g) => [g.nummer, g])))
    })
    .catch(() => {
      // Kein Fehlerhinweis: Titel und Glossar-Link reichen als Rückfall.
    })
}

/** Enter und Leertaste wirken wie bei einem echten Knopf (Leertaste ohne Scrollen). */
function tastendruck(ereignis: KeyboardEvent) {
  ereignis.preventDefault()
  if (ereignis.repeat) return
  ;(ereignis.currentTarget as HTMLElement).click()
}

/** WA-Ereignisse steigen auf; nur die des eigenen Popovers zählen. */
function umschalten(ereignis: Event, zustand: boolean) {
  if (ereignis.target !== ereignis.currentTarget) return
  offen.value = zustand
  if (zustand) ladeGruppen()
}
</script>

<template>
  <span
    :id="knopfId"
    role="button"
    tabindex="0"
    class="mm-produktgruppe"
    aria-haspopup="dialog"
    :aria-expanded="offen"
    @keydown.enter="tastendruck"
    @keydown.space="tastendruck"
    >{{ posten.bezeichnung }}</span
  >
  <Teleport to="body" defer>
    <wa-popover
      :for="knopfId"
      placement="top"
      class="mm-produktgruppe-popover"
      @wa-show="umschalten($event, true)"
      @wa-hide="umschalten($event, false)"
    >
      <span class="mm-produktgruppe__inhalt">
        <strong class="mm-produktgruppe__titel">{{ posten.bezeichnung }}</strong>

        <span class="mm-produktgruppe__text">
          <span v-if="beschreibung">{{ beschreibung.text }}</span>
          <span v-if="seite" class="mm-produktgruppe__quelle">
            {{
              beschreibung?.vereinfacht ? 'Vereinfacht nach dem Haushaltsplan' : 'Haushaltsplan'
            }}, Band 1, S. {{ seite }} (PDF)
          </span>

          <span v-if="hinweise.notiz || hinweise.texte.length" class="mm-produktgruppe__hinweise">
            <strong class="mm-produktgruppe__zwischentitel">Gut zu wissen</strong>
            <template v-if="hinweise.notiz">
              <span>{{ hinweise.notiz.text }}</span>
              <span class="mm-produktgruppe__quelle">
                Haushaltsplan Band 1, S. {{ hinweise.notiz.seite }} (PDF)
              </span>
            </template>
            <span v-for="text in hinweise.texte" :key="text">{{ text }}</span>
          </span>
        </span>

        <RouterLink
          :to="{ path: '/glossar', hash: `#pg-${posten.code}` }"
          class="mm-produktgruppe__link"
          data-popover="close"
        >
          Mehr im Glossar <wa-icon name="arrow-right" aria-hidden="true"></wa-icon>
        </RouterLink>
      </span>
    </wa-popover>
  </Teleport>
</template>

<style scoped>
/* Gleiches Aussehen wie .mm-fachwort in GlossarBegriff.vue. */
.mm-produktgruppe {
  padding: 0 0.1em;
  border-radius: var(--wa-border-radius-s);
  background-color: var(--wa-color-brand-fill-quiet);
  text-decoration: underline dotted var(--wa-color-brand-on-quiet);
  text-decoration-thickness: 0.1em;
  text-underline-offset: 0.15em;
  cursor: pointer;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

.mm-produktgruppe:hover,
.mm-produktgruppe:focus-visible,
.mm-produktgruppe[aria-expanded='true'] {
  background-color: var(--wa-color-brand-border-quiet);
}

.mm-produktgruppe:focus-visible {
  outline: var(--wa-focus-ring);
  outline-offset: var(--wa-focus-ring-offset);
}

.mm-produktgruppe-popover {
  --max-width: 20rem;
}

.mm-produktgruppe-popover::part(body) {
  padding: var(--wa-space-m);
}

.mm-produktgruppe__inhalt,
.mm-produktgruppe__text {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-xs);
}

.mm-produktgruppe__inhalt {
  font-size: var(--wa-font-size-s);
  line-height: 1.5;
}

/* Mit Notiz und Besonderheiten kann es lang werden: dann scrollt nur der
   Text, Titel und Glossar-Link bleiben stehen. */
.mm-produktgruppe__text {
  max-height: min(40vh, 24rem);
  overflow-y: auto;
}

.mm-produktgruppe__titel {
  font-size: var(--wa-font-size-m);
  font-weight: var(--wa-font-weight-semibold);
}

.mm-produktgruppe__quelle {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-xs);
}

.mm-produktgruppe__hinweise {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-xs);
  padding-top: var(--wa-space-xs);
  border-top: 1px solid var(--wa-color-surface-border);
}

.mm-produktgruppe__zwischentitel {
  font-weight: var(--wa-font-weight-semibold);
}

.mm-produktgruppe__link {
  align-self: flex-start;
  color: var(--wa-color-brand-fill-loud);
  font-weight: var(--wa-font-weight-semibold);
}

.mm-produktgruppe__link wa-icon {
  font-size: 0.85em;
}
</style>

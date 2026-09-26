<script setup lang="ts">
/**
 * Fachwort im Fließtext: farbig hinterlegt und gepunktet unterstrichen. Ein
 * Klick oder Tipp öffnet ein kleines Fenster mit der Kurzerklärung aus
 * src/data/glossar.ts und einem Link zum Eintrag auf der Glossar-Seite.
 *
 * Einbauen: <GlossarBegriff id="vzae">VZÄ</GlossarBegriff>. Ohne Inhalt steht der Begriff
 * aus dem Glossar da. Eine unbekannte ID lässt die Typprüfung scheitern.
 *
 * Regel: nur das erste Vorkommen eines Begriffs je Seite oder Abschnitt
 * markieren, sonst wird der Text unruhig. Funktioniert nur in HTML-Text, also in
 * Templates und Slots. In ECharts-Optionen und in Props, die Text als String
 * erwarten (z. B. `beschreibung` von PageIntro), geht es nicht.
 *
 * Das Fenster ist ein <wa-popover>: Es öffnet sich beim Klick auf den Begriff und
 * schließt mit Esc, bei einem Klick daneben oder auf den Glossar-Link
 * (`data-popover="close"`). Der Begriff ist ein <span role="button"> statt eines
 * <button>: Knöpfe sind immer inline-block und bekommen von Web Awesome eine
 * feste Höhe, das verschiebt die Zeile und verhindert den Umbruch mehrteiliger
 * Begriffe. Das Popover hängt am <body>, damit es weder die Schrift des
 * umgebenden Texts erbt noch in einer aria-live-Region vorgelesen wird.
 */
import { computed, ref, useId } from 'vue'
import { RouterLink } from 'vue-router'
import { eintrag, type BegriffId } from '@/data/glossar'

const props = defineProps<{
  id: BegriffId
}>()

const knopfId = `mm-fachwort-${useId()}`
const begriff = computed(() => eintrag(props.id))
const offen = ref(false)

/** Enter und Leertaste wirken wie bei einem echten Knopf (Leertaste ohne Scrollen). */
function tastendruck(ereignis: KeyboardEvent) {
  ereignis.preventDefault()
  ;(ereignis.currentTarget as HTMLElement).click()
}

/** WA-Ereignisse steigen auf; nur die des eigenen Popovers zählen. */
function umschalten(ereignis: Event, zustand: boolean) {
  if (ereignis.target === ereignis.currentTarget) offen.value = zustand
}
</script>

<template>
  <span
    :id="knopfId"
    role="button"
    tabindex="0"
    class="mm-fachwort"
    aria-haspopup="dialog"
    :aria-expanded="offen"
    @keydown.enter="tastendruck"
    @keydown.space="tastendruck"
    ><slot>{{ begriff.begriff }}</slot></span
  >
  <Teleport to="body" defer>
    <wa-popover
      :for="knopfId"
      placement="bottom"
      class="mm-fachwort-popover"
      @wa-show="umschalten($event, true)"
      @wa-hide="umschalten($event, false)"
    >
      <span class="mm-fachwort__inhalt">
        <strong class="mm-fachwort__titel">
          {{ begriff.begriff
          }}<template v-if="begriff.abkuerzung"> ({{ begriff.abkuerzung }})</template>
        </strong>
        <span class="mm-fachwort__text">{{ begriff.kurz }}</span>
        <RouterLink
          :to="{ path: '/glossar', hash: `#${id}` }"
          class="mm-fachwort__link"
          data-popover="close"
        >
          Mehr im Glossar <wa-icon name="arrow-right" aria-hidden="true"></wa-icon>
        </RouterLink>
      </span>
    </wa-popover>
  </Teleport>
</template>

<style scoped>
/* Kein vertikales Padding, damit die Zeilenhöhe gleich bleibt. */
.mm-fachwort {
  padding: 0 0.1em;
  border-radius: var(--wa-border-radius-s);
  background-color: var(--wa-color-brand-fill-quiet);
  text-decoration: underline dotted var(--wa-color-brand-on-quiet);
  text-decoration-thickness: 0.1em;
  text-underline-offset: 0.15em;
  cursor: help;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

.mm-fachwort:hover,
.mm-fachwort:focus-visible,
.mm-fachwort[aria-expanded='true'] {
  background-color: var(--wa-color-brand-border-quiet);
}

.mm-fachwort:focus-visible {
  outline: var(--wa-focus-ring);
  outline-offset: var(--wa-focus-ring-offset);
}

.mm-fachwort-popover {
  --max-width: 20rem;
}

.mm-fachwort-popover::part(body) {
  padding: var(--wa-space-m);
}

.mm-fachwort__inhalt {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-xs);
  font-size: var(--wa-font-size-s);
  line-height: 1.5;
}

.mm-fachwort__titel {
  font-size: var(--wa-font-size-m);
  font-weight: var(--wa-font-weight-semibold);
}

.mm-fachwort__link {
  align-self: flex-start;
  color: var(--wa-color-brand-fill-loud);
  font-weight: var(--wa-font-weight-semibold);
}

.mm-fachwort__link wa-icon {
  font-size: 0.85em;
}
</style>

<script setup lang="ts">
/**
 * App-Rahmen. Kopf- und Fußzeile sind hier einmal gesetzt und gelten damit für
 * jede Seite. `<wa-page>` von Web Awesome übernimmt das Grundraster und hält die
 * Fußzeile unten, auch wenn eine Seite wenig Inhalt hat.
 *
 * Geteilte Datei — bitte nicht für einzelne Seiten anpassen.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import TheHeader from '@/components/layout/TheHeader.vue'
import TheFooter from '@/components/layout/TheFooter.vue'
import MuensterhackBadge from '@/components/layout/MuensterhackBadge.vue'

const kopf = ref<HTMLElement | null>(null)
let beobachter: ResizeObserver | undefined

/* Der Seitenkopf klebt oben und ist auf schmalen Bildschirmen mehrzeilig. Seine
   tatsächliche Höhe braucht main.css (scroll-padding-top), damit per Tastatur
   fokussierte Elemente nicht unter ihm verschwinden. */
onMounted(() => {
  if (!kopf.value) return
  beobachter = new ResizeObserver(() => {
    document.documentElement.style.setProperty(
      '--mm-kopf-hoehe',
      `${kopf.value?.offsetHeight ?? 0}px`,
    )
  })
  beobachter.observe(kopf.value)
})
onBeforeUnmount(() => beobachter?.disconnect())

/* Eigener Sprunglink statt dem von <wa-page>: Dessen href="#main-content"
   würde im Hash-Router als Route gelesen und auf die Startseite umleiten. */
function zumInhalt(): void {
  document.getElementById('inhalt')?.focus()
}
</script>

<template>
  <wa-page disable-navigation-toggle>
    <header ref="kopf" slot="header" class="mm-shell__header">
      <a href="#inhalt" class="mm-sprunglink" @click.prevent="zumInhalt">Zum Inhalt springen</a>
      <TheHeader />
    </header>

    <main id="inhalt" tabindex="-1">
      <RouterView />
    </main>

    <footer slot="footer" class="mm-shell__footer">
      <TheFooter />
    </footer>
  </wa-page>

  <MuensterhackBadge />
</template>

<style scoped>
/* Der eingebaute Sprunglink von <wa-page> (englisch, bricht den Hash-Router). */
wa-page::part(skip-to-content) {
  display: none;
}

/* Unsichtbar, bis er per Tab den Fokus bekommt. */
.mm-sprunglink {
  position: absolute;
  inset-inline-start: var(--wa-space-m);
  top: var(--wa-space-s);
  z-index: 10;
  padding: var(--wa-space-xs) var(--wa-space-m);
  border-radius: var(--wa-border-radius-m);
  background: var(--wa-color-surface-raised);
  color: var(--wa-color-text-link);
  font-weight: var(--wa-font-weight-semibold);
  transform: translateY(-200%);
}

.mm-sprunglink:focus {
  transform: none;
  outline: var(--wa-focus-ring);
  outline-offset: 2px;
}

.mm-shell__header {
  /* <wa-page> setzt seine slotted Kopf- und Fusszeile auf display:flex und
     zentriert sie. Dadurch schrumpfen sie auf Inhaltsbreite und sitzen nicht
     mehr buendig ueber dem Seiteninhalt — deshalb hier zurueck auf block. */
  display: block;
  /* <wa-page> gibt den Slot-Bereichen eigenes Padding, das sich zu dem der
     Kopfzeile addieren würde — dann stünde sie nicht mehr bündig zum Inhalt. */
  padding: 0;
  position: relative;
  border-bottom: 1px solid var(--wa-color-surface-border);
  background-color: var(--wa-color-surface-raised);
}

.mm-shell__footer {
  display: block;
  padding: 0;
  border-top: 1px solid var(--wa-color-surface-border);
  background-color: var(--wa-color-surface-raised);
}
</style>

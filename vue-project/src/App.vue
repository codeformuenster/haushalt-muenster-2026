<script setup lang="ts">
/**
 * App-Rahmen. Kopf- und Fußzeile sind hier einmal gesetzt und gelten damit für
 * jede Seite. `<wa-page>` von Web Awesome übernimmt das Grundraster und hält die
 * Fußzeile unten, auch wenn eine Seite wenig Inhalt hat.
 *
 * Geteilte Datei — bitte nicht für einzelne Seiten anpassen.
 */
import { RouterView } from 'vue-router'
import TheHeader from '@/components/layout/TheHeader.vue'
import TheFooter from '@/components/layout/TheFooter.vue'
</script>

<template>
  <wa-page disable-navigation-toggle>
    <header slot="header" class="mm-shell__header">
      <TheHeader />
    </header>

    <RouterView />

    <footer slot="footer" class="mm-shell__footer">
      <TheFooter />
    </footer>
  </wa-page>
</template>

<style scoped>
.mm-shell__header {
  /* <wa-page> setzt seine slotted Kopf- und Fusszeile auf display:flex und
     zentriert sie. Dadurch schrumpfen sie auf Inhaltsbreite und sitzen nicht
     mehr buendig ueber dem Seiteninhalt — deshalb hier zurueck auf block. */
  display: block;
  /* <wa-page> gibt den Slot-Bereichen eigenes Padding, das sich zu dem der
     Kopfzeile addieren würde — dann stünde sie nicht mehr bündig zum Inhalt. */
  padding: 0;
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

<script setup lang="ts">
/**
 * Karte um ein Diagramm oder eine Tabelle. Sorgt dafür, dass Titel, Beschreibung
 * und Quellenangabe auf allen Seiten gleich sitzen.
 */
import { pdfLink } from '@/data/haushaltsplan'

defineProps<{
  titel: string
  /** Ein Satz, der erklärt, was man im Diagramm sieht. Optional, aber empfohlen. */
  beschreibung?: string
  /** Woher die Zahlen stammen, z. B. 'Haushaltsplan 2026/27, Band 2, S. 67'. */
  quelle?: string
  /** PDF-Seite, auf die der Link hinter der Quellenangabe führt, z. B. { band: 2, seite: 71 }. */
  pdf?: { band: 1 | 2; seite: number }
}>()
</script>

<template>
  <wa-card class="mm-card">
    <div slot="header" class="mm-card__kopf">
      <h2>{{ titel }}</h2>
      <p v-if="beschreibung">{{ beschreibung }}</p>
    </div>

    <slot />

    <small slot="footer" v-if="quelle || pdf" class="mm-card__quelle">
      <template v-if="quelle">Quelle: {{ quelle }}</template>
      <template v-if="quelle && pdf"> · </template>
      <a v-if="pdf" :href="pdfLink(pdf.band, pdf.seite)" target="_blank" rel="noopener">
        PDF-Seite {{ pdf.seite }}
        <wa-icon name="arrow-up-right-from-square" aria-hidden="true"></wa-icon>
      </a>
    </small>
  </wa-card>
</template>

<style scoped>
.mm-card {
  width: 100%;
  /* Kartenrahmen in Markenorange statt im grauen Standard-Rahmenton. Die Regel
     am Host-Element gewinnt gegen die :host-Regel von <wa-card>. */
  border-color: var(--wa-color-brand-fill-quiet);
}

/* Die inneren Trennlinien zum Kopf und zur Quellenzeile liegen im Shadow DOM
   und erben den Rahmenton nicht — deshalb hier noch einmal dieselbe Farbe. */
.mm-card::part(header),
.mm-card::part(footer) {
  border-color: var(--wa-color-brand-fill-quiet);
}

/* Stehen zwei Karten nebeneinander, macht das Raster sie gleich hoch. Damit
   dann auch die Quellenzeilen auf einer Höhe sitzen, muss der Inhalt die
   überschüssige Höhe aufnehmen — sonst rutscht der Fuß der kürzeren Karte
   nach oben und darunter bleibt eine Lücke. */
.mm-card::part(body) {
  flex: 1 1 auto;
}

.mm-card__kopf h2 {
  margin: 0;
  font-size: var(--wa-font-size-l);
  line-height: 1.3;
}

.mm-card__kopf p {
  margin: var(--wa-space-2xs) 0 0;
  max-width: var(--mm-lesebreite);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-card__quelle {
  color: var(--wa-color-text-quiet);
}

/* Dunkles Markenblau wie die Buttons; das Orange wäre als kleiner Text zu kontrastarm. */
.mm-card__quelle a {
  color: var(--wa-color-brand-fill-loud);
  white-space: nowrap;
}

.mm-card__quelle wa-icon {
  font-size: 0.85em;
}
</style>

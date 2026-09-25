<script setup lang="ts">
/**
 * Karte um ein Diagramm oder eine Tabelle. Sorgt dafür, dass Titel, Beschreibung
 * und Quellenangabe auf allen Seiten gleich sitzen.
 */
defineProps<{
  titel: string
  /** Ein Satz, der erklärt, was man im Diagramm sieht. Optional, aber empfohlen. */
  beschreibung?: string
  /** Woher die Zahlen stammen, z. B. 'Haushaltsplan 2026/27, Band 2, S. 67'. */
  quelle?: string
}>()
</script>

<template>
  <wa-card class="mm-card">
    <div slot="header" class="mm-card__kopf">
      <h2>{{ titel }}</h2>
      <p v-if="beschreibung">{{ beschreibung }}</p>
    </div>

    <slot />

    <small slot="footer" v-if="quelle" class="mm-card__quelle">Quelle: {{ quelle }}</small>
  </wa-card>
</template>

<style scoped>
.mm-card {
  width: 100%;
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
</style>

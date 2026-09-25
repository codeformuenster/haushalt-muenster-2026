<script setup lang="ts">
/** Titelblock am Anfang jeder Seite: Überschrift plus ein erklärender Absatz. */
defineProps<{
  titel: string
  /** Zwei bis drei Sätze: Was zeigt diese Seite, und warum ist das interessant? */
  beschreibung: string
}>()
</script>

<template>
  <header class="mm-intro">
    <h1>{{ titel }}</h1>
    <p>{{ beschreibung }}</p>
    <slot />
  </header>
</template>

<style scoped>
.mm-intro h1 {
  margin: 0;
  font-size: var(--wa-font-size-2xl);
  line-height: 1.2;
}

.mm-intro p {
  margin: var(--wa-space-s) 0 0;
  max-width: var(--mm-lesebreite);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-l);
  line-height: 1.6;
}
</style>

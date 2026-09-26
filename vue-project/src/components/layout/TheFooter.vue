<script setup lang="ts">
/** Fußzeile für alle Seiten: Datenherkunft und Projektkontext. */
</script>

<template>
  <div class="mm-footer">
    <p>
      Datengrundlage: Haushaltsplan 2026/2027 der Stadt Münster (Stand 20.05.2026), Band 1 und Band
      2.
    </p>
    <nav aria-label="Weiterführende Links">
      <a
        href="https://www.stadt-muenster.de/finanzen/muensters-haushalt/der-haushaltsplan"
        target="_blank"
        rel="noopener"
        >Haushaltsplan der Stadt Münster
        <span class="mm-visually-hidden">(öffnet in neuem Tab)</span></a
      >
      <a href="https://muensterhack.de" target="_blank" rel="noopener"
        >Münsterhack 2026 <span class="mm-visually-hidden">(öffnet in neuem Tab)</span></a
      >
    </nav>
  </div>
</template>

<style scoped>
.mm-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--wa-space-s) var(--wa-space-xl);
  max-width: 72rem;
  margin-inline: auto;
  padding: var(--wa-space-s);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-footer p {
  margin: 0;
  max-width: var(--mm-lesebreite);
}

.mm-footer nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wa-space-l);
}
</style>

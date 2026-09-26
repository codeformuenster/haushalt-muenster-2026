<script setup lang="ts">
/**
 * Glossar: erst die Fachwörter (BegriffeListe), auf die <GlossarBegriff> in den
 * anderen Seiten verlinkt, danach alle Produkte des Haushaltsplans zum
 * Aufklappen. Die Seite ist nur der Rahmen, Daten und Darstellung stecken in
 * den beiden Komponenten.
 */
import PageIntro from '@/components/ui/PageIntro.vue'
import BegriffeListe from '@/components/ui/BegriffeListe.vue'
import ProduktAkkordeon from '@/components/ui/ProduktAkkordeon.vue'
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Glossar"
      beschreibung="Was bedeuten die Fachwörter im Haushalt, und was steckt hinter den einzelnen Produkten? Oben stehen die Begriffe, darunter alle Produkte des Haushaltsplans mit ihrer Beschreibung."
    />

    <BegriffeListe />

    <section class="mm-produktliste" aria-labelledby="mm-produkte-titel">
      <h2 id="mm-produkte-titel">Produkte</h2>
      <ProduktAkkordeon />
    </section>
  </div>
</template>

<style scoped>
.mm-produktliste h2 {
  margin: 0 0 var(--wa-space-m);
  font-size: var(--wa-font-size-xl);
}
</style>

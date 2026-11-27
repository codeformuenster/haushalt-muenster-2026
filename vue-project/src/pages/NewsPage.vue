<script setup lang="ts">
/** Übersicht aller Neuigkeiten zum Projekt. Die Texte stehen in src/news/*.md. */
import PageIntro from '@/components/ui/PageIntro.vue'
import NewsListe from '@/components/news/NewsListe.vue'
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Neuigkeiten"
      beschreibung="Was sich bei Münster Money tut: neue Seiten, Korrekturen und alles rund ums Projekt."
    />
    <NewsListe ebene="h2" />
  </div>
</template>

<script setup lang="ts">
/** Eine einzelne Neuigkeit. Der Inhalt ist beim Build aus Markdown erzeugtes HTML. */
import { computed, watchEffect } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { datumLang, news } from '@/data/news'

const route = useRoute()
const router = useRouter()

const artikel = computed(() => news.find((eintrag) => eintrag.slug === route.params.slug))

// Unbekannte Meldung: zurück zur Übersicht statt leerer Seite.
watchEffect(() => {
  if (!artikel.value) router.replace({ name: 'news' })
  else document.title = `${artikel.value.titel} | Münster Money`
})
</script>

<template>
  <article v-if="artikel" class="mm-seite mm-news-artikel">
    <header>
      <p class="mm-news-artikel__zurueck">
        <RouterLink to="/news">← Alle Neuigkeiten</RouterLink>
      </p>
      <h1 tabindex="-1">{{ artikel.titel }}</h1>
      <time :datetime="artikel.datum">{{ datumLang(artikel.datum) }}</time>
    </header>
    <!-- Nur Texte aus dem eigenen Repository, daher v-html unbedenklich. -->
    <div class="mm-news-artikel__text" v-html="artikel.html"></div>
  </article>
</template>

<style scoped>
.mm-news-artikel header {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-2xs);
}

.mm-news-artikel__zurueck {
  margin: 0;
  font-size: var(--wa-font-size-s);
}

h1 {
  margin: 0;
  max-width: var(--mm-lesebreite);
  font-size: var(--wa-font-size-2xl);
  line-height: 1.2;
}

time {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-news-artikel__text {
  max-width: var(--mm-lesebreite);
  font-size: var(--wa-font-size-l);
  line-height: 1.6;
}

.mm-news-artikel__text :deep(h2) {
  margin: var(--wa-space-xl) 0 var(--wa-space-s);
  font-size: var(--wa-font-size-xl);
}

.mm-news-artikel__text :deep(p),
.mm-news-artikel__text :deep(ul),
.mm-news-artikel__text :deep(ol) {
  margin: 0 0 var(--wa-space-m);
}

.mm-news-artikel__text :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--wa-border-radius-l);
}
</style>

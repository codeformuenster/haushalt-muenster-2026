<script setup lang="ts">
/** Liste der Neuigkeiten als Karten: Datum, Titel, Teaser. Neueste zuerst. */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { datumLang, news } from '@/data/news'

const props = defineProps<{
  /** Höchstens so viele Meldungen zeigen; ohne Angabe alle. */
  anzahl?: number
  /** Überschriftenebene der Titel, je nach Seite. */
  ebene?: 'h2' | 'h3'
}>()

const eintraege = computed(() => news.slice(0, props.anzahl ?? news.length))
</script>

<template>
  <ul class="mm-news-liste">
    <li v-for="artikel in eintraege" :key="artikel.slug">
      <RouterLink :to="`/news/${artikel.slug}`" class="mm-news-liste__link">
        <wa-card appearance="outlined">
          <time :datetime="artikel.datum">{{ datumLang(artikel.datum) }}</time>
          <component :is="ebene ?? 'h3'">{{ artikel.titel }}</component>
          <p>{{ artikel.teaser }}</p>
        </wa-card>
      </RouterLink>
    </li>
  </ul>
</template>

<style scoped>
.mm-news-liste {
  display: grid;
  gap: var(--wa-space-m);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* native.css von Web Awesome rückt Listeneinträge ein. */
.mm-news-liste li {
  margin: 0;
}

.mm-news-liste__link {
  display: block;
  border-radius: var(--wa-panel-border-radius);
  text-decoration: none;
  color: inherit;
}

.mm-news-liste__link:focus-visible {
  outline: var(--wa-focus-ring);
  outline-offset: 2px;
}

.mm-news-liste wa-card {
  border-color: var(--wa-color-brand-fill-quiet);
}

time {
  font-size: var(--wa-font-size-xs);
  color: var(--wa-color-text-quiet);
}

h2,
h3 {
  margin: var(--wa-space-3xs) 0 var(--wa-space-2xs);
  font-size: var(--wa-font-size-l);
  color: var(--wa-color-brand-on-quiet);
}

p {
  margin: 0;
  max-width: var(--mm-lesebreite);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  line-height: 1.5;
}
</style>

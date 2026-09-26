<script setup lang="ts">
/**
 * Alle Fachwörter aus src/data/glossar.ts, alphabetisch sortiert und wie in
 * einem gedruckten Wörterbuch nach Anfangsbuchstaben gruppiert. Jeder Eintrag
 * hat seine ID als Sprungziel, damit <GlossarBegriff> per /glossar#<id> hierher
 * verlinken kann.
 *
 * Mit Hash-URLs (#/glossar#vzae) greift CSS `:target` nicht. Deshalb hebt die
 * Komponente den angesprungenen Eintrag selbst kurz hervor. Das Scrollen
 * übernimmt `scrollBehavior` im Router.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { eintrag, GLOSSAR, type BegriffId } from '@/data/glossar'

const begriffe = (Object.keys(GLOSSAR) as BegriffId[])
  .map((id) => {
    const e = eintrag(id)
    return { ...e, id, siehe: e.siehe ?? [] }
  })
  .sort((a, b) => a.begriff.localeCompare(b.begriff, 'de'))

/** Anfangsbuchstabe ohne Umlaut, damit „Ä“ unter A steht. */
function buchstabe(wort: string): string {
  return wort.normalize('NFD').charAt(0).toUpperCase()
}

/** Begriffe je Anfangsbuchstabe, in der sortierten Reihenfolge. */
const gruppen = begriffe.reduce<{ zeichen: string; eintraege: typeof begriffe }[]>((liste, b) => {
  const zeichen = buchstabe(b.begriff)
  const letzte = liste.at(-1)
  if (letzte?.zeichen === zeichen) letzte.eintraege.push(b)
  else liste.push({ zeichen, eintraege: [b] })
  return liste
}, [])

const route = useRoute()
const markiert = ref<BegriffId | null>(null)
let zeitgeber: ReturnType<typeof setTimeout> | undefined

watch(
  () => route.hash,
  (hash) => {
    const id = hash.slice(1)
    if (!(id in GLOSSAR)) return
    clearTimeout(zeitgeber)
    markiert.value = id as BegriffId
    zeitgeber = setTimeout(() => (markiert.value = null), 2000)
  },
  { immediate: true },
)

onBeforeUnmount(() => clearTimeout(zeitgeber))
</script>

<template>
  <section class="mm-begriffe" aria-labelledby="mm-begriffe-titel">
    <h2 id="mm-begriffe-titel" class="mm-begriffe__titel">Begriffe</h2>
    <p class="mm-begriffe__intro">
      Die wichtigsten Fachwörter aus dem Haushalt, kurz erklärt. Im Text der anderen Seiten sind sie
      farbig hinterlegt und führen hierher.
    </p>

    <div>
      <div v-for="gruppe in gruppen" :key="gruppe.zeichen" class="mm-buchstabe">
        <span class="mm-buchstabe__zeichen" aria-hidden="true">{{ gruppe.zeichen }}</span>
        <div class="mm-buchstabe__eintraege">
          <article
            v-for="b in gruppe.eintraege"
            :id="b.id"
            :key="b.id"
            class="mm-begriff"
            :class="{ 'mm-begriff--markiert': markiert === b.id }"
          >
            <h3>
              {{ b.begriff
              }}<span v-if="b.abkuerzung" class="mm-begriff__abkuerzung">
                ({{ b.abkuerzung }})</span
              >
            </h3>
            <p>{{ b.kurz }}</p>
            <p v-if="b.lang" class="mm-begriff__lang">{{ b.lang }}</p>
            <p v-if="b.siehe.length" class="mm-begriff__siehe">
              Siehe auch:
              <template v-for="(andere, i) in b.siehe" :key="andere">
                <RouterLink :to="{ path: '/glossar', hash: `#${andere}` }">{{
                  GLOSSAR[andere].begriff
                }}</RouterLink
                ><template v-if="i < b.siehe.length - 1">, </template>
              </template>
            </p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mm-begriffe {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-m);
}

.mm-begriffe__titel {
  margin: 0;
  font-size: var(--wa-font-size-xl);
}

.mm-begriffe__intro {
  max-width: var(--mm-lesebreite);
  margin: 0;
  color: var(--wa-color-text-quiet);
  line-height: 1.6;
}

/* Wörterbuch: links der Buchstabe, rechts die Einträge, Linien zwischen den Buchstaben. */
.mm-buchstabe {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr);
  gap: var(--wa-space-m);
  padding-block: var(--wa-space-l);
  border-top: 1px solid var(--wa-color-surface-border);
}

.mm-buchstabe__zeichen {
  color: var(--wa-color-brand-on-quiet);
  font-size: var(--wa-font-size-3xl);
  font-weight: var(--wa-font-weight-bold);
  line-height: 1;
}

.mm-buchstabe__eintraege {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-l);
}

/* Padding mit Gegen-Margin gibt der kurzen Hervorhebung Luft, ohne den Text zu verschieben. */
.mm-begriff {
  max-width: var(--mm-lesebreite);
  margin: calc(-1 * var(--wa-space-s));
  padding: var(--wa-space-s);
  border-radius: var(--wa-border-radius-m);
  /* Platz für den klebenden Seitenkopf, falls der Browser selbst scrollt. */
  scroll-margin-top: 5rem;
  transition: background-color var(--wa-transition-slow);
}

.mm-begriff--markiert {
  background-color: var(--wa-color-brand-fill-quiet);
}

.mm-begriff h3 {
  margin: 0 0 var(--wa-space-2xs);
  color: var(--wa-color-text-normal);
  font-size: var(--wa-font-size-l);
  line-height: 1.3;
}

.mm-begriff__abkuerzung {
  color: var(--wa-color-text-quiet);
  font-weight: var(--wa-font-weight-body);
}

.mm-begriff p {
  margin: 0 0 var(--wa-space-xs);
  line-height: 1.6;
}

.mm-begriff p:last-child {
  margin-bottom: 0;
}

.mm-begriff__lang {
  color: var(--wa-color-text-quiet);
}

.mm-begriff__siehe {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

@media (max-width: 40rem) {
  .mm-buchstabe {
    grid-template-columns: 2rem minmax(0, 1fr);
    gap: var(--wa-space-s);
  }

  .mm-buchstabe__zeichen {
    font-size: var(--wa-font-size-2xl);
  }
}
</style>

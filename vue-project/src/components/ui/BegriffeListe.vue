<script setup lang="ts">
/**
 * Alle Fachwörter aus src/data/glossar.ts, alphabetisch sortiert. Jeder Eintrag
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

    <div class="mm-begriffe__liste">
      <article
        v-for="b in begriffe"
        :id="b.id"
        :key="b.id"
        class="mm-begriff"
        :class="{ 'mm-begriff--markiert': markiert === b.id }"
      >
        <h3>
          {{ b.begriff
          }}<span v-if="b.abkuerzung" class="mm-begriff__abkuerzung"> ({{ b.abkuerzung }})</span>
        </h3>
        <p>{{ b.kurz }}</p>
        <p v-if="b.lang">{{ b.lang }}</p>
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

/* Rahmen wie das Produkt-Akkordeon darunter, Einträge durch Linien getrennt. */
.mm-begriffe__liste {
  border: var(--wa-border-width-s) solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-m);
  background-color: var(--wa-color-surface-default);
}

.mm-begriff {
  padding: var(--wa-space-m) var(--wa-space-l);
  /* Platz für den klebenden Seitenkopf, falls der Browser selbst scrollt. */
  scroll-margin-top: 5rem;
  transition: background-color var(--wa-transition-slow);
}

.mm-begriff + .mm-begriff {
  border-top: 1px solid var(--wa-color-surface-border);
}

.mm-begriff--markiert {
  background-color: var(--wa-color-brand-fill-quiet);
}

.mm-begriff > * {
  max-width: var(--mm-lesebreite);
}

.mm-begriff h3 {
  margin: 0 0 var(--wa-space-xs);
  font-size: var(--wa-font-size-m);
  line-height: 1.3;
}

.mm-begriff__abkuerzung {
  color: var(--wa-color-text-quiet);
  font-weight: var(--wa-font-weight-body);
}

.mm-begriff p {
  margin: 0 0 var(--wa-space-s);
  line-height: 1.6;
}

.mm-begriff p:last-child {
  margin-bottom: 0;
}

.mm-begriff__siehe {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-begriff__siehe a {
  color: var(--wa-color-brand-fill-loud);
}
</style>

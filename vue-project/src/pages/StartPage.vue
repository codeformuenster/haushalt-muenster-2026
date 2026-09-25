<script setup lang="ts">
/**
 * Landing Page: erklärt in wenigen Sätzen, was Münster Money ist, und führt
 * von dort in die einzelnen Themenseiten.
 */
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

const einstiege = [
  {
    ziel: '/ueberblick',
    titel: 'Überblick',
    text: 'Das große Ganze: Wie verteilt sich der Haushalt auf die Aufgabenbereiche der Stadt? Von dort geht es Schritt für Schritt ins Detail.',
  },
  {
    ziel: '/ein-ausgaben',
    titel: 'Ein- & Ausgaben',
    text: 'Woher kommt das Geld, und wofür wird es ausgegeben? Erträge und Aufwendungen gegenübergestellt.',
  },
  {
    ziel: '/stellenplan',
    titel: 'Stellenplan',
    text: 'Wie viele Stellen hat die Stadt, wie verteilen sie sich auf Beamtinnen, Beamte und Tarifbeschäftigte?',
  },
  {
    ziel: '/freiwillige-leistungen',
    titel: 'Freiwillige Leistungen',
    text: 'Welcher Teil des Haushalts ist gesetzlich vorgeschrieben, und wo kann die Stadt selbst entscheiden?',
  },
  {
    ziel: '/bezirke',
    titel: 'Bezirke',
    text: 'Wie verteilen sich Mittel über die Stadtbezirke? Der räumliche Blick auf den Haushalt.',
  },
]
</script>

<template>
  <div class="mm-seite">
    <section class="mm-hero">
      <h1>Wofür gibt Münster sein Geld aus?</h1>
      <p class="mm-hero__lead">
        Der Haushaltsplan der Stadt Münster für 2026 und 2027 umfasst mehrere hundert Seiten
        Tabellen. Darin steht, wofür die Stadt in den nächsten zwei Jahren Geld ausgibt — von
        Kitaplätzen über Straßenbau bis zur Feuerwehr. Nur liest ihn so gut wie niemand.
      </p>
      <p class="mm-hero__lead">
        Münster Money nimmt die Zahlen aus diesem Plan und macht sie sichtbar: als Diagramme,
        durch die man sich klicken kann, statt als PDF zum Durchblättern.
      </p>
      <wa-button variant="brand" @click="router.push('/ueberblick')">Zum Überblick</wa-button>
    </section>

    <wa-divider></wa-divider>

    <section>
      <h2 class="mm-abschnitt-titel">Die Themen</h2>
      <div class="mm-raster">
        <RouterLink v-for="einstieg in einstiege" :key="einstieg.ziel" :to="einstieg.ziel" class="mm-kachel">
          <wa-card appearance="outlined">
            <h3>{{ einstieg.titel }}</h3>
            <p>{{ einstieg.text }}</p>
          </wa-card>
        </RouterLink>
      </div>
    </section>

    <section>
      <h2 class="mm-abschnitt-titel">Woher die Zahlen kommen</h2>
      <p class="mm-fliesstext">
        Alle Angaben stammen aus dem offiziellen Haushaltsplan 2026/2027 der Stadt Münster
        (Stand 20.05.2026), Band 1 und Band 2. Wir rechnen die Zahlen nicht um und schätzen
        nichts dazu — jede Darstellung nennt die Seite im Plan, aus der sie stammt, damit man
        sie dort nachschlagen kann.
      </p>
    </section>
  </div>
</template>

<style scoped>
.mm-hero h1 {
  margin: 0;
  max-width: var(--mm-lesebreite);
  font-size: var(--wa-font-size-3xl);
  line-height: 1.15;
}

.mm-hero__lead {
  max-width: var(--mm-lesebreite);
  margin: var(--wa-space-m) 0 0;
  font-size: var(--wa-font-size-l);
  line-height: 1.6;
  color: var(--wa-color-text-quiet);
}

.mm-hero wa-button {
  margin-top: var(--wa-space-l);
}

.mm-abschnitt-titel {
  margin: 0 0 var(--wa-space-m);
  font-size: var(--wa-font-size-xl);
}

.mm-fliesstext {
  max-width: var(--mm-lesebreite);
  margin: 0;
  line-height: 1.6;
  color: var(--wa-color-text-quiet);
}

.mm-kachel {
  text-decoration: none;
  color: inherit;
}

.mm-kachel wa-card {
  height: 100%;
}

.mm-kachel h3 {
  margin: 0 0 var(--wa-space-2xs);
  font-size: var(--wa-font-size-l);
  color: var(--wa-color-brand-on-quiet);
}

.mm-kachel p {
  margin: 0;
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  line-height: 1.5;
}
</style>

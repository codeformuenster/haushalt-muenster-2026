<script setup lang="ts">
/**
 * Landing Page: erklärt in wenigen Sätzen, was Münster Money ist, und führt
 * von dort in die einzelnen Themenseiten.
 */
import { RouterLink, useRouter } from 'vue-router'
import heroImageUrl from '@/assets/images/Hero-image.png'

const router = useRouter()

const einstiege = [
  {
    ziel: '/ueberblick',
    titel: 'Überblick',
    icon: 'chart-pie',
    text: 'Das große Ganze: Wie verteilt sich der Haushalt auf die Aufgabenbereiche der Stadt? Von dort geht es Schritt für Schritt ins Detail.',
  },
  {
    ziel: '/ein-ausgaben',
    titel: 'Ein- & Ausgaben',
    icon: 'scale-balanced',
    text: 'Woher kommt das Geld, und wofür wird es ausgegeben? Erträge und Aufwendungen gegenübergestellt.',
  },
  {
    ziel: '/stellenplan',
    titel: 'Stellenplan',
    icon: 'users',
    text: 'Wie viele Stellen hat die Stadt, wie verteilen sie sich auf Beamtinnen, Beamte und Tarifbeschäftigte?',
  },
  {
    ziel: '/zuschuesse',
    titel: 'Zuschüsse',
    icon: 'hand-holding-heart',
    text: 'Geld für Vereine, Verbände und andere Träger. Wie viel davon ist gesetzlich vorgeschrieben, und wo kann der Rat selbst entscheiden?',
  },
  {
    ziel: '/bezirke',
    titel: 'Bezirke',
    icon: 'map-location-dot',
    text: 'Wie verteilen sich Mittel über die Stadtbezirke? Der räumliche Blick auf den Haushalt.',
  },
  {
    ziel: '/planspiel',
    titel: 'Planspiel',
    icon: 'chess-knight',
    text: 'Gleich den Haushalt 2026 aus: Triff Entscheidungen wie kostenlose Kitas oder eine höhere Grundsteuer und sieh sofort, was sie bewirken.',
  },
]
</script>

<template>
  <div class="mm-seite">
    <section class="mm-hero">
      <div class="mm-hero__inhalt">
        <div class="mm-hero__text">
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
        </div>

        <aside class="mm-hero__teaser" aria-label="Planspiel-Hinweis">
          <img :src="heroImageUrl" alt="Illustration zum Haushalts-Planspiel" class="mm-hero__bild" />
          <p class="mm-hero__claim">
            Kannst du den Haushalt ausgleichen? Spiele unser
            <RouterLink to="/planspiel">Planspiel</RouterLink>
          </p>
        </aside>
      </div>
    </section>

    <wa-divider></wa-divider>

    <section>
      <h2 class="mm-abschnitt-titel">Die Themen</h2>
      <div class="mm-raster">
        <RouterLink v-for="einstieg in einstiege" :key="einstieg.ziel" :to="einstieg.ziel" class="mm-kachel">
          <wa-card appearance="outlined">
            <div class="mm-kachel__kopf">
              <wa-icon :name="einstieg.icon" class="mm-kachel__icon"></wa-icon>
              <h3>{{ einstieg.titel }}</h3>
            </div>
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

      <!-- Stand September 2026; entfernen, sobald ein Nachtragshaushalt oder neuer Plan vorliegt. -->
      <wa-callout variant="warning" appearance="outlined" class="mm-nachtrag">
        <wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
        <strong>Nachtrag: 2027 fehlen rund 92 Mio. € vom Land.</strong> Nach der Berechnung des
        Landes NRW vom August 2026 erhält Münster 2027 nur rund 2,8 Mio. € Schlüsselzuweisungen,
        eingeplant waren rund 95 Mio. €. Alle Zahlen für 2027 in dieser App zeigen den Plan vor
        dieser Kürzung. Die Stadt hat eine Haushaltssperre erlassen und arbeitet an
        Gegenmaßnahmen.
        <a
          href="https://www.stadt-muenster.de/aktuelles/newsdetail/doppelhaushalt-2026-2027-verliert-in-2027-schluesselzuweisungen-in-millionenhoehe"
          target="_blank"
          rel="noopener"
          >Meldung der Stadt</a
        >
      </wa-callout>
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

.mm-hero__inhalt {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 1fr);
  gap: var(--wa-space-l);
  align-items: start;
}

.mm-hero__teaser {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-s);
}

.mm-hero__bild {
  width: 100%;
  height: auto;
  border-radius: var(--wa-border-radius-l);
}

.mm-hero__claim {
  margin: 0;
  font-size: 1.5em;
  text-align: center;
  font-style: italic;
  line-height: 1.45;
  color: var(--wa-color-text-normal);
}

.mm-hero__claim a {
  color: var(--wa-color-brand-on-quiet);
  text-decoration: underline;
  text-underline-offset: 0.15em;
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

@media (max-width: 52rem) {
  .mm-hero__inhalt {
    grid-template-columns: 1fr;
  }
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

.mm-nachtrag {
  max-width: var(--mm-lesebreite);
  margin-top: var(--wa-space-l);
}

.mm-kachel {
  text-decoration: none;
  color: inherit;
}

.mm-kachel wa-card {
  height: 100%;
}

.mm-kachel__kopf {
  display: flex;
  align-items: center;
  gap: var(--wa-space-xs);
  margin-bottom: var(--wa-space-2xs);
}

.mm-kachel__icon {
  color: var(--wa-color-brand-on-quiet);
  font-size: 1.1em;
}

.mm-kachel h3 {
  margin: 0;
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

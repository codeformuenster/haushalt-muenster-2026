<script setup lang="ts">
/**
 * Klappliste über alle Produkte des Haushaltsplans: erst der Produktbereich,
 * darin die Produktgruppen, darin die einzelnen Produkte mit Beschreibung und
 * den Zielen ihrer Gruppe.
 *
 * Alles, was dazugehört, steckt in dieser Komponente — Daten laden und der
 * Umschalter auf Einfache Sprache. Einbauen heißt: <ProduktAkkordeon />.
 */
import { computed, onMounted, ref } from 'vue'
import {
  absaetze,
  hatInhalt,
  ladeProduktbereiche,
  type Produkt,
  type Produktbereich,
  type Produktgruppe,
} from '@/data/produkte'

const bereiche = ref<Produktbereich[]>([])
const ladefehler = ref(false)
/** false = Wortlaut des Haushaltsplans, true = Fassung in Einfacher Sprache. */
const einfacheSprache = ref(false)

const anzahlProdukte = computed(() =>
  bereiche.value.reduce((summe, bereich) => summe + bereich.anzahlProdukte, 0),
)

const zustand = computed<'laedt' | 'fehler' | 'bereit'>(() => {
  if (ladefehler.value) return 'fehler'
  return bereiche.value.length ? 'bereit' : 'laedt'
})

onMounted(() => {
  ladeProduktbereiche()
    .then((geladen) => {
      bereiche.value = geladen
    })
    .catch(() => {
      ladefehler.value = true
    })
})

/** „1 Produkt" statt „1 Produkte". */
function menge(anzahl: number, einzahl: string, mehrzahl: string): string {
  return `${anzahl} ${anzahl === 1 ? einzahl : mehrzahl}`
}

function spracheUmschalten(ereignis: Event) {
  einfacheSprache.value = (ereignis.target as HTMLElement & { checked: boolean }).checked
}

function beschreibung(produkt: Produkt): string {
  return einfacheSprache.value ? produkt.beschreibung_einfach : produkt.beschreibung
}

function besonderheiten(produkt: Produkt): string {
  return einfacheSprache.value
    ? produkt.besonderheiten_einfach
    : produkt.besonderheiten_in_den_planjahren
}

function ziele(gruppe: Produktgruppe): string {
  return einfacheSprache.value ? gruppe.zieleEinfach : gruppe.ziele
}

/** Zuständigkeiten und Fundstelle als kurze Liste unter dem Produktnamen. */
function merkmale(produkt: Produkt): { bezeichnung: string; wert: string }[] {
  return [
    { bezeichnung: 'Dezernat', wert: produkt.dezernat ?? '' },
    { bezeichnung: 'Amt', wert: produkt.amt ?? '' },
    { bezeichnung: 'Ausschuss', wert: produkt.ausschuss ?? '' },
    { bezeichnung: 'Band 1, PDF-Seite', wert: produkt.pdf_seiten.split(',').join(', ') },
  ].filter((merkmal) => hatInhalt(merkmal.wert))
}
</script>

<template>
  <div class="mm-produkte">
    <div class="mm-produkte__kopf">
      <p v-if="anzahlProdukte" class="mm-produkte__anzahl">
        {{ menge(anzahlProdukte, 'Produkt', 'Produkte') }} in
        {{ menge(bereiche.length, 'Produktbereich', 'Produktbereichen') }} · Haushaltsplan 2026/27,
        Band 1
      </p>
      <wa-switch
        :checked="einfacheSprache"
        hint="Kürzere Sätze, erklärte Fachwörter."
        @change="spracheUmschalten"
      >
        Einfache Sprache
      </wa-switch>
    </div>

    <p v-if="zustand === 'laedt'" class="mm-laden">
      <wa-spinner></wa-spinner> Produktdaten werden geladen …
    </p>

    <wa-callout v-else-if="zustand === 'fehler'" variant="danger" appearance="outlined">
      Die Produktdaten konnten nicht geladen werden. Bitte die Seite neu laden.
    </wa-callout>

    <wa-accordion v-else class="mm-akkordeon" appearance="outlined" heading-level="3">
      <wa-accordion-item v-for="bereich in bereiche" :key="bereich.nummer">
        <span slot="label" class="mm-akkordeon__titel">
          <code>{{ bereich.nummer }}</code>
          <span>{{ bereich.name }}</span>
          <small>
            {{ menge(bereich.gruppen.length, 'Produktgruppe', 'Produktgruppen') }} ·
            {{ menge(bereich.anzahlProdukte, 'Produkt', 'Produkte') }}
          </small>
        </span>

        <wa-accordion class="mm-akkordeon" appearance="plain" heading-level="4">
          <wa-accordion-item v-for="gruppe in bereich.gruppen" :key="gruppe.nummer">
            <span slot="label" class="mm-akkordeon__titel">
              <code>{{ gruppe.nummer }}</code>
              <span>{{ gruppe.name }}</span>
            </span>

            <div class="mm-gruppe">
              <section v-if="hatInhalt(ziele(gruppe))" class="mm-gruppe__ziele">
                <h5>Ziele der Produktgruppe</h5>
                <p v-for="(absatz, i) in absaetze(ziele(gruppe))" :key="i">{{ absatz }}</p>
              </section>
              <p v-else class="mm-leer">
                Für diese Produktgruppe nennt der Haushaltsplan keine Ziele.
              </p>

              <article v-for="produkt in gruppe.produkte" :key="produkt.pnummer" class="mm-produkt">
                <!-- Bei Gruppen aus einem gleichnamigen Produkt stünde hier sonst
                   dieselbe Überschrift ein zweites Mal. -->
                <h5 v-if="!gruppe.einzelprodukt">
                  <code>{{ produkt.pnummer }}</code> {{ produkt.name }}
                </h5>

                <dl class="mm-produkt__merkmale">
                  <div v-for="merkmal in merkmale(produkt)" :key="merkmal.bezeichnung">
                    <dt>{{ merkmal.bezeichnung }}</dt>
                    <dd>{{ merkmal.wert }}</dd>
                  </div>
                </dl>

                <p v-for="(absatz, i) in absaetze(beschreibung(produkt))" :key="i">{{ absatz }}</p>

                <div v-if="hatInhalt(besonderheiten(produkt))" class="mm-produkt__besonderheiten">
                  <h6>Besonderheiten in den Planjahren</h6>
                  <p v-for="(absatz, i) in absaetze(besonderheiten(produkt))" :key="i">
                    {{ absatz }}
                  </p>
                </div>
              </article>
            </div>
          </wa-accordion-item>
        </wa-accordion>
      </wa-accordion-item>
    </wa-accordion>
  </div>
</template>

<style scoped>
.mm-produkte {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-m);
}

/* Anzahl links, Sprachschalter rechts — auf schmalen Bildschirmen untereinander. */
.mm-produkte__kopf {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  justify-content: space-between;
  gap: var(--wa-space-s);
}

.mm-produkte__anzahl,
.mm-laden {
  margin: 0;
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-laden {
  display: flex;
  align-items: center;
  gap: var(--wa-space-xs);
}

.mm-akkordeon {
  width: 100%;
}

/* Beschriftung einer Klappzeile: Nummer, Name und — beim Produktbereich — die
   Anzahl dahinter. Bricht auf schmalen Bildschirmen um. */
.mm-akkordeon__titel {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--wa-space-2xs) var(--wa-space-s);
}

.mm-akkordeon__titel code {
  color: var(--wa-color-text-quiet);
}

.mm-akkordeon__titel small {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-gruppe {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-l);
  max-width: var(--mm-lesebreite);
}

.mm-gruppe__ziele {
  padding: var(--wa-space-s) var(--wa-space-m);
  border-left: 3px solid var(--wa-color-brand-fill-loud);
  background-color: var(--wa-color-neutral-fill-quiet);
  border-radius: var(--wa-border-radius-m);
}

.mm-produkt + .mm-produkt {
  padding-top: var(--wa-space-l);
  border-top: 1px solid var(--wa-color-surface-border);
}

.mm-gruppe h5 {
  margin: 0 0 var(--wa-space-xs);
  font-size: var(--wa-font-size-m);
  line-height: 1.3;
}

.mm-gruppe h6 {
  margin: 0 0 var(--wa-space-2xs);
  font-size: var(--wa-font-size-s);
  color: var(--wa-color-text-quiet);
}

.mm-gruppe p {
  margin: 0 0 var(--wa-space-s);
  line-height: 1.6;
}

.mm-gruppe p:last-child {
  margin-bottom: 0;
}

.mm-leer {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

/* Zuständigkeiten nebeneinander: „Dezernat V", „Amt …" usw. */
.mm-produkt__merkmale {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wa-space-2xs) var(--wa-space-m);
  margin: 0 0 var(--wa-space-s);
  font-size: var(--wa-font-size-s);
  color: var(--wa-color-text-quiet);
}

.mm-produkt__merkmale div {
  display: flex;
  gap: var(--wa-space-3xs);
}

.mm-produkt__merkmale dt::after {
  content: ':';
}

.mm-produkt__merkmale dd {
  margin: 0;
  font-weight: var(--wa-font-weight-semibold);
}

.mm-produkt__besonderheiten {
  font-size: var(--wa-font-size-s);
}
</style>

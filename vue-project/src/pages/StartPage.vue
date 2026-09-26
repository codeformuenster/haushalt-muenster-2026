<script setup lang="ts">
/**
 * Landing Page: erklärt in wenigen Sätzen, was Münster Money ist, und führt
 * von dort in die einzelnen Themenseiten.
 */
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import heroImageUrl from '@/assets/images/Hero-image.png'
import GlossarBegriff from '@/components/ui/GlossarBegriff.vue'
import rawGesamtuebersicht from '../../../daten/agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv?raw'
import { euroKurz } from '@/charts/format'

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

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      const next = text[i + 1]
      if (inQuotes && next === '"') {
        value += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0))
}

function toObjects<T extends Record<string, string>>(text: string): T[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const [header = [], ...data] = rows

  return data.map((values) => {
    const obj: Record<string, string> = {}
    header.forEach((key, idx) => {
      obj[key] = values[idx] ?? ''
    })
    return obj as T
  })
}

function asNumber(value: string | undefined): number {
  const num = Number(value ?? '')
  return Number.isFinite(num) ? num : 0
}

type GesamtuebersichtRow = {
  Code: string
  Bezeichnung: string
  Ertraege_2026_EUR?: string
  Ertraege_2027_EUR?: string
  Aufwendungen_2026_EUR?: string
  Aufwendungen_2027_EUR?: string
  SaldoLfdVerw_2026_EUR?: string
  SaldoLfdVerw_2027_EUR?: string
  OrdentlErgebnis_2026_EUR?: string
  OrdentlErgebnis_2027_EUR?: string
  SaldoInvestitionstaetigkeit_2026_EUR?: string
  SaldoInvestitionstaetigkeit_2027_EUR?: string
  Finanzmittelueberschuss_fehlbetrag_2026_EUR?: string
  Finanzmittelueberschuss_fehlbetrag_2027_EUR?: string
}

function trend(delta: number): { pfeil: string; text: string; klasse: string } {
  if (delta > 0) return { pfeil: '▲', text: `+${euroKurz(delta)} zu 2027`, klasse: 'ist-plus' }
  if (delta < 0) return { pfeil: '▼', text: `${euroKurz(delta)} zu 2027`, klasse: 'ist-minus' }
  return { pfeil: '→', text: 'unverändert zu 2027', klasse: 'ist-neutral' }
}

const gesamtuebersichtRows = toObjects<GesamtuebersichtRow>(rawGesamtuebersicht)
const gesamtZeile =
  gesamtuebersichtRows.find(
    (row) => row.Code.trim() === '' || row.Bezeichnung.trim() === 'Gesamtsumme Stadt Münster',
  ) ?? null

const dashboardKarten = computed(() => [
  {
    titel: 'Einnahmen',
    wert: euroKurz(asNumber(gesamtZeile?.Ertraege_2026_EUR)),
    trend: trend(asNumber(gesamtZeile?.Ertraege_2027_EUR) - asNumber(gesamtZeile?.Ertraege_2026_EUR)),
  },
  {
    titel: 'Ausgaben',
    wert: euroKurz(asNumber(gesamtZeile?.Aufwendungen_2026_EUR)),
    trend: trend(
      asNumber(gesamtZeile?.Aufwendungen_2027_EUR) - asNumber(gesamtZeile?.Aufwendungen_2026_EUR),
    ),
  },
  {
    titel: 'Investitionssaldo',
    wert: euroKurz(asNumber(gesamtZeile?.SaldoInvestitionstaetigkeit_2026_EUR)),
    trend: trend(
      asNumber(gesamtZeile?.SaldoInvestitionstaetigkeit_2027_EUR) -
        asNumber(gesamtZeile?.SaldoInvestitionstaetigkeit_2026_EUR),
    ),
  },
  {
    titel: 'Kassenplus/-minus',
    wert: euroKurz(asNumber(gesamtZeile?.Finanzmittelueberschuss_fehlbetrag_2026_EUR)),
    trend: trend(
      asNumber(gesamtZeile?.Finanzmittelueberschuss_fehlbetrag_2027_EUR) -
        asNumber(gesamtZeile?.Finanzmittelueberschuss_fehlbetrag_2026_EUR),
    ),
  },
])
</script>

<template>
  <div class="mm-seite">
    <section class="mm-hero">
      <div class="mm-hero__inhalt">
        <div ref="heroTextRef" class="mm-hero__text">
          <p class="mm-hero__subhead">Der Haushaltsplan 2026/2027</p>
          <h1>Wofür gibt Münster Geld aus?</h1>
          <p class="mm-hero__lead">
            Der <GlossarBegriff id="haushalt">Haushaltsplan</GlossarBegriff> der Stadt Münster für 2026 und
            2027 umfasst mehrere hundert Seiten Tabellen. Darin steht, wofür die Stadt in den nächsten zwei Jahren Geld ausgibt — von
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

    <section class="mm-dashboard">
      <div class="dashboard-cards" aria-label="Haushalts-Kennzahlen">
        <wa-card v-for="karte in dashboardKarten" :key="karte.titel" appearance="outlined" class="mm-dashboard-card">
          <div class="mm-dashboard-card__kopf">
            <h3>{{ karte.titel }}</h3>
          </div>
          <p class="mm-dashboard-card__wert">{{ karte.wert }}</p>
          <p class="mm-dashboard-card__trend" :class="karte.trend.klasse">
            <span aria-hidden="true">{{ karte.trend.pfeil }}</span>
            {{ karte.trend.text }}
          </p>
        </wa-card>
      </div>
      <p class="mm-dashboard__quelle">
        Datenjahr 2026 · Veränderung zu 2027 · Quelle: Haushaltsplan 2026/27, Gesamtübersicht Einnahmen/Ausgaben
      </p>

      <div class="mm-dashboard__erklaerung">
        <h2 class="mm-abschnitt-titel">Was ist eigentlich ein Haushalt?</h2>
        <p class="mm-hero__lead">
          Der Haushalt ist der Finanzplan der Stadt. Er legt fest, welche Einnahmen und Ausgaben für die kommenden Jahre erwartet werden und welche finanziellen Mittel für die unterschiedlichen Aufgaben vorgesehen sind.
          Dabei geht es um weit mehr als die Verwaltung im Rathaus: Der Haushalt finanziert unter anderem Schulen und Kitas, Straßen und Verkehr, Feuerwehr, Kultur, Sport, Soziales und viele weitere Aufgaben.
          Der Haushalt wird vom Rat der Stadt beschlossen und bildet damit eine wichtige Grundlage für die Arbeit der Stadtverwaltung.
        </p>
      </div>
    </section>

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
      <p class="mm-fliesstext mm-fliesstext--folge">
        Fachwörter wie <GlossarBegriff id="doppelhaushalt">Doppelhaushalt</GlossarBegriff> sind farbig
        hinterlegt und gepunktet unterstrichen. Tippe oder klicke darauf, dann erscheint eine kurze
        Erklärung. Alle Begriffe stehen im <RouterLink to="/glossar">Glossar</RouterLink>.
      </p>

      <!-- Stand September 2026; entfernen, sobald ein Nachtragshaushalt oder neuer Plan vorliegt. -->
      <wa-callout variant="warning" appearance="outlined" class="mm-nachtrag">
        <wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
        <strong>Nachtrag: 2027 fehlen rund 92 Mio. € vom Land.</strong> Nach der Berechnung des
        Landes NRW vom August 2026 erhält Münster 2027 nur rund 2,8 Mio. €
        <GlossarBegriff id="schluesselzuweisungen">Schlüsselzuweisungen</GlossarBegriff>, eingeplant waren
        rund 95 Mio. €. Alle Zahlen für 2027 in dieser App zeigen den Plan vor dieser Kürzung. Die
        Stadt hat eine <GlossarBegriff id="haushaltssperre">Haushaltssperre</GlossarBegriff> erlassen und
        arbeitet an Gegenmaßnahmen.
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

.mm-hero__subhead {
  margin: 0 0 var(--wa-space-2xs);
  font-size: var(--wa-font-size-l);
  text-transform: uppercase;
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

.mm-dashboard {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: var(--wa-space-xl);
  align-items: start;
}

.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--wa-space-m);
}

.mm-dashboard-card {
  height: 100%;
}

.mm-dashboard-card__kopf {
  margin-bottom: var(--wa-space-2xs);
}

.mm-dashboard-card__kopf h3 {
  margin: 0;
  font-size: var(--wa-font-size-m);
  color: var(--wa-color-brand-on-quiet);
}

.mm-dashboard-card p {
  margin: 0;
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  line-height: 1.5;
}

.mm-dashboard-card .mm-dashboard-card__wert {
  font-size: 24px;
  font-weight: var(--wa-font-weight-semibold);
  line-height: 1.15;
  color: var(--wa-color-text-normal);
}

.mm-dashboard-card .mm-dashboard-card__trend {
  margin-top: var(--wa-space-3xs);
  font-size: var(--wa-font-size-2xs);
  line-height: 1.4;
}

.mm-dashboard-card__trend span {
  margin-right: var(--wa-space-3xs);
}

.mm-dashboard-card__trend.ist-plus {
  color: var(--wa-color-success-on-quiet);
}

.mm-dashboard-card__trend.ist-minus {
  color: var(--wa-color-danger-on-quiet);
}

.mm-dashboard-card__trend.ist-neutral {
  color: var(--wa-color-text-quiet);
}

.mm-dashboard__quelle {
  margin: var(--wa-space-2xs) 0 0;
  grid-column: 1;
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-2xs);
}

.mm-dashboard__erklaerung {
  grid-column: 2;
  grid-row: 1 / span 2;
}

.mm-dashboard__erklaerung .mm-hero__lead {
  margin-top: 0;
}

@media (max-width: 52rem) {
  .mm-hero__inhalt {
    grid-template-columns: 1fr;
  }

  .mm-dashboard {
    grid-template-columns: 1fr;
  }

  .dashboard-cards {
    grid-template-columns: 1fr;
  }

  .mm-dashboard__quelle,
  .mm-dashboard__erklaerung {
    grid-column: auto;
    grid-row: auto;
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

.mm-fliesstext--folge {
  margin-top: var(--wa-space-s);
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

<script setup lang="ts">
/**
 * Indirekte Zuschüsse: Grundstücke und Gebäude, die die Stadt unter Marktwert
 * per Erbbaurecht oder Mietvertrag überlässt (Zuschussbericht, Anlagen 3 und 4).
 *
 * Die Daten kommen aus public/daten/zuschuesse-indirekt.json, erzeugt von
 * scripts/pipeline/agg_zuschuesse_indirekt.py. Die Mieten sind Ist-Werte 2024
 * und werden bewusst nicht mit den Planwerten der Seite summiert.
 */
import { onMounted, ref } from 'vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'
import { euro, zahl } from '@/charts/format'

interface Erbbaurecht {
  nr: number
  objekt: string
  berechtigter: string
  zweck: string
  flaeche: number
  zuschuss: number
  vertragsende: string
}

interface Miete {
  nr: number
  objekt: string
  mieter: string
  flaeche: number
  grundlage: string
  warmmiete: number
  kaltmiete: number
  zuschuss: number
  anpassungAb: string
  erlaeuterung: string
}

interface Daten {
  quelle: string
  erbbaurechte: { zeilen: Erbbaurecht[]; summe: number }
  mieten: {
    stand: number
    zeilen: Miete[]
    summe: { warmmiete: number; kaltmiete: number; zuschuss: number }
    hinweis: string
    fussnoten: Record<string, string>
  }
}

const daten = ref<Daten | null>(null)
const ladefehler = ref(false)

onMounted(async () => {
  try {
    const antwort = await fetch(`${import.meta.env.BASE_URL}daten/zuschuesse-indirekt.json`)
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`)
    daten.value = (await antwort.json()) as Daten
  } catch {
    ladefehler.value = true
  }
})
</script>

<template>
  <section class="mm-indirekt" aria-labelledby="mm-indirekt-titel">
    <h2 id="mm-indirekt-titel">Indirekte Zuschüsse: Erbbaurechte und Mieten</h2>
    <p class="mm-indirekt__text">
      Neben Geldzahlungen unterstützt die Stadt Vereine und Verbände auch, indem sie ihnen
      Grundstücke und Gebäude kostenlos oder vergünstigt überlässt, über Erbbaurechts- und
      Mietverträge. Dabei fließt kein Geld; die Stadt verzichtet auf Einnahmen. Der Zuschussbericht
      beziffert diesen Verzicht als Unterschied zum angemessenen Erbbauzins bzw. zur Warmmiete nach
      interner Leistungsverrechnung (ILV). Diese Beträge sind in den Zahlen oben nicht enthalten.
    </p>

    <wa-callout v-if="ladefehler" variant="danger" appearance="outlined" role="alert">
      <strong>Die indirekten Zuschüsse konnten nicht geladen werden.</strong> Die Datei
      <code>daten/zuschuesse-indirekt.json</code> fehlt oder ist nicht lesbar. Sie entsteht mit
      <code>scripts/pipeline/agg_zuschuesse_indirekt.py</code>.
    </wa-callout>

    <template v-if="daten">
      <ChartCard
        titel="Erbbaurechte unter Marktzins"
        :beschreibung="`${zahl(daten.erbbaurechte.zeilen.length)} Erbbaurechtsverträge, zusammen ${euro(daten.erbbaurechte.summe)} im Jahr. Der Zuschuss ist der Unterschied zwischen dem angemessenen und dem vereinbarten Erbbauzins, mal Grundstücksgröße.`"
        :quelle="daten.quelle"
        :pdf="{ band: 2, seite: 363 }"
      >
        <DatenTabelle beschriftung="Erbbaurechte unter Marktzins, Zuschuss pro Jahr">
          <thead>
            <tr>
              <th scope="col">Erbbauberechtigter und Nutzung</th>
              <th scope="col">Objekt</th>
              <th scope="col" class="mm-zahl">Fläche (m²)</th>
              <th scope="col" class="mm-zahl">Zuschuss pro Jahr (€)</th>
              <th scope="col">Vertragsende</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in daten.erbbaurechte.zeilen" :key="e.nr">
              <th scope="row">
                {{ e.berechtigter }}
                <span class="mm-indirekt__zweck">{{ e.zweck }}</span>
              </th>
              <td>{{ e.objekt }}</td>
              <td class="mm-zahl">{{ zahl(e.flaeche) }}</td>
              <td class="mm-zahl">{{ euro(e.zuschuss) }}</td>
              <td>{{ e.vertragsende }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Zusammen</th>
              <td></td>
              <td></td>
              <td class="mm-zahl">{{ euro(daten.erbbaurechte.summe) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </DatenTabelle>
        <p class="mm-indirekt__fussnote">
          Der Vertrag am Meckmannweg 72 endet am 31.07.2026; der Bericht nennt für ihn nur den
          Anteil für sieben Monate.
        </p>
      </ChartCard>

      <ChartCard
        :titel="`Verbilligte Mieten (Stand ${daten.mieten.stand})`"
        :beschreibung="`${zahl(daten.mieten.zeilen.length)} Mietverträge, zusammen ${euro(daten.mieten.summe.zuschuss)} Zuschuss im Jahr ${daten.mieten.stand}. Der Zuschuss ist die Warmmiete nach ILV abzüglich der tatsächlich gezahlten Kaltmiete.`"
        :quelle="daten.quelle"
        :pdf="{ band: 2, seite: 364 }"
      >
        <wa-callout variant="warning" appearance="outlined">
          <wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
          <strong>Ist-Werte {{ daten.mieten.stand }}, keine Planwerte.</strong> Die Mieten lassen
          sich deshalb nicht mit den Zuschüssen 2026/2027 oben zusammenrechnen.
        </wa-callout>
        <DatenTabelle :beschriftung="`Verbilligte Mieten ${daten.mieten.stand}`">
          <thead>
            <tr>
              <th scope="col">Mieter</th>
              <th scope="col">Objekt</th>
              <th scope="col" class="mm-zahl">Fläche (m²)</th>
              <th scope="col" class="mm-zahl">Warmmiete nach ILV (€)</th>
              <th scope="col" class="mm-zahl">Kaltmiete gezahlt (€)</th>
              <th scope="col" class="mm-zahl">Zuschuss (€)</th>
              <th scope="col">Grundlage</th>
              <th scope="col">Anpassung möglich ab</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in daten.mieten.zeilen" :key="m.nr">
              <th scope="row">
                {{ m.mieter }}<sup v-if="m.erlaeuterung">{{ m.erlaeuterung }}</sup>
              </th>
              <td>{{ m.objekt }}</td>
              <td class="mm-zahl">{{ zahl(m.flaeche) }}</td>
              <td class="mm-zahl">{{ euro(m.warmmiete) }}</td>
              <td class="mm-zahl">{{ euro(m.kaltmiete) }}</td>
              <td class="mm-zahl">{{ euro(m.zuschuss) }}</td>
              <td>{{ m.grundlage }}</td>
              <td>{{ m.anpassungAb }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Zusammen</th>
              <td></td>
              <td></td>
              <td class="mm-zahl">{{ euro(daten.mieten.summe.warmmiete) }}</td>
              <td class="mm-zahl">{{ euro(daten.mieten.summe.kaltmiete) }}</td>
              <td class="mm-zahl">{{ euro(daten.mieten.summe.zuschuss) }}</td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </DatenTabelle>
        <dl class="mm-indirekt__fussnote">
          <template v-for="(text, marke) in daten.mieten.fussnoten" :key="marke">
            <dt>{{ marke }}</dt>
            <dd>{{ text }}</dd>
          </template>
        </dl>
        <p class="mm-indirekt__fussnote">{{ daten.mieten.hinweis }}</p>
      </ChartCard>
    </template>
  </section>
</template>

<style scoped>
.mm-indirekt {
  display: flex;
  flex-direction: column;
  gap: var(--mm-block-abstand);
}

.mm-indirekt h2 {
  margin: 0;
}

.mm-indirekt__text {
  margin: 0;
  max-width: var(--mm-lesebreite);
}

.mm-indirekt__zweck {
  display: block;
  max-width: 44ch;
  font-weight: normal;
  color: var(--wa-color-text-quiet);
}

.mm-indirekt__fussnote {
  margin: var(--wa-space-l) 0 0;
  max-width: var(--mm-lesebreite);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

dl.mm-indirekt__fussnote {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--wa-space-2xs) var(--wa-space-s);
}

dl.mm-indirekt__fussnote dd {
  margin: 0;
}
</style>

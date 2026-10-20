<script setup lang="ts">
/**
 * Schulden und Investitionen: wie sich die Kredite für Investitionen bis 2030
 * entwickeln, wofür die Stadt investiert und welche Zahlungen schon zugesagt sind.
 *
 * Daten aus src/data/schulden.json (Band 2: Vorbericht S. 27 und 31-32,
 * Übersichten S. 83 und 91, alle Beträge in €), erzeugt von
 * scripts/pipeline/agg_schulden.py. Das Jahresergebnis 2026 kommt aus
 * src/data/ruecklagen.json (Mio. €).
 */
import type { EChartsOption } from 'echarts'
import { RouterLink } from 'vue-router'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'
import GlossarBegriff from '@/components/ui/GlossarBegriff.vue'
import { euro, euroKurz, zahl } from '@/charts/format'
import { KATEGORIE_FARBEN } from '@/charts/echartsTheme'
import schulden from '@/data/schulden.json'
import ruecklagen from '@/data/ruecklagen.json'

const MIO = 1_000_000
const { kredite, beteiligungen, verbindlichkeiten, verpflichtungsermaechtigungen: ve } = schulden

const i2026 = kredite.jahre.indexOf(2026)
const netto2026 = kredite.netto[i2026] ?? 0
const jahresergebnis2026 = (ruecklagen.jahresergebnis[ruecklagen.jahre.indexOf(2026)] ?? 0) * MIO
/** Spalte 31.12.2026 der Übersicht über die Verbindlichkeiten. */
const stichtag2026 = verbindlichkeiten.stichtage.indexOf('31.12.2026')
const hoechststand = Math.max(...kredite.stand)
const jahrHoechststand = kredite.jahre[kredite.stand.indexOf(hoechststand)]

const kennzahlen = [
  {
    titel: 'Kredite für Investitionen Ende 2026',
    wert: euroKurz(verbindlichkeiten.investitionskredite[stichtag2026] ?? 0),
    zusatz: 'langfristige Kredite, mit denen Bauten und Anlagen bezahlt werden',
  },
  {
    titel: 'Liquiditätskredite Ende 2026',
    wert: euroKurz(verbindlichkeiten.liquiditaetskredite[stichtag2026] ?? 0),
    zusatz: 'kurzfristige Kredite für laufende Zahlungen; sie steigen, wenn im Betrieb Geld fehlt',
  },
  {
    titel: 'Neue Schulden für Investitionen 2026',
    wert: euroKurz(netto2026),
    zusatz: 'neue Kredite abzüglich Tilgung',
  },
]

const jahrLabel = kredite.jahre.map((j, i) => `${j}\n${kredite.art[i]}`)

const schuldenstand: EChartsOption = {
  grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
  legend: { top: 0 },
  tooltip: { trigger: 'axis', valueFormatter: (v) => euroKurz(Number(v)) },
  xAxis: { type: 'category', data: jahrLabel },
  // Eigene Achse für die Jahresbeträge, sonst liegen die Linien neben 2 Mrd. € flach am Boden.
  yAxis: [
    { type: 'value', name: 'Stand', axisLabel: { formatter: (v: number) => euroKurz(v) } },
    {
      type: 'value',
      name: 'pro Jahr',
      splitLine: { show: false },
      axisLabel: { formatter: (v: number) => euroKurz(v) },
    },
  ],
  series: [
    {
      name: 'Schulden am 31.12.',
      type: 'bar',
      data: kredite.stand,
      itemStyle: { color: KATEGORIE_FARBEN[0] },
    },
    {
      name: 'Neue Kredite',
      type: 'line',
      yAxisIndex: 1,
      data: kredite.aufnahme,
      itemStyle: { color: KATEGORIE_FARBEN[1] },
      lineStyle: { color: KATEGORIE_FARBEN[1] },
    },
    {
      name: 'Tilgung',
      type: 'line',
      yAxisIndex: 1,
      data: kredite.tilgung,
      itemStyle: { color: KATEGORIE_FARBEN[2] },
      lineStyle: { color: KATEGORIE_FARBEN[2] },
    },
  ],
}

/** Dezernate nach Betrag absteigend, Name ohne den Vorspann „Dezernat für“. */
const dezernate = [...schulden.dezernate]
  .sort((a, b) => b.betrag - a.betrag)
  .map((d) => ({ ...d, kurz: d.name.replace(/^Dezernat (für |des )/, '') }))
const investitionenGesamt = dezernate.reduce((s, d) => s + d.betrag, 0)

const investitionen: EChartsOption = {
  grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (v) => euro(Number(v)),
  },
  xAxis: { type: 'value', axisLabel: { formatter: (v: number) => euroKurz(v) } },
  yAxis: {
    type: 'category',
    inverse: true,
    data: dezernate.map((d) => d.kurz),
    axisLabel: { width: 180, overflow: 'break' },
  },
  series: [
    {
      name: 'Investitionen 2026-2030',
      type: 'bar',
      data: dezernate.map((d) => d.betrag),
      itemStyle: { color: KATEGORIE_FARBEN[0] },
      label: { show: true, position: 'right', formatter: (p) => euroKurz(Number(p.value)) },
    },
  ],
}

/** Fälligkeitsjahre ohne Spalten, in denen nichts fällig wird (Folgejahre: 0 €). */
const veSpalten = ve.faelligkeit
  .map((name, i) => ({ name, i }))
  .filter(({ i }) => ve.werte.some((z) => (z[i] ?? 0) !== 0))

const verpflichtungen: EChartsOption = {
  grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
  legend: { top: 0 },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (v) => euroKurz(Number(v)),
  },
  xAxis: { type: 'category', data: veSpalten.map((s) => s.name) },
  yAxis: { type: 'value', axisLabel: { formatter: (v: number) => euroKurz(v) } },
  series: ve.entstehungsjahre.map((jahr, k) => ({
    name: `zugesagt im Plan ${jahr}`,
    type: 'bar' as const,
    stack: 've',
    data: veSpalten.map(({ i }) => ve.werte[k]?.[i] ?? 0),
    itemStyle: { color: KATEGORIE_FARBEN[k] },
  })),
}
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Schulden und Investitionen"
      :beschreibung="`Münster plant in den nächsten Jahren hohe Investitionen und bezahlt sie größtenteils mit Krediten. Die Schulden für Investitionen steigen bis ${jahrHoechststand} auf ${euroKurz(hoechststand)}.`"
    />

    <div class="mm-text">
      <p>
        Zwei Dinge werden oft verwechselt. Das
        <GlossarBegriff id="jahresergebnis">Jahresergebnis</GlossarBegriff> zeigt, ob die Stadt im
        laufenden Betrieb mehr verbraucht als sie einnimmt. Dieses Minus verringert ihre
        <GlossarBegriff id="allgemeine-ruecklage">Rücklagen</GlossarBegriff>, also ihr Eigenkapital.
        Schulden entstehen dagegen vor allem durch
        <GlossarBegriff id="investitionen">Investitionen</GlossarBegriff>: Schulen, Straßen oder
        Feuerwachen bezahlt die Stadt größtenteils mit Krediten, die sie über viele Jahre abzahlt.
        Fehlt im laufenden Betrieb Geld, überbrückt sie das mit kurzfristigen Liquiditätskrediten.
      </p>
      <p>
        2026 plant die Stadt ein Jahresergebnis von {{ euroKurz(jahresergebnis2026) }}. Für
        Investitionen nimmt sie im selben Jahr unter dem Strich {{ euroKurz(netto2026) }} neue
        Kredite auf. Mehr zum Minus im laufenden Betrieb auf der Seite
        <RouterLink to="/jahresergebnis">Jahresergebnis</RouterLink>.
      </p>
    </div>

    <dl class="mm-kennzahlen">
      <div v-for="k in kennzahlen" :key="k.titel" class="mm-kennzahl">
        <dt>{{ k.titel }}</dt>
        <dd>{{ k.wert }}</dd>
        <dd class="mm-kennzahl__zusatz">{{ k.zusatz }}</dd>
      </div>
    </dl>

    <ChartCard
      titel="Schulden für Investitionen 2023 bis 2030"
      beschreibung="Säulen: Stand der Kredite für Investitionen am Jahresende. Linien: neue Kredite und Tilgung im Jahr. Ab 2029 tilgt die Stadt mehr, als sie neu aufnimmt."
      quelle="Haushaltsplan 2026/27, Band 2, Vorbericht, Entwicklung der Schulden"
      :pdf="{ band: 2, seite: 31 }"
    >
      <div class="mm-text">
        <p>
          Die Zahlen schließen Kredite ein, die die Stadt aufnimmt und an ihre Beteiligungen (etwa
          städtische Gesellschaften) weitergibt. Ende {{ beteiligungen.jahre[1] }} sollen das
          {{ euroKurz(beteiligungen.betrag[1] ?? 0) }} oder
          {{ zahl(beteiligungen.prozent[1] ?? 0) }} % der Schulden sein (Prognose). Wie viel
          tatsächlich aufgenommen wird, hängt davon ab, wie schnell gebaut wird; in den vergangenen
          Jahren lagen die aufgenommenen Kredite stets deutlich unter dem erlaubten Rahmen.
        </p>
      </div>

      <BaseChart :option="schuldenstand" hoehe="360px" />

      <wa-details summary="Werte als Tabelle" class="mm-tabelle-details">
        <DatenTabelle beschriftung="Kredite für Investitionen 2023 bis 2030">
          <thead>
            <tr>
              <th scope="col">Jahr</th>
              <th scope="col" class="mm-zahl">Neue Kredite</th>
              <th scope="col" class="mm-zahl">Tilgung</th>
              <th scope="col" class="mm-zahl">Netto-Neuverschuldung</th>
              <th scope="col" class="mm-zahl">Schulden am 31.12.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(jahr, i) in kredite.jahre" :key="jahr">
              <th scope="row">{{ jahr }} ({{ kredite.art[i] }})</th>
              <td class="mm-zahl">{{ euroKurz(kredite.aufnahme[i] ?? 0) }}</td>
              <td class="mm-zahl">{{ euroKurz(kredite.tilgung[i] ?? 0) }}</td>
              <td class="mm-zahl">{{ euroKurz(kredite.netto[i] ?? 0) }}</td>
              <td class="mm-zahl">{{ euroKurz(kredite.stand[i] ?? 0) }}</td>
            </tr>
          </tbody>
        </DatenTabelle>
        <p class="mm-fussnote">
          2025: Neue Kredite minus Tilgung ergibt 205,9 Mio. €, im Plan steht 205,0 Mio. €. Der
          Schuldenstand passt zu 205,0 Mio. €.
        </p>
      </wa-details>
    </ChartCard>

    <ChartCard
      titel="Wofür investiert wird: 2026 bis 2030"
      :beschreibung="`Geplante Investitionen nach Dezernat, zusammen ${euroKurz(investitionenGesamt)} in fünf Jahren. Den größten Teil hat das Dezernat für Bildung, Jugend, Familie und Sport, darunter viel Geld für Schulen.`"
      quelle="Haushaltsplan 2026/27, Band 2, Vorbericht, investive Dezernatsbudgets"
      :pdf="{ band: 2, seite: 27 }"
    >
      <BaseChart :option="investitionen" hoehe="380px" />
    </ChartCard>

    <ChartCard
      titel="Schon zugesagte Zahlungen"
      :beschreibung="`Verpflichtungsermächtigungen: Mit ihnen darf die Stadt heute Aufträge vergeben, die sie erst in späteren Jahren bezahlt. Zusammen ${euroKurz(ve.summe)}, nach dem Jahr, in dem sie fällig werden. Die Farben zeigen, in welchem Haushaltsplan die Zusage erteilt wurde.`"
      quelle="Haushaltsplan 2026/27, Band 2, Übersicht über die Verpflichtungsermächtigungen"
      :pdf="{ band: 2, seite: 91 }"
    >
      <BaseChart :option="verpflichtungen" hoehe="360px" />
    </ChartCard>
  </div>
</template>

<style scoped>
.mm-text {
  max-width: var(--mm-lesebreite);
  margin-bottom: var(--wa-space-m);
}

.mm-text p {
  margin: 0 0 var(--wa-space-s);
  line-height: 1.6;
}

.mm-tabelle-details {
  margin-top: var(--wa-space-l);
}

.mm-fussnote {
  margin: var(--wa-space-s) 0 0;
  max-width: var(--mm-lesebreite);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-kennzahlen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: var(--wa-space-l);
  margin: 0 0 var(--wa-space-l);
}

.mm-kennzahl dt {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-kennzahl dd {
  margin: var(--wa-space-3xs) 0 0;
  font-size: var(--wa-font-size-2xl);
  font-weight: var(--wa-font-weight-bold);
  line-height: 1.1;
}

.mm-kennzahl .mm-kennzahl__zusatz {
  margin: var(--wa-space-2xs) 0 0;
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  font-weight: var(--wa-font-weight-normal);
  line-height: var(--wa-line-height-normal);
}
</style>

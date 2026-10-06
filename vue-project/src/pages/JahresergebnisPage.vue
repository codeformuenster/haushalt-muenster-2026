<script setup lang="ts">
/**
 * Jahresergebnis und Rücklagen: wie das Minus im Ergebnisplan entsteht, womit die
 * Stadt es deckt und wie nah sie an der Grenze zur Haushaltssicherung ist.
 *
 * Zahlen 2026/2027 aus src/data/planspiel.json (Gesamtergebnisplan, Band 1, S. 9),
 * die Reihe 2024-2030 aus src/data/ruecklagen.json (Vorbericht, Band 2, S. 18,
 * in Mio. € mit einer Nachkommastelle). Beide erzeugt die Pipeline unter scripts/.
 */
import { computed, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'
import GlossarBegriff from '@/components/ui/GlossarBegriff.vue'
import { euro, euroKurz, zahl } from '@/charts/format'
import { KATEGORIE_FARBEN, POL_FARBEN } from '@/charts/echartsTheme'
import plan from '@/data/planspiel.json'
import ruecklagen from '@/data/ruecklagen.json'

/** Index in den Wertelisten von planspiel.json: Zeile 01 steht an Stelle 0. */
const ZEILE = {
  ertraege: 9,
  aufwendungen: 16,
  ordentlichesErgebnis: 17,
  finanzertraege: 18,
  zinsen: 19,
  finanzergebnis: 20,
  ausserordentlichesErgebnis: 24,
  jahresergebnis: 25,
} as const

/** Schwelle nach § 76 Abs. 1 Nr. 2 GO NRW: Verringerung der allgemeinen Rücklage in %. */
const SCHWELLE_PROZENT = 5
const MIO = 1_000_000

/** Eine Nachkommastelle wie im Vorbericht, auch bei glatten Werten ("37,0"). */
const EINE_STELLE = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const selectedYear = ref<2026 | 2027>(2026)

/** Haushaltsjahr aus einem <wa-select> übernehmen. */
function onYearSelect(event: Event): void {
  selectedYear.value = (event.target as HTMLInputElement).value === '2027' ? 2027 : 2026
}

const werte = computed(() => {
  const z = plan.gesamt[String(selectedYear.value) as '2026' | '2027']
  return (zeile: number) => z[zeile] ?? 0
})

const jahresergebnis2026 = plan.gesamt['2026'][ZEILE.jahresergebnis] ?? 0

// ------------------------------------------------------------ Wasserfall

type Schritt = { name: string; von: number; bis: number; summe: boolean }

/** Die Treppe vom ordentlichen Ergebnis zum Jahresergebnis. */
const schritte = computed<Schritt[]>(() => {
  const w = werte.value
  const ordentlich = w(ZEILE.ordentlichesErgebnis)
  const nachFinanzertraegen = ordentlich + w(ZEILE.finanzertraege)
  return [
    { name: 'Ordentliches Ergebnis', von: 0, bis: ordentlich, summe: true },
    { name: '+ Finanzerträge', von: ordentlich, bis: nachFinanzertraegen, summe: false },
    {
      name: '− Zinsen',
      von: nachFinanzertraegen,
      bis: nachFinanzertraegen - w(ZEILE.zinsen),
      summe: false,
    },
    { name: 'Jahresergebnis', von: 0, bis: w(ZEILE.jahresergebnis), summe: true },
  ]
})

function vorzeichen(betrag: number): string {
  return `${betrag > 0 ? '+' : ''}${euroKurz(betrag)}`
}

/*
 * ECharts kennt keine schwebenden Balken. Jeder Schritt wird deshalb aus einem
 * unsichtbaren Sockel und einem sichtbaren Teil gestapelt. Negative Werte stapelt
 * ECharts getrennt nach unten; ein Schritt, der die Null kreuzt, bekommt keinen
 * Sockel, sondern einen sichtbaren Teil unter und einen über der Null.
 */
const wasserfall = computed<EChartsOption>(() => {
  const teile = schritte.value.map((s) => {
    const unten = Math.min(s.von, s.bis)
    const oben = Math.max(s.von, s.bis)
    if (unten < 0 && oben > 0) return { sockel: 0, minus: unten, plus: oben }
    if (oben <= 0) return { sockel: oben, minus: unten - oben, plus: 0 }
    return { sockel: unten, minus: 0, plus: oben - unten }
  })
  const farbe = (s: Schritt) =>
    s.summe ? KATEGORIE_FARBEN[0] : s.bis > s.von ? POL_FARBEN.positiv : POL_FARBEN.negativ
  const beschriftung = (s: Schritt) => (s.summe ? euroKurz(s.bis) : vorzeichen(s.bis - s.von))
  // Beschriftet wird nur der Teil, der vom Nullpunkt am weitesten weg ist.
  const sichtbar = (teil: 'minus' | 'plus', i: number) => {
    const t = teile[i]!
    return teil === 'minus'
      ? Math.abs(t.minus) >= Math.abs(t.plus)
      : Math.abs(t.plus) > Math.abs(t.minus)
  }
  const teilSerie = (teil: 'minus' | 'plus') => ({
    type: 'bar' as const,
    name: teil,
    stack: 'treppe',
    barWidth: '55%',
    data: schritte.value.map((s, i) => ({
      value: teile[i]![teil],
      itemStyle: { color: farbe(s) },
      label: {
        show: sichtbar(teil, i),
        position: teil === 'minus' ? ('bottom' as const) : ('top' as const),
        formatter: () => beschriftung(s),
      },
    })),
  })

  return {
    grid: { left: 8, right: 8, top: 32, bottom: 32, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (info: unknown) => {
        const [erster] = info as { dataIndex: number }[]
        const s = schritte.value[erster?.dataIndex ?? 0]!
        return `<strong>${s.name}</strong><br>${s.summe ? euro(s.bis) : euro(s.bis - s.von)}`
      },
    },
    xAxis: { type: 'category', data: schritte.value.map((s) => s.name) },
    yAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
    series: [
      {
        type: 'bar',
        name: 'sockel',
        stack: 'treppe',
        itemStyle: { color: 'transparent' },
        emphasis: { disabled: true },
        data: teile.map((t) => t.sockel),
      },
      teilSerie('minus'),
      teilSerie('plus'),
    ],
  }
})

// ------------------------------------------------------------ 2024 bis 2030

const ART: Record<number, string> = { 2024: 'Ist', 2025: 'Ansatz', 2026: 'Ansatz', 2027: 'Ansatz' }
const jahre = ruecklagen.jahre.map((jahr) => ({ jahr, art: ART[jahr] ?? 'Planung' }))
const jahrLabels = jahre.map(({ jahr, art }) => `${jahr}\n${art}`)
const mio = (reihe: number[]) => reihe.map((wert) => wert * MIO)

const verlauf: EChartsOption = {
  grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
  legend: { top: 0 },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (wert) => euroKurz(Math.abs(Number(wert))),
  },
  xAxis: { type: 'category', data: jahrLabels },
  yAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
  series: [
    {
      type: 'bar',
      name: 'Jahresergebnis',
      stack: 'ergebnis',
      itemStyle: { color: KATEGORIE_FARBEN[0] },
      label: {
        show: true,
        position: 'insideBottom',
        color: '#fff',
        formatter: ({ value }) => EINE_STELLE.format(Number(value) / MIO),
      },
      data: mio(ruecklagen.jahresergebnis),
    },
    {
      type: 'bar',
      name: 'Globaler Minderaufwand (pauschal eingeplante Kürzung)',
      stack: 'ergebnis',
      itemStyle: { color: POL_FARBEN.neutral },
      // Als negativer Teil gestapelt: So weit wäre das Minus ohne die pauschale Kürzung.
      data: mio(ruecklagen.globalerMinderaufwand).map((wert) => -wert),
    },
  ],
}

// ------------------------------------------------------------ Rücklagen

const deckung: EChartsOption = {
  grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
  legend: { top: 0 },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (wert) => euroKurz(Number(wert)),
  },
  xAxis: { type: 'category', data: jahrLabels },
  yAxis: { type: 'value', axisLabel: { formatter: (wert: number) => euroKurz(wert) } },
  series: [
    {
      type: 'bar',
      name: 'aus der Ausgleichsrücklage',
      stack: 'deckung',
      itemStyle: { color: KATEGORIE_FARBEN[2] },
      data: mio(ruecklagen.entnahmeAusgleichsruecklage).map((wert) => -wert),
    },
    {
      type: 'bar',
      name: 'aus der allgemeinen Rücklage',
      stack: 'deckung',
      itemStyle: { color: KATEGORIE_FARBEN[1] },
      data: mio(ruecklagen.entnahmeAllgemeineRuecklage).map((wert) => -wert),
    },
  ],
}

const index2026 = ruecklagen.jahre.indexOf(2026)
const ausgleich2026 = -(ruecklagen.entnahmeAusgleichsruecklage[index2026] ?? 0) * MIO
const allgemein2026 = -(ruecklagen.entnahmeAllgemeineRuecklage[index2026] ?? 0) * MIO

// ------------------------------------------------------------ Schwelle

const ueberSchwelle = jahre
  .map(({ jahr }, i) => ({ jahr, prozent: ruecklagen.inanspruchnahmeProzent[i] ?? 0 }))
  .filter(({ prozent }) => prozent > SCHWELLE_PROZENT)
  .map(({ jahr }) => jahr)
const zweiJahreNacheinander = ueberSchwelle.some((jahr) => ueberSchwelle.includes(jahr + 1))

const schwelle: EChartsOption = {
  grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
  legend: { top: 0 },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (wert) => `${zahl(Number(wert))} %`,
  },
  xAxis: { type: 'category', data: jahrLabels },
  yAxis: { type: 'value', axisLabel: { formatter: '{value} %' } },
  series: [
    {
      type: 'bar',
      name: 'Verringerung der allgemeinen Rücklage',
      label: {
        show: true,
        position: 'top',
        formatter: ({ value }) => `${EINE_STELLE.format(Number(value))} %`,
      },
      data: ruecklagen.inanspruchnahmeProzent.map((prozent) => ({
        value: prozent,
        itemStyle: { color: prozent > SCHWELLE_PROZENT ? POL_FARBEN.negativ : KATEGORIE_FARBEN[0] },
      })),
    },
    {
      type: 'line',
      name: `Schwelle ${SCHWELLE_PROZENT} %`,
      symbol: 'none',
      lineStyle: { type: 'dashed', color: POL_FARBEN.neutral },
      itemStyle: { color: POL_FARBEN.neutral },
      data: jahre.map(() => SCHWELLE_PROZENT),
    },
  ],
}

const QUELLE_VORBERICHT = 'Haushaltsplan 2026/27, Band 2, Vorbericht, Entwicklung der Rücklagen'
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Jahresergebnis und Rücklagen"
      :beschreibung="`Münster plant für 2026 mit einem Minus von ${euroKurz(-jahresergebnis2026)}. Diese Seite zeigt, wie das Minus entsteht, womit die Stadt es deckt und wie nah sie dabei an eine gesetzliche Grenze kommt.`"
    />

    <ChartCard
      titel="Wie das Jahresergebnis entsteht"
      beschreibung="Vom ordentlichen Ergebnis des laufenden Betriebs zum Jahresergebnis: Finanzerträge kommen hinzu, Zinsen gehen ab. Alle Werte stehen unter dem Diagramm auch als Tabelle."
      quelle="Haushaltsplan 2026/27, Band 1, Gesamtergebnisplan"
      :pdf="{ band: 1, seite: 9 }"
    >
      <div class="mm-text">
        <p>
          Im <GlossarBegriff id="ergebnisplan">Ergebnisplan</GlossarBegriff> stellt die Stadt alles
          gegenüber, was sie in einem Jahr erwirtschaftet und verbraucht. Der laufende Betrieb
          ergibt das
          <GlossarBegriff id="ordentliches-ergebnis">ordentliche Ergebnis</GlossarBegriff>:
          {{ euroKurz(werte(ZEILE.ertraege)) }} Erträge, etwa Steuern und Gebühren, gegen
          {{ euroKurz(werte(ZEILE.aufwendungen)) }} Aufwendungen, etwa für Personal und
          Sozialleistungen.
        </p>
        <p>
          Dazu kommt das <GlossarBegriff id="finanzergebnis">Finanzergebnis</GlossarBegriff>.
          Finanzerträge sind vor allem Gewinnausschüttungen städtischer Unternehmen wie der
          Stadtwerke, die Zinsen fallen für die Kredite der Stadt an. Unter dem Strich steht das
          <GlossarBegriff id="jahresergebnis">Jahresergebnis</GlossarBegriff>. Nach ihm richtet
          sich, ob der Haushalt ausgeglichen ist.
        </p>
      </div>

      <wa-select
        class="mm-jahr-auswahl"
        label="Haushaltsjahr"
        :value="String(selectedYear)"
        @change="onYearSelect"
      >
        <wa-option value="2026">2026</wa-option>
        <wa-option value="2027">2027</wa-option>
      </wa-select>

      <BaseChart :option="wasserfall" hoehe="360px" />

      <wa-details summary="Werte als Tabelle" class="mm-tabelle-details">
        <DatenTabelle
          :beschriftung="`Vom ordentlichen Ergebnis zum Jahresergebnis ${selectedYear}`"
        >
          <thead>
            <tr>
              <th scope="col">Zeile im Ergebnisplan</th>
              <th scope="col" class="mm-zahl">{{ selectedYear }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Ordentliche Erträge</th>
              <td class="mm-zahl">{{ euro(werte(ZEILE.ertraege)) }}</td>
            </tr>
            <tr>
              <th scope="row">− Ordentliche Aufwendungen</th>
              <td class="mm-zahl">{{ euro(werte(ZEILE.aufwendungen)) }}</td>
            </tr>
            <tr class="mm-summe">
              <th scope="row">= Ordentliches Ergebnis</th>
              <td class="mm-zahl">{{ euro(werte(ZEILE.ordentlichesErgebnis)) }}</td>
            </tr>
            <tr>
              <th scope="row">+ Finanzerträge</th>
              <td class="mm-zahl">{{ euro(werte(ZEILE.finanzertraege)) }}</td>
            </tr>
            <tr>
              <th scope="row">− Zinsen und sonstige Finanzaufwendungen</th>
              <td class="mm-zahl">{{ euro(werte(ZEILE.zinsen)) }}</td>
            </tr>
            <tr class="mm-summe">
              <th scope="row">= Finanzergebnis</th>
              <td class="mm-zahl">{{ euro(werte(ZEILE.finanzergebnis)) }}</td>
            </tr>
            <tr>
              <th scope="row">Außerordentliches Ergebnis</th>
              <td class="mm-zahl">{{ euro(werte(ZEILE.ausserordentlichesErgebnis)) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">= Jahresergebnis</th>
              <td class="mm-zahl">{{ euro(werte(ZEILE.jahresergebnis)) }}</td>
            </tr>
          </tfoot>
        </DatenTabelle>
      </wa-details>
    </ChartCard>

    <ChartCard
      titel="Das Jahresergebnis 2024 bis 2030"
      beschreibung="Blau: das geplante Jahresergebnis. Grau: der globale Minderaufwand, also Einsparungen, die die Stadt ab 2028 pauschal einplant, ohne schon festzulegen, wo. Gelingen sie nicht, wird das Minus um diesen Teil größer. Beträge in Mio. €."
      :quelle="QUELLE_VORBERICHT"
      :pdf="{ band: 2, seite: 18 }"
    >
      <div class="mm-text">
        <p>
          Die Stadt plant in jedem Jahr mit einem Minus. Ab 2028 rechnet sie mit einem
          <GlossarBegriff id="globaler-minderaufwand">globalen Minderaufwand</GlossarBegriff>. 2024
          ist das tatsächliche Ergebnis (Ist), 2025 der ursprüngliche Plan, ab 2026 der aktuelle
          Plan.
        </p>
      </div>

      <BaseChart :option="verlauf" hoehe="360px" />

      <wa-details summary="Werte als Tabelle" class="mm-tabelle-details">
        <DatenTabelle beschriftung="Jahresergebnis 2024 bis 2030 in Mio. €">
          <thead>
            <tr>
              <th scope="col">Jahr</th>
              <th scope="col" class="mm-zahl">Jahresergebnis vor globalem Minderaufwand</th>
              <th scope="col" class="mm-zahl">Globaler Minderaufwand</th>
              <th scope="col" class="mm-zahl">Jahresergebnis</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="({ jahr, art }, i) in jahre" :key="jahr">
              <th scope="row">{{ jahr }} ({{ art }})</th>
              <td class="mm-zahl">
                {{ euroKurz((ruecklagen.jahresergebnisVorMinderaufwand[i] ?? 0) * MIO) }}
              </td>
              <td class="mm-zahl">
                {{ euroKurz((ruecklagen.globalerMinderaufwand[i] ?? 0) * MIO) }}
              </td>
              <td class="mm-zahl">{{ euroKurz((ruecklagen.jahresergebnis[i] ?? 0) * MIO) }}</td>
            </tr>
          </tbody>
        </DatenTabelle>
      </wa-details>
    </ChartCard>

    <ChartCard
      titel="Womit die Stadt das Minus deckt"
      beschreibung="Jedes Minus verringert das Eigenkapital der Stadt. Das Diagramm zeigt je Jahr, wie viel aus welcher Rücklage kommt."
      :quelle="QUELLE_VORBERICHT"
      :pdf="{ band: 2, seite: 18 }"
    >
      <div class="mm-text">
        <p>
          Ein Minus wird zuerst aus der
          <GlossarBegriff id="ausgleichsruecklage">Ausgleichsrücklage</GlossarBegriff> gedeckt,
          einem Polster aus Überschüssen früherer Jahre. Solange sie reicht, gilt der Haushalt
          rechtlich als ausgeglichen, obwohl die Stadt mehr verbraucht als sie einnimmt. 2026 ist
          das Polster aufgebraucht: Es deckt noch {{ euroKurz(ausgleich2026) }}, die übrigen
          {{ euroKurz(allgemein2026) }} gehen von der
          <GlossarBegriff id="allgemeine-ruecklage">allgemeinen Rücklage</GlossarBegriff> ab. Das
          muss die Bezirksregierung als Aufsichtsbehörde genehmigen.
        </p>
        <p>
          Rücklagen sind kein Geld auf einem Sparkonto. Sie sind Rechengrößen in der Bilanz. Die
          Rechnungen bezahlt die Stadt trotzdem, wenn das Geld nicht reicht, mit Krediten.
        </p>
      </div>

      <BaseChart :option="deckung" hoehe="360px" />

      <wa-details summary="Werte als Tabelle" class="mm-tabelle-details">
        <DatenTabelle beschriftung="Deckung des Jahresergebnisses aus den Rücklagen 2024 bis 2030">
          <thead>
            <tr>
              <th scope="col">Jahr</th>
              <th scope="col" class="mm-zahl">Aus der Ausgleichsrücklage</th>
              <th scope="col" class="mm-zahl">Aus der allgemeinen Rücklage</th>
              <th scope="col" class="mm-zahl">Ausgleichsrücklage am Jahresende</th>
              <th scope="col" class="mm-zahl">Allgemeine Rücklage am Jahresende</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="({ jahr, art }, i) in jahre" :key="jahr">
              <th scope="row">{{ jahr }} ({{ art }})</th>
              <td class="mm-zahl">
                {{ euroKurz(-(ruecklagen.entnahmeAusgleichsruecklage[i] ?? 0) * MIO) }}
              </td>
              <td class="mm-zahl">
                {{ euroKurz(-(ruecklagen.entnahmeAllgemeineRuecklage[i] ?? 0) * MIO) }}
              </td>
              <td class="mm-zahl">
                {{ euroKurz((ruecklagen.ausgleichsruecklageEnde[i] ?? 0) * MIO) }}
              </td>
              <td class="mm-zahl">
                {{ euroKurz((ruecklagen.allgemeineRuecklageEnde[i] ?? 0) * MIO) }}
              </td>
            </tr>
          </tbody>
        </DatenTabelle>
      </wa-details>
    </ChartCard>

    <ChartCard
      :titel="`Wie nah die Stadt an der ${SCHWELLE_PROZENT}-%-Grenze ist`"
      :beschreibung="`Um wie viel Prozent die allgemeine Rücklage in jedem Jahr sinkt. Die gestrichelte Linie ist die Grenze von ${SCHWELLE_PROZENT} %, Jahre darüber sind orange statt blau.`"
      :quelle="QUELLE_VORBERICHT"
      :pdf="{ band: 2, seite: 18 }"
    >
      <div class="mm-text">
        <p>
          Sinkt die allgemeine Rücklage zwei Jahre nacheinander um jeweils mehr als
          {{ SCHWELLE_PROZENT }} %, muss die Stadt ein
          <GlossarBegriff id="haushaltssicherungskonzept"
            >Haushaltssicherungskonzept</GlossarBegriff
          >
          aufstellen (§ 76 Gemeindeordnung NRW). Dann muss sie der Aufsichtsbehörde zeigen, wie sie
          wieder ausgeglichene Haushalte erreicht, und hat weniger Spielraum, vor allem bei
          freiwilligen Leistungen.
        </p>
        <p v-if="ueberSchwelle.length">
          Im Plan liegt die Verringerung {{ ueberSchwelle.join(' und ') }} über der Grenze.
          <template v-if="zweiJahreNacheinander"> Darunter sind zwei Jahre nacheinander. </template>
          <template v-else>
            Zwei Jahre nacheinander sind es nicht. Laut Vorbericht hält die Stadt die Verringerung
            so im zulässigen Rahmen und vermeidet ein Haushaltssicherungskonzept, auch mit Hilfe des
            globalen Minderaufwands ab 2028.
          </template>
        </p>
      </div>

      <BaseChart :option="schwelle" hoehe="320px" />

      <wa-details summary="Werte als Tabelle" class="mm-tabelle-details">
        <DatenTabelle beschriftung="Verringerung der allgemeinen Rücklage 2024 bis 2030">
          <thead>
            <tr>
              <th scope="col">Jahr</th>
              <th scope="col" class="mm-zahl">Verringerung</th>
              <th scope="col" class="mm-zahl">Grenze ({{ SCHWELLE_PROZENT }} %)</th>
              <th scope="col" class="mm-zahl">Abstand zur Grenze</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="({ jahr, art }, i) in jahre" :key="jahr">
              <th scope="row">{{ jahr }} ({{ art }})</th>
              <td class="mm-zahl">{{ zahl(ruecklagen.inanspruchnahmeProzent[i] ?? 0) }} %</td>
              <td class="mm-zahl">{{ euroKurz((ruecklagen.schwellenwert[i] ?? 0) * MIO) }}</td>
              <td class="mm-zahl">{{ euroKurz((ruecklagen.puffer[i] ?? 0) * MIO) }}</td>
            </tr>
          </tbody>
        </DatenTabelle>
      </wa-details>
    </ChartCard>

    <!-- Stand September 2026, wie auf der Startseite; entfernen, sobald ein Nachtragshaushalt vorliegt. -->
    <wa-callout variant="brand" appearance="filled">
      <wa-icon slot="icon" name="triangle-exclamation" aria-hidden="true"></wa-icon>
      <strong>Die Zahlen ab 2027 sind überholt.</strong> Nach der Berechnung des Landes NRW erhält
      Münster 2027 rund 92 Mio. € weniger
      <GlossarBegriff id="schluesselzuweisungen">Schlüsselzuweisungen</GlossarBegriff> als
      eingeplant. Diese Seite zeigt den Plan vom Mai 2026, vor dieser Kürzung.
      <a
        href="https://www.stadt-muenster.de/aktuelles/newsdetail/kaemmerin-zeller-informiert-finanzausschuss"
        target="_blank"
        rel="noopener"
        >Meldung der Stadt vom 9. September 2026<span class="mm-visually-hidden">
          (öffnet in neuem Tab)</span
        ></a
      >
    </wa-callout>
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

.mm-jahr-auswahl {
  width: 9rem;
  margin-bottom: var(--wa-space-m);
}

.mm-tabelle-details {
  margin-top: var(--wa-space-l);
}
</style>

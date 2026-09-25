<script setup lang="ts">
/**
 * Glossar: erklärt die Kürzel und Nummern, die einem beim Blättern durch den
 * Haushaltsplan und durch daten/raw_table_extraction/ begegnen (PB, PG, die
 * Dateinamen der Rohdaten). Reine Nachschlageseite, keine Zahlen aus dem
 * Haushalt — deshalb kein DemoHinweis nötig.
 */
import PageIntro from '@/components/ui/PageIntro.vue'
import ChartCard from '@/components/ui/ChartCard.vue'

const produktbereiche = [
  { nr: '01', name: 'Innere Verwaltung' },
  { nr: '02', name: 'Sicherheit und Ordnung' },
  { nr: '03', name: 'Schulträgeraufgaben' },
  { nr: '04', name: 'Kultur und Wissenschaft' },
  { nr: '05', name: 'Soziale Leistungen' },
  { nr: '06', name: 'Kinder-, Jugend- und Familienhilfe' },
  { nr: '07', name: 'Gesundheitsdienste' },
  { nr: '08', name: 'Sportförderung' },
  { nr: '09', name: 'Räumliche Planung und Entwicklung/Geoinformationen' },
  { nr: '10', name: 'Bauen und Wohnen' },
  { nr: '11', name: 'Ver- und Entsorgung' },
  { nr: '12', name: 'Verkehrsflächen und -anlagen, ÖPNV' },
  { nr: '13', name: 'Natur- und Landschaftspflege' },
  { nr: '14', name: 'Umweltschutz' },
  { nr: '15', name: 'Wirtschaft und Tourismus' },
  { nr: '16', name: 'Allgemeine Finanzwirtschaft' },
  { nr: '17', name: 'Stiftungen' },
]

const produktgruppenBeispiel = [
  { nr: '0601', name: 'Förderung von Kindern in Tagesbetreuung' },
  { nr: '0602', name: 'Kinder- und Jugendarbeit' },
  { nr: '0603', name: 'Förderung von benachteiligten jungen Menschen' },
  { nr: '0604', name: 'Familienförderung' },
  { nr: '0605', name: 'Erzieherische und wirtschaftliche Hilfen für Familien' },
]

const dateinameTeile = [
  { teil: 'band1 / band2', bedeutung: 'Aus welchem der zwei Bände des Haushaltsplans die Tabelle stammt.' },
  {
    teil: 'p<NNN>',
    bedeutung:
      'PDF-Seitenzahl im jeweiligen Band (nicht die gedruckte Seitenzahl im Dokument — siehe README für den Versatz).',
  },
  { teil: 'PB.. / PG....', bedeutung: 'Produktbereich bzw. Produktgruppe, siehe oben.' },
  {
    teil: 'Tabelle / Beschreibung / Kennzahlen / Teilergebnisplan / Teilfinanzplan / Investitionsmassnahmen',
    bedeutung: 'Um welche Art von Tabelle es sich auf der Seite handelt.',
  },
  { teil: 't<N>', bedeutung: 'Laufende Nummer, falls eine Seite mehrere Tabellen dieser Art enthält.' },
]
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Glossar"
      beschreibung="Der Haushaltsplan und die Rohdaten in diesem Projekt sind voller Kürzel und Nummern. Diese Seite sammelt, was sie bedeuten."
    />

    <wa-callout variant="brand" appearance="outlined">
      <strong>Keine ANBest-P.</strong> Die Nummern im Haushaltsplan (PB, PG) haben nichts mit den
      „Allgemeinen Nebenbestimmungen für Zuwendungen zur Projektförderung" (ANBest-P) zu tun — das
      ist ein Förderrecht-Begriff aus einem ganz anderen Zusammenhang. Hier geht es um die
      Gliederung des Haushalts selbst.
    </wa-callout>

    <ChartCard
      titel="PB — Produktbereich"
      beschreibung="Zweistellige Nummer für die 17 großen Aufgabenbereiche, in die der Haushalt gegliedert ist."
      quelle="Haushaltsplan 2026/27, Band 1"
    >
      <table class="mm-tabelle">
        <thead>
          <tr>
            <th>PB</th>
            <th>Aufgabenbereich</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pb in produktbereiche" :key="pb.nr">
            <td><code>{{ pb.nr }}</code></td>
            <td>{{ pb.name }}</td>
          </tr>
        </tbody>
      </table>
    </ChartCard>

    <ChartCard
      titel="PG — Produktgruppe"
      beschreibung="Vierstellige Nummer: die ersten zwei Ziffern nennen den Produktbereich, die letzten zwei die laufende Nummer der Gruppe darin. Beispiel PB 06 (Kinder-, Jugend- und Familienhilfe):"
      quelle="Haushaltsplan 2026/27, Band 1"
    >
      <table class="mm-tabelle">
        <thead>
          <tr>
            <th>PG</th>
            <th>Produktgruppe</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pg in produktgruppenBeispiel" :key="pg.nr">
            <td><code>{{ pg.nr }}</code></td>
            <td>{{ pg.name }}</td>
          </tr>
        </tbody>
      </table>
    </ChartCard>

    <ChartCard
      titel="Dateinamen der Rohdaten"
      beschreibung="So sind die CSV-Dateien in daten/raw_table_extraction/ benannt, z. B. band1_p700_PG0111_Immobilienmanagement_Investitionsmassnahmen_t0.csv."
    >
      <table class="mm-tabelle">
        <thead>
          <tr>
            <th>Teil</th>
            <th>Bedeutung</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="teil in dateinameTeile" :key="teil.teil">
            <td><code>{{ teil.teil }}</code></td>
            <td>{{ teil.bedeutung }}</td>
          </tr>
        </tbody>
      </table>
    </ChartCard>

    <wa-callout variant="warning" appearance="outlined">
      <strong>Mit Vorsicht genießen:</strong> Laut README sind bei den Rohdaten manche
      Abschnittskürzel falsch zugeordnet (z. B. <code>PG12</code> für den Ergebnis- und
      Finanzplan). Die Nummer im Dateinamen ist also ein guter erster Anhaltspunkt, aber keine
      Garantie.
    </wa-callout>
  </div>
</template>

<style scoped>
.mm-tabelle {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--wa-font-size-s);
}

.mm-tabelle th,
.mm-tabelle td {
  padding: var(--wa-space-2xs) var(--wa-space-s);
  text-align: left;
  border-bottom: 1px solid var(--wa-color-surface-border);
}

.mm-tabelle th {
  color: var(--wa-color-text-quiet);
  font-weight: var(--wa-font-weight-bold);
}

.mm-tabelle td:first-child {
  white-space: nowrap;
}
</style>

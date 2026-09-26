<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import { RouterLink, useRoute } from 'vue-router'
import PageIntro from '@/components/ui/PageIntro.vue'
import GlossarBegriff from '@/components/ui/GlossarBegriff.vue'
import ChartCard from '@/components/ui/ChartCard.vue'
import DatenTabelle from '@/components/ui/DatenTabelle.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import { KATEGORIE_FARBEN, POL_FARBEN } from '@/charts/echartsTheme'
import { euro, euroKurz, vzae } from '@/charts/format'
import { BESOLDUNG_QUELLE } from '@/data/besoldung'
import daten from '@/data/stellenplan.json'
import { TARIF_QUELLEN } from '@/data/tvoed'
import { hinweisZumWert, jahresentgelt, schaetzung } from '@/lib/entgelt'

type Ansicht = 'map' | 'change'
type Kennzahl = 'vzae' | 'entgelt'
type Stelle = {
  code: string
  name: string
  year: string
  total: number
  grades: Record<string, number>
}
const stellen: Stelle[] = daten.rows.map((row) => {
  const grades: Record<string, number> = {}
  for (const [key, value] of Object.entries(row.grades)) {
    if (typeof value === 'number') grades[key] = value
  }
  return { ...row, grades }
})
type RangZeile = {
  code: string
  name: string
  value: number
  kind: 'area' | 'group'
}

const route = useRoute()
const jahr = ref(route.query.jahr === '2027' ? '2027' : '2026')
const bereich = ref('all')
const ansicht = ref<Ansicht>('map')
const kennzahl = ref<Kennzahl>(route.query.kennzahl === 'entgelt' ? 'entgelt' : 'vzae')
const auswahl = ref('')
const stufe = ref(3)
const besoldungsStufe = ref(6)
/** Der gewählte Wert eines <wa-select>-change-Events. */
const auswahlWert = (ereignis: Event) => (ereignis.target as HTMLInputElement).value
const ansichten: { id: Ansicht; name: string }[] = [
  { id: 'map', name: 'Bestand' },
  { id: 'change', name: 'Veränderungen' },
]
const index = new Map(stellen.map((r) => [`${r.year}:${r.code}`, r]))
const differenz = (code: string) =>
  Math.round(
    ((index.get(`2027:${code}`)?.total ?? 0) - (index.get(`2026:${code}`)?.total ?? 0)) * 100,
  ) / 100
const entgelt = (row: Stelle | undefined) =>
  row ? schaetzung(row.grades, row.year, stufe.value, besoldungsStufe.value).euro : 0
const entgeltDifferenz = (code: string) =>
  entgelt(index.get(`2027:${code}`)) - entgelt(index.get(`2026:${code}`))
const wert = (row: Stelle) => (kennzahl.value === 'vzae' ? row.total : entgelt(row))
const beschaeftigungsWert = (row: Stelle, art: 'Tarif_' | 'Beamte_') => {
  if (kennzahl.value === 'vzae')
    return Object.entries(row.grades)
      .filter(([key]) => key.startsWith(art))
      .reduce((summe, [, value]) => summe + value, 0)

  const schaetzungDerZeile = schaetzung(row.grades, row.year, stufe.value, besoldungsStufe.value)
  return Object.entries(row.grades)
    .filter(([key]) => key.startsWith(art))
    .reduce((summe, [key, value]) => {
      const jahreswert =
        key === 'Tarif_TVOEDFEST'
          ? schaetzungDerZeile.durchschnittTarif
          : jahresentgelt(key, row.year, stufe.value, besoldungsStufe.value)
      return summe + (jahreswert ?? 0) * value
    }, 0)
}
const veraenderung = (code: string) =>
  kennzahl.value === 'vzae' ? differenz(code) : entgeltDifferenz(code)
const vorzeichen = (wert: number) => `${wert > 0 ? '+' : ''}${vzae(wert)}`
const geldVorzeichen = (wert: number) => `${wert > 0 ? '+' : ''}${euroKurz(wert)}`
const wertFormat = (value: number) =>
  kennzahl.value === 'vzae' ? `${vzae(value)} VZÄ` : euroKurz(value)
const deltaFormat = (value: number) =>
  kennzahl.value === 'vzae' ? `${vorzeichen(value)} VZÄ` : geldVorzeichen(value)
const anzeigeName = (name: string) =>
  name
    .toLocaleLowerCase('de-DE')
    .replace(/(^|[\s/-])\p{L}/gu, (treffer) => treffer.toLocaleUpperCase('de-DE'))
const auswahlZeilen = computed(() =>
  stellen.filter(
    (r) => r.year === jahr.value && (bereich.value === 'all' || r.code.startsWith(bereich.value)),
  ),
)
const bereiche = computed<RangZeile[]>(() =>
  Object.entries(daten.areas)
    .map(([code, name]) => ({
      code,
      name,
      value: stellen
        .filter((row) => row.year === jahr.value && row.code.startsWith(code))
        .reduce((summe, row) => summe + wert(row), 0),
      kind: 'area' as const,
    }))
    .filter((row) => row.value > 0),
)
const sortiert = computed<RangZeile[]>(() => {
  if (ansicht.value === 'map' && bereich.value === 'all')
    return [...bereiche.value].sort((a, b) => b.value - a.value)
  return auswahlZeilen.value
    .map((row) => ({
      code: row.code,
      name: anzeigeName(row.name),
      value: ansicht.value === 'change' ? veraenderung(row.code) : wert(row),
      kind: 'group' as const,
    }))
    .filter((row) => ansicht.value !== 'change' || row.value !== 0)
    .sort((a, b) =>
      ansicht.value === 'change' ? Math.abs(b.value) - Math.abs(a.value) : b.value - a.value,
    )
})
const balken = computed(() => [...sortiert.value].filter((row) => row.kind === 'group').reverse())
const topListe = computed(() => sortiert.value.slice(0, 7))
const aktuell = computed(() =>
  stellen.find((row) => row.year === jahr.value && row.code === auswahl.value),
)
watch([bereich, jahr], () => {
  if (aktuell.value && (bereich.value === 'all' || aktuell.value.code.startsWith(bereich.value)))
    return
  auswahl.value = ''
})
const gesamt = computed(() =>
  stellen.filter((r) => r.year === jahr.value).reduce((sum, r) => sum + r.total, 0),
)
const gesamtDelta = stellen
  .filter((r) => r.year === '2027')
  .reduce((sum, r) => sum + differenz(r.code), 0)
const gruppen = computed(() =>
  Object.entries(aktuell.value?.grades ?? {})
    .filter(([, wert]) => wert > 0)
    .sort((a, b) => b[1] - a[1]),
)
const aktuelleSchaetzung = computed(() =>
  schaetzung(aktuell.value?.grades ?? {}, jahr.value, stufe.value, besoldungsStufe.value),
)
const stadtSchaetzung = computed(() =>
  stellen
    .filter((r) => r.year === jahr.value)
    .reduce(
      (summe, r) => {
        const wert = schaetzung(r.grades, jahr.value, stufe.value, besoldungsStufe.value)
        summe.euro += wert.euro
        summe.bewertet += wert.bewertet
        summe.unbewertet += wert.unbewertet
        summe.angenahert += wert.angenahert
        return summe
      },
      { euro: 0, bewertet: 0, unbewertet: 0, angenahert: 0 },
    ),
)
const bewertungsquote = computed(() => {
  const summe = stadtSchaetzung.value.bewertet + stadtSchaetzung.value.unbewertet
  return summe === 0 ? 0 : (stadtSchaetzung.value.bewertet / summe) * 100
})
const kennzahlGesamt = computed(() =>
  kennzahl.value === 'vzae' ? gesamt.value : stadtSchaetzung.value.euro,
)
const kennzahlDelta = computed(() =>
  kennzahl.value === 'vzae'
    ? gesamtDelta
    : stellen
        .filter((r) => r.year === '2027')
        .reduce((summe, r) => summe + entgeltDifferenz(r.code), 0),
)
const gruppenJahresentgelt = (key: string, value: number) => {
  const betrag =
    key === 'Tarif_TVOEDFEST'
      ? aktuelleSchaetzung.value.durchschnittTarif
      : jahresentgelt(key, jahr.value, stufe.value, besoldungsStufe.value)
  return betrag == null ? null : betrag * value
}
const gruppenHinweis = (key: string) => hinweisZumWert(key, stufe.value, besoldungsStufe.value)
const gruppenName = (key: string) =>
  key
    .replace('Beamte_', '')
    .replace('Tarif_', '')
    .replace('_LG2E2', ' (LG 2.2)')
    .replace('_LG2E1', ' (LG 2.1)')
    .replace('TVOEDFEST', 'TVöD fest')
const quelle = 'Haushaltsplan 2026/27, Band 2 · Stellenplan nach Besoldungsgruppen'
const bereichName = computed(() =>
  bereich.value === 'all'
    ? ''
    : ((daten.areas as Record<string, string>)[bereich.value] ?? 'Produktbereich'),
)
const titel = computed(() =>
  ansicht.value === 'change'
    ? 'Wo verändert sich der Stellenplan?'
    : bereich.value === 'all'
      ? 'Wo stecken die Stellen?'
      : bereichName.value,
)
const beschreibung = computed(() =>
  ansicht.value === 'change'
    ? '2027 minus 2026 · Änderungen nach Größe sortiert · Balken auswählen'
    : bereich.value === 'all'
      ? `Fläche = ${kennzahl.value === 'vzae' ? 'Stellenumfang' : 'geschätztes Tabellenentgelt'} · Themenbereich auswählen`
      : `Fläche = ${kennzahl.value === 'vzae' ? 'Stellenumfang' : 'geschätztes Tabellenentgelt'} · Produktgruppe auswählen`,
)
const hauptHoehe = computed(() =>
  ansicht.value === 'map' ? '520px' : `${Math.max(240, balken.value.length * 40 + 75)}px`,
)
const detailZeilen = computed(() =>
  [...gruppen.value]
    .map(([key, value]) => ({
      key,
      value: kennzahl.value === 'vzae' ? value : (gruppenJahresentgelt(key, value) ?? undefined),
    }))
    .filter((row): row is { key: string; value: number } => row.value != null)
    .reverse(),
)
const detailHoehe = computed(() => `${Math.max(180, detailZeilen.value.length * 38 + 70)}px`)
const tooltip = { renderMode: 'richText' as const, confine: true }
const anteilsFarbe = (beamtenAnteil: number) => {
  const tarif = [0, 113, 236]
  const beamte = [153, 81, 219]
  const anteil = Math.max(0, Math.min(1, beamtenAnteil))
  const kanaele = tarif.map((wert, index) =>
    Math.round(wert + ((beamte[index] ?? wert) - wert) * anteil),
  )
  return `rgb(${kanaele.join(', ')})`
}
const statusKinder = (rows: Stelle[], code?: string) => {
  const tarif = rows.reduce((summe, row) => summe + beschaeftigungsWert(row, 'Tarif_'), 0)
  const beamte = rows.reduce((summe, row) => summe + beschaeftigungsWert(row, 'Beamte_'), 0)
  return [
    {
      name: 'Tarifbeschäftigte',
      value: tarif,
      areaCode: bereich.value === 'all' ? rows[0]?.code.slice(0, 2) : bereich.value,
      code,
      itemStyle: { color: KATEGORIE_FARBEN[0] },
    },
    {
      name: 'Beamtinnen / Beamte',
      value: beamte,
      areaCode: bereich.value === 'all' ? rows[0]?.code.slice(0, 2) : bereich.value,
      code,
      itemStyle: { color: KATEGORIE_FARBEN[3] },
    },
  ].filter((row) => row.value > 0)
}
const treemapDaten = computed(() => {
  if (bereich.value === 'all')
    return Object.entries(daten.areas)
      .map(([code, name]) => {
        const rows = stellen.filter((row) => row.year === jahr.value && row.code.startsWith(code))
        const tarif = rows.reduce(
          (summe, row) =>
            summe +
            Object.entries(row.grades)
              .filter(([key]) => key.startsWith('Tarif_'))
              .reduce((teil, [, value]) => teil + value, 0),
          0,
        )
        const beamte = rows.reduce(
          (summe, row) =>
            summe +
            Object.entries(row.grades)
              .filter(([key]) => key.startsWith('Beamte_'))
              .reduce((teil, [, value]) => teil + value, 0),
          0,
        )
        const beamtenAnteil = tarif + beamte === 0 ? 0 : beamte / (tarif + beamte)
        return {
          name,
          value: rows.reduce((summe, row) => summe + wert(row), 0),
          areaCode: code,
          beamtenAnteil,
          itemStyle: { color: anteilsFarbe(beamtenAnteil) },
        }
      })
      .filter((row) => row.value > 0)

  return auswahlZeilen.value.map((row) => ({
    name: anzeigeName(row.name),
    value: wert(row),
    code: row.code,
    areaCode: bereich.value,
    children: statusKinder([row], row.code),
  }))
})
const hauptOption = computed<EChartsOption>(() => {
  if (ansicht.value === 'map')
    return {
      tooltip: {
        ...tooltip,
        formatter: (params: unknown) => {
          const info = params as {
            name: string
            value: number
            data?: { beamtenAnteil?: number }
          }
          const zeilen = [`${info.name}`, wertFormat(Number(info.value))]
          if (typeof info.data?.beamtenAnteil === 'number')
            zeilen.push(`${vzae(info.data.beamtenAnteil * 100)} % Beamtinnen / Beamte`)
          return zeilen.join('\n')
        },
      },
      series: [
        {
          type: 'treemap',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          left: 0,
          right: 0,
          top: 12,
          bottom: 0,
          upperLabel: {
            show: bereich.value !== 'all',
            height: 42,
            overflow: 'truncate',
            formatter: (p) => `${p.name}\n${wertFormat(Number(p.value))}`,
          },
          label: {
            show: true,
            color: '#ffffff',
            fontSize: bereich.value === 'all' ? 16 : 12,
            fontWeight: bereich.value === 'all' ? 650 : 400,
            lineHeight: bereich.value === 'all' ? 23 : 16,
            overflow: 'truncate',
            formatter: (p) => `${p.name}\n${wertFormat(Number(p.value))}`,
          },
          levels: [
            { itemStyle: { borderWidth: 0, gapWidth: 5 } },
            {
              itemStyle: { borderColor: '#ffffff', borderWidth: 3, gapWidth: 2 },
              upperLabel: { show: bereich.value !== 'all' },
            },
            {
              itemStyle: { borderColor: '#ffffff', borderWidth: 1, gapWidth: 1 },
              upperLabel: { show: false },
            },
          ],
          data: treemapDaten.value,
        },
      ],
    }
  return {
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) => deltaFormat(Number(value)),
    },
    grid: { left: 4, right: 68, top: 20, bottom: 40, containLabel: true },
    xAxis: {
      type: 'value',
      name: kennzahl.value === 'vzae' ? 'Δ VZÄ' : 'Δ Euro/Jahr',
      nameLocation: 'middle',
      nameGap: 28,
    },
    yAxis: {
      type: 'category',
      data: balken.value.map((r) => `${r.code} ${r.name}`),
      axisLabel: { interval: 0, width: 125, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        label: {
          show: true,
          position: 'right',
          formatter: (p) => deltaFormat(Number(p.value)),
        },
        data: balken.value.map((r) => ({
          value: r.value,
          code: r.code,
          itemStyle: {
            color: r.value < 0 ? POL_FARBEN.negativ : KATEGORIE_FARBEN[0],
          },
        })),
      },
    ],
  }
})
const detailOption = computed<EChartsOption>(() => {
  const rows = detailZeilen.value
  return {
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      valueFormatter: (value) => wertFormat(Number(value)),
    },
    grid: { left: 4, right: 60, top: 15, bottom: 40, containLabel: true },
    xAxis: {
      type: 'value',
      name: kennzahl.value === 'vzae' ? 'VZÄ' : 'Euro/Jahr',
      nameLocation: 'middle',
      nameGap: 28,
    },
    yAxis: {
      type: 'category',
      data: rows.map((row) => gruppenName(row.key)),
      axisLabel: { interval: 0 },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        label: { show: true, position: 'right', formatter: (p) => wertFormat(Number(p.value)) },
        data: rows.map((row) => ({
          value: row.value,
          itemStyle: {
            color: row.key.startsWith('Beamte_') ? KATEGORIE_FARBEN[3] : KATEGORIE_FARBEN[0],
          },
        })),
      },
    ],
  }
})
function waehlen(event: unknown) {
  if (typeof event !== 'object' || !event || !('data' in event)) return
  const data = event.data
  if (typeof data !== 'object' || !data) return
  if ('code' in data && typeof data.code === 'string' && data.code) {
    auswahl.value = data.code
    return
  }
  if ('areaCode' in data && typeof data.areaCode === 'string') bereich.value = data.areaCode
}
function rangWaehlen(row: RangZeile) {
  if (row.kind === 'area') bereich.value = row.code
  else auswahl.value = row.code
}
function zurUebersicht() {
  bereich.value = 'all'
  auswahl.value = ''
}
</script>

<template>
  <div class="mm-seite">
    <PageIntro
      titel="Stellenatlas Münster"
      beschreibung="Wo arbeitet die Stadt? Der Stellenatlas zeigt geplante Stellen in Vollzeitäquivalenten (VZÄ) – nicht tatsächliche Beschäftigtenzahlen."
    />
    <div class="stellen-kennzahlen" aria-live="polite">
      <div>
        <span>Stadt insgesamt · {{ jahr }}</span>
        <strong v-if="kennzahl === 'vzae'"
          >{{ vzae(kennzahlGesamt) }} <GlossarBegriff id="vzae">VZÄ</GlossarBegriff></strong
        >
        <strong v-else>{{ euroKurz(kennzahlGesamt) }}</strong>
      </div>
      <div>
        <span>Veränderung 2026 → 2027 · Stadt insgesamt</span
        ><strong>{{
          kennzahl === 'vzae' ? `${vorzeichen(kennzahlDelta)} VZÄ` : geldVorzeichen(kennzahlDelta)
        }}</strong>
      </div>
      <div v-if="kennzahl === 'vzae'">
        <span>Aufgaben der Stadt</span><strong>63 Produktgruppen</strong>
      </div>
      <div v-else>
        <span>Davon mit Näherungswert</span
        ><strong>{{ vzae(stadtSchaetzung.angenahert) }} VZÄ</strong>
        <small>{{ vzae(bewertungsquote) }} % der Stellen bewertet</small>
      </div>
    </div>
    <div class="stellen-filter" aria-label="Darstellung filtern">
      <div class="stellen-metrik" role="group" aria-label="Kennzahl">
        <button type="button" :aria-pressed="kennzahl === 'vzae'" @click="kennzahl = 'vzae'">
          VZÄ
        </button>
        <button type="button" :aria-pressed="kennzahl === 'entgelt'" @click="kennzahl = 'entgelt'">
          Gehaltskosten
        </button>
      </div>
      <div class="stellen-ansichten" role="group" aria-label="Zeitraumvergleich">
        <button
          v-for="view in ansichten"
          :key="view.id"
          type="button"
          :aria-pressed="ansicht === view.id"
          @click="ansicht = view.id"
        >
          {{ view.name }}
        </button>
      </div>
      <wa-select
        v-if="kennzahl === 'entgelt'"
        class="stellen-stufe"
        label="TVöD-Stufe"
        :value="String(stufe)"
        @change="stufe = Number(auswahlWert($event))"
      >
        <wa-option v-for="nr in 6" :key="nr" :value="String(nr)">Stufe {{ nr }}</wa-option>
      </wa-select>
      <wa-select
        v-if="kennzahl === 'entgelt'"
        class="stellen-stufe"
        label="Besoldungsstufe"
        :value="String(besoldungsStufe)"
        @change="besoldungsStufe = Number(auswahlWert($event))"
      >
        <wa-option v-for="nr in 10" :key="nr + 2" :value="String(nr + 2)">
          Stufe {{ nr + 2 }}
        </wa-option>
      </wa-select>
      <wa-select label="Planjahr" :value="jahr" @change="jahr = auswahlWert($event)">
        <wa-option value="2026">2026</wa-option>
        <wa-option value="2027">2027</wa-option>
      </wa-select>
      <wa-select
        class="stellen-bereich"
        label="Produktbereich"
        :value="bereich"
        @change="bereich = auswahlWert($event)"
      >
        <wa-option value="all">Alle Produktbereiche</wa-option>
        <wa-option v-for="(name, code) in daten.areas" :key="code" :value="code">
          {{ name }}
        </wa-option>
      </wa-select>
    </div>
    <ChartCard
      :titel="titel"
      :beschreibung="beschreibung"
      :quelle="quelle"
      :pdf="{ band: 2, seite: 41 }"
    >
      <div v-if="bereich !== 'all'" class="stellen-pfad">
        <button type="button" class="stellen-zurueck" @click="zurUebersicht">
          ← Alle Themenbereiche
        </button>
        <span aria-hidden="true">›</span>
        <strong>{{ bereichName }}</strong>
      </div>
      <div
        v-if="ansicht === 'map' && bereich === 'all'"
        class="stellen-farbskala"
        aria-label="Farbskala für den Beamtenanteil"
      >
        <span>0 % Beamte</span>
        <i aria-hidden="true"></i>
        <span>100 % Beamte</span>
      </div>
      <div v-else-if="ansicht === 'map'" class="stellen-legende stellen-legende--haupt">
        <span><i :style="{ background: KATEGORIE_FARBEN[0] }"></i>Tarifbeschäftigte</span>
        <span><i :style="{ background: KATEGORIE_FARBEN[3] }"></i>Beamtinnen / Beamte</span>
      </div>
      <p v-if="ansicht === 'change' && !balken.length" role="status">
        In diesem Produktbereich ändert sich die Gesamtstellenzahl keiner Produktgruppe.
      </p>
      <div v-else class="stellen-visualisierung">
        <BaseChart
          :key="`${ansicht}-${bereich}`"
          :option="hauptOption"
          :hoehe="hauptHoehe"
          @chart-click="waehlen"
        />
        <aside class="stellen-topliste" aria-label="Größte Bereiche">
          <h3>
            {{
              ansicht === 'change'
                ? 'Größte Veränderungen'
                : bereich === 'all'
                  ? 'Größte Themenbereiche'
                  : 'Größte Produktgruppen'
            }}
          </h3>
          <ol>
            <li v-for="row in topListe" :key="row.code">
              <button type="button" @click="rangWaehlen(row)">
                <span>{{ row.code }} · {{ row.name }}</span>
                <strong>{{
                  ansicht === 'change' ? deltaFormat(row.value) : wertFormat(row.value)
                }}</strong>
              </button>
            </li>
          </ol>
        </aside>
      </div>
      <details>
        <summary>Alle Werte als Tabelle</summary>
        <DatenTabelle>
          <caption class="sr-only">
            {{
              titel
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">
                {{ bereich === 'all' && ansicht === 'map' ? 'Themenbereich' : 'Produktgruppe' }}
              </th>
              <th scope="col" class="mm-zahl">
                {{
                  kennzahl === 'vzae'
                    ? ansicht === 'change'
                      ? 'Δ VZÄ'
                      : 'VZÄ'
                    : ansicht === 'change'
                      ? 'Δ Tabellenentgelt/Jahr'
                      : 'Tabellenentgelt/Jahr'
                }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortiert" :key="row.code">
              <td>
                <button type="button" class="stellen-textbutton" @click="rangWaehlen(row)">
                  {{ row.code }} · {{ row.name }}
                </button>
              </td>
              <td class="mm-zahl">
                {{ ansicht === 'change' ? deltaFormat(row.value) : wertFormat(row.value) }}
              </td>
            </tr>
          </tbody>
        </DatenTabelle>
      </details>
    </ChartCard>

    <ChartCard
      v-if="aktuell"
      titel="Ausgewählte Produktgruppe"
      beschreibung="Alle Entgelt- und Besoldungsgruppen mit Stellenanteilen in der Auswahl."
      :quelle="quelle"
      :pdf="{ band: 2, seite: 41 }"
    >
      <wa-select
        label="Produktgruppe"
        placeholder="Produktgruppe auswählen"
        :value="auswahl"
        @change="auswahl = auswahlWert($event)"
      >
        <wa-option v-for="row in auswahlZeilen" :key="row.code" :value="row.code">
          {{ row.code }} · {{ anzeigeName(row.name) }}
        </wa-option>
      </wa-select>
      <div v-if="aktuell" aria-live="polite">
        <h3>{{ anzeigeName(aktuell.name) }}</h3>
        <p class="stellen-detailzahl">
          {{
            kennzahl === 'vzae'
              ? `${vzae(aktuell.total)} VZÄ`
              : `${euroKurz(aktuelleSchaetzung.euro)} · TVöD ${stufe} / Besoldung ${besoldungsStufe}`
          }}
          · {{ jahr }}
        </p>
        <p>{{ deltaFormat(veraenderung(aktuell.code)) }} von 2026 auf 2027</p>
      </div>
      <div v-if="kennzahl === 'vzae'" class="stellen-legende">
        <span><i :style="{ background: KATEGORIE_FARBEN[0] }"></i>Tarifbeschäftigte</span
        ><span><i :style="{ background: KATEGORIE_FARBEN[3] }"></i>Beamtinnen / Beamte</span>
      </div>
      <p v-else class="stellen-hinweis">
        Alle Gruppen sind bewertet; Näherungen sind in der Tabelle gekennzeichnet.
      </p>
      <BaseChart :option="detailOption" :hoehe="detailHoehe" />
      <details>
        <summary>Besoldungsgruppen als Tabelle</summary>
        <DatenTabelle>
          <thead>
            <tr>
              <th scope="col">Gruppe</th>
              <th scope="col" class="mm-zahl">VZÄ</th>
              <th scope="col" class="mm-zahl">Geschätzte Kosten/Jahr</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[key, value] in gruppen" :key="key">
              <td>{{ gruppenName(key) }}</td>
              <td class="mm-zahl">{{ vzae(value) }}</td>
              <td class="mm-zahl">
                <template v-if="gruppenJahresentgelt(key, value) != null">
                  {{ euro(gruppenJahresentgelt(key, value)!) }}
                  <small v-if="gruppenHinweis(key)" class="stellen-leise">
                    {{ gruppenHinweis(key) }}
                  </small>
                </template>
                <span v-else class="stellen-leise">Kein Wert verfügbar</span>
              </td>
            </tr>
          </tbody>
        </DatenTabelle>
      </details>
    </ChartCard>

    <section class="stellen-gesamt" aria-labelledby="gesamtuebersicht-titel">
      <div>
        <h2 id="gesamtuebersicht-titel">Alle Aufgaben und Produktgruppen auf einen Blick</h2>
        <p>
          Die vollständige Hierarchie des Stellenplans als interaktive Gesamtübersicht erkunden.
        </p>
      </div>
      <RouterLink
        class="stellen-gesamt__link"
        :to="{ name: 'stellenplan-gesamt', query: { jahr, kennzahl } }"
      >
        Gesamtübersicht öffnen →
      </RouterLink>
    </section>
    <ChartCard
      v-if="kennzahl === 'entgelt'"
      titel="Zur Gehaltskostenschätzung"
      beschreibung="Szenario bei vollständiger Besetzung der Planstellen mit den gewählten TVöD- und Besoldungsstufen."
      quelle="VKA-Entgelttabellen und Grundgehaltstabellen NRW"
    >
      <div class="entgelt-kopf">
        <p>
          2026 wird monatsgenau mit vier Monaten des vorherigen und acht Monaten des neuen
          Tarifstands berechnet. Für 2027 wird der Stand ab Mai 2026 unverändert fortgeschrieben.
          Die NRW-Grundgehälter ab April 2026 werden für beide Planjahre mit zwölf Monaten
          angesetzt.
        </p>
      </div>
      <div class="entgelt-kennzahlen" aria-live="polite">
        <div>
          <span>Stadt insgesamt · {{ jahr }}</span>
          <strong>{{ euro(stadtSchaetzung.euro) }}</strong>
          <small>{{ vzae(stadtSchaetzung.bewertet) }} bewertete VZÄ</small>
        </div>
        <div>
          <span>Ausgewählte Produktgruppe</span>
          <strong>{{ euro(aktuelleSchaetzung.euro) }}</strong>
          <small v-if="aktuell">{{ aktuell.code }} · {{ anzeigeName(aktuell.name) }}</small>
        </div>
        <div>
          <span>Näherungswerte</span>
          <strong>{{ vzae(stadtSchaetzung.angenahert) }} VZÄ</strong>
          <small>{{ vzae(bewertungsquote) }} % der Stellen bewertet</small>
        </div>
      </div>
      <p class="stellen-hinweis">
        Enthalten ist nur das monatliche Tabellenentgelt × 12 beziehungsweise der monatsgenaue
        Tarifwechsel 2026. Jahressonderzahlung, Zulagen, Zuschläge, Arbeitgeberanteile und
        Versorgungskosten sind nicht enthalten. TVöD-Festentgelte erhalten den gewichteten
        Tarifmittelwert ihrer Produktgruppe. S10 ist der Mittelwert aus S9 und S11b; fehlende
        Stufe-1-Werte von P7–P9 werden aus dem Abstand von Stufe 2 zu 3 zurückgerechnet. Bei
        A-Besoldungsgruppen ohne die gewählte Stufe gilt die nächstgelegene vorhandene Stufe. A9Z
        enthält nur A9 ohne Amtszulage.
      </p>
      <details>
        <summary>Tarifquellen</summary>
        <ul>
          <li v-for="tarifquelle in TARIF_QUELLEN" :key="tarifquelle.url">
            <a :href="tarifquelle.url" target="_blank" rel="noopener noreferrer">
              {{ tarifquelle.name }}
            </a>
          </li>
          <li>
            <a :href="BESOLDUNG_QUELLE.url" target="_blank" rel="noopener noreferrer">
              {{ BESOLDUNG_QUELLE.name }}
            </a>
          </li>
        </ul>
      </details>
    </ChartCard>
    <p class="stellen-hinweis">
      Die Summen werden aus den Besoldungsgruppen berechnet. Gegenüber der separaten
      Stellenübersicht ergeben sich kleine Abweichungen (2026: 0,06 VZÄ; 2027: 0,07 VZÄ), die noch
      am Originalplan geprüft werden müssen.
    </p>
  </div>
</template>

<style scoped>
.stellen-kennzahlen {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wa-space-xl);
}
.stellen-kennzahlen > div {
  flex: 1;
  min-width: 12rem;
}
.stellen-kennzahlen span,
.stellen-kennzahlen strong,
.stellen-kennzahlen small {
  display: block;
}
.stellen-kennzahlen span,
.stellen-kennzahlen small,
.stellen-hinweis {
  color: var(--wa-color-text-quiet);
}
.stellen-kennzahlen strong,
.stellen-detailzahl {
  font-size: var(--wa-font-size-xl);
  font-variant-numeric: tabular-nums;
}
.stellen-filter,
.stellen-ansichten,
.stellen-metrik {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--wa-space-s);
}
.stellen-filter {
  flex-wrap: wrap;
}
.stellen-filter > wa-select {
  flex: 0 1 auto;
  width: 8rem;
  min-width: 0;
  max-width: 100%;
}
.stellen-filter > .stellen-bereich {
  flex: 1 1 16rem;
  width: auto;
  max-width: min(22rem, 36vw);
}
.stellen-filter > .stellen-stufe {
  width: 10rem;
}
.stellen-metrik {
  padding-right: var(--wa-space-s);
  border-right: 1px solid var(--wa-color-surface-border);
}
button {
  font: inherit;
  color: inherit;
  background: var(--wa-color-surface-default);
  border: 1px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-m);
  padding: var(--wa-space-s);
  min-height: 44px;
  max-width: 100%;
  cursor: pointer;
}
/* Ausgewählter Filter: leicht orange hinterlegt statt vollflächig laut. */
button[aria-pressed='true'] {
  background: var(--mm-auswahl-flaeche);
  border-color: var(--mm-auswahl-rand);
  color: var(--mm-auswahl-text);
  font-weight: var(--wa-font-weight-semibold);
}
.stellen-visualisierung {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(15rem, 0.3fr);
  gap: var(--wa-space-l);
  align-items: start;
}
.stellen-visualisierung > * {
  min-width: 0;
}
.stellen-pfad {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--wa-space-xs);
  margin-bottom: var(--wa-space-s);
  color: var(--wa-color-text-quiet);
}
.stellen-zurueck {
  min-height: 36px;
  padding: var(--wa-space-xs) var(--wa-space-s);
  color: var(--wa-color-text-link);
}
h3 {
  overflow-wrap: anywhere;
  font-size: var(--wa-font-size-m);
}
.stellen-legende {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wa-space-s);
  font-size: var(--wa-font-size-s);
}
.stellen-legende i {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  margin-right: 0.35rem;
  border-radius: 50%;
}
.stellen-legende--haupt {
  margin-bottom: var(--wa-space-xs);
}
.stellen-farbskala {
  display: grid;
  grid-template-columns: auto minmax(7rem, 18rem) auto;
  align-items: center;
  gap: var(--wa-space-xs);
  width: fit-content;
  margin-bottom: var(--wa-space-xs);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}
.stellen-farbskala i {
  display: block;
  height: 0.75rem;
  border-radius: 999px;
  background: linear-gradient(90deg, rgb(0 113 236), rgb(153 81 219));
}
.stellen-topliste {
  border-left: 1px solid var(--wa-color-surface-border);
  padding-left: var(--wa-space-l);
}
.stellen-topliste h3 {
  margin: var(--wa-space-s) 0;
}
.stellen-topliste ol {
  display: grid;
  gap: var(--wa-space-2xs);
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: topliste;
}
.stellen-topliste li {
  counter-increment: topliste;
}
.stellen-topliste button {
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 1fr);
  gap: 0 var(--wa-space-xs);
  width: 100%;
  padding: var(--wa-space-xs) 0;
  min-height: 48px;
  text-align: left;
  border: 0;
  border-radius: 0;
  border-bottom: 1px solid var(--wa-color-surface-border);
}
.stellen-topliste button::before {
  content: counter(topliste) '.';
  grid-row: 1 / span 2;
  color: var(--wa-color-text-quiet);
}
.stellen-topliste button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stellen-topliste button strong {
  font-size: var(--wa-font-size-s);
  font-variant-numeric: tabular-nums;
}
.stellen-gesamt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--wa-space-l);
  padding: var(--wa-space-xl);
  border: 1px solid var(--wa-color-brand-border-quiet);
  border-radius: var(--wa-border-radius-l);
  background: var(--wa-color-brand-fill-quiet);
}
.stellen-gesamt h2,
.stellen-gesamt p {
  margin: 0;
}
.stellen-gesamt h2 {
  font-size: var(--wa-font-size-l);
}
.stellen-gesamt p {
  margin-top: var(--wa-space-xs);
  color: var(--wa-color-text-quiet);
}
.stellen-gesamt__link {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: var(--wa-space-s) var(--wa-space-m);
  border-radius: var(--wa-border-radius-m);
  color: var(--wa-color-brand-on-loud);
  background: var(--wa-color-brand-fill-loud);
  font-weight: var(--wa-font-weight-semibold);
  text-decoration: none;
}
summary {
  cursor: pointer;
  padding-block: var(--wa-space-s);
}
.stellen-textbutton {
  text-align: left;
  border: 0;
  padding: 0;
  color: var(--wa-color-text-link);
}
.stellen-leise,
.entgelt-kopf p,
.entgelt-kennzahlen small {
  color: var(--wa-color-text-quiet);
}
td .stellen-leise {
  display: block;
  max-width: 22rem;
  white-space: normal;
}
.entgelt-kopf {
  display: flex;
  align-items: end;
  gap: var(--wa-space-l);
  margin-bottom: var(--wa-space-l);
}
.entgelt-kopf p {
  max-width: var(--mm-lesebreite);
  margin: 0;
}
.entgelt-kennzahlen {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--wa-space-l);
}
.entgelt-kennzahlen span,
.entgelt-kennzahlen strong,
.entgelt-kennzahlen small {
  display: block;
}
.entgelt-kennzahlen strong {
  font-size: var(--wa-font-size-xl);
  font-variant-numeric: tabular-nums;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
@media (max-width: 850px) {
  .stellen-kennzahlen {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--wa-space-l) var(--wa-space-m);
  }
  .stellen-kennzahlen > div {
    min-width: 0;
  }
  .stellen-kennzahlen > div:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
  .stellen-visualisierung {
    grid-template-columns: minmax(0, 1fr);
  }
  .stellen-topliste {
    border-left: 0;
    border-top: 1px solid var(--wa-color-surface-border);
    padding: var(--wa-space-m) 0 0;
  }
  .stellen-filter {
    flex-wrap: wrap;
  }
  .stellen-filter > label,
  .stellen-filter > label:last-child {
    flex: 1 1 12rem;
    width: auto;
  }
  .entgelt-kopf {
    align-items: stretch;
    flex-direction: column;
  }
  .entgelt-kennzahlen {
    grid-template-columns: minmax(0, 1fr);
  }
  .stellen-gesamt {
    align-items: stretch;
    flex-direction: column;
  }
  .stellen-gesamt__link {
    justify-content: center;
  }
}
</style>

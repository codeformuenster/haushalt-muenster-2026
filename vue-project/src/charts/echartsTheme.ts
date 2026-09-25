/**
 * Gemeinsame ECharts-Konfiguration für alle Seiten.
 *
 * Zweck: Jede Seite soll nur noch ihre `option` schreiben müssen — Farben,
 * Schrift, Achsen und Tooltip kommen von hier, damit die Diagramme über alle
 * Seiten hinweg gleich aussehen. Nicht pro Seite überschreiben; wenn hier etwas
 * fehlt, im Team abstimmen und diese Datei erweitern.
 */
import { registerTheme, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, MapChart, PieChart, SankeyChart, TreemapChart } from 'echarts/charts'
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'

// ECharts ist modular: Nur was hier registriert ist, lässt sich in einer
// `option` verwenden. Fehlt ein Diagrammtyp, hier ergänzen.
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  TreemapChart,
  SankeyChart,
  MapChart,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
])

export const CHART_THEME = 'muenster-money'

/**
 * Kategoriale Palette für Serien ohne inhaltliche Reihenfolge (Produktbereiche,
 * Beschäftigtengruppen ...). Die Reihenfolge ist fix: Serie 1 nimmt Farbe 1,
 * Serie 2 Farbe 2 usw. Nicht umsortieren und nicht im Kreis wiederverwenden —
 * die Abstände sind so gewählt, dass benachbarte Farben auch bei Rot-Grün-Sehschwäche
 * unterscheidbar bleiben (geprüft für hellen und dunklen Hintergrund).
 *
 * Mehr als acht Kategorien: Rest zu "Sonstige" zusammenfassen, statt Farben zu wiederholen.
 */
export const KATEGORIE_FARBEN = [
  '#0071ec', // blau
  '#cd491c', // orange
  '#008fab', // türkis
  '#9951db', // violett
  '#00883c', // grün
  '#c84382', // pink
  '#b45f04', // ocker
  '#6163f2', // indigo
] as const

/**
 * Abgestufte Skala für Größen mit natürlicher Reihenfolge — wenig bis viel.
 * Gedacht für `visualMap`, vor allem die Einfärbung der Karte: die Stufen
 * werden heller nach dunkler, das liest sich auch in Graustufen und bei jeder
 * Farbsehschwäche noch als Rangfolge.
 *
 * Nicht für Kategorien nehmen — dafür gibt es KATEGORIE_FARBEN. Und nicht für
 * Werte mit Vorzeichen; dann POL_FARBEN.
 *
 * Die Skala endet bewusst vor dem tiefsten Blau: Gebietsnamen stehen dunkel mit
 * weißem Rand darauf und bleiben so auch auf der stärksten Stufe lesbar.
 */
export const SEQUENZ_FARBEN = [
  '#eaf1fc',
  '#c6daf5',
  '#9dbeec',
  '#6d9ce1',
  '#3a78d4',
  '#1257b0',
] as const

/** Für Gegenüberstellungen mit Vorzeichen: Erträge vs. Aufwendungen, Plan vs. Ist. */
export const POL_FARBEN = {
  positiv: '#00883c',
  negativ: '#cd491c',
  neutral: '#717584',
} as const

const TEXT_NORMAL = '#31333d'
const TEXT_LEISE = '#545868'
const LINIE = '#e4e5e9'

const achse = {
  axisLine: { show: true, lineStyle: { color: LINIE } },
  axisTick: { show: false },
  axisLabel: { color: TEXT_LEISE, fontSize: 12 },
  splitLine: { show: false, lineStyle: { color: LINIE } },
}

registerTheme(CHART_THEME, {
  color: [...KATEGORIE_FARBEN],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: TEXT_NORMAL,
  },
  // Achsen und Gitter bleiben zurückhaltend, damit die Daten vorne stehen.
  categoryAxis: achse,
  valueAxis: {
    ...achse,
    axisLine: { show: false },
    splitLine: { show: true, lineStyle: { color: LINIE } },
  },
  legend: {
    textStyle: { color: TEXT_LEISE, fontSize: 12 },
    icon: 'roundRect',
    itemWidth: 12,
    itemHeight: 12,
  },
  tooltip: {
    backgroundColor: '#ffffff',
    borderColor: LINIE,
    borderWidth: 1,
    textStyle: { color: TEXT_NORMAL, fontSize: 13 },
    extraCssText: 'box-shadow: 0 4px 16px rgba(0,0,0,.12); border-radius: 6px;',
  },
  // Abgerundete Balkenenden und dünne Linien — bewusst schlanke Markierungen.
  bar: { itemStyle: { borderRadius: [4, 4, 0, 0] } },
  line: { lineStyle: { width: 2 }, symbolSize: 8, showSymbol: false },
  pie: { itemStyle: { borderColor: '#ffffff', borderWidth: 2 } },
})

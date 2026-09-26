import type { InjectionKey } from 'vue'

/**
 * Verbindung zwischen <ChartCard> und dem <BaseChart> darin: Die Karte gibt die
 * IDs ihres Titels und ihrer Beschreibung weiter, damit das Diagramm für
 * Screenreader denselben Namen bekommt wie die Karte.
 */
export interface ChartKontext {
  titelId: string
  beschreibungId: () => string | undefined
}

export const CHART_KONTEXT: InjectionKey<ChartKontext> = Symbol('mm-chart-kontext')

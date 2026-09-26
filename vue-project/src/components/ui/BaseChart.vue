<script setup lang="ts">
/**
 * Einheitlicher Diagramm-Wrapper. Seiten übergeben nur die `option` —
 * Theme, Farben und das Mitwachsen beim Fenster-Resize sind hier schon geregelt.
 */
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { CHART_THEME } from '@/charts/echartsTheme'
import { CHART_KONTEXT } from '@/components/ui/chartKontext'

const emit = defineEmits<{
  chartClick: [params: unknown]
}>()

const props = withDefaults(
  defineProps<{
    /** ECharts-Konfiguration des Diagramms. */
    option: EChartsOption
    /** Höhe des Diagramms, z. B. '420px'. */
    hoehe?: string
    /**
     * Textalternative für Screenreader: Was zeigt das Diagramm, was ist die
     * Kernaussage — und wo stehen die Werte als Tabelle? Ohne diese Angabe
     * gelten Titel und Beschreibung der umgebenden <ChartCard>.
     */
    beschreibung?: string
  }>(),
  { hoehe: '320px', beschreibung: undefined },
)

/*
 * Ein Canvas ist für Screenreader leer. Der Rahmen wird deshalb als Grafik
 * (role="img") mit Namen ausgezeichnet: entweder aus `beschreibung` oder aus
 * Titel und Beschreibung der umgebenden Karte.
 */
const kontext = inject(CHART_KONTEXT, undefined)
const ariaAttribute = computed(() =>
  props.beschreibung
    ? { 'aria-label': props.beschreibung }
    : kontext
      ? {
          'aria-labelledby': kontext.titelId,
          'aria-describedby': kontext.beschreibungId(),
        }
      : { 'aria-label': 'Diagramm' },
)

/* Wer in den Systemeinstellungen weniger Bewegung wünscht, bekommt Diagramme
   ohne Einblend- und Übergangsanimationen. */
const wenigerBewegung =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const optionMitVorgaben = computed<EChartsOption>(() =>
  wenigerBewegung ? { ...props.option, animation: false } : props.option,
)

/*
 * Alles, was nicht Prop ist — vor allem Ereignis-Listener wie
 * @legendselectchanged — gehört an das Diagramm, nicht an den Rahmen-<div>.
 * Ohne das landen Listener auf einem Element, das sie nie auslöst.
 */
defineOptions({ inheritAttrs: false })

const rahmen = ref<HTMLElement | null>(null)
const hatBreite = ref(false)
let beobachter: ResizeObserver | undefined

/*
 * Diagramme stecken in <wa-card>, einer Web Component. Beim ersten Rendern ist
 * die Karte noch nicht ausgelegt, der Container also 0 Pixel breit — ECharts
 * würde in ein Diagramm ohne Größe zeichnen und das im Log bemängeln. Deshalb
 * warten wir, bis der Container tatsächlich Platz hat.
 */
onMounted(() => {
  if (!rahmen.value) return
  beobachter = new ResizeObserver((eintraege) => {
    if (eintraege.some((eintrag) => eintrag.contentRect.width > 0)) {
      hatBreite.value = true
      beobachter?.disconnect()
    }
  })
  beobachter.observe(rahmen.value)
})

onBeforeUnmount(() => beobachter?.disconnect())
</script>

<template>
  <div ref="rahmen" class="mm-chart" :style="{ height: hoehe }" role="img" v-bind="ariaAttribute">
    <VChart
      v-if="hatBreite"
      v-bind="$attrs"
      :option="optionMitVorgaben"
      :theme="CHART_THEME"
      autoresize
      @click="(params: unknown) => emit('chartClick', params)"
    />
  </div>
</template>

<style scoped>
.mm-chart {
  width: 100%;
}
</style>

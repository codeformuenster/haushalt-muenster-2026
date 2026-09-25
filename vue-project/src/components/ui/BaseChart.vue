<script setup lang="ts">
/**
 * Einheitlicher Diagramm-Wrapper. Seiten übergeben nur die `option` —
 * Theme, Farben und das Mitwachsen beim Fenster-Resize sind hier schon geregelt.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { CHART_THEME } from '@/charts/echartsTheme'

const emit = defineEmits<{
  chartClick: [params: unknown]
}>()

withDefaults(
  defineProps<{
    /** ECharts-Konfiguration des Diagramms. */
    option: EChartsOption
    /** Höhe des Diagramms, z. B. '420px'. */
    hoehe?: string
  }>(),
  { hoehe: '320px' },
)

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
  <div ref="rahmen" class="mm-chart" :style="{ height: hoehe }">
    <VChart
      v-if="hatBreite"
      :option="option"
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

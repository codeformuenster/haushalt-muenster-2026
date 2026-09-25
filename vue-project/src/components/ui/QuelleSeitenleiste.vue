<script setup lang="ts">
/**
 * Seitenleiste mit der Quelle eines einzelnen Werts: der Ausschnitt der PDF-Seite
 * um die Zeile, ein Link ins Original-PDF und die Zeile der Roh-CSV.
 *
 * Weiß nichts über die Seite, die sie benutzt. Die Seite lädt die Angaben selbst
 * und reicht sie als `quelle` herein; solange `quelle` null ist, zeigt die
 * Seitenleiste "wird geladen", bei `fehler` eine kurze Fehlermeldung.
 */
import { nextTick, ref, watch } from 'vue'

export interface Quelle {
  titel: string
  /** Fertig formatierter Betrag, z. B. "46.000 €". */
  betrag: string
  band: number
  seite: number
  /** URL des Seitenbilds. */
  bild: string
  /** Seitengröße in PDF-Punkten; `box` ist in derselben Einheit. */
  bildBreite: number
  bildHoehe: number
  /** Rechteck der Zeile auf der Seite: [x0, oben, x1, unten] in PDF-Punkten. */
  box: [number, number, number, number]
  pdfUrl: string
  csv: { datei: string; zeile: number; zellen: string[]; url: string }
}

const offen = defineModel<boolean>('offen', { required: true })

const props = defineProps<{
  quelle: Quelle | null
  fehler?: boolean
}>()

/**
 * CSS-Pixel je PDF-Punkt. Die Schrift im Haushaltsplan ist 5,6 pt klein; auf
 * Leistenbreite gestaucht wäre sie unlesbar. Deshalb in fester Größe mit
 * waagerechtem Scrollen, das Seitenbild hat dafür 2 Pixel je Punkt.
 */
const SKALA = 1.5

const ausschnitt = ref<HTMLElement | null>(null)

const prozent = (wert: number, gesamt: number): string => `${(wert / gesamt) * 100}%`

/** Scrollt den Ausschnitt so, dass die markierte Zeile mittig und ihr Anfang links steht. */
function zurZeile(): void {
  const q = props.quelle
  const el = ausschnitt.value
  if (!q || !el) return
  const [x0, oben, , unten] = q.box
  el.scrollTop = ((oben + unten) / 2) * SKALA - el.clientHeight / 2
  el.scrollLeft = x0 * SKALA - 8
}

watch(
  () => props.quelle,
  () => nextTick(zurZeile),
)

/** Nur Ereignisse der Leiste selbst; wa-details darin meldet dieselben Ereignisse. */
function nachDemZeigen(ereignis: Event): void {
  if (ereignis.target === ereignis.currentTarget) zurZeile()
}

function nachDemSchliessen(ereignis: Event): void {
  if (ereignis.target === ereignis.currentTarget) offen.value = false
}
</script>

<template>
  <wa-drawer
    class="mm-quelle"
    label="Quelle"
    placement="end"
    light-dismiss
    :open="offen"
    @wa-after-show="nachDemZeigen"
    @wa-after-hide="nachDemSchliessen"
  >
    <p v-if="fehler" class="mm-quelle__hinweis">
      Die Quellenangaben konnten nicht geladen werden.
    </p>
    <p v-else-if="!quelle" class="mm-quelle__hinweis">Quelle wird geladen …</p>

    <template v-else>
      <div class="mm-quelle__kopf">
        <h3>{{ quelle.titel }}</h3>
        <p class="mm-quelle__betrag">{{ quelle.betrag }}</p>
        <p class="mm-quelle__fundstelle">Band {{ quelle.band }}, PDF-Seite {{ quelle.seite }}</p>
      </div>

      <div ref="ausschnitt" class="mm-quelle__ausschnitt">
        <div
          class="mm-quelle__seite"
          :style="{ width: `${quelle.bildBreite * SKALA}px`, height: `${quelle.bildHoehe * SKALA}px` }"
        >
          <img :src="quelle.bild" :alt="`Band ${quelle.band}, PDF-Seite ${quelle.seite}`" />
          <div
            class="mm-quelle__markierung"
            :style="{
              left: prozent(quelle.box[0], quelle.bildBreite),
              top: prozent(quelle.box[1], quelle.bildHoehe),
              width: prozent(quelle.box[2] - quelle.box[0], quelle.bildBreite),
              height: prozent(quelle.box[3] - quelle.box[1], quelle.bildHoehe),
            }"
          ></div>
        </div>
      </div>

      <a
        class="mm-quelle__link"
        :href="`${quelle.pdfUrl}#page=${quelle.seite}`"
        target="_blank"
        rel="noopener"
      >
        PDF-Seite {{ quelle.seite }} öffnen
        <wa-icon name="arrow-up-right-from-square" aria-hidden="true"></wa-icon>
      </a>

      <wa-details summary="Zeile in der Rohdaten-CSV">
        <p class="mm-quelle__datei">
          <code>{{ quelle.csv.datei }}</code>, Zeile {{ quelle.csv.zeile }}
        </p>
        <ol class="mm-quelle__zellen">
          <li v-for="(zelle, i) in quelle.csv.zellen" :key="i">{{ zelle || '(leer)' }}</li>
        </ol>
        <a class="mm-quelle__link" :href="quelle.csv.url" target="_blank" rel="noopener">
          Auf GitHub ansehen
          <wa-icon name="arrow-up-right-from-square" aria-hidden="true"></wa-icon>
        </a>
      </wa-details>
    </template>
  </wa-drawer>
</template>

<style scoped>
.mm-quelle {
  /* Die Leiste schrumpft auf schmalen Bildschirmen von selbst auf volle Breite. */
  --size: 34rem;
}

.mm-quelle__hinweis {
  margin: 0;
  color: var(--wa-color-text-quiet);
}

.mm-quelle__kopf h3 {
  margin: 0;
  font-size: var(--wa-font-size-m);
  line-height: 1.3;
}

.mm-quelle__kopf p {
  margin: var(--wa-space-3xs) 0 0;
}

.mm-quelle__betrag {
  font-size: var(--wa-font-size-l);
  font-weight: var(--wa-font-weight-bold);
  font-variant-numeric: tabular-nums;
}

.mm-quelle__fundstelle {
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
}

.mm-quelle__ausschnitt {
  height: 16rem;
  margin: var(--wa-space-m) 0;
  overflow: auto;
  border: 1px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-m);
  background: white;
}

.mm-quelle__seite {
  position: relative;
}

.mm-quelle__seite img {
  display: block;
  width: 100%;
  height: 100%;
}

.mm-quelle__markierung {
  position: absolute;
  background: color-mix(in oklab, var(--mm-amber-glow) 25%, transparent);
  outline: 2px solid var(--mm-blaze-orange);
  pointer-events: none;
}

.mm-quelle__link {
  display: inline-flex;
  align-items: center;
  gap: var(--wa-space-2xs);
  margin-bottom: var(--wa-space-m);
}

.mm-quelle__datei {
  margin: 0 0 var(--wa-space-xs);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  overflow-wrap: anywhere;
}

.mm-quelle__zellen {
  margin: 0 0 var(--wa-space-s);
  padding-left: var(--wa-space-l);
  color: var(--wa-color-text-normal);
  font-size: var(--wa-font-size-s);
}
</style>

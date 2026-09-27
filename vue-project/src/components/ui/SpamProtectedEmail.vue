<script setup lang="ts">
import { computed } from 'vue'

/**
 * Setzt die Kontaktadresse erst im Browser zusammen. Damit landet sie weder
 * als Klartext im HTML noch als leicht auffindbarer String im JavaScript.
 * Gegen Crawler, die JavaScript ausführen, ist das bewusst nur Basisschutz.
 */
const zeichen = [
  109, 117, 101, 110, 115, 116, 101, 114, 64, 99, 111, 100, 101, 102, 111, 114, 46, 100, 101,
]

const adresse = computed(() => String.fromCharCode(...zeichen))
const mailto = computed(() => `mailto:${adresse.value}`)
</script>

<template>
  <a :href="mailto">{{ adresse }}</a>
</template>

<script setup lang="ts">
/**
 * Markiert eine Seite, die noch Platzhalterzahlen zeigt.
 *
 * Sobald eine Seite auf echte Daten aus dem Haushaltsplan umgestellt ist, wird
 * dieser Hinweis dort entfernt. Wenn die Komponente am Ende nirgends mehr
 * verwendet wird, kann die Datei gelöscht werden.
 */
</script>

<template>
  <wa-callout variant="warning" appearance="outlined">
    <strong>Beispieldaten.</strong> Die Zahlen auf dieser Seite sind erfunden und dienen nur
    dazu, das Layout zu zeigen. Sie stammen noch nicht aus dem Haushaltsplan.
  </wa-callout>
</template>

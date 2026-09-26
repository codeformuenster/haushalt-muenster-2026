<script setup lang="ts">
/**
 * Rahmen und Grundstil für alle Tabellen der Seite. Der Inhalt (caption, thead,
 * tbody, tfoot) kommt über den Slot; Zahlenspalten bekommen die Klasse `mm-zahl`.
 * Seitenspezifische Zeilen- oder Spaltenstile bleiben auf der jeweiligen Seite.
 */
</script>

<template>
  <!-- Auf schmalen Fenstern darf die Tabelle scrollen statt die Seite zu sprengen. -->
  <div class="mm-tabelle-rahmen">
    <table class="mm-tabelle">
      <slot />
    </table>
  </div>
</template>

<!-- Nicht scoped: Der Tabelleninhalt stammt aus dem Slot der aufrufenden Seite. -->
<style>
.mm-tabelle-rahmen {
  overflow-x: auto;
}

.mm-tabelle {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--wa-color-surface-border);
  font-size: var(--wa-font-size-s);
}

.mm-tabelle th,
.mm-tabelle td {
  padding: var(--wa-space-2xs) var(--wa-space-s);
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--wa-color-surface-border);
}

.mm-tabelle th {
  color: var(--wa-color-text-quiet);
  font-weight: var(--wa-font-weight-bold);
}

/* Summenzeilen: der tfoot und Zwischensummen im tbody (Klasse `mm-summe`).
   Nur das Label ist <th scope="row">, die Beträge sind <td> — Web Awesome setzt
   jedes andere <th> als Spaltenkopf in kleinerer Schrift. */
.mm-tabelle tfoot th,
.mm-tabelle tfoot td,
.mm-tabelle .mm-summe th,
.mm-tabelle .mm-summe td {
  color: var(--wa-color-text-normal);
  font-weight: var(--wa-font-weight-semibold);
  background: color-mix(in srgb, var(--wa-color-surface-lowered) 55%, transparent);
}

.mm-tabelle tfoot th,
.mm-tabelle tfoot td {
  border-bottom: none;
}

.mm-tabelle .mm-zahl {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
</style>

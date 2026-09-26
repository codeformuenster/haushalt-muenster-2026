<script setup lang="ts">
/**
 * „Made in Münsterhack“-Plakette unten rechts, verlinkt auf muensterhack.de.
 * Farben und Look wie dort: Münster-Gelb und -Rot, schwarzer Rahmen, harter
 * Pixel-Schatten, Monospace-Schrift. Share Tech Mono wird bewusst nicht
 * nachgeladen (keine Anfrage an Google Fonts), es greift die System-Monospace.
 */
</script>

<template>
  <a
    class="mm-hack-badge"
    href="https://muensterhack.de/"
    target="_blank"
    rel="noopener"
    aria-label="Made in Münsterhack (öffnet muensterhack.de in neuem Tab)"
  >
    <span class="mm-hack-badge__oben">Made in</span>
    <span class="mm-hack-badge__name">Münsterhack</span>
  </a>
</template>

<style scoped>
.mm-hack-badge {
  --mm-hack-gelb: #fcdd09;
  --mm-hack-rot: #da121a;

  position: fixed;
  right: var(--wa-space-m);
  bottom: var(--wa-space-m);
  z-index: 10;
  display: flex;
  flex-direction: column;
  border: 2px solid #000;
  background-color: var(--mm-hack-gelb);
  box-shadow: 4px 4px 0 #000;
  color: #000;
  font-family: 'Share Tech Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace;
  line-height: 1.1;
  text-decoration: none;
  text-transform: uppercase;
  transition:
    transform var(--wa-transition-fast),
    box-shadow var(--wa-transition-fast);
}

.mm-hack-badge__oben {
  padding: 0.25em 0.6em 0.15em;
  font-size: var(--wa-font-size-2xs);
  letter-spacing: 0.1em;
}

/* Weiß auf Rot hält 4,9:1. */
.mm-hack-badge__name {
  padding: 0.2em 0.6em 0.25em;
  background-color: var(--mm-hack-rot);
  color: #fff;
  font-size: var(--wa-font-size-s);
  font-weight: var(--wa-font-weight-bold);
  letter-spacing: 0.05em;
}

/* Beim Drücken „rastet“ die Plakette in ihren Schatten ein. */
.mm-hack-badge:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #000;
}

.mm-hack-badge:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 #000;
}

.mm-hack-badge:focus-visible {
  outline: var(--wa-focus-ring);
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .mm-hack-badge {
    transition: none;
  }
}

@media print {
  .mm-hack-badge {
    display: none;
  }
}
</style>

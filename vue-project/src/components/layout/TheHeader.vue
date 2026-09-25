<script setup lang="ts">
/**
 * Kopfzeile für alle Seiten: Wortmarke plus Navigation.
 *
 * Die Links werden aus den Routen mit `meta.nav` erzeugt — neue Seite anlegen
 * heißt also: Eintrag in src/router/index.ts, hier ist nichts zu tun.
 */
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import logoUrl from '/src/assets/images/Logo.svg'

const navIcons: Record<string, string> = {
  '/': 'house',
  '/ueberblick': 'chart-pie',
  '/ein-ausgaben': 'scale-balanced',
  '/stellenplan': 'users',
  '/freiwillige-leistungen': 'hand-holding-heart',
  '/bezirke': 'map-location-dot',
  '/planspiel': 'chess-knight',
  '/glossar': 'book-open',
}

const router = useRouter()

const links = computed(() =>
  router.options.routes
    .filter((route) => route.meta?.nav)
    .map((route) => ({
      ziel: route.path,
      text: route.meta!.nav as string,
      icon: navIcons[route.path] ?? 'circle',
    })),
)
</script>

<template>
  <div class="mm-header">
    <RouterLink to="/" class="mm-header__marke">
      <img :src="logoUrl" alt="" class="mm-header__logo" aria-hidden="true" />
      Münster<span>Money</span>
    </RouterLink>

    <nav class="mm-header__nav" aria-label="Hauptnavigation">
      <RouterLink v-for="link in links" :key="link.ziel" :to="link.ziel">
        <wa-icon :name="link.icon" aria-hidden="true" class="mm-header__nav-icon" />
        <span>{{ link.text }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.mm-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--wa-space-m) var(--wa-space-xl);
  max-width: 72rem;
  margin-inline: auto;
  padding: var(--wa-space-m) var(--wa-space-l);
}

.mm-header__marke {
  display: inline-flex;
  align-items: center;
  gap: var(--wa-space-2xs);
  font-size: var(--wa-font-size-l);
  font-weight: var(--wa-font-weight-bold);
  color: var(--wa-color-text-normal);
  text-decoration: none;
  white-space: nowrap;
}

.mm-header__logo {
  width: 2.6rem;
  height: 2.6rem;
  object-fit: contain;
}

.mm-header__marke span {
  color: var(--wa-color-brand-on-quiet);
}

.mm-header__nav {
  display: flex;
  /*
   * Auf schmalen Bildschirmen brechen die Links in mehrere Zeilen um. Bewusst
   * kein seitliches Scrollen: das würde verlangen, dass jeder Container in der
   * Kette darüber schrumpfen darf — tut einer es nicht, wird die ganze Seite
   * breiter als der Bildschirm.
   */
  flex-wrap: wrap;
  gap: var(--wa-space-2xs) var(--wa-space-l);
  margin-inline-start: auto;
  min-width: 0;
}

.mm-header__nav a {
  display: inline-flex;
  align-items: center;
  gap: var(--wa-space-2xs);
  padding-block: var(--wa-space-2xs);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}

.mm-header__nav-icon {
  font-size: 0.95em;
  color: currentColor;
}

.mm-header__nav a:hover {
  color: var(--wa-color-text-normal);
}

.mm-header__nav a.router-link-active {
  color: var(--wa-color-brand-on-quiet);
  border-bottom-color: var(--wa-color-brand-border-loud);
}
</style>

<script setup lang="ts">
/**
 * Kopfzeile für alle Seiten: Wortmarke plus Navigation.
 *
 * Die Links werden aus den Routen mit `meta.nav` erzeugt — neue Seite anlegen
 * heißt also: Eintrag in src/router/index.ts, hier ist nichts zu tun.
 *
 * Ab Tablet-Breite steht die Navigation offen in der Kopfzeile. Darunter ist
 * dafür kein Platz: acht Links brächen in drei Zeilen um und schöben den
 * Seiteninhalt nach unten. Deshalb liegen sie dort in einer Seitenleiste, die
 * das Burger-Menü öffnet. Welche der beiden Varianten sichtbar ist, entscheidet
 * CSS — die Links stehen einmal im Markup und werden zweimal ausgegeben.
 */
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import logoUrl from '/src/assets/images/Logo.svg'

const navIcons: Record<string, string> = {
  '/': 'house',
  '/ueberblick': 'chart-pie',
  '/ein-ausgaben': 'scale-balanced',
  '/stellenplan': 'users',
  '/zuschuesse': 'hand-holding-heart',
  '/bezirke': 'map-location-dot',
  '/planspiel': 'chess-knight',
  '/glossar': 'book-open',
}

const router = useRouter()
const route = useRoute()

const links = computed(() =>
  router.options.routes
    .filter((route) => route.meta?.nav)
    .map((route) => ({
      ziel: route.path,
      text: route.meta!.nav as string,
      icon: navIcons[route.path] ?? 'circle',
    })),
)

const menueOffen = ref(false)

/* Nach einem Klick auf einen Link soll die Seitenleiste nicht offen stehen
   bleiben. Auf den Pfad zu horchen fängt auch den Fall mit ab, dass die
   Navigation von woanders kommt — etwa über die Zurück-Taste. */
watch(
  () => route.fullPath,
  () => (menueOffen.value = false),
)

/* <wa-drawer> schließt sich bei Escape und Klick daneben selbst; ohne diese
   Rückmeldung wüsste unser `menueOffen` nichts davon und der Knopf würde die
   Leiste beim nächsten Druck nicht wieder öffnen. */
function nachDemSchliessen(ereignis: Event): void {
  if (ereignis.target === ereignis.currentTarget) menueOffen.value = false
}
</script>

<template>
  <div class="mm-header">
    <RouterLink to="/" class="mm-header__marke">
      <img :src="logoUrl" alt="" class="mm-header__logo" aria-hidden="true" />
      Münster<span>Money</span>
    </RouterLink>

    <nav class="mm-header__nav" aria-label="Hauptnavigation">
      <RouterLink
        v-for="link in links"
        :key="link.ziel"
        :to="link.ziel"
        :class="{
          'router-link-active': link.ziel !== '/' && route.path.startsWith(`${link.ziel}/`),
        }"
      >
        <wa-icon :name="link.icon" aria-hidden="true" class="mm-header__nav-icon" />
        <span>{{ link.text }}</span>
      </RouterLink>
    </nav>

    <wa-button
      class="mm-header__burger"
      appearance="plain"
      size="large"
      aria-label="Navigation öffnen"
      aria-haspopup="dialog"
      :aria-expanded="menueOffen ? 'true' : 'false'"
      @click="menueOffen = true"
    >
      <wa-icon name="bars" label="Menü"></wa-icon>
    </wa-button>

    <wa-drawer
      class="mm-header__leiste"
      label="Navigation"
      placement="end"
      light-dismiss
      :open="menueOffen"
      @wa-after-hide="nachDemSchliessen"
    >
      <nav class="mm-header__nav-mobil" aria-label="Hauptnavigation">
        <RouterLink
          v-for="link in links"
          :key="link.ziel"
          :to="link.ziel"
          :class="{
            'router-link-active': link.ziel !== '/' && route.path.startsWith(`${link.ziel}/`),
          }"
        >
          <wa-icon :name="link.icon" aria-hidden="true" class="mm-header__nav-icon" />
          <span>{{ link.text }}</span>
        </RouterLink>
      </nav>
    </wa-drawer>
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
   * Zwischen Burger-Breite und Desktop brechen die Links in mehrere Zeilen um.
   * Bewusst kein seitliches Scrollen: das würde verlangen, dass jeder Container
   * in der Kette darüber schrumpfen darf — tut einer es nicht, wird die ganze
   * Seite breiter als der Bildschirm.
   */
  flex-wrap: wrap;
  gap: var(--wa-space-2xs) var(--wa-space-l);
  margin-inline-start: auto;
  min-width: 0;
}

.mm-header__nav a,
.mm-header__nav-mobil a {
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

.mm-header__nav a:hover,
.mm-header__nav-mobil a:hover {
  color: var(--wa-color-text-normal);
}

.mm-header__nav a.router-link-active,
.mm-header__nav-mobil a.router-link-active {
  color: var(--wa-color-brand-on-quiet);
  border-bottom-color: var(--wa-color-brand-border-loud);
}

/* --- Burger-Menü ------------------------------------------------------- */

.mm-header__burger {
  margin-inline-start: auto;
  font-size: var(--wa-font-size-l);
}

.mm-header__leiste {
  --size: 17rem;
}

.mm-header__nav-mobil {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-xs);
}

.mm-header__nav-mobil a {
  /* In der Leiste ist Platz: größere Schrift und eine Zeilenhöhe, die als
     Tippfläche taugt (Richtwert 44 px). */
  gap: var(--wa-space-s);
  padding-block: var(--wa-space-xs);
  font-size: var(--wa-font-size-m);
  border-bottom: none;
  border-inline-start: 3px solid transparent;
  padding-inline-start: var(--wa-space-s);
}

.mm-header__nav-mobil a.router-link-active {
  border-bottom: none;
  border-inline-start-color: var(--wa-color-brand-border-loud);
  background-color: var(--mm-auswahl-flaeche);
  border-radius: var(--wa-border-radius-s);
}

.mm-header__nav-mobil .mm-header__nav-icon {
  /* Feste Breite, damit die Beschriftungen untereinander auf einer Kante
     beginnen, auch wenn die Symbole verschieden breit sind. */
  width: 1.25em;
  text-align: center;
  font-size: 1em;
}

/* Unterhalb der Tablet-Breite (siehe SCHMAL_BIS in src/lib/bildschirm.ts)
   ersetzt der Burger die offene Navigation. */
@media (max-width: 699px) {
  .mm-header__nav {
    display: none;
  }
}

@media (min-width: 700px) {
  .mm-header__burger,
  .mm-header__leiste {
    display: none;
  }
}
</style>

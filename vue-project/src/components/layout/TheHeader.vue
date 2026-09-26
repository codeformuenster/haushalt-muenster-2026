<script setup lang="ts">
/**
 * Kopfzeile für alle Seiten: Wortmarke plus Navigation.
 *
 * Die sichtbaren Einträge werden aus den Routen mit `meta.nav` erzeugt. Für
 * die Gruppierung in „Entdecken“ und „Ausprobieren“ gibt es feste Pfadlisten.
 *
 * Ab Tablet-Breite steht die Navigation offen in der Kopfzeile (als Buttons,
 * teils in Dropdowns). Darunter zeigt das Burger-Menü die mobile Linkliste.
 * Welche der beiden Varianten sichtbar ist, entscheidet CSS.
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
  '/eine-million': 'piggy-bank',
  '/glossar': 'book-open',
}

const router = useRouter()
const route = useRoute()

type NavLink = {
  ziel: string
  text: string
  icon: string
}

const NAV_ENTDECKEN = ['/ein-ausgaben', '/stellenplan', '/zuschuesse', '/bezirke'] as const
const NAV_AUSPROBIEREN = ['/planspiel', '/eine-million', '/mehr-oder-weniger'] as const

const links = computed<NavLink[]>(() =>
  router.options.routes
    .filter((routenEintrag) => routenEintrag.meta?.nav && routenEintrag.path !== '/')
    .map((routenEintrag) => ({
      ziel: routenEintrag.path,
      text: routenEintrag.meta!.nav as string,
      icon: navIcons[routenEintrag.path] ?? 'circle',
    })),
)

const linkNachPfad = computed(() => new Map(links.value.map((link) => [link.ziel, link])))

const ueberblickLink = computed(() => linkNachPfad.value.get('/ueberblick'))
const glossarLink = computed(() => linkNachPfad.value.get('/glossar'))

function linksNachPfaden(pfade: readonly string[]): NavLink[] {
  return pfade
    .map((pfad) => linkNachPfad.value.get(pfad))
    .filter((link): link is NavLink => Boolean(link))
}

const entdeckenLinks = computed(() => linksNachPfaden(NAV_ENTDECKEN))
const ausprobierenLinks = computed(() => linksNachPfaden(NAV_AUSPROBIEREN))

function istAktiv(ziel: string): boolean {
  return route.path === ziel || route.path.startsWith(`${ziel}/`)
}

function gruppeIstAktiv(gruppenLinks: NavLink[]): boolean {
  return gruppenLinks.some((link) => istAktiv(link.ziel))
}

function geheZu(ziel: string): void {
  void router.push(ziel)
}

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
      <wa-button
        v-if="ueberblickLink"
        :class="{
          'mm-header__nav-button': true,
          'mm-header__nav-button--aktiv': istAktiv(ueberblickLink.ziel),
        }"
        size="small"
        appearance="plain"
        :variant="istAktiv(ueberblickLink.ziel) ? 'brand' : 'neutral'"
        @click="geheZu(ueberblickLink.ziel)"
      >
        <wa-icon :name="ueberblickLink.icon" aria-hidden="true" slot="start" class="mm-header__nav-icon" />
        <span>{{ ueberblickLink.text }}</span>
      </wa-button>

      <wa-dropdown class="mm-header__dropdown">
        <wa-button
          slot="trigger"
          :class="{
            'mm-header__dropdown-trigger': true,
            'mm-header__dropdown-trigger--aktiv': gruppeIstAktiv(entdeckenLinks),
          }"
          size="small"
          appearance="plain"
          :variant="gruppeIstAktiv(entdeckenLinks) ? 'brand' : 'neutral'"
          with-caret
        >
          <wa-icon name="compass" aria-hidden="true" slot="start" class="mm-header__nav-icon" />
          Entdecken
        </wa-button>

        <div class="mm-header__dropdown-inhalt">
          <RouterLink
            v-for="link in entdeckenLinks"
            :key="link.ziel"
            :to="link.ziel"
            :class="{ 'router-link-active': istAktiv(link.ziel) }"
          >
            <wa-icon :name="link.icon" aria-hidden="true" class="mm-header__nav-icon" />
            <span>{{ link.text }}</span>
          </RouterLink>
        </div>
      </wa-dropdown>

      <wa-dropdown class="mm-header__dropdown">
        <wa-button
          slot="trigger"
          :class="{
            'mm-header__dropdown-trigger': true,
            'mm-header__dropdown-trigger--aktiv': gruppeIstAktiv(ausprobierenLinks),
          }"
          size="small"
          appearance="plain"
          :variant="gruppeIstAktiv(ausprobierenLinks) ? 'brand' : 'neutral'"
          with-caret
        >
          <wa-icon name="flask" aria-hidden="true" slot="start" class="mm-header__nav-icon" />
          Ausprobieren
        </wa-button>

        <div class="mm-header__dropdown-inhalt">
          <RouterLink
            v-for="link in ausprobierenLinks"
            :key="link.ziel"
            :to="link.ziel"
            :class="{ 'router-link-active': istAktiv(link.ziel) }"
          >
            <wa-icon :name="link.icon" aria-hidden="true" class="mm-header__nav-icon" />
            <span>{{ link.text }}</span>
          </RouterLink>
        </div>
      </wa-dropdown>

      <wa-button
        v-if="glossarLink"
        :class="{
          'mm-header__nav-button': true,
          'mm-header__nav-button--aktiv': istAktiv(glossarLink.ziel),
        }"
        size="small"
        appearance="plain"
        :variant="istAktiv(glossarLink.ziel) ? 'brand' : 'neutral'"
        @click="geheZu(glossarLink.ziel)"
      >
        <wa-icon :name="glossarLink.icon" aria-hidden="true" slot="start" class="mm-header__nav-icon" />
        <span>{{ glossarLink.text }}</span>
      </wa-button>
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
          :class="{ 'router-link-active': istAktiv(link.ziel) }"
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
  gap: var(--wa-space-2xs) var(--wa-space-xs);
  margin-inline-start: auto;
  min-width: 0;
}

.mm-header__dropdown {
  display: inline-flex;
}

.mm-header__nav-button,
.mm-header__dropdown-trigger {
  font-size: var(--wa-font-size-s);
}

.mm-header__nav-button::part(base),
.mm-header__dropdown-trigger::part(base) {
  min-height: 2rem;
  background-repeat: no-repeat;
  background-position: center bottom;
}

.mm-header__nav-button--aktiv::part(base),
.mm-header__dropdown-trigger--aktiv::part(base) {
  background-image: linear-gradient(var(--wa-color-brand-border-loud), var(--wa-color-brand-border-loud));
  background-size: calc(100% - 28px) 2px;
}

.mm-header__dropdown-inhalt {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-3xs);
  min-width: 14rem;
  padding: var(--wa-space-2xs);
}

.mm-header__dropdown-inhalt a {
  display: inline-flex;
  align-items: center;
  gap: var(--wa-space-2xs);
  padding: var(--wa-space-2xs) var(--wa-space-s);
  color: var(--wa-color-text-quiet);
  font-size: var(--wa-font-size-s);
  text-decoration: none;
  white-space: nowrap;
  border: none;
  border-bottom: none;
  border-radius: var(--wa-border-radius-s);
}

.mm-header__dropdown-inhalt a:hover {
  color: var(--wa-color-text-normal);
  background-color: var(--mm-auswahl-flaeche);
}

.mm-header__dropdown-inhalt a.router-link-active {
  color: var(--wa-color-brand-on-quiet);
  background-color: var(--mm-auswahl-flaeche);
  border-bottom: none;
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

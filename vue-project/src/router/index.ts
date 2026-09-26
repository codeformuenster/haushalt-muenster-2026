import { nextTick } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import StartPage from '@/pages/StartPage.vue'

/**
 * Zentrale Zuordnung URL -> Seite.
 *
 * Geteilte Datei: hier stehen alle Seiten schon drin, damit beim Bauen der
 * einzelnen Seiten niemand mehr diese Datei anfassen muss. `meta.nav` ist die
 * Beschriftung in der Navigation — die Navigation baut sich daraus selbst auf,
 * eine neue Seite braucht also nur einen Eintrag hier.
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** Beschriftung im Header. Ohne diesen Wert taucht die Route nicht in der Navigation auf. */
    nav?: string
    /** Seitentitel im Browser-Tab; fehlt er, gilt `nav`. */
    titel?: string
  }
}

const router = createRouter({
  // Hash URLs also work when opened directly on static GitHub Pages hosting.
  history: createWebHashHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'start',
      component: StartPage,
      meta: { nav: 'Start' },
    },
    {
      path: '/ueberblick',
      name: 'ueberblick',
      component: () => import('@/pages/UeberblickPage.vue'),
      meta: { nav: 'Überblick' },
    },
    {
      path: '/ein-ausgaben',
      name: 'ein-ausgaben',
      component: () => import('@/pages/EinAusgabenPage.vue'),
      meta: { nav: 'Ein- & Ausgaben', titel: 'Einnahmen und Ausgaben' },
    },
    {
      path: '/stellenplan',
      name: 'stellenplan',
      component: () => import('@/pages/StellenplanPage.vue'),
      meta: { nav: 'Stellenplan' },
    },
    {
      path: '/stellenplan/gesamtuebersicht',
      name: 'stellenplan-gesamt',
      component: () => import('@/pages/StellenplanGesamtPage.vue'),
      meta: { titel: 'Stellenplan – Gesamtübersicht' },
    },
    {
      path: '/zuschuesse',
      name: 'zuschuesse',
      component: () => import('@/pages/ZuschuessePage.vue'),
      meta: { nav: 'Zuschüsse' },
    },
    {
      path: '/bezirke',
      name: 'bezirke',
      component: () => import('@/pages/BezirkePage.vue'),
      meta: { nav: 'Bezirke' },
    },
    {
      path: '/planspiel',
      name: 'planspiel',
      component: () => import('@/pages/PlanspielPage.vue'),
      meta: { nav: 'Planspiel' },
    },
    {
      path: '/eine-million',
      name: 'eine-million',
      component: () => import('@/pages/MillionPage.vue'),
      meta: { nav: '1 Mio. €', titel: 'Was kostet eine Million?' },
    },
    {
      path: '/mehr-oder-weniger',
      name: 'mehr-oder-weniger',
      component: () => import('@/pages/MehrOderWenigerPage.vue'),
      meta: { nav: 'Schätzduell', titel: 'Mehr oder weniger? – Schätzduell' },
    },
    {
      path: '/glossar',
      name: 'glossar',
      component: () => import('@/pages/GlossarPage.vue'),
      meta: { nav: 'Glossar' },
    },
    {
      // Unbekannte Adressen landen auf der Startseite statt auf einer leeren Seite.
      path: '/:pfad(.*)*',
      redirect: { name: 'start' },
    },
  ],
  // Sprungziele wie #/glossar#vzae (Links aus <GlossarBegriff>): zum Eintrag scrollen,
  // mit Abstand für den klebenden Seitenkopf. Der ist auf schmalen Bildschirmen
  // mehrzeilig, daher seine tatsächliche Höhe. Sonst immer nach oben.
  scrollBehavior: (to) =>
    to.hash
      ? {
          el: to.hash,
          top: (document.querySelector('.mm-shell__header')?.clientHeight ?? 64) + 16,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        }
      : { top: 0 },
})

/*
 * Nach jedem Seitenwechsel: Titel im Browser-Tab setzen und den Fokus an den
 * Anfang der neuen Seite legen. Ohne das bliebe der Fokus auf dem angeklickten
 * Navigationslink, und Screenreader bekämen vom Seitenwechsel nichts mit.
 * Beim ersten Laden bleibt der Fokus, wo der Browser ihn hinlegt.
 */
router.afterEach((to, from) => {
  // Startseite: der ausführliche Titel aus index.html.
  const titel = to.name === 'start' ? undefined : (to.meta.titel ?? to.meta.nav)
  document.title = titel
    ? `${titel} — Münster Money`
    : 'Münster Money — Haushalt der Stadt Münster 2026/2027'

  if (from.matched.length === 0 || to.path === from.path) {
    if (to.hash && to.hash !== from.hash) fokussiere(to.hash.slice(1))
    return
  }
  // Seiten werden nachgeladen: erst nach dem Rendern existiert die neue h1.
  nextTick(() => setTimeout(() => fokussiere(to.hash ? to.hash.slice(1) : undefined), 0))
})

function fokussiere(id?: string): void {
  const ziel =
    (id && document.getElementById(decodeURIComponent(id))) ||
    document.querySelector<HTMLElement>('#inhalt h1') ||
    document.getElementById('inhalt')
  if (!ziel) return
  if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1')
  ziel.focus({ preventScroll: true })
}

export default router

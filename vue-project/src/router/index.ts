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
      meta: { nav: 'Ein- & Ausgaben' },
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
      meta: { nav: '1 Mio. €' },
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

export default router

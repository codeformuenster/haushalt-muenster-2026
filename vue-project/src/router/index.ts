import { createRouter, createWebHistory } from 'vue-router'
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
  history: createWebHistory(import.meta.env.BASE_URL),
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
      path: '/freiwillige-leistungen',
      name: 'freiwillige-leistungen',
      component: () => import('@/pages/FreiwilligeLeistungenPage.vue'),
      meta: { nav: 'Freiwillige Leistungen' },
    },
    {
      path: '/bezirke',
      name: 'bezirke',
      component: () => import('@/pages/BezirkePage.vue'),
      meta: { nav: 'Bezirke' },
    },
    {
      // Unbekannte Adressen landen auf der Startseite statt auf einer leeren Seite.
      path: '/:pfad(.*)*',
      redirect: { name: 'start' },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router

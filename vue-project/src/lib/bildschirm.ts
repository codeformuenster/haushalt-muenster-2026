/**
 * Bildschirmbreite als reaktiver Wert — für die Fälle, in denen eine
 * Media-Query in CSS nicht reicht, weil JavaScript die Entscheidung treffen
 * muss: die Navigation klappt ins Burger-Menü, ein Balkendiagramm dreht sich
 * von stehenden Säulen auf liegende Balken.
 *
 * Reines Umschalten von Aussehen gehört weiterhin in CSS. Hier landet nur, was
 * die Struktur ändert.
 */
import { onBeforeUnmount, readonly, ref, type Ref } from 'vue'

/**
 * Ab hier gilt ein Bildschirm als schmal: Handys hochkant und schmale
 * Fenster. Derselbe Wert steht als `--mm-schmal` in main.css, damit CSS und
 * JavaScript an derselben Stelle umschalten.
 */
export const SCHMAL_BIS = 699

/**
 * `true`, solange das Fenster höchstens {@link SCHMAL_BIS} Pixel breit ist.
 *
 * Achtung beim Server-Rendern oder in Tests ohne `window`: dort gibt es kein
 * matchMedia, die Abfrage fällt dann auf „nicht schmal“ zurück.
 */
export function useSchmalerBildschirm(): Readonly<Ref<boolean>> {
  const schmal = ref(false)
  if (typeof window === 'undefined' || !window.matchMedia) return readonly(schmal)

  const abfrage = window.matchMedia(`(max-width: ${SCHMAL_BIS}px)`)
  schmal.value = abfrage.matches

  const aktualisiere = (ereignis: MediaQueryListEvent) => {
    schmal.value = ereignis.matches
  }
  abfrage.addEventListener('change', aktualisiere)
  onBeforeUnmount(() => abfrage.removeEventListener('change', aktualisiere))

  return readonly(schmal)
}

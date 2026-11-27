/**
 * Alle Neuigkeiten aus src/news/*.md, neueste zuerst.
 * Eine neue Meldung ist eine neue Markdown-Datei dort; der Dateiname
 * (ohne .md) wird zur Adresse, z. B. #/news/2026-11-27-muensterhack-preis.
 */
export type NewsArtikel = {
  slug: string
  titel: string
  /** JJJJ-MM-TT */
  datum: string
  /** Ein bis zwei Sätze für die Übersicht. */
  teaser: string
  html: string
}

const dateien = import.meta.glob<Omit<NewsArtikel, 'slug'>>('../news/*.md', {
  eager: true,
  import: 'default',
})

export const news: NewsArtikel[] = Object.entries(dateien)
  .map(([pfad, inhalt]) => ({ ...inhalt, slug: pfad.replace(/^.*\/|\.md$/g, '') }))
  .sort((a, b) => b.datum.localeCompare(a.datum))

/** „27. November 2026“ */
export function datumLang(datum: string): string {
  return new Date(`${datum}T12:00:00`).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

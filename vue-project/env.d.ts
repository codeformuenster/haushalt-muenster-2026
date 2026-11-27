/// <reference types="vite/client" />

// Typen und Autocomplete für die <wa-*> Custom Elements von Web Awesome.
// Das Paket gibt diesen Pfad nicht über sein "exports"-Feld frei, deshalb der
// relative Import statt eines Eintrags unter compilerOptions.types.
import './node_modules/@awesome.me/webawesome/dist/types/vue'

// Neuigkeiten aus src/news/*.md, umgewandelt vom Plugin in vite.config.ts.
declare module '*.md' {
  const artikel: { titel: string; datum: string; teaser: string; html: string }
  export default artikel
}

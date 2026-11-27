import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { marked } from 'marked'
import type { Plugin } from 'vite'

/**
 * Wandelt die Neuigkeiten in src/news/*.md beim Bauen in HTML um.
 * Jede Datei beginnt mit einem Kopf aus `titel`, `datum` (JJJJ-MM-TT) und
 * `teaser`, eingerahmt von `---`. Fehlt etwas, bricht der Build ab.
 */
function newsMarkdown(): Plugin {
  return {
    name: 'mm-news-markdown',
    transform(code, id) {
      if (!id.endsWith('.md') || !id.includes('/src/news/')) return
      const treffer = code.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
      if (!treffer) throw new Error(`${id}: Kopf zwischen --- fehlt`)
      const kopf: Record<string, string> = {}
      for (const zeile of treffer[1]!.split(/\r?\n/)) {
        const [, schluessel, wert] = zeile.match(/^(\w+):\s*(.*)$/) ?? []
        if (schluessel) kopf[schluessel] = wert!.trim().replace(/^"(.*)"$/, '$1')
      }
      for (const feld of ['titel', 'datum', 'teaser']) {
        if (!kopf[feld]) throw new Error(`${id}: Feld „${feld}“ fehlt im Kopf`)
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(kopf.datum!)) {
        throw new Error(`${id}: datum muss JJJJ-MM-TT sein`)
      }
      const html = marked.parse(treffer[2]!, { async: false })
      return { code: `export default ${JSON.stringify({ ...kopf, html })}`, map: null }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    newsMarkdown(),
    vue({
      template: {
        compilerOptions: {
          // Web Awesome liefert Custom Elements (<wa-card>, <wa-page>, ...).
          // Ohne diese Zeile versucht Vue sie als eigene Komponenten aufzulösen.
          isCustomElement: (tag) => tag.startsWith('wa-'),
        },
      },
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  {
    name: 'app/web-awesome',
    files: ['**/*.vue'],
    rules: {
      /*
       * Web Awesome liefert echte Web Components. Dort ist `slot="name"` das
       * korrekte Standard-Attribut — `<template v-slot:name>` funktioniert nur
       * bei Vue-Komponenten und erzeugt hier kaputtes Markup. Die Regel gilt
       * deshalb weiterhin, aber nicht für Kinder von <wa-*>-Elementen.
       */
      'vue/no-deprecated-slot-attribute': ['error', { ignoreParents: ['/^wa-/'] }],
    },
  },

  skipFormatting,
)

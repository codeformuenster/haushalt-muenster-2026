# vue-project

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Stellenatlas (Zwischenstand)

Die Seite `#/stellenplan` zeigt Stellenlandschaft, vollständige Rangliste,
Jahresveränderungen und alle Entgelt-/Besoldungsgruppen der gewählten Produktgruppe.
Die Diagramme wachsen mit der Zahl der Einträge; Tabellen bieten dieselben Werte
und eine Auswahl per Tastatur. Produktbereich und Planjahr filtern die Ansicht.
Die Kennzahlen oben beziehen sich ausdrücklich auf die gesamte Stadt.

### Daten aktualisieren

```sh
python3 scripts/generate-stellenplan.py
```

Das Skript liest `../daten/agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv`
als Zahlenbasis und die Produktbereichsnamen aus `Stellenplan_2026_2027.csv`.
Es prüft eindeutige Schlüssel, Abdeckung und Detail-/Gesamtsummen und schreibt
`src/data/stellenplan.json`. Die erzeugte Datei wird mit eingecheckt; Python ist
für den normalen Web-Build nicht erforderlich. Summenzeilen werden nicht als
Produktgruppen übernommen. Codes bleiben Zeichenketten mit führenden Nullen.

Die Detaildatei ergibt 4.898,38 VZÄ (2026) und 4.901,73 VZÄ (2027).
Die Abweichungen zur Übersicht von 0,06 beziehungsweise 0,07 VZÄ müssen noch
am Originalplan geprüft werden. Es handelt sich um Planstellen, nicht um den
Besetzungsstand. Erfahrungsstufen, Gehälter und Personalkostenschätzungen sind
noch nicht Bestandteil dieses Zwischenstands.

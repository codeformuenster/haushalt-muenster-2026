
Dies ist der Quellcode vom Münsterhack '26 Projekt "Münster Money"

## Webseite auf GitHub Pages

Die Vue-App in `vue-project/` wird durch `.github/workflows/deploy-pages.yml`
bei jedem Push auf `main` gebaut und auf GitHub Pages veröffentlicht.
Der Workflow kann auch manuell im Actions-Tab gestartet werden.

Einmalig im Repository unter **Settings → Pages → Build and deployment → Source**
die Option **GitHub Actions** auswählen. Anschließend diese Änderungen nach
`main` übernehmen und pushen.

Die Webseite ist danach unter
[codeformuenster.github.io/haushalt-muenster-2026/](https://codeformuenster.github.io/haushalt-muenster-2026/)
erreichbar. Zusätzliche Secrets oder ein `gh-pages`-Branch sind nicht nötig.

Der Workflow nutzt Node.js 24, installiert mit `npm ci`, prüft TypeScript und
veröffentlicht `vue-project/dist/`. Der Vite-Basispfad kommt aus der Pages-Konfiguration.
Vue Router nutzt Hash-URLs (z. B. `/#/about`), damit direkte Aufrufe und Neuladen
von Unterseiten ohne serverseitige Weiterleitungen funktionieren.

Den Pages-Build lokal prüfen:

```sh
cd vue-project
npm ci
npm run type-check
npm run build-only -- --base /haushalt-muenster-2026/
npm run preview -- --base /haushalt-muenster-2026/
```

Links
* Quellseite für den Münsteraner Haushaltsplan: https://www.stadt-muenster.de/finanzen/muensters-haushalt/der-haushaltsplan


## Warum machen wir das? 

Weil der Haushalt einer Stadt alle betrifft – aber heute vor allem für diejenigen zugänglich ist, die die Zeit, das Wissen und die Geduld haben, sich durch hunderte Seiten Tabellen und Verwaltungssprache zu arbeiten.

Wir wollen diese Zugangshürde senken.

Nicht, indem wir Informationen weglassen. Sondern indem wir sie so aufbereiten, dass mehr Menschen sie verstehen, eigene Fragen stellen und sich eine Meinung bilden können.

# Haushaltsplan der Stadt Münster PDF Inhalte

## Haushaltsplan Band 1

* Link: [Haushaltsplan_2026-2027_Band_1_Stand_20.05.2026.pdf](https://www.stadt-muenster.de/fileadmin/user_upload/stadt-muenster/20_finanzen_und_beteiligungen/pdf/Haushalt/Haushalt_2026_2027/Haushaltsplan_2026-2027_Band_1_Stand_20.05.2026.pdf)
* 723 PDF-Seiten, PDF-Seite = Seitenzahl + 6

Inhalte

Jeder Produktbereich enthält Teilergebnisplan und Teilfinanzplan, danach je Produktgruppe Beschreibung, Kennzahlen, Teilergebnisplan und Teilfinanzplan.

| Kapitel | Tabelle | PDF-Seiten | Seitenzahlen |
|------------|------------|------------|------------|
| Ergebnis- und Finanzplan | | 7-14 | 1-8 |
| Teilpläne | | 15-558 | 9-552 |
| | PB 01 Innere Verwaltung | 15-100 | 9-94 |
| | PB 02 Sicherheit und Ordnung | 101-180 | 95-174 |
| | PB 03 Schulträgeraufgaben | 181-208 | 175-202 |
| | PB 04 Kultur und Wissenschaft | 209-270 | 203-264 |
| | PB 05 Soziale Leistungen | 271-308 | 265-302 |
| | PB 06 Kinder-, Jugend- und Familienhilfe | 309-360 | 303-354 |
| | PB 07 Gesundheitsdienste | 361-372 | 355-366 |
| | PB 08 Sportförderung | 373-390 | 367-384 |
| | PB 09 Räumliche Planung und Entwicklung/Geoinformationen | 391-414 | 385-408 |
| | PB 10 Bauen und Wohnen | 415-438 | 409-432 |
| | PB 11 Ver- und Entsorgung | 439-450 | 433-444 |
| | PB 12 Verkehrsflächen und -anlagen, ÖPNV | 451-462 | 445-456 |
| | PB 13 Natur- und Landschaftspflege | 463-496 | 457-490 |
| | PB 14 Umweltschutz | 497-506 | 491-500 |
| | PB 15 Wirtschaft und Tourismus | 507-534 | 501-528 |
| | PB 16 Allgemeine Finanzwirtschaft | 535-548 | 529-542 |
| | PB 17 Stiftungen | 549-558 | 543-552 |
| Investitionsplan | Investitionsmaßnahmen nach Dezernat (OB, I-VI, ohne Zuordnung) | 559-723 | 553-717 |

## Haushaltsplan Band 2 
* Link: [Haushaltsplan_2026-2027_Band_2_Stand_20.05.2026.pdf](https://www.stadt-muenster.de/fileadmin/user_upload/stadt-muenster/20_finanzen_und_beteiligungen/pdf/Haushalt/Haushalt_2026_2027/Haushaltsplan_2026-2027_Band_2_Stand_20.05.2026.pdf)
* 379 PDF-Seiten, PDF-Seite = Seitenzahl + 4

Inhalte

| Kapitel | Tabelle | PDF-Seiten | Seitenzahlen | Daten |
|------------|------------|------------|------------|------------|
| Vorbericht | | 5-34 | 1-30 | |
| Stellenplan | | 35-68 | 31-64 | |
| | Beamte & Beamtinnen | 37-38 | 33-34 |  |
| | Tariflich Beschäftigte | 39-40 | 35-36 | |
| | Stellen nach Haushaltsgliederung: Beamte & Beamtinnen 2026 | 41-45 | 37-41 | [Stellenplan_2026_2027.csv](daten/agg_tables/Stellenplan_2026_2027.csv), [Stellenplan_2026_2027_nach_Besoldungsgruppen.csv](daten/agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv) |
| | Stellen nach Haushaltsgliederung: Tariflich Beschäftigte 2026 | 46-53 | 42-49 | (s.o.) |
| | Stellen nach Haushaltsgliederung: Beamte & Beamtinnen 2027 | 54-58 | 50-54 | (s.o.) |
| | Stellen nach Haushaltsgliederung: Tariflich Beschäftigte 2027 | 59-66 | 55-62 | (s.o.) |
| Haushaltsquerschnitt | | 69-80 | 65-76 | [Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv](daten/agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv) |
| | Ergebnisplanung 2026 | 71-73 | 67-69 | |
| | Ergebnisplanung 2027 | 74-76 | 70-72 | |
| | Finanzplanung 2026 | 77-78 | 73-74 | |
| | Finanzplanung 2027 | 79-80 | 75-76 | |
| Übersicht über den voraussichtlichen Stand der Verbindlichkeiten | | 81-84 | 77-80 | |
| Übersicht über die Entwicklung des Eigenkapitals | | 85-88 | 81-84 | |
| Übersicht über die Verpflichtungsermächtigungen | | 89-92 | 85-88 | |
| Ergebnisrechnung, Finanzrechnung und Bilanz 2024 | | 93-100 | 89-96 | |
| Wirtschaftspläne und Jahresabschlüsse der Sondervermögen | AWM, citeq, Münster Marketing, Theater Münster | 101-136 | 97-132 | |
| Übersicht über die Wirtschaftslage der Unternehmen | | 137-146 | 133-142 | |
| Bezirksbezogene Haushaltsangaben | Bezirksvertretungen Mitte, Nord, Ost, Südost, Hiltrup, West (Teilergebnisplan PG 01 01, Investitionsmaßnahmen im Bezirk) | 147-328 | 143-324 | [Bezirksvertretungen_Investitionsmassnahmen_2026_2027.csv](daten/agg_tables/Bezirksvertretungen_Investitionsmassnahmen_2026_2027.csv) |
| Übersicht über die Zuwendungen an die Fraktionen | | 329-344 | 325-340 | |
| Zuschussbericht | Zuwendungen an Dritte | 345-366 | 341-362 | |
| Maßnahmenprogramm des Amtes für Mobilität und Tiefbau | | 367-370 | 363-366 | |
| Navigator durch den Haushalt | | 371-376 | 367-372 | |
| Haushaltsberatende Gremien | | 377-379 | 373-375 | |

## Rohdaten

`daten/raw_table_extraction/` enthält unbereinigte, automatisch extrahierte Tabellen aus beiden Bänden (ca. 1900 CSV-Dateien). Namensschema: `band<N>_p<PDF-Seite>_<Abschnitt>_<Typ>_t<Tabellen-Nr>.csv`, z.B. `band1_p700_PG0111_Immobilienmanagement_Investitionsmassnahmen_t0.csv`. Die Qualität ist gemischt: fehlende Leerzeichen, mehrzeilige Kopfzeilen, Fließtext statt Tabellen und teils falsche Abschnittskürzel (z.B. `PG12` für den Ergebnis- und Finanzplan, `PG03`/`PG05`/`PG13` für Produktbereichsseiten).

## Geodaten

`daten/geo/` enthält Kartengrundlagen, die nicht aus dem Haushaltsplan stammen,
sondern aus dem [Open-Data-Portal der Stadt Münster](https://opendata.stadt-muenster.de/).
Herkunft, Stand und Lizenz je Datei stehen in [`daten/geo/README.md`](daten/geo/README.md).

## Skripte

Python-Skripte zur Prüfung und Auswertung der Daten liegen in [`scripts/`](scripts/README.md). `scripts/pipeline/build_agg_tables.py` erzeugt alle Tabellen in `daten/agg_tables/` aus `daten/raw_table_extraction/` neu und prüft sie anschließend auf Konsistenz. Die Konsistenzprüfung der bereinigten CSVs schreibt ihren Bericht nach [`daten/pruefberichte/konsistenz.md`](daten/pruefberichte/konsistenz.md). Die manuell untersuchten Abweichungen sind in [`daten/pruefberichte/befunde.md`](daten/pruefberichte/befunde.md) dokumentiert.


## Die Anwendung

Vue 3 + TypeScript + Vite in `vue-project/`. UI-Komponenten von
[Web Awesome](https://webawesome.com), Diagramme mit
[ECharts](https://echarts.apache.org) über `vue-echarts`.

Die Gehaltskostenschätzung im Stellenatlas kombiniert die TVöD-VKA-Tabellen mit den
[NRW-Grundgehaltssätzen ab April 2026](https://www.finanzverwaltung.nrw.de/system/files/media/document/file/grundgehaelter-a-b-r-und-w-01.04.26_0.pdf).
TVöD-Festentgelte werden mit dem gewichteten Mittel der übrigen Tarifstellen ihrer Produktgruppe
angesetzt. S10 wird als Mittel aus S9 und S11b geschätzt; für die fehlende Stufe 1 von P7–P9 wird
der Abstand zwischen Stufe 2 und 3 zurückgerechnet. Bei A-Besoldungsgruppen wird die gewählte
Besoldungsstufe verwendet oder, falls sie dort nicht existiert, die nächstgelegene verfügbare
Stufe. A9Z enthält nur das A9-Grundgehalt ohne Amtszulage. Die Rechnung enthält keine
Jahressonderzahlungen, Zulagen, Zuschläge, Arbeitgeberanteile oder Versorgungskosten.

```
cd vue-project
npm install
npm run dev
```

### Wer arbeitet wo?

Jede Seite ist genau eine Datei in `src/pages/`. Wer eine Seite baut, arbeitet
nur dort — dann kommen sich mehrere Leute nicht in die Quere.

| Seite | URL | Datei |
|---|---|---|
| Start | `/` | `src/pages/StartPage.vue` |
| Überblick (das große Ganze) | `/ueberblick` | `src/pages/UeberblickPage.vue` |
| Ein- & Ausgaben | `/ein-ausgaben` | `src/pages/EinAusgabenPage.vue` |
| Stellenplan | `/stellenplan` | `src/pages/StellenplanPage.vue` |
| Zuschüsse an Vereine und Verbände | `/zuschuesse` | `src/pages/ZuschuessePage.vue` |
| Bezirke | `/bezirke` | `src/pages/BezirkePage.vue` |
| Planspiel (Haushalt 2026 ausgleichen) | `/planspiel` | `src/pages/PlanspielPage.vue` |
| Glossar (PB/PG-Nummern, Rohdaten-Dateinamen) | `/glossar` | `src/pages/GlossarPage.vue` |

Wird eine Seite zu groß für eine Datei, kommen ihre Bestandteile in einen
eigenen Ordner `src/components/<seite>/`.

Das Planspiel liest `src/data/planspiel.json`, erzeugt von
`scripts/pipeline/planspiel_daten.py`; die Entscheidungskarten stehen in
`src/components/planspiel/karten.ts`.

### Bitte nicht allein ändern

Diese Dateien gelten für alle Seiten. Änderungen daran kurz im Team abstimmen:

| Datei | Wofür |
|---|---|
| `src/App.vue` | Rahmen mit Kopf- und Fußzeile |
| `src/router/index.ts` | URL → Seite. Neue Seite = ein Eintrag hier, die Navigation baut sich daraus selbst |
| `src/components/layout/` | Kopf- und Fußzeile |
| `src/components/ui/` | `PageIntro`, `ChartCard`, `BaseChart` — das gemeinsame Seitengerüst |
| `src/charts/echartsTheme.ts` | Farben und Achsen aller Diagramme |
| `src/charts/format.ts` | Zahlen- und Euroformate |

So sieht eine Seite aus:

```vue
<PageIntro titel="..." beschreibung="..." />
<ChartCard titel="..." quelle="Haushaltsplan 2026/27, Band 2, S. ...">
  <BaseChart :option="meineOption" />
</ChartCard>
```

Farben nicht selbst wählen: `KATEGORIE_FARBEN` aus `echartsTheme.ts` ist in
fester Reihenfolge zu verwenden (Serie 1 nimmt Farbe 1 usw.). Die Abstände sind
so gesetzt, dass benachbarte Farben auch bei Rot-Grün-Sehschwäche unterscheidbar
bleiben, auf hellem wie dunklem Hintergrund.

### Stand

Zwei Seiten lesen echte Daten, aufbereitet von Skripten in `preprocessing/`
(siehe [preprocessing/README.md](preprocessing/README.md)):

* **Zuschüsse** (`/zuschuesse`) — der Zuschussbericht aus Band 2.
* **Bezirke** (`/bezirke`) — die bezirksbezogenen Haushaltsangaben aus Band 2,
  auf einer Karte der sechs Stadtbezirke.

**Ein- & Ausgaben** und **Stellenplan** lesen ihre Zahlen direkt aus CSV bzw.
JSON unter `vue-project/src/`, ohne Skript in `preprocessing/`.

Nur noch **Überblick** (`/ueberblick`) zeigt **erfundene** Platzhalterzahlen und
trägt deshalb einen `DemoHinweis`. Der wird entfernt, sobald die Seite echte
Daten aus `daten/` liest — dann kann auch `src/components/ui/DemoHinweis.vue`
weg.

Die Abgrenzung freiwillige gegen pflichtige Leistungen ist für die Zuschüsse
**geklärt**: der Zuschussbericht führt dafür selbst eine Spalte
`verpflichtend_freiwillig` mit vier Stufen (`freiwillig`, `dem Grunde nach`,
`der Höhe nach`, `Höhe und Grund nach`). Für den restlichen Haushalt — Personal,
Bau, Sozialtransfers — kennzeichnet der Plan sie weiterhin nicht.

Räumlich geht der Haushalt nur bis zu den sechs **Stadtbezirken**. Eine Karte der
45 Stadtteile ist deshalb nicht möglich — es gibt dafür keine Zahlen, auch wenn
die Geometrie im Open-Data-Portal läge. Was die Bezirke-Seite zeigt, sind
Investitionen *im* Bezirk; entschieden werden sie überwiegend gesamtstädtisch.

Offen: Anbindung der übrigen CSVs aus `daten/`. Für die Bezirke wäre der nächste
Schritt die einzelne Investitionsmaßnahme — 283 benannte Vorhaben („Ludgerikirchplatz“,
„Kita Sonnenstraße“) stecken in den 635 Roh-CSVs unter
`daten/raw_table_extraction/band2_*Bezirksvertretung*`.


## A message to our robotic friends (LLMs)
- Never force-push
- Use feature-branches for non trivial additions
- Less is more, no overengineering, YAGNI style
- Ask your user, don't guess if you are < 95% sure

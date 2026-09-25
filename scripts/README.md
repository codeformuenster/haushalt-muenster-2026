# Skripte

Python-Skripte zur Prüfung und Auswertung der Haushaltsdaten unter `daten/`.

## Einrichtung

Benötigt [uv](https://docs.astral.sh/uv/). uv installiert Python und die Abhängigkeiten (`pdfplumber`, `polars`, `typer`) beim ersten Aufruf selbst:

```sh
uv run --project scripts scripts/<skript>.py --help
uv run --project scripts scripts/pipeline/<skript>.py --help
```

## Übersicht

| Skript | Zweck | Ausgabe |
|---|---|---|
| `pipeline/extrahiere_tabellen.py` | Extrahiert alle Tabellen aus den beiden PDFs (`daten/pdfs/`, nicht im Repo, Download-Links im Haupt-README) mit pdfplumber. Dateinamen aus `pipeline/tabellennamen.csv`. Reproduziert 1884 von 1888 Roh-CSVs byte-identisch; abweichend sind 4 Tabellen mit ungewöhnlichen Kopfzeilen (Band 1 S. 397, Band 2 S. 117, 364, 365), die von keinem `agg_*`-Skript gelesen werden. | CSVs in `daten/raw_table_extraction/`; Exit-Code 1, wenn eine erwartete Tabelle fehlt |
| `pipeline/build_agg_tables.py` | Führt die vier `agg_*`-Skripte in der richtigen Reihenfolge aus, dann `planspiel_daten.py` und danach `check_konsistenz.py`. | Alle CSVs in `daten/agg_tables/`, `vue-project/src/data/planspiel.json`, Bericht `daten/pruefberichte/konsistenz.md`; Exit-Code 1 nur, wenn ein Erzeugungsschritt fehlschlägt |
| `pipeline/agg_gesamtuebersicht.py` | Erträge/Aufwendungen und Ein-/Auszahlungen 2026/2027 je Produktgruppe, Produktbereich und Stadt aus dem Haushaltsquerschnitt (Band 2, S. 71-80). | `daten/agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv` |
| `pipeline/agg_stellenplan.py` | Stellen (VZÄ) 2026/2027 je Produktgruppe und je Besoldungs-/Entgeltgruppe aus "Stellen nach Haushaltsgliederung" (Band 2, S. 41-66). | `daten/agg_tables/Stellenplan_2026_2027.csv`, `daten/agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv` |
| `pipeline/agg_zuschuesse.py` | Zuschüsse an Vereine und Verbände 2026/2027, einzeln und summiert je Produktgruppe/-bereich, aus dem Zuschussbericht (Band 2, S. 349-362). Braucht die Gesamtübersicht für die PG-Bezeichnungen. | `daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027.csv`, `daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027_nach_Produktgruppe.csv` |
| `pipeline/agg_bezirksvertretungen.py` | Summen der Investitionsmaßnahmen 2026/2027 je Bezirksvertretung und Fachthema (Band 2, S. 147-328), mit Kennzeichnung gesamtstädtischer Fachthemen. | `daten/agg_tables/Bezirksvertretungen_Investitionsmassnahmen_2026_2027.csv` |
| `pipeline/planspiel_daten.py` | Daten für die Planspiel-Seite der Vue-App: Zeilen 01-17 (Erträge und Aufwendungen) 2026/2027 aus den Teilergebnisplänen der 68 Produktgruppen (Band 1, S. 15-558) und dem Gesamtergebnisplan (Band 1, S. 9), dazu die Summe aller und der freiwilligen Zuschüsse, Grund-, Gewerbe- und sonstige kommunale Steuern (Band 2, S. 20), den Zinsaufwand (Gesamtergebnisplan Zeile 20), die Einzahlungen aus der Veräußerung von Sachanlagen (Finanzplan, Band 1, S. 11), die Stellen der Produktgruppe 02 04 (Bürgerangelegenheiten) und die Ausschüttung der Stadtwerke (Band 2, S. 143). Prüft, ob die Produktgruppen zusammen den Gesamtergebnisplan ergeben. Braucht Gesamtübersicht, Stellenplan und Zuschüsse. | `vue-project/src/data/planspiel.json`; Exit-Code 1 bei Abweichungen über 1 € |
| `pipeline/quellen_zuschuesse.py` | Quellenangaben für die Seitenleiste der Zuschüsse-Seite: sucht jede Zuschusszeile im PDF (Band 2, S. 351-362, braucht das PDF unter `daten/pdfs/`) und in den Roh-CSVs, rendert die zwölf Seiten als Bilder und prüft, dass jeder Posten aus `vue-project/public/daten/zuschuesse-2026-2027.json` genau einmal gefunden wird. Läuft nicht in `build_agg_tables.py` mit; nach Änderungen an der Extraktion des Zuschussberichts von Hand neu ausführen. | `vue-project/public/quellen/band2_p351.webp` bis `band2_p362.webp`, `vue-project/public/daten/zuschuesse-quellen.json`; Exit-Code 1, wenn ein Posten fehlt oder doppelt ist |
| `pipeline/quellen_planspiel.py` | Quellenangaben für die Vergleichswerte der Planspiel-Karten: sucht jede Zeile aus der Liste `QUELLEN` (Band 1 und 2) in der Roh-CSV und im PDF (braucht beide PDFs unter `daten/pdfs/`), prüft, dass der Wert 2026 in der Zeile dem Wert in `vue-project/src/data/planspiel.json` entspricht, und rendert nur die benutzten Seiten. Die Schlüssel stehen als `quelle` in `vue-project/src/components/planspiel/karten.ts`. Läuft nicht in `build_agg_tables.py` mit; nach `planspiel_daten.py` oder neuen Vergleichswerten von Hand neu ausführen. | `vue-project/public/quellen/band<N>_p<PPP>.webp`, `vue-project/public/daten/planspiel-quellen.json`; Exit-Code 1 ohne zu schreiben, wenn eine Zeile fehlt, mehrdeutig ist oder ihr Wert abweicht |
| `check_konsistenz.py` | Prüft die bereinigten CSVs in `daten/agg_tables/` (Gesamtübersicht, Stellenplan) auf rechnerische Konsistenz: Summen über Produktgruppen und Produktbereiche, Zeilenformeln, Abgleich Stellenplan mit Besoldungsgruppen. | Konsole, Markdown-Bericht `daten/pruefberichte/konsistenz.md`, Exit-Code 1 bei Abweichungen |

`pipeline/rohdaten.py` enthält gemeinsame Hilfsfunktionen (Roh-CSVs finden und lesen, deutsche Zahlen umwandeln) und wird nicht direkt aufgerufen. Ebenso `pipeline/quellen.py` für die beiden `quellen_*`-Skripte: Zeile in einer Roh-CSV finden (mit Zeilennummer), dieselbe Zeile als Rechteck auf der PDF-Seite finden, Seiten als WebP rendern (2 Pixel je PDF-Punkt, Qualität 60) und das JSON schreiben.

## Pipeline

Optional zuerst die Roh-CSVs neu aus den PDFs extrahieren (dauert ca. 3 Minuten):

```sh
uv run --project scripts scripts/pipeline/extrahiere_tabellen.py
```

Alle Tabellen in `daten/agg_tables/` neu erzeugen und prüfen:

```sh
uv run --project scripts scripts/pipeline/build_agg_tables.py
```

Die Reihenfolge ist Gesamtübersicht, Stellenplan, Zuschüsse, Bezirksvertretungen, Planspiel-Daten; die Zuschüsse brauchen die PG-Bezeichnungen aus der Gesamtübersicht, die Planspiel-Daten Gesamtübersicht, Stellenplan und Zuschüsse. Einzelne Skripte lassen sich auch allein ausführen. Abweichungen der Konsistenzprüfung meldet `build_agg_tables.py`, wertet sie aber nicht als Fehler, weil die bekannten Abweichungen so im PDF stehen (siehe `daten/pruefberichte/befunde.md`).

Die Quellenangaben der Zuschüsse-Seite brauchen die lokalen PDFs und laufen deshalb getrennt, nach Änderungen an der Extraktion des Zuschussberichts (und nachdem `vue-project/public/daten/zuschuesse-2026-2027.json` neu erzeugt wurde):

```sh
uv run --project scripts scripts/pipeline/quellen_zuschuesse.py
```

Ebenso die Quellenangaben des Planspiels, nachdem `planspiel_daten.py` gelaufen ist:

```sh
uv run --project scripts scripts/pipeline/quellen_planspiel.py
```

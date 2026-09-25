# Skripte

Python-Skripte zur Prüfung und Auswertung der Haushaltsdaten unter `daten/`.

## Einrichtung

Benötigt [uv](https://docs.astral.sh/uv/). uv installiert Python und die Abhängigkeiten (`polars`, `typer`) beim ersten Aufruf selbst:

```sh
uv run --project scripts scripts/<skript>.py --help
```

## Übersicht

| Skript | Zweck | Ausgabe |
|---|---|---|
| `build_agg_tables.py` | Führt die vier `agg_*`-Skripte in der richtigen Reihenfolge aus und danach `check_konsistenz.py`. | Alle CSVs in `daten/agg_tables/`, Bericht `daten/pruefberichte/konsistenz.md`; Exit-Code 1 nur, wenn ein Erzeugungsschritt fehlschlägt |
| `agg_gesamtuebersicht.py` | Erträge/Aufwendungen und Ein-/Auszahlungen 2026/2027 je Produktgruppe, Produktbereich und Stadt aus dem Haushaltsquerschnitt (Band 2, S. 71-80). | `daten/agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv` |
| `agg_stellenplan.py` | Stellen (VZÄ) 2026/2027 je Produktgruppe und je Besoldungs-/Entgeltgruppe aus "Stellen nach Haushaltsgliederung" (Band 2, S. 41-66). | `daten/agg_tables/Stellenplan_2026_2027.csv`, `daten/agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv` |
| `agg_zuschuesse.py` | Zuschüsse an Vereine und Verbände 2026/2027, einzeln und summiert je Produktgruppe/-bereich, aus dem Zuschussbericht (Band 2, S. 349-362). Braucht die Gesamtübersicht für die PG-Bezeichnungen. | `daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027.csv`, `daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027_nach_Produktgruppe.csv` |
| `agg_bezirksvertretungen.py` | Summen der Investitionsmaßnahmen 2026/2027 je Bezirksvertretung und Fachthema (Band 2, S. 147-328), mit Kennzeichnung gesamtstädtischer Fachthemen. | `daten/agg_tables/Bezirksvertretungen_Investitionsmassnahmen_2026_2027.csv` |
| `check_konsistenz.py` | Prüft die bereinigten CSVs in `daten/agg_tables/` (Gesamtübersicht, Stellenplan) auf rechnerische Konsistenz: Summen über Produktgruppen und Produktbereiche, Zeilenformeln, Abgleich Stellenplan mit Besoldungsgruppen. | Konsole, Markdown-Bericht `daten/pruefberichte/konsistenz.md`, Exit-Code 1 bei Abweichungen |

`rohdaten.py` enthält gemeinsame Hilfsfunktionen (Roh-CSVs finden und lesen, deutsche Zahlen umwandeln) und wird nicht direkt aufgerufen.

## Pipeline

Alle Tabellen in `daten/agg_tables/` neu erzeugen und prüfen:

```sh
uv run --project scripts scripts/build_agg_tables.py
```

Die Reihenfolge ist Gesamtübersicht, Stellenplan, Zuschüsse, Bezirksvertretungen; nur die Zuschüsse hängen von einer anderen Tabelle ab (PG-Bezeichnungen aus der Gesamtübersicht). Einzelne Skripte lassen sich auch allein ausführen. Abweichungen der Konsistenzprüfung meldet `build_agg_tables.py`, wertet sie aber nicht als Fehler, weil die bekannten Abweichungen so im PDF stehen (siehe `daten/pruefberichte/befunde.md`).

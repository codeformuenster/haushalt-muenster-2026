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
| `check_konsistenz.py` | Prüft die bereinigten CSVs in `daten/agg_tables/` (Gesamtübersicht, Stellenplan) auf rechnerische Konsistenz: Summen über Produktgruppen und Produktbereiche, Zeilenformeln, Abgleich Stellenplan mit Besoldungsgruppen. | Konsole, Markdown-Bericht `daten/pruefberichte/konsistenz.md`, Exit-Code 1 bei Abweichungen |

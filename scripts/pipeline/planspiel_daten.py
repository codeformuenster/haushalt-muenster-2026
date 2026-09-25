"""Daten für das Planspiel der Vue-App (vue-project/src/data/planspiel.json).

Liest die Zeilen 01-17 (Erträge und Aufwendungen) der Jahre 2026 und 2027 aus

- den Teilergebnisplänen aller 68 Produktgruppen (Band 1, PDF-Seiten 15-558),
- dem Gesamtergebnisplan (Band 1, PDF-Seite 9).

Die Roh-CSVs aus Band 2 mit "PG0101_Teilergebnisplan" im Namen sind Auszüge je
Bezirksvertretung (Bezirksbezogene Haushaltsangaben) und werden nicht gelesen.

Dazu kommen zwei Einzelwerte für die Entscheidungskarten: die Summe der
freiwilligen Zuschüsse an Vereine und Verbände (aus der Zuschusstabelle unter
daten/agg_tables/, agg_zuschuesse.py muss vorher gelaufen sein) und der
Grundsteuerertrag aus dem Vorbericht (Band 2, PDF-Seite 20, dort in Mio. € mit
einer Nachkommastelle). PG- und PB-Bezeichnungen stammen aus der Gesamtübersicht.

Prüft, ob die Summe über alle Produktgruppen je Zeile und Jahr dem
Gesamtergebnisplan entspricht (Toleranz 1 €).

Ausgabe: vue-project/src/data/planspiel.json; Exit-Code 1 bei Abweichungen.
"""

import json
import re
from pathlib import Path

import polars as pl
import typer

from agg_gesamtuebersicht import AUSGABE as GU_DATEI
from agg_zuschuesse import AUSGABE as ZUSCHUSS_DATEI
from rohdaten import lies, roh_dateien, zahl

DATEN = Path(__file__).resolve().parents[2] / "daten"
AUSGABE = Path(__file__).resolve().parents[2] / "vue-project" / "src" / "data" / "planspiel.json"

TOLERANZ_EUR = 1.0
JAHRE = ("2026", "2027")
# Spalten der Roh-CSVs: Zeilennummer, Bezeichnung, 2024, 2025, 2026, 2027, ...
JAHR_SPALTE = {"2026": "column_5", "2027": "column_6"}

# Die Roh-CSVs schreiben die Bezeichnungen ohne Leerzeichen, deshalb stehen sie hier.
ZEILEN = [
    "Steuern und ähnliche Abgaben",
    "Zuwendungen und allgemeine Umlagen",
    "Sonstige Transfererträge",
    "Öffentlich-rechtliche Leistungsentgelte",
    "Privatrechtliche Leistungsentgelte",
    "Kostenerstattungen und Kostenumlagen",
    "Sonstige ordentliche Erträge",
    "Aktivierte Eigenleistungen",
    "Bestandsveränderungen",
    "Ordentliche Erträge",
    "Personalaufwendungen",
    "Versorgungsaufwendungen",
    "Aufwendungen für Sach- und Dienstleistungen",
    "Bilanzielle Abschreibungen",
    "Transferaufwendungen",
    "Sonstige ordentliche Aufwendungen",
    "Ordentliche Aufwendungen",
]

c = pl.col


def lies_plan(pfad: Path) -> dict[str, list[int]]:
    """Zeilen 01-17 eines (Teil-)Ergebnisplans: Jahr -> 17 Beträge in €."""
    df = lies(pfad).filter(c("column_1").str.contains(r"^(0[1-9]|1[0-7])$")).sort("column_1")
    if df.height != len(ZEILEN):
        raise typer.BadParameter(f"{pfad.name}: {df.height} statt {len(ZEILEN)} Zeilen")
    werte = df.select(zahl(c(JAHR_SPALTE[j])).fill_null(0.0).alias(j) for j in JAHRE)
    return {j: [round(w) for w in werte[j]] for j in JAHRE}


def grundsteuer(daten: Path) -> dict[str, int]:
    """Grundsteuerertrag je Jahr aus dem Vorbericht (Band 2, S. 20), umgerechnet von Mio. € in €."""
    df = lies(daten / "raw_table_extraction" / "band2_p020_Vorbericht_Ergebnisplan_t1.csv")
    zeile = df.filter(c("column_1") == "Grundsteuer").select(
        zahl(c(f"column_{i}")).alias(j) for i, j in ((4, "2026"), (5, "2027"))
    )
    return {j: round(zeile[j][0] * 1_000_000) for j in JAHRE}


def freiwillige_zuschuesse(daten: Path) -> dict[str, int]:
    """Summe der als "freiwillig" gekennzeichneten Zuschüsse je Jahr."""
    df = pl.read_csv(daten / ZUSCHUSS_DATEI).filter(c("verpflichtend_freiwillig") == "freiwillig")
    return {j: round(df[f"Zuschuss_{j}_EUR"].sum()) for j in JAHRE}


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Schreibt die Planspiel-Daten und prüft die PG-Summen gegen den Gesamtergebnisplan.

    Quelle: Band 1, PDF-Seite 9 und Teilergebnispläne der Produktgruppen (S. 15-558),
    Band 2, PDF-Seite 20 (Grundsteuer), Zuschusstabelle und Gesamtübersicht unter daten/agg_tables/.
    Ausgabe: vue-project/src/data/planspiel.json. Exit-Code 1 bei Abweichungen.
    """
    namen = pl.read_csv(daten / GU_DATEI, schema_overrides={"Code": pl.String})
    namen = dict(zip(namen["Code"], namen["Bezeichnung"]))

    produktgruppen = []
    for pfad in roh_dateien(daten, 1, 15, 558, "*_PG????_*Teilergebnisplan_*"):
        code = re.search(r"_PG(\d{4})_", pfad.name)[1]
        produktgruppen.append({"code": code, "name": namen[code], "werte": lies_plan(pfad)})
    produktgruppen.sort(key=lambda pg: pg["code"])
    gesamt = lies_plan(daten / "raw_table_extraction" / "band1_p009_PG12_Ergebnisplan_t0.csv")

    abweichungen = 0
    for j in JAHRE:
        for i, zeile in enumerate(ZEILEN):
            summe = sum(pg["werte"][j][i] for pg in produktgruppen)
            if abs(summe - gesamt[j][i]) > TOLERANZ_EUR:
                abweichungen += 1
                typer.echo(f"Abweichung {j} Zeile {i + 1:02d} {zeile}: PG-Summe {summe}, Gesamtplan {gesamt[j][i]}")

    pb_codes = sorted({pg["code"][:2] for pg in produktgruppen})
    daten_json = {
        "zeilen": ZEILEN,
        "gesamt": gesamt,
        "produktbereiche": [{"code": pb, "name": namen[pb]} for pb in pb_codes],
        "produktgruppen": produktgruppen,
        "freiwilligeZuschuesse": freiwillige_zuschuesse(daten),
        "grundsteuer": grundsteuer(daten),
    }
    AUSGABE.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(daten_json, ensure_ascii=False, separators=(",", ":"))
    AUSGABE.write_text(text + "\n", encoding="utf-8")
    typer.echo(f"{AUSGABE}: {len(produktgruppen)} Produktgruppen, {abweichungen} Abweichungen zum Gesamtergebnisplan")
    if abweichungen:
        raise typer.Exit(code=1)


if __name__ == "__main__":
    typer.run(main)

"""Daten für das Planspiel der Vue-App (vue-project/src/data/planspiel.json).

Liest die Zeilen 01-17 (Erträge und Aufwendungen) der Jahre 2026 und 2027 aus

- den Teilergebnisplänen aller 68 Produktgruppen (Band 1, PDF-Seiten 15-558),
- dem Gesamtergebnisplan (Band 1, PDF-Seite 9).

Die Roh-CSVs aus Band 2 mit "PG0101_Teilergebnisplan" im Namen sind Auszüge je
Bezirksvertretung (Bezirksbezogene Haushaltsangaben) und werden nicht gelesen.

Dazu kommen Einzelwerte für die Entscheidungskarten: die Summe der
freiwilligen und aller Zuschüsse an Vereine und Verbände (aus der Zuschusstabelle
unter daten/agg_tables/, agg_zuschuesse.py muss vorher gelaufen sein), Grundsteuer,
Gewerbesteuer und sonstige kommunale Steuern aus dem Vorbericht (Band 2, PDF-Seite
20, dort in Mio. € mit einer Nachkommastelle), die Hundesteuer aus den Erläuterungen
der Allgemeinen Finanzwirtschaft (Band 1, PDF-Seite 545, von Hand übertragen nach
daten/manuell/, siehe README dort), Zeile 20 des Gesamtergebnisplans
(Zinsaufwendungen), Zeile 19 des Gesamtfinanzplans (Band 1, PDF-Seite 11,
Einzahlungen aus der Veräußerung von Sachanlagen) und die Stellen (VZÄ) einzelner Produktgruppen aus dem
Stellenplan unter daten/agg_tables/ (agg_stellenplan.py muss vorher gelaufen
sein) sowie die geplante Ausschüttung der Stadtwerke Münster GmbH an die Stadt
(Band 2, PDF-Seite 143, dort in T€). PG- und PB-Bezeichnungen stammen aus der
Gesamtübersicht.

Prüft, ob die Summe über alle Produktgruppen je Zeile und Jahr dem
Gesamtergebnisplan entspricht (Toleranz 1 €), und ob die von Hand übertragenen
Steuerarten zusammen Zeile 01 der Produktgruppe 16 01 ergeben (Rundungstoleranz).

Ausgabe: vue-project/src/data/planspiel.json; Exit-Code 1 bei Abweichungen.
"""

import json
import re
from pathlib import Path

import polars as pl
import typer

from agg_gesamtuebersicht import AUSGABE as GU_DATEI
from agg_stellenplan import AUSGABE_SP as STELLENPLAN_DATEI
from agg_zuschuesse import AUSGABE as ZUSCHUSS_DATEI
from rohdaten import lies, roh_dateien, zahl

DATEN = Path(__file__).resolve().parents[2] / "daten"
AUSGABE = Path(__file__).resolve().parents[2] / "vue-project" / "src" / "data" / "planspiel.json"

TOLERANZ_EUR = 1.0
# Aufstellung der Steuerarten, Band 1, PDF-Seite 545 (von Hand übertragen). Die Beträge sind
# in Mio. € auf höchstens 0,05 Mio. € gerundet, daher diese Toleranz je Zeile beim Summenvergleich.
STEUERARTEN_DATEI = "band1_p545_PG1601_Erlaeuterungen_Steuerarten.csv"
RUNDUNG_MIO = 0.05
JAHRE = ("2026", "2027")
# Spalten der Roh-CSVs: Zeilennummer, Bezeichnung, 2024, 2025, 2026, 2027, ...
JAHR_SPALTE = {"2026": "column_5", "2027": "column_6"}
# Produktgruppen, deren Stellen eine Entscheidungskarte braucht (Bürgerangelegenheiten).
STELLEN_PG = ("0204",)

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


def plan_zeile(pfad: Path, nummer: str) -> dict[str, int]:
    """Eine einzelne Zeile eines Gesamtplans je Jahr in €."""
    zeile = lies(pfad).filter(c("column_1") == nummer).select(zahl(c(s)).alias(j) for j, s in JAHR_SPALTE.items())
    return {j: round(zeile[j][0]) for j in JAHRE}


def steuer(daten: Path, steuerart: str) -> dict[str, int]:
    """Ertrag einer Steuerart je Jahr aus dem Vorbericht (Band 2, S. 20), umgerechnet von Mio. € in €."""
    df = lies(daten / "raw_table_extraction" / "band2_p020_Vorbericht_Ergebnisplan_t1.csv")
    zeile = df.filter(c("column_1") == steuerart).select(
        zahl(c(f"column_{i}")).alias(j) for i, j in ((4, "2026"), (5, "2027"))
    )
    return {j: round(zeile[j][0] * 1_000_000) for j in JAHRE}


def steuerarten(daten: Path) -> dict[str, dict[str, int]]:
    """Alle Steuerarten der Aufstellung auf Band 1, S. 545 je Jahr, umgerechnet von Mio. € in €."""
    df = pl.read_csv(daten / "manuell" / STEUERARTEN_DATEI)
    return {
        row["Steuerart"]: {j: round(row[f"Ansatz_{j}_Mio_EUR"] * 1_000_000) for j in JAHRE}
        for row in df.iter_rows(named=True)
    }


def stadtwerke_ausschuettung(daten: Path) -> dict[str, int]:
    """Gewinnausschüttung der Stadtwerke Münster GmbH an die Stadt je Jahr (Band 2, S. 143), von T€ in €."""
    datei = "band2_p143_Uebersicht_Wirtschaftslage_Unternehmen_Tabelle_t0.csv"
    df = lies(daten / "raw_table_extraction" / datei)
    zeile = df.filter((c("column_1") == "Stadtwerke Münster GmbH") & (c("column_2") == "(1)")).select(
        zahl(c(f"column_{i}")).alias(j) for i, j in ((4, "2026"), (5, "2027"))
    )
    return {j: round(zeile[j][0] * 1000) for j in JAHRE}


def stellen(daten: Path) -> dict[str, dict[str, float]]:
    """Stellen (VZÄ) je Jahr für die Produktgruppen in STELLEN_PG."""
    df = pl.read_csv(daten / STELLENPLAN_DATEI, schema_overrides={"Code": pl.String})
    df = df.filter(c("Code").is_in(STELLEN_PG) & (c("Ebene") == "PG"))
    return {row["Code"]: {j: row[f"Stellen_Gesamt_VZAE_{j}"] for j in JAHRE} for row in df.iter_rows(named=True)}


def zuschuesse(daten: Path, nur_freiwillig: bool) -> dict[str, int]:
    """Summe aller oder nur der als "freiwillig" gekennzeichneten Zuschüsse je Jahr.

    Die Gesamtsumme am Tabellenende hat keine LfdNr und wird nicht mitgezählt.
    """
    df = pl.read_csv(daten / ZUSCHUSS_DATEI).filter(c("LfdNr").is_not_null())
    if nur_freiwillig:
        df = df.filter(c("verpflichtend_freiwillig") == "freiwillig")
    return {j: round(df[f"Zuschuss_{j}_EUR"].sum()) for j in JAHRE}


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Schreibt die Planspiel-Daten und prüft die PG-Summen gegen den Gesamtergebnisplan.

    Quelle: Band 1, PDF-Seite 9 und Teilergebnispläne der Produktgruppen (S. 15-558),
    Band 1, PDF-Seite 11 (Finanzplan) und 545 (Steuerarten, daten/manuell/), Band 2, PDF-Seite 20 (Steuern) und 143 (Stadtwerke), Zuschusstabelle,
    Stellenplan und Gesamtübersicht unter daten/agg_tables/.
    Ausgabe: vue-project/src/data/planspiel.json. Exit-Code 1 bei Abweichungen.
    """
    namen = pl.read_csv(daten / GU_DATEI, schema_overrides={"Code": pl.String})
    namen = dict(zip(namen["Code"], namen["Bezeichnung"]))

    produktgruppen = []
    for pfad in roh_dateien(daten, 1, 15, 558, "*_PG????_*Teilergebnisplan_*"):
        code = re.search(r"_PG(\d{4})_", pfad.name)[1]
        produktgruppen.append({"code": code, "name": namen[code], "werte": lies_plan(pfad)})
    produktgruppen.sort(key=lambda pg: pg["code"])
    ergebnisplan = daten / "raw_table_extraction" / "band1_p009_PG12_Ergebnisplan_t0.csv"
    gesamt = lies_plan(ergebnisplan)

    abweichungen = 0
    for j in JAHRE:
        for i, zeile in enumerate(ZEILEN):
            summe = sum(pg["werte"][j][i] for pg in produktgruppen)
            if abs(summe - gesamt[j][i]) > TOLERANZ_EUR:
                abweichungen += 1
                typer.echo(f"Abweichung {j} Zeile {i + 1:02d} {zeile}: PG-Summe {summe}, Gesamtplan {gesamt[j][i]}")

    arten = steuerarten(daten)
    zeile01 = next(pg for pg in produktgruppen if pg["code"] == "1601")["werte"]
    for j in JAHRE:
        summe = sum(werte[j] for werte in arten.values())
        if abs(summe - zeile01[j][0]) > len(arten) * RUNDUNG_MIO * 1_000_000:
            abweichungen += 1
            typer.echo(f"Abweichung {j} Steuerarten S. 545: Summe {summe}, PG 16 01 Zeile 01 {zeile01[j][0]}")

    pb_codes = sorted({pg["code"][:2] for pg in produktgruppen})
    daten_json = {
        "zeilen": ZEILEN,
        "gesamt": gesamt,
        "produktbereiche": [{"code": pb, "name": namen[pb]} for pb in pb_codes],
        "produktgruppen": produktgruppen,
        "freiwilligeZuschuesse": zuschuesse(daten, nur_freiwillig=True),
        "zuschuesseGesamt": zuschuesse(daten, nur_freiwillig=False),
        "grundsteuer": steuer(daten, "Grundsteuer"),
        "gewerbesteuer": steuer(daten, "Gewerbesteuer"),
        "sonstigeSteuern": steuer(daten, "Sonstige kommunale Steuern"),
        "hundesteuer": arten["Hundesteuer"],
        "zinsaufwand": plan_zeile(ergebnisplan, "20"),
        "verkaufSachanlagen": plan_zeile(daten / "raw_table_extraction" / "band1_p011_PG12_Finanzplan_t0.csv", "19"),
        "stellen": stellen(daten),
        "stadtwerkeAusschuettung": stadtwerke_ausschuettung(daten),
    }
    AUSGABE.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(daten_json, ensure_ascii=False, separators=(",", ":"))
    AUSGABE.write_text(text + "\n", encoding="utf-8")
    typer.echo(f"{AUSGABE}: {len(produktgruppen)} Produktgruppen, {abweichungen} Abweichungen zum Gesamtergebnisplan")
    if abweichungen:
        raise typer.Exit(code=1)


if __name__ == "__main__":
    typer.run(main)

"""Zuschüsse an Vereine und Verbände 2026/2027, einzeln und je Produktgruppe.

Liest den Zuschussbericht "Zuwendungen an Dritte" (Band 2, PDF-Seiten 351-362) aus
daten/raw_table_extraction/. Die Seiten 363-365 enthalten andere Tabellen
(Erbbaurechte, Mietverhältnisse) und werden nicht gelesen. Die
Produktbereichsbezeichnungen stammen aus der Übersicht auf Seite 349, die
Produktgruppenbezeichnungen aus der Gesamtübersicht (agg_gesamtuebersicht.py muss
vorher gelaufen sein).

Ausgaben:

- daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027.csv: ein Zuschuss je
  Zeile, dazu eine Zeile mit der Gesamtsumme der Zuschüsse.
- daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027_nach_Produktgruppe.csv:
  Anzahl und Summen je Produktgruppe, Produktbereich und für die Stadt.
"""

from pathlib import Path

import polars as pl
import typer

from agg_gesamtuebersicht import AUSGABE as GU_DATEI
from rohdaten import lies, roh_dateien, schreibe, zahl

DATEN = Path(__file__).resolve().parent.parent / "daten"
AUSGABE = "agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027.csv"
AUSGABE_PG = "agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027_nach_Produktgruppe.csv"

TEXT_VORNE = ["LfdNr", "Produktgruppe", "Amt", "Ausschuss", "Empfaenger", "Verwendungszweck_Zielsetzung"]
BETRAEGE = [
    f"{s}_{j}_EUR"
    for j in (2026, 2027)
    for s in ("Zuschuss", "davon_Personalkosten", "davon_Overhead", "davon_sonstigeKosten")
]
TEXT_HINTEN = ["verpflichtend_freiwillig", "zeitliche_Befristung"]

c = pl.col


def lade_zuschuesse(daten: Path) -> pl.DataFrame:
    """Alle Zuschusszeilen (erkennbar an der laufenden Nummer in der ersten Spalte)."""
    df = pl.concat([lies(p) for p in roh_dateien(daten, 2, 351, 362, "*_Zuschussbericht_*")])
    df = df.rename(dict(zip(df.columns, TEXT_VORNE + BETRAEGE + TEXT_HINTEN)))
    return df.filter(c("LfdNr").str.contains(r"^\d+$")).with_columns(
        c("LfdNr").cast(pl.Int64),
        *[zahl(c(b)).fill_null(0.0).alias(b) for b in BETRAEGE],
    )


def pb_bezeichnungen(daten: Path) -> pl.DataFrame:
    """PB-Bezeichnungen aus der Übersicht auf Seite 349 (Produktbereich 01 "Innere Verwaltung")."""
    df = pl.concat([lies(p) for p in roh_dateien(daten, 2, 349, 349, "*_Zuschussbericht_*")])
    return df.select(
        c("column_1").str.extract(r"^Produktbereich (\d{2}) ").alias("Code"),
        c("column_1").str.extract(r'"(.*)"').alias("Bezeichnung"),
    ).drop_nulls()


def nach_produktgruppe(daten: Path, zuschuesse: pl.DataFrame) -> pl.DataFrame:
    """Anzahl und Summen je PG, PB und Stadt."""
    werte = [pl.len().alias("AnzahlZuschuesse"), c(BETRAEGE).sum()]
    pg_namen = pl.read_csv(daten / GU_DATEI, schema_overrides={"Code": pl.String}).select("Code", "Bezeichnung")
    pg = (
        zuschuesse.group_by(c("Produktgruppe").alias("Code"))
        .agg(werte)
        .join(pg_namen, on="Code", how="left")
        .with_columns(pl.lit("PG").alias("Ebene"))
    )
    pb = (
        zuschuesse.group_by(c("Produktgruppe").str.slice(0, 2).alias("Code"))
        .agg(werte)
        .join(pb_bezeichnungen(daten), on="Code", how="left")
        .with_columns(pl.lit("Produktbereich-Summe").alias("Ebene"))
    )
    gesamt = zuschuesse.select(werte).with_columns(
        pl.lit(None, pl.String).alias("Code"),
        pl.lit("Gesamtsumme Stadt Münster").alias("Bezeichnung"),
        pl.lit("Summe").alias("Ebene"),
    )
    spalten = ["Code", "Bezeichnung", "Ebene", "AnzahlZuschuesse", *BETRAEGE]
    return pl.concat(
        [pg.sort("Code").select(spalten), pb.sort("Code").select(spalten), gesamt.select(spalten)],
        how="vertical_relaxed",
    )


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Erzeugt die Zuschussliste 2026/2027 und die Summen je Produktgruppe und Produktbereich.

    Quelle: Zuschussbericht, Band 2, PDF-Seiten 349 und 351-362.
    PG-Bezeichnungen aus der Gesamtübersicht.
    Ausgaben: daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027.csv und
    daten/agg_tables/Zuschuesse_Vereine_Verbaende_2026_2027_nach_Produktgruppe.csv
    """
    zuschuesse = lade_zuschuesse(daten)
    summe = zuschuesse.select(
        pl.lit("Gesamtsumme").alias("Empfaenger"), c("Zuschuss_2026_EUR", "Zuschuss_2027_EUR").sum()
    )
    liste = pl.concat([zuschuesse, summe], how="diagonal")
    for datei, df in [(AUSGABE, liste), (AUSGABE_PG, nach_produktgruppe(daten, zuschuesse))]:
        schreibe(df, daten / datei)
        typer.echo(f"{daten / datei}: {df.height} Zeilen")


if __name__ == "__main__":
    typer.run(main)

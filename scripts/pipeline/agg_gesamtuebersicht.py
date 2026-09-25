"""Gesamtübersicht der Erträge/Aufwendungen und Ein-/Auszahlungen aus dem Haushaltsquerschnitt.

Liest den Haushaltsquerschnitt (Band 2, PDF-Seiten 71-80) aus daten/raw_table_extraction/:

- Ergebnisplanung 2026 (S. 71-73) und 2027 (S. 74-76): ordentliche Erträge,
  ordentliche Aufwendungen, ordentliches Ergebnis.
- Finanzplanung 2026 (S. 77-78) und 2027 (S. 79-80): Ein-/Auszahlungen aus
  laufender Verwaltungstätigkeit und Investitionstätigkeit, Salden,
  Finanzmittelüberschuss/-fehlbetrag.

Eine Zeile je Produktgruppe (PG), Produktbereich (PB) und die Gesamtsumme. Code und
Bezeichnung stammen aus der Ergebnisplanung 2026.

Ausgabe: daten/agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv
"""

from pathlib import Path

import polars as pl
import typer

from rohdaten import lies, roh_dateien, schreibe, zahl

DATEN = Path(__file__).resolve().parents[2] / "daten"
AUSGABE = "agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv"

c = pl.col

ERGEBNIS_SPALTEN = ["Ertraege", "Aufwendungen", "OrdentlErgebnis"]
FINANZ_SPALTEN = [
    "Einzahlungen_lfdVerw",
    "Auszahlungen_lfdVerw",
    "SaldoLfdVerw",
    "Einzahlungen_Investitionstaetigkeit",
    "Auszahlungen_Investitionstaetigkeit",
    "SaldoInvestitionstaetigkeit",
    "Finanzmittelueberschuss_fehlbetrag",
]

# (erste Seite, letzte Seite, Jahr, Spaltennamen ab der zweiten Rohspalte)
TEILE = [
    (71, 73, 2026, ERGEBNIS_SPALTEN),
    (74, 76, 2027, ERGEBNIS_SPALTEN),
    (77, 78, 2026, FINANZ_SPALTEN),
    (79, 80, 2027, FINANZ_SPALTEN),
]


def lade_teil(daten: Path, von: int, bis: int, jahr: int, spalten: list[str]) -> pl.DataFrame:
    """Liest einen Teil des Querschnitts: eine Zeile je Code bzw. Summenzeile."""
    df = pl.concat([lies(p) for p in roh_dateien(daten, 2, von, bis, "*_Haushaltsquerschnitt_*")])
    werte = {f"column_{i + 2}": f"{s}_{jahr}_EUR" for i, s in enumerate(spalten)}
    return (
        df.filter(c("column_1").str.contains(r"^\d{2,4} ") | (c("column_1") == "Summe"))
        .select(
            c("column_1").str.extract(r"^(\d{2,4}) ").alias("Code"),
            c("column_1").str.extract(r"^\d{2,4} (.*)$").alias("Bezeichnung"),
            *[zahl(c(roh)).alias(name) for roh, name in werte.items()],
        )
        .with_columns(c("Code").fill_null("Summe").alias("schluessel"))
    )


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Erzeugt die Gesamtübersicht (Ergebnis- und Finanzplanung 2026/2027 je PG, PB und Stadt).

    Quelle: Haushaltsquerschnitt, Band 2, PDF-Seiten 71-80.
    Ausgabe: daten/agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv
    """
    teile = [lade_teil(daten, *t) for t in TEILE]
    df = teile[0]
    for teil in teile[1:]:
        df = df.join(teil.drop("Code", "Bezeichnung"), on="schluessel", how="left")
    df = df.with_columns(
        pl.when(c("Code").is_null())
        .then(pl.lit("Gesamtsumme Stadt Münster"))
        .otherwise(c("Bezeichnung"))
        .alias("Bezeichnung"),
        c("Code").str.len_chars().replace_strict({4: "PG", 2: "PB"}, default="Summe").alias("Ebene"),
    ).select("Code", "Bezeichnung", "Ebene", pl.exclude("Code", "Bezeichnung", "Ebene", "schluessel"))

    ziel = daten / AUSGABE
    schreibe(df, ziel)
    typer.echo(f"{ziel}: {df.height} Zeilen")


if __name__ == "__main__":
    typer.run(main)

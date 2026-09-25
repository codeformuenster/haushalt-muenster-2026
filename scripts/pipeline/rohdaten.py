"""Gemeinsame Hilfsfunktionen für die Roh-CSVs unter daten/raw_table_extraction/.

Die Roh-CSVs sind automatisch aus den PDFs extrahierte Tabellen, eine Datei je
Tabelle: band<N>_p<PDF-Seite>_<Abschnitt>_<Typ>_t<Tabellennummer>.csv
"""

import re
from pathlib import Path

import polars as pl

DATEINAME = re.compile(r"^band(\d+)_p(\d+)_.*_t(\d+)\.csv$")


def roh_dateien(daten: Path, band: int, von: int, bis: int, muster: str = "*") -> list[Path]:
    """Roh-CSVs eines Bandes auf den PDF-Seiten von..bis (inklusive), sortiert nach Seite und Tabelle.

    muster schränkt den Dateinamen zusätzlich ein (glob, z.B. "*_Stellenplan_*").
    """
    treffer = []
    for pfad in (daten / "raw_table_extraction").glob(f"band{band}_p{muster}"):
        m = DATEINAME.match(pfad.name)
        if m and von <= int(m[2]) <= bis:
            treffer.append((int(m[2]), int(m[3]), pfad))
    return [pfad for _, _, pfad in sorted(treffer)]


def seite(pfad: Path) -> int:
    """PDF-Seite aus dem Dateinamen."""
    return int(DATEINAME.match(pfad.name)[2])


def lies(pfad: Path) -> pl.DataFrame:
    """Liest eine Roh-CSV ohne Kopfzeile; alle Spalten als Text, leere Zellen als null."""
    return pl.read_csv(pfad, has_header=False, infer_schema=False)


def zahl(ausdruck: pl.Expr) -> pl.Expr:
    """Wandelt deutsche Zahlentexte in Float um.

    Versteht Tausenderpunkte, Dezimalkomma, nachgestelltes Minus und €-Zeichen
    ("338.560,00-", "46.000 €"). Leere Zellen werden null.
    """
    text = ausdruck.str.replace_all(r"[€\s]", "")
    betrag = (
        text.str.strip_chars_end("-")
        .str.replace_all(".", "", literal=True)
        .str.replace(",", ".", literal=True)
    )
    betrag = pl.when(betrag != "").then(betrag).cast(pl.Float64)
    return pl.when(text.str.ends_with("-")).then(-betrag).otherwise(betrag)


def schreibe(df: pl.DataFrame, ziel: Path) -> None:
    """Schreibt eine Ergebnistabelle als CSV mit CRLF-Zeilenenden wie die bestehenden agg_tables."""
    df.write_csv(ziel, line_terminator="\r\n")

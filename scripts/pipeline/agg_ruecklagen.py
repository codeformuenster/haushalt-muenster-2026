"""Jahresergebnis und Rücklagen 2024-2030 aus dem Vorbericht.

Liest die Tabelle zur Entwicklung der Rücklagen (Band 2, PDF-Seite 18, Vorbericht)
aus daten/raw_table_extraction/: allgemeine Rücklage und Ausgleichsrücklage am
Jahresanfang und -ende, Jahresergebnis vor und nach dem globalen Minderaufwand,
Entnahmen aus beiden Rücklagen, der Schwellenwert nach § 76 Abs. 1 Nr. 2 GO NRW
(5 % der allgemeinen Rücklage), der Puffer bis dahin und die Inanspruchnahme der
allgemeinen Rücklage in Prozent. Beträge in Mio. € mit einer Nachkommastelle, wie im Plan.

2024 ist das Ist, 2025 der ursprüngliche Ansatz (nicht der fortgeschriebene Ansatz aus
Band 1, S. 9), 2026 und 2027 der Ansatz, 2028-2030 die Planung.

Prüft, ob das Jahresergebnis nach globalem Minderaufwand 2026 und 2027 Zeile 28 des
Gesamtergebnisplans (Band 1, PDF-Seite 9) entspricht (Rundungstoleranz 0,05 Mio. €).

Ausgaben:

- daten/agg_tables/Ruecklagen_2024_2030.csv
- vue-project/src/data/ruecklagen.json

Exit-Code 1 bei Abweichungen.
"""

import json
from pathlib import Path

import polars as pl
import typer

from rohdaten import lies, schreibe, zahl

DATEN = Path(__file__).resolve().parents[2] / "daten"
AUSGABE = "agg_tables/Ruecklagen_2024_2030.csv"
AUSGABE_JSON = Path(__file__).resolve().parents[2] / "vue-project" / "src" / "data" / "ruecklagen.json"
ROH = "band2_p018_Vorbericht_Tabelle_t0.csv"
ERGEBNISPLAN = "band1_p009_PG12_Ergebnisplan_t0.csv"

JAHRE = list(range(2024, 2031))
RUNDUNG_MIO = 0.05

# Zeilenbeginn in der Roh-CSV -> Schlüssel in CSV und JSON
POSITIONEN = {
    "Allgemeine Rücklage am 01.01.": "allgemeineRuecklageAnfang",
    "Ausgleichsrücklage am 01.01.": "ausgleichsruecklageAnfang",
    "Jahresergebnis (vor": "jahresergebnisVorMinderaufwand",
    "globaler Minderaufwand": "globalerMinderaufwand",
    "Jahresergebnis (nach": "jahresergebnis",
    "Verrechnung mit der allgemeinen Rücklage": "verrechnungAllgemeineRuecklage",
    "Zuführung/Entnahme allgemeine Rücklage": "entnahmeAllgemeineRuecklage",
    "Zuführung/Entnahme Ausgleichsrücklage": "entnahmeAusgleichsruecklage",
    "Allgemeine Rücklage am 31.12.": "allgemeineRuecklageEnde",
    "Ausgleichsrücklage am 31.12.": "ausgleichsruecklageEnde",
    "Schwellenwert nach": "schwellenwert",
    "Puffer": "puffer",
    "Inanspruchnahme der allgemeinen Rücklage": "inanspruchnahmeProzent",
}

c = pl.col


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Schreibt Jahresergebnis und Rücklagen 2024-2030 als CSV und JSON und prüft sie gegen Band 1, S. 9."""
    roh = lies(daten / "raw_table_extraction" / ROH)
    werte = [f"column_{i + 2}" for i in range(len(JAHRE))]
    zeilen = []
    for anfang, schluessel in POSITIONEN.items():
        treffer = roh.filter(c("column_1").str.starts_with(anfang))
        if treffer.height != 1:
            raise typer.BadParameter(f"{ROH}: {treffer.height} Zeilen beginnen mit {anfang!r}")
        zeile = treffer.select(
            c("column_1").alias("Position"),
            pl.lit(schluessel).alias("Schluessel"),
            *[zahl(c(s).str.replace("%", "")).alias(str(j)) for s, j in zip(werte, JAHRE)],
        )
        zeilen.append(zeile)
    df = pl.concat(zeilen)

    plan = lies(daten / "raw_table_extraction" / ERGEBNISPLAN).filter(c("column_1") == "28")
    jahresergebnis = df.filter(c("Schluessel") == "jahresergebnis")
    abweichungen = 0
    for jahr, spalte in ((2026, "column_5"), (2027, "column_6")):
        soll = plan.select(zahl(c(spalte)))[0, 0] / 1_000_000
        ist = jahresergebnis[str(jahr)][0]
        if abs(soll - ist) > RUNDUNG_MIO:
            abweichungen += 1
            typer.echo(f"Abweichung {jahr} Jahresergebnis: Vorbericht {ist} Mio. €, Band 1 S. 9 Zeile 28 {soll:.2f} Mio. €")

    ziel = daten / AUSGABE
    schreibe(df, ziel)
    daten_json = {
        "jahre": JAHRE,
        **{row["Schluessel"]: [row[str(j)] for j in JAHRE] for row in df.iter_rows(named=True)},
    }
    AUSGABE_JSON.write_text(json.dumps(daten_json, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    typer.echo(f"{ziel}, {AUSGABE_JSON}: {df.height} Positionen, {abweichungen} Abweichungen zu Band 1 S. 9")
    if abweichungen:
        raise typer.Exit(code=1)


if __name__ == "__main__":
    typer.run(main)

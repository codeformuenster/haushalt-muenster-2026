"""Extrahiert die Tabellen aus den Haushaltsplan-PDFs nach daten/raw_table_extraction/.

Liest Band 1 und Band 2 aus daten/pdfs/ mit pdfplumber (extract_tables mit
Standardeinstellungen) und schreibt eine CSV je Tabelle. Mehrzeilige Zellen werden
wie in der ursprünglichen Extraktion behandelt: Haben mindestens 40 % der Zellen
einer Zeile dieselbe Zeilenzahl n > 1, wird die Zeile in n Zeilen aufgeteilt;
sonst werden Zeilenumbrüche durch Leerzeichen ersetzt.

Die Dateinamen (band<N>_p<Seite>_<Abschnitt>_<Typ>_t<Nr>.csv) stammen aus
tabellennamen.csv neben diesem Skript, übernommen aus der ursprünglichen
Extraktion. Tabellen ohne Eintrag dort werden nicht geschrieben, nur gezählt.

Ausgabe: CSVs unter daten/raw_table_extraction/, Übersicht auf der Konsole.
"""

import csv
from collections import Counter
from pathlib import Path

import pdfplumber
import typer

DATEN = Path(__file__).resolve().parents[2] / "daten"
NAMEN = Path(__file__).resolve().parent / "tabellennamen.csv"
PDFS = {
    1: "Haushaltsplan_2026-2027_Band_1_Stand_20.05.2026.pdf",
    2: "Haushaltsplan_2026-2027_Band_2_Stand_20.05.2026.pdf",
}
SCHWELLE = 0.4


def zeilen_aufteilen(tabelle: list[list[str | None]]) -> list[list[str]]:
    """Teilt Zeilen mit mehrzeiligen Zellen auf (Regel siehe Modul-Docstring)."""
    aus = []
    for zeile in tabelle:
        zellen = ["" if z is None else z for z in zeile]
        zeilenzahlen = [z.count("\n") + 1 for z in zellen if "\n" in z]
        if zeilenzahlen:
            n, anzahl = Counter(zeilenzahlen).most_common(1)[0]
            if anzahl >= len(zellen) * SCHWELLE:
                spalten = [
                    z.split("\n") if z.count("\n") + 1 == n else [z.replace("\n", " ")] + [""] * (n - 1)
                    for z in zellen
                ]
                aus += [list(z) for z in zip(*spalten)]
                continue
        aus.append([z.replace("\n", " ") for z in zellen])
    return aus


def lade_namen() -> dict[tuple[int, int, int], str]:
    with NAMEN.open(encoding="utf-8", newline="") as f:
        return {(int(r["band"]), int(r["seite"]), int(r["tabelle"])): r["datei"] for r in csv.DictReader(f)}


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Extrahiert alle Tabellen aus den beiden PDFs nach daten/raw_table_extraction/.

    Schreibt eine CSV je Tabelle mit Namen aus tabellennamen.csv und meldet, wie viele
    Tabellen geschrieben wurden, wie viele pdfplumber zusätzlich gefunden hat und
    welche erwarteten Tabellen fehlen.
    """
    namen = lade_namen()
    ziel = daten / "raw_table_extraction"
    ziel.mkdir(parents=True, exist_ok=True)
    geschrieben = zusaetzlich = 0
    gefunden = set()
    for band, datei in PDFS.items():
        with pdfplumber.open(daten / "pdfs" / datei) as pdf:
            for nr, seite in enumerate(pdf.pages, start=1):
                for t, tabelle in enumerate(seite.extract_tables()):
                    name = namen.get((band, nr, t))
                    if name is None:
                        zusaetzlich += 1
                        continue
                    with (ziel / name).open("w", encoding="utf-8", newline="") as f:
                        csv.writer(f).writerows(zeilen_aufteilen(tabelle))
                    gefunden.add((band, nr, t))
                    geschrieben += 1
                seite.flush_cache()

    fehlend = sorted(set(namen) - gefunden)
    typer.echo(f"{geschrieben} Tabellen geschrieben, {zusaetzlich} weitere ohne Namen uebersprungen.")
    for schluessel in fehlend:
        typer.echo(f"Nicht gefunden: {namen[schluessel]}")
    if fehlend:
        raise typer.Exit(code=1)


if __name__ == "__main__":
    typer.run(main)

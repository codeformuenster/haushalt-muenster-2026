"""Quellenangaben für die Zuschüsse-Seite der Vue-App: wo steht jeder Zuschuss im PDF?

Sucht jede Zuschusszeile des Zuschussberichts (Band 2, PDF-Seiten 351-362) in den
Roh-CSVs unter daten/raw_table_extraction/ (Dateiname, Zeilennummer, Zellen) und
dieselbe Zeile als Rechteck in PDF-Punkten auf der Seite im PDF unter daten/pdfs/
(nicht im Repo). Die Hilfsfunktionen dafür stehen in quellen.py.
Die zwölf Seiten werden als WebP-Bilder gespeichert, damit die App den
Ausschnitt um die Zeile zeigen kann.

Ausgaben:

- vue-project/public/quellen/band2_p351.webp bis band2_p362.webp
- vue-project/public/daten/zuschuesse-quellen.json

Prüft, dass jeder Posten aus vue-project/public/daten/zuschuesse-2026-2027.json
genau einmal gefunden wird; sonst Exit-Code 1, ohne etwas zu schreiben.
"""

import json
import re
from pathlib import Path

import pdfplumber
import typer

from quellen import PDF_URLS, PDFS, als_json, csv_zeilen, ort, pdf_box, rendere_seite
from rohdaten import roh_dateien

DATEN = Path(__file__).resolve().parents[2] / "daten"
PUBLIC = Path(__file__).resolve().parents[2] / "vue-project" / "public"
BAND = 2
VON, BIS = 351, 362
LFD_NR = re.compile(r"^\d+$")


def zeilen_in_csv(daten: Path) -> dict[int, list[tuple[str, int, list[str]]]]:
    """Laufende Nummer -> alle Fundstellen (Dateiname, Zeilennummer ab 1, Zellen) in den Roh-CSVs."""
    treffer: dict[int, list[tuple[str, int, list[str]]]] = {}
    for pfad in roh_dateien(daten, BAND, VON, BIS, "*_Zuschussbericht_*"):
        for zeile, zellen in csv_zeilen(pfad):
            erste = zellen[0].strip() if zellen else ""
            if LFD_NR.match(erste):
                treffer.setdefault(int(erste), []).append((pfad.name, zeile, zellen))
    return treffer


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Erzeugt Seitenbilder und Quellenangaben für die Zuschüsse der Vue-App.

    Quelle: Zuschussbericht, Band 2, PDF-Seiten 351-362 (PDF unter daten/pdfs/) und
    die zugehörigen Roh-CSVs. Ausgaben: vue-project/public/quellen/*.webp und
    vue-project/public/daten/zuschuesse-quellen.json. Exit-Code 1, wenn ein Posten
    der App fehlt oder doppelt ist.
    """
    in_csv = zeilen_in_csv(daten)
    app = json.loads((PUBLIC / "daten" / "zuschuesse-2026-2027.json").read_text(encoding="utf-8"))
    nummern = [p["nr"] for p in app["posten"]]

    fehler = [f"App: Nr. {n} kommt mehrfach vor" for n in sorted(set(nummern)) if nummern.count(n) > 1]
    fehler += [f"CSV: Nr. {n} kommt {len(t)}-mal vor" for n, t in sorted(in_csv.items()) if len(t) > 1]
    fehler += [f"Nr. {n} fehlt in den Roh-CSVs" for n in sorted(set(nummern) - set(in_csv))]
    if len(in_csv) != len(set(nummern)):
        fehler.append(f"Anzahl: App {len(nummern)}, Roh-CSVs {len(in_csv)}")

    posten = {}
    with pdfplumber.open(daten / "pdfs" / PDFS[BAND]) as pdf:
        for lfd in sorted(set(nummern) & set(in_csv)):
            datei, zeile, zellen = in_csv[lfd][0]
            try:
                box = pdf_box(pdf, datei, str(lfd))
            except ValueError as e:
                fehler.append(str(e))
                continue
            posten[str(lfd)] = {"seite": ort(datei)[1], "box": box, "csv": datei, "zeile": zeile, "zellen": zellen}
        for meldung in fehler:
            typer.echo(meldung)
        if fehler:
            raise typer.Exit(code=1)

        ziel = PUBLIC / "quellen"
        seiten = {str(nr): rendere_seite(pdf, BAND, nr, ziel) for nr in range(VON, BIS + 1)}

    ausgabe = PUBLIC / "daten" / "zuschuesse-quellen.json"
    with ausgabe.open("w", encoding="utf-8", newline="\n") as f:
        f.write(als_json({"pdf": PDF_URLS[BAND], "band": BAND}, seiten, posten))
    groesse = sum((PUBLIC / s["bild"]).stat().st_size for s in seiten.values())
    typer.echo(f"Bilder zusammen: {groesse / 1024:.0f} KB")
    typer.echo(f"{ausgabe}: {len(posten)} Posten, {ausgabe.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    typer.run(main)

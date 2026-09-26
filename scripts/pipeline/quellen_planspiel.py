"""Quellenangaben für die Vergleichswerte der Planspiel-Karten in der Vue-App.

Zu jedem Vergleichswert in vue-project/src/components/planspiel/karten.ts, der genau
einer Zeile im Haushaltsplan entspricht, sucht das Skript die Zeile in der Roh-CSV
unter daten/raw_table_extraction/ und dieselbe Zeile als Rechteck auf der Seite im
PDF unter daten/pdfs/ (nicht im Repo, beide Bände). Summen aus mehreren Zeilen
oder Tabellen (alle Zuschüsse, Stellen im Bürgerbüro) haben keine Quelle.
Werte aus von Hand übertragenen Tabellen (MANUELL) stehen in daten/manuell/;
ihre Zeile im PDF findet eine Textsuche.

Prüft außerdem, dass der Wert 2026 in der gefundenen Zeile dem Wert entspricht,
den die App aus vue-project/src/data/planspiel.json zeigt.

Ausgaben:

- vue-project/public/quellen/band<N>_p<PPP>.webp für die benutzten Seiten
- vue-project/public/daten/planspiel-quellen.json

Exit-Code 1 ohne etwas zu schreiben, wenn eine Zeile fehlt, mehrdeutig ist oder
ihr Wert abweicht.
"""

import json
import re
from collections.abc import Callable
from pathlib import Path

import pdfplumber
import polars as pl
import typer

from planspiel_daten import STEUERARTEN_DATEI
from quellen import PDF_URLS, PDFS, als_json, csv_zeile, ort, pdf_box, rendere_seite, text_box
from rohdaten import zahl

DATEN = Path(__file__).resolve().parents[2] / "daten"
WURZEL = Path(__file__).resolve().parents[2]
PUBLIC = WURZEL / "vue-project" / "public"
PLANSPIEL = WURZEL / "vue-project" / "src" / "data" / "planspiel.json"
JAHR = "2026"

GESAMT = "band1_p009_PG12_Ergebnisplan_t0.csv"
VORBERICHT = "band2_p020_Vorbericht_Ergebnisplan_t1.csv"

Wert = Callable[[dict], float]


def plan(datei: str, zeile: str, wert: Wert) -> tuple[str, str, int, float, Wert]:
    """Quelle in einem (Teil-)Ergebnis- oder Finanzplan: Spalte 5 ist 2026, Beträge in €."""
    return datei, zeile, 4, 1, wert


def gesamt(nr: int) -> tuple[str, str, int, float, Wert]:
    """Zeile 01-17 des Gesamtergebnisplans (Band 1, PDF-Seite 9)."""
    return plan(GESAMT, f"{nr:02d}", lambda d: d["gesamt"][JAHR][nr - 1])


def pg(datei: str, nr: int) -> tuple[str, str, int, float, Wert]:
    """Zeile 01-17 im Teilergebnisplan einer Produktgruppe; der PG-Code steht im Dateinamen."""
    code = datei.split("_PG")[1][:4]
    return plan(datei, f"{nr:02d}", lambda d: _pg_werte(d, code)[nr - 1])


def _pg_werte(daten: dict, code: str) -> list[int]:
    """Werte 2026 der Zeilen 01-17 einer Produktgruppe aus planspiel.json."""
    return next(p for p in daten["produktgruppen"] if p["code"] == code)["werte"][JAHR]


# Schlüssel in planspiel-quellen.json -> (Roh-CSV, erste Zelle der Zeile, Spalte mit 2026
# ab 0, Faktor zu €, Wert der App aus planspiel.json). Die Schlüssel stehen in karten.ts.
QUELLEN: dict[str, tuple[str, str, int, float, Wert]] = {
    "gesamt-01": gesamt(1),
    "gesamt-10": gesamt(10),
    "gesamt-11": gesamt(11),
    "gesamt-14": gesamt(14),
    "gesamt-17": gesamt(17),
    "gesamt-20": plan(GESAMT, "20", lambda d: d["zinsaufwand"][JAHR]),
    "finanzplan-19": plan("band1_p011_PG12_Finanzplan_t0.csv", "19", lambda d: d["verkaufSachanlagen"][JAHR]),
    "pg-0204-11": pg("band1_p129_PG0204_Burgerangelegenheiten_Teilergebnisplan_t0.csv", 11),
    "pg-0209-17": pg("band1_p163_PG0209_BrandschutzundfeuerwehrtechnischeHilfeleistung_Teilergebnisplan_t0.csv", 17),
    "pg-0402-17": pg("band1_p226_PG0402_Volkshochschule_Teilergebnisplan_t0.csv", 17),
    "pg-0403-17": pg(
        "band1_p236_PG0403_Westf_SchulefurMusikundForderungderStadtteilmusikschulen_Teilergebnisplan_t0.csv", 17
    ),
    "pg-0404-17": pg("band1_p244_PG0404_StadtbuchereiundForderungvonBuchereienfreierTrager_Teilergebnisplan_t0.csv", 17),
    "pg-0501-10": pg("band1_p282_PG0501_LeistungenderGrundsicherungfurArbeitsuchende_Teilergebnisplan_t0.csv", 10),
    "pg-0501-17": pg("band1_p282_PG0501_LeistungenderGrundsicherungfurArbeitsuchende_Teilergebnisplan_t0.csv", 17),
    "pg-0601-17": pg("band1_p318_PG0601_ForderungvonKinderninTagesbetreuung_Teilergebnisplan_t0.csv", 17),
    "pg-0802-17": pg("band1_p387_PG0802_Bader_Teilergebnisplan_t0.csv", 17),
    "pg-1101-04": pg("band1_p445_PG1101_Abwasserbeseitigung_Teilergebnisplan_t0.csv", 4),
    "pg-1201-17": pg("band1_p459_PG1201_BereitstellungvonVerkehrsflachenund_anlagen_Teilergebnisplan_t0.csv", 17),
    # Die App summiert die Produktgruppen 04xx; der Teilergebnisplan des Produktbereichs hat dieselbe Summe.
    "pb-04-17": plan(
        "band1_p210_PB04_KulturundWissenschaft_Teilergebnisplan_t0.csv",
        "17",
        lambda d: sum(p["werte"][JAHR][16] for p in d["produktgruppen"] if p["code"].startswith("04")),
    ),
    "steuer-sonstige": (VORBERICHT, "Sonstige kommunale Steuern", 3, 1_000_000, lambda d: d["sonstigeSteuern"][JAHR]),
    "stadtwerke": (
        "band2_p143_Uebersicht_Wirtschaftslage_Unternehmen_Tabelle_t0.csv",
        "Stadtwerke Münster GmbH",
        3,
        1000,
        lambda d: d["stadtwerkeAusschuettung"][JAHR],
    ),
}


# Von Hand übertragene Tabellen unter daten/manuell/ (dort Dezimalpunkt statt deutscher
# Zahlen): Schlüssel -> (CSV, erste Zelle der Zeile, Spalte mit 2026 ab 0, Faktor zu €,
# Wert der App). Das Rechteck im PDF kommt aus einer Textsuche nach der Zeile.
MANUELL: dict[str, tuple[str, str, int, float, Wert]] = {
    "steuer-hunde": (STEUERARTEN_DATEI, "Hundesteuer", 1, 1_000_000, lambda d: d["hundesteuer"][JAHR]),
}


def betrag(text: str) -> float | None:
    """Deutscher Zahlentext als Zahl (wie rohdaten.zahl), None bei leerer Zelle."""
    return pl.select(zahl(pl.lit(text))).item()


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Erzeugt Seitenbilder und Quellenangaben für die Vergleichswerte des Planspiels.

    Quelle: die Roh-CSVs aus QUELLEN und die beiden PDFs unter daten/pdfs/.
    Ausgaben: vue-project/public/quellen/*.webp und
    vue-project/public/daten/planspiel-quellen.json. Exit-Code 1, wenn eine Zeile
    fehlt, mehrdeutig ist oder ihr Wert 2026 von planspiel.json abweicht.
    """
    app = json.loads(PLANSPIEL.read_text(encoding="utf-8"))
    fehler = []
    posten = {}
    seiten = {}
    with pdfplumber.open(daten / "pdfs" / PDFS[1]) as band1, pdfplumber.open(daten / "pdfs" / PDFS[2]) as band2:
        pdfs = {1: band1, 2: band2}
        for schluessel, (datei, zeile_schluessel, spalte, faktor, wert) in QUELLEN.items():
            band, seite, _ = ort(datei)
            try:
                zeile, zellen = csv_zeile(daten / "raw_table_extraction" / datei, zeile_schluessel)
                box = pdf_box(pdfs[band], datei, zeile_schluessel)
            except ValueError as e:
                fehler.append(f"{schluessel}: {e}")
                continue
            im_plan = betrag(zellen[spalte])
            erwartet = wert(app)
            if im_plan is None or abs(im_plan * faktor - erwartet) > 0.5:
                fehler.append(f"{schluessel}: {zellen[spalte]!r} in {datei} passt nicht zu {erwartet} in planspiel.json")
            posten[schluessel] = {"band": band, "seite": seite, "box": box, "csv": datei, "zeile": zeile, "zellen": zellen}

        for schluessel, (datei, zeile_schluessel, spalte, faktor, wert) in MANUELL.items():
            band, seite, _ = ort(datei)
            try:
                zeile, zellen = csv_zeile(daten / "manuell" / datei, zeile_schluessel)
                box = text_box(pdfs[band], seite, rf"{re.escape(zeile_schluessel)}(\s+[\d.,]+)+")
            except ValueError as e:
                fehler.append(f"{schluessel}: {e}")
                continue
            erwartet = wert(app)
            if abs(float(zellen[spalte]) * faktor - erwartet) > 0.5:
                fehler.append(f"{schluessel}: {zellen[spalte]!r} in {datei} passt nicht zu {erwartet} in planspiel.json")
            posten[schluessel] = {
                "band": band,
                "seite": seite,
                "box": box,
                "ordner": "manuell",
                "csv": datei,
                "zeile": zeile,
                "zellen": zellen,
            }

        for meldung in fehler:
            typer.echo(meldung)
        if fehler:
            raise typer.Exit(code=1)

        for band, seite in sorted({(p["band"], p["seite"]) for p in posten.values()}):
            seiten[f"{band}-{seite}"] = rendere_seite(pdfs[band], band, seite, PUBLIC / "quellen")

    ausgabe = PUBLIC / "daten" / "planspiel-quellen.json"
    with ausgabe.open("w", encoding="utf-8", newline="\n") as f:
        f.write(als_json({"pdf": {str(b): url for b, url in PDF_URLS.items()}}, seiten, posten))
    groesse = sum((PUBLIC / s["bild"]).stat().st_size for s in seiten.values())
    typer.echo(f"{len(seiten)} Bilder zusammen: {groesse / 1024:.0f} KB")
    typer.echo(f"{ausgabe}: {len(posten)} Quellen, {ausgabe.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    typer.run(main)

"""Quellenangaben für die Zuschüsse-Seite der Vue-App: wo steht jeder Zuschuss im PDF?

Liest den Zuschussbericht (Band 2, PDF-Seiten 351-362) direkt aus dem PDF unter
daten/pdfs/ (nicht im Repo) und sucht zu jeder Zuschusszeile die Seite und die
Position der Zeile (Rechteck in PDF-Punkten). Dazu kommt die passende Zeile der
Roh-CSV unter daten/raw_table_extraction/ (Dateiname, Zeilennummer, Zellen).
Die zwölf Seiten werden als WebP-Bilder gespeichert, damit die App den
Ausschnitt um die Zeile zeigen kann.

Ausgaben:

- vue-project/public/quellen/band2_p351.webp bis band2_p362.webp
- vue-project/public/daten/zuschuesse-quellen.json

Prüft, dass jeder Posten aus vue-project/public/daten/zuschuesse-2026-2027.json
genau einmal gefunden wird; sonst Exit-Code 1, ohne etwas zu schreiben.
"""

import csv
import json
import re
from pathlib import Path

import pdfplumber
import typer

from rohdaten import roh_dateien, seite

DATEN = Path(__file__).resolve().parents[2] / "daten"
PUBLIC = Path(__file__).resolve().parents[2] / "vue-project" / "public"
PDF = "Haushaltsplan_2026-2027_Band_2_Stand_20.05.2026.pdf"
PDF_URL = (
    "https://www.stadt-muenster.de/fileadmin/user_upload/stadt-muenster/"
    "20_finanzen_und_beteiligungen/pdf/Haushalt/Haushalt_2026_2027/" + PDF
)
BAND = 2
VON, BIS = 351, 362
# 144 dpi = 2 Pixel je PDF-Punkt; die App zeigt die Seite mit 1,5 CSS-Pixeln je Punkt.
AUFLOESUNG = 144
WEBP_QUALITAET = 60
LFD_NR = re.compile(r"^\d+$")


def zeilen_im_pdf(pdf_pfad: Path) -> dict[int, tuple[int, list[float]]]:
    """Laufende Nummer -> (PDF-Seite, [x0, top, x1, bottom] in Punkten) aus den Tabellen des PDFs."""
    treffer: dict[int, list[tuple[int, list[float]]]] = {}
    with pdfplumber.open(pdf_pfad) as pdf:
        for nr in range(VON, BIS + 1):
            for tabelle in pdf.pages[nr - 1].find_tables():
                for zeile, zellen in zip(tabelle.rows, tabelle.extract()):
                    erste = (zellen[0] or "").strip()
                    if LFD_NR.match(erste):
                        box = [round(w, 1) for w in zeile.bbox]
                        treffer.setdefault(int(erste), []).append((nr, box))
    return _eindeutig(treffer, "PDF")


def zeilen_in_csv(daten: Path) -> dict[int, tuple[str, int, list[str]]]:
    """Laufende Nummer -> (Dateiname, Zeilennummer ab 1, Zellen) aus den Roh-CSVs.

    Die Zeilennummer ist die erste physische Zeile des Datensatzes in der Datei,
    wie GitHub sie anzeigt; mehrzeilige Zellen in Anführungszeichen zählen mit.
    """
    treffer: dict[int, list[tuple[str, int, list[str]]]] = {}
    for pfad in roh_dateien(daten, BAND, VON, BIS, "*_Zuschussbericht_*"):
        with pfad.open(encoding="utf-8", newline="") as f:
            leser = csv.reader(f)
            beginn = 1
            for zellen in leser:
                erste = zellen[0].strip() if zellen else ""
                if LFD_NR.match(erste):
                    treffer.setdefault(int(erste), []).append((pfad.name, beginn, zellen))
                beginn = leser.line_num + 1
    return _eindeutig(treffer, "CSV")


def _eindeutig(treffer: dict[int, list], quelle: str) -> dict:
    """Nimmt je Nummer den einzigen Treffer; doppelte Nummern werden gemeldet und ausgelassen."""
    ergebnis = {}
    for lfd, liste in treffer.items():
        if len(liste) == 1:
            ergebnis[lfd] = liste[0]
        else:
            typer.echo(f"{quelle}: Nr. {lfd} kommt {len(liste)}-mal vor")
    return ergebnis


def rendere_seiten(pdf_pfad: Path, ziel: Path) -> dict[str, dict]:
    """Speichert die Seiten VON..BIS als WebP und gibt die Seitenangaben für das JSON zurück."""
    ziel.mkdir(parents=True, exist_ok=True)
    seiten = {}
    with pdfplumber.open(pdf_pfad) as pdf:
        for nr in range(VON, BIS + 1):
            pdf_seite = pdf.pages[nr - 1]
            name = f"band{BAND}_p{nr}.webp"
            bild = pdf_seite.to_image(resolution=AUFLOESUNG).original.convert("RGB")
            bild.save(ziel / name, "WEBP", quality=WEBP_QUALITAET, method=6)
            typer.echo(f"{ziel / name}: {bild.width}x{bild.height} px, {(ziel / name).stat().st_size / 1024:.0f} KB")
            seiten[str(nr)] = {
                "bild": f"quellen/{name}",
                "breite": round(float(pdf_seite.width), 1),
                "hoehe": round(float(pdf_seite.height), 1),
            }
    return seiten


def als_json(seiten: dict[str, dict], posten: dict[str, dict]) -> str:
    """JSON mit einem Posten je Zeile, damit die Datei klein und trotzdem lesbar bleibt."""
    def zeile(schluessel: str, wert: dict) -> str:
        return f"    {json.dumps(schluessel)}: {json.dumps(wert, ensure_ascii=False)}"

    teile = [
        "{",
        f'  "pdf": {json.dumps(PDF_URL)},',
        f'  "band": {BAND},',
        '  "seiten": {',
        ",\n".join(zeile(k, v) for k, v in seiten.items()),
        "  },",
        '  "posten": {',
        ",\n".join(zeile(k, v) for k, v in posten.items()),
        "  }",
        "}",
    ]
    return "\n".join(teile) + "\n"


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Erzeugt Seitenbilder und Quellenangaben für die Zuschüsse der Vue-App.

    Quelle: Zuschussbericht, Band 2, PDF-Seiten 351-362 (PDF unter daten/pdfs/) und
    die zugehörigen Roh-CSVs. Ausgaben: vue-project/public/quellen/*.webp und
    vue-project/public/daten/zuschuesse-quellen.json. Exit-Code 1, wenn ein Posten
    der App fehlt oder doppelt ist.
    """
    pdf_pfad = daten / "pdfs" / PDF
    im_pdf = zeilen_im_pdf(pdf_pfad)
    in_csv = zeilen_in_csv(daten)
    app = json.loads((PUBLIC / "daten" / "zuschuesse-2026-2027.json").read_text(encoding="utf-8"))
    nummern = [p["nr"] for p in app["posten"]]

    fehler = [f"App: Nr. {n} kommt mehrfach vor" for n in sorted(set(nummern)) if nummern.count(n) > 1]
    fehler += [f"Nr. {n} fehlt im PDF" for n in sorted(set(nummern) - set(im_pdf))]
    fehler += [f"Nr. {n} fehlt in den Roh-CSVs" for n in sorted(set(nummern) - set(in_csv))]
    for lfd in sorted(set(im_pdf) & set(in_csv)):
        if im_pdf[lfd][0] != seite(daten / "raw_table_extraction" / in_csv[lfd][0]):
            fehler.append(f"Nr. {lfd}: Seite im PDF und Seite der Roh-CSV weichen ab")
    if len(im_pdf) != len(nummern) or len(in_csv) != len(nummern):
        fehler.append(f"Anzahl: App {len(nummern)}, PDF {len(im_pdf)}, Roh-CSVs {len(in_csv)}")
    for meldung in fehler:
        typer.echo(meldung)
    if fehler:
        raise typer.Exit(code=1)

    posten = {}
    for lfd in sorted(nummern):
        nr, box = im_pdf[lfd]
        datei, zeile, zellen = in_csv[lfd]
        posten[str(lfd)] = {"seite": nr, "box": box, "csv": datei, "zeile": zeile, "zellen": zellen}

    seiten = rendere_seiten(pdf_pfad, PUBLIC / "quellen")
    ausgabe = PUBLIC / "daten" / "zuschuesse-quellen.json"
    with ausgabe.open("w", encoding="utf-8", newline="\n") as f:
        f.write(als_json(seiten, posten))
    groesse = sum(p.stat().st_size for p in (PUBLIC / "quellen").glob("*.webp"))
    typer.echo(f"Bilder zusammen: {groesse / 1024:.0f} KB")
    typer.echo(f"{ausgabe}: {len(posten)} Posten, {ausgabe.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    typer.run(main)

"""Gemeinsame Hilfsfunktionen für die Quellenangaben der Vue-App (Seitenleiste "Quelle").

Findet eine Zeile in einer Roh-CSV unter daten/raw_table_extraction/, dieselbe
Zeile als Rechteck auf der PDF-Seite, speichert Seiten als WebP-Bilder unter
vue-project/public/quellen/ und schreibt das gemeinsame JSON-Format. Benutzt von
quellen_zuschuesse.py und quellen_planspiel.py; wird nicht direkt aufgerufen.
Braucht die PDFs unter daten/pdfs/ (nicht im Repo).
"""

import csv
import json
from collections.abc import Iterator
from pathlib import Path

import pdfplumber
import typer

from extrahiere_tabellen import zeilen_aufteilen
from rohdaten import DATEINAME

PDFS = {
    1: "Haushaltsplan_2026-2027_Band_1_Stand_20.05.2026.pdf",
    2: "Haushaltsplan_2026-2027_Band_2_Stand_20.05.2026.pdf",
}
PDF_URLS = {
    band: "https://www.stadt-muenster.de/fileadmin/user_upload/stadt-muenster/"
    "20_finanzen_und_beteiligungen/pdf/Haushalt/Haushalt_2026_2027/" + name
    for band, name in PDFS.items()
}
# 144 dpi = 2 Pixel je PDF-Punkt; die App zeigt die Seite mit 1,5 CSS-Pixeln je Punkt.
AUFLOESUNG = 144
WEBP_QUALITAET = 60


def csv_zeilen(pfad: Path) -> Iterator[tuple[int, list[str]]]:
    """Alle Datensätze einer Roh-CSV als (Zeilennummer ab 1, Zellen).

    Die Zeilennummer ist die erste physische Zeile des Datensatzes in der Datei,
    wie GitHub sie anzeigt; mehrzeilige Zellen in Anführungszeichen zählen mit.
    """
    with pfad.open(encoding="utf-8", newline="") as f:
        leser = csv.reader(f)
        beginn = 1
        for zellen in leser:
            yield beginn, zellen
            beginn = leser.line_num + 1


def csv_zeile(pfad: Path, schluessel: str) -> tuple[int, list[str]]:
    """Der eine Datensatz, dessen erste Zelle (ohne Leerzeichen am Rand) gleich schluessel ist.

    ValueError, wenn es keinen oder mehrere solche Datensätze gibt.
    """
    treffer = [(nr, zellen) for nr, zellen in csv_zeilen(pfad) if zellen and zellen[0].strip() == schluessel]
    if len(treffer) != 1:
        raise ValueError(f"{pfad.name}: Zeile {schluessel!r} kommt {len(treffer)}-mal vor")
    return treffer[0]


def ort(datei: str) -> tuple[int, int, int]:
    """(Band, PDF-Seite, Tabellennummer) aus dem Namen einer Roh-CSV."""
    m = DATEINAME.match(datei)
    return int(m[1]), int(m[2]), int(m[3])


def pdf_box(pdf: pdfplumber.PDF, datei: str, schluessel: str) -> list[float]:
    """Rechteck [x0, top, x1, bottom] in PDF-Punkten der Tabellenzeile, deren erste Zelle schluessel ist.

    pdf ist der geöffnete Band aus dem Dateinamen der Roh-CSV; Seite und Tabelle
    stammen ebenfalls daraus (find_tables liefert die Tabellen in derselben
    Reihenfolge wie extract_tables in extrahiere_tabellen.py). pdfplumber fasst
    manchmal mehrere Zeilen zu einer zusammen (z. B. 01 bis 09 im Ergebnisplan
    oder die drei Typen der Stadtwerke). Die Zeile wird mit derselben Regel
    aufgeteilt wie beim Schreiben der Roh-CSV (zeilen_aufteilen); steht
    schluessel in der i-ten von n Teilzeilen, gilt der i-te von n gleich hohen
    Streifen des Rechtecks, sonst das ganze Rechteck. Die Höhe kommt aus den
    Zellen rechts der ersten: Ist die erste Zelle über mehrere Zeilen verbunden
    (Stadtwerke mit drei Typen), wäre das Rechteck der ganzen Zeile zu hoch.
    ValueError bei keinem oder mehreren Treffern.
    """
    _, nr, t = ort(datei)
    tabelle = pdf.pages[nr - 1].find_tables()[t]
    treffer = []
    for zeile, zellen in zip(tabelle.rows, tabelle.extract()):
        teile = [teil[0].strip() for teil in zeilen_aufteilen([zellen])]
        if schluessel in teile:
            x0, oben, x1, unten = zeile.bbox
            rechts = [zelle for zelle in zeile.cells[1:] if zelle]
            if rechts:
                oben = min(zelle[1] for zelle in rechts)
                unten = max(zelle[3] for zelle in rechts)
            hoehe = (unten - oben) / len(teile)
            oben += teile.index(schluessel) * hoehe
            treffer.append([round(w, 1) for w in (x0, oben, x1, oben + hoehe)])
    if len(treffer) != 1:
        raise ValueError(f"{datei}: Zeile {schluessel!r} kommt im PDF {len(treffer)}-mal vor")
    return treffer[0]


def rendere_seite(pdf: pdfplumber.PDF, band: int, nr: int, ziel: Path) -> dict:
    """Speichert eine PDF-Seite als ziel/band<N>_p<PPP>.webp; gibt Bildpfad und Seitengröße für das JSON zurück."""
    ziel.mkdir(parents=True, exist_ok=True)
    pdf_seite = pdf.pages[nr - 1]
    name = f"band{band}_p{nr:03d}.webp"
    bild = pdf_seite.to_image(resolution=AUFLOESUNG).original.convert("RGB")
    bild.save(ziel / name, "WEBP", quality=WEBP_QUALITAET, method=6)
    typer.echo(f"{ziel / name}: {bild.width}x{bild.height} px, {(ziel / name).stat().st_size / 1024:.0f} KB")
    return {
        "bild": f"quellen/{name}",
        "breite": round(float(pdf_seite.width), 1),
        "hoehe": round(float(pdf_seite.height), 1),
    }


def als_json(kopf: dict, seiten: dict[str, dict], posten: dict[str, dict]) -> str:
    """JSON mit den Kopfangaben, dann einer Seite bzw. einem Posten je Zeile, damit die Datei klein und lesbar bleibt."""
    def zeile(schluessel: str, wert: dict) -> str:
        return f"    {json.dumps(schluessel)}: {json.dumps(wert, ensure_ascii=False)}"

    teile = [
        "{",
        *(f"  {json.dumps(k)}: {json.dumps(v)}," for k, v in kopf.items()),
        '  "seiten": {',
        ",\n".join(zeile(k, v) for k, v in seiten.items()),
        "  },",
        '  "posten": {',
        ",\n".join(zeile(k, v) for k, v in posten.items()),
        "  }",
        "}",
    ]
    return "\n".join(teile) + "\n"

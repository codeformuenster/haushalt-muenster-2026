"""Bewirtschaftungsregeln und Erläuterungen je Produktgruppe für die Vue-App.

Liest die Textseiten "Bewirtschaftungsregeln / Erläuterungen" aus Band 1 (PDF unter
daten/pdfs/, nicht im Repo): je Produktgruppe eine Seite nach dem Teilergebnisplan,
teils eine Folgeseite und eine Seite nach dem Teilfinanzplan, dazu vier Seiten im
Investitionsplan. Für diese Seiten findet pdfplumber keine Tabelle, es gibt also keine
Roh-CSV; das Skript liest den Seitentext.

Jeder Block ("zu Zeile N:", "allgemein:", "zu Maßnahme NNNN ...", sonst freier Text)
wird ein Eintrag mit Produktgruppe, Abschnitt (regel/erlaeuterung), Plan
(ergebnis/finanz/invest), Zeilen, Maßnahme, Sperrvermerk, Text und PDF-Seite.

Gefiltert werden leere Abschnitte ("Keine") und der Standardtext zu Zeile 27/28 über
die internen Leistungsbeziehungen (Mieter-/Vermietermodell des Immobilienmanagements).

Ausgabe: vue-project/public/daten/erlaeuterungen.json. Exit-Code 1 ohne zu schreiben,
wenn die Blockzahl abweicht, eine Zeilennummer außerhalb des Plans liegt oder die
Produktgruppen nicht zu planspiel.json passen.
"""

import json
import re
import sys
from pathlib import Path

import pdfplumber
import typer

from quellen import PDFS

WURZEL = Path(__file__).resolve().parents[2]
DATEN = WURZEL / "daten"
AUSGABE = WURZEL / "vue-project" / "public" / "daten" / "erlaeuterungen.json"
PLANSPIEL = WURZEL / "vue-project" / "src" / "data" / "planspiel.json"

# Alle Seiten mit "Bewirtschaftungsregeln:" in Band 1 (Durchsicht aller Seiten 15-711).
# Eine Suche über alle Seiten dauert Minuten, deshalb die feste Liste; die Prüfung
# unten stellt sicher, dass jede Seite den erwarteten Kopf hat.
SEITEN = [
    23, 27, 33, 41, 60, 65, 72, 78, 83, 85, 100, 108, 114, 121, 130, 136, 144, 151, 155, 164,
    171, 178, 197, 206, 219, 227, 237, 245, 254, 283, 291, 301, 307, 319, 322, 329, 331, 338,
    340, 347, 359, 370, 381, 388, 404, 428, 437, 446, 460, 470, 476, 482, 487, 494, 505, 517,
    527, 545, 555, 589, 592, 632, 701,
]
# Folgeseite ohne eigenen Abschnittskopf -> Seite, deren letzten Abschnitt sie fortsetzt.
FOLGESEITEN = {320: 319}
# Seiten direkt nach dem Teilfinanzplan: "zu Zeile N" meint dort Zeilen des Teilfinanzplans.
FINANZ_SEITEN = {85, 322, 331, 340}
# Ab hier Investitionsplan (Erläuterungen "zu Maßnahme").
INVEST_AB = 560
# Zeilennummern je Plan: Teilergebnisplan 01-29, Teilfinanzplan bis 40.
ZEILEN_BIS = {"ergebnis": 29, "finanz": 40, "invest": 0}

# Rohzahl der Blöcke vor dem Filtern, am PDF abgezählt.
ERWARTET = {"zeile": 138, "allgemein": 3, "massnahme": 4}
# Produktgruppen aus planspiel.json ohne Bewirtschaftungsregeln/Erläuterungen im Plan.
OHNE_SEITE = {
    "0105", "0106", "0107", "0114", "0115", "0406", "0407", "0408", "0902", "1001", "1102",
    "1502", "1504",
}

# Auch "Zu Zeile 15:", "zu Zeile 15 und Zeile 16:", "zu Zeile 13 – 16:" und ohne Doppelpunkt ("zu Zeile 28").
ZU_ZEILE = re.compile(r"^[Zz]u Zeilen? (\d+(?:\s*(?:,|–|-|und(?: Zeile)?)\s*\d+)*)\s*:?\s*(.*)$")
ALLGEMEIN = re.compile(r"^allgemein:\s*(.*)$")
ZU_MASSNAHME = re.compile(r"^zu Maßnahme (\d{4})\s*(.*)$")
PG = re.compile(r"Produktgruppe\s*(\d{4})")
# Zeile, die eine volle Satzbreite füllt: die nächste setzt den Satz fort.
VOLLE_ZEILE = 120


def zeilen_nummern(angabe: str) -> list[int]:
    """'13 – 16' -> 13..16, '27, 28' / '04 und 05' -> Liste."""
    spanne = re.fullmatch(r"\s*(\d+)\s*[–-]\s*(\d+)\s*", angabe)
    if spanne:
        return list(range(int(spanne[1]), int(spanne[2]) + 1))
    return [int(n) for n in re.findall(r"\d+", angabe)]


def verbinde(zeilen: list[str]) -> str:
    """Setzt umbrochene Zeilen zusammen; kurze Zeilen (Listen, Tabellen) bleiben eigene Zeilen."""
    text, vorige = "", ""
    for zeile in zeilen:
        if not text:
            text = zeile
        elif zeile.startswith("- ") or vorige.endswith(":"):
            text += "\n" + zeile  # Aufzählung oder Einleitung einer Liste
        elif text.endswith("-") and re.match(r"(und|oder|bzw\.) ", zeile):
            text += " " + zeile  # "Miet-, Pacht- und ..."
        elif text.endswith("-") and zeile[:1].islower():
            text = text[:-1] + zeile  # Silbentrennung
        elif text.endswith("-"):
            text += zeile  # "Mieter-/Vermieter"
        elif len(vorige) >= VOLLE_ZEILE:
            text += " " + zeile  # Satz läuft über den Zeilenumbruch weiter
        else:
            text += "\n" + zeile
        vorige = zeile
    return re.sub(r"\bD ie\b", "Die", text).strip()


def lies_seite(text: str) -> tuple[str | None, list[str]]:
    """Produktgruppe aus dem Kopf und die Zeilen ab dem ersten Abschnitt (ohne Seitenzahlen)."""
    zeilen = [z.strip() for z in text.splitlines() if z.strip()]
    # Seitenzahl steht als erste oder letzte Zeile; Jahreszahlen im Text bleiben.
    while zeilen and zeilen[0].isdigit():
        zeilen.pop(0)
    while zeilen and zeilen[-1].isdigit():
        zeilen.pop()
    pg = PG.search(text)
    start = next(
        i for i, z in enumerate(zeilen)
        if z == "Bewirtschaftungsregeln:" or ZU_ZEILE.match(z)
    )
    return (pg[1] if pg else None), zeilen[start:]


def bloecke(pg: str, seite: int, zeilen: list[str], abschnitt: str) -> list[dict]:
    """Zerlegt die Zeilen einer Seite in Blöcke."""
    plan = "invest" if seite > INVEST_AB else "finanz" if seite in FINANZ_SEITEN else "ergebnis"
    liste: list[dict] = []
    for zeile in zeilen:
        if zeile in ("Bewirtschaftungsregeln:", "Erläuterungen:"):
            abschnitt = "regel" if zeile.startswith("Bewirt") else "erlaeuterung"
            liste.append({"art": "frei", "abschnitt": abschnitt, "zeilen": [], "kopf": []})
            continue
        neu = None
        if m := ZU_ZEILE.match(zeile):
            neu = {"art": "zeile", "zeilen": zeilen_nummern(m[1]), "kopf": [m[2]] if m[2] else []}
        elif m := ALLGEMEIN.match(zeile):
            neu = {"art": "allgemein", "zeilen": [], "kopf": [m[1]] if m[1] else []}
        elif m := ZU_MASSNAHME.match(zeile):
            neu = {"art": "massnahme", "zeilen": [], "massnahme": m[1], "titel": m[2].strip('"„“ '), "kopf": []}
        if neu:
            liste.append({"abschnitt": abschnitt, **neu})
        else:
            if not liste:
                liste.append({"art": "frei", "abschnitt": abschnitt, "zeilen": [], "kopf": []})
            liste[-1]["kopf"].append(zeile)
    eintraege = []
    for b in liste:
        text = verbinde(b["kopf"])
        if b["art"] == "frei" and not text:
            continue  # Abschnittskopf direkt vor "zu Zeile"
        eintraege.append({
            "art": b["art"],
            "pg": pg,
            "abschnitt": b["abschnitt"],
            "plan": plan,
            "zeilen": b["zeilen"],
            "massnahme": b.get("massnahme"),
            "titel": b.get("titel") or None,
            "sperrvermerk": "SPERRVERMERK" in text or "SPERRVERMERK" in (b.get("titel") or ""),
            "text": text,
            "seite": seite,
        })
    return eintraege


def standardtext(e: dict) -> bool:
    """Leerer Abschnitt oder Standardtext zu den internen Leistungsbeziehungen (Zeile 27/28)."""
    if e["text"] == "Keine" and not e["zeilen"] and not e["massnahme"]:
        return True
    return (
        bool(e["zeilen"]) and set(e["zeilen"]) <= {27, 28}
        and e["text"].startswith("Bei den internen Leistungsbeziehungen")
        and "Vermietermodell" in e["text"]
    )


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Schreibt vue-project/public/daten/erlaeuterungen.json aus Band 1 (siehe Moduldoc)."""
    alle: list[dict] = []
    fehler: list[str] = []
    with pdfplumber.open(daten / "pdfs" / PDFS[1]) as pdf:
        letzter: dict[int, tuple[str, str]] = {}
        for seite in sorted(SEITEN + list(FOLGESEITEN)):
            text = pdf.pages[seite - 1].extract_text() or ""
            if seite not in FOLGESEITEN and "Bewirtschaftungsregeln:" not in text:
                fehler.append(f"S. {seite}: kein Abschnitt 'Bewirtschaftungsregeln:'")
                continue
            pg, zeilen = lies_seite(text)
            if seite in FOLGESEITEN:
                vorher_pg, abschnitt = letzter[FOLGESEITEN[seite]]
                if pg != vorher_pg:
                    fehler.append(f"S. {seite}: PG {pg}, erwartet {vorher_pg}")
            else:
                abschnitt = "regel"
            if not pg:
                fehler.append(f"S. {seite}: keine Produktgruppe im Kopf")
                continue
            neu = bloecke(pg, seite, zeilen, abschnitt)
            letzter[seite] = (pg, neu[-1]["abschnitt"])
            alle += neu

    for art, soll in ERWARTET.items():
        ist = sum(e["art"] == art for e in alle)
        if ist != soll:
            fehler.append(f"Blöcke '{art}': {ist}, erwartet {soll}")
    for e in alle:
        bis = ZEILEN_BIS[e["plan"]]
        if any(not 1 <= z <= bis for z in e["zeilen"]):
            fehler.append(f"S. {e['seite']} PG {e['pg']}: Zeilen {e['zeilen']} außerhalb 1-{bis} ({e['plan']})")
    codes = {g["code"] for g in json.loads(PLANSPIEL.read_text(encoding="utf-8"))["produktgruppen"]}
    gefunden = {e["pg"] for e in alle}
    if gefunden - codes:
        fehler.append(f"PG nicht in planspiel.json: {sorted(gefunden - codes)}")
    if codes - gefunden != OHNE_SEITE:
        fehler.append(f"PG ohne Seite: {sorted(codes - gefunden)}, erwartet {sorted(OHNE_SEITE)}")

    if fehler:
        print("\n".join(fehler), file=sys.stderr)
        raise typer.Exit(1)

    behalten = [e for e in alle if not standardtext(e)]
    for e in behalten:
        del e["art"]
    AUSGABE.write_text(
        "[\n" + ",\n".join("  " + json.dumps(e, ensure_ascii=False) for e in behalten) + "\n]\n",
        encoding="utf-8",
    )
    print(
        f"{len(alle)} Blöcke von {len(SEITEN) + len(FOLGESEITEN)} Seiten, "
        f"{len(alle) - len(behalten)} gefiltert ('Keine', Standardtext Zeile 27/28), "
        f"{len(behalten)} geschrieben, davon {sum(e['sperrvermerk'] for e in behalten)} mit Sperrvermerk"
    )


if __name__ == "__main__":
    typer.run(main)

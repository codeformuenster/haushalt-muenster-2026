"""Schulden, Kredite und Investitionen aus Band 2 (Vorbericht und Übersichten).

Liest aus daten/raw_table_extraction/ (PDF-Seiten von Band 2):

- p027: investive Dezernatsbudgets 2026-2030 in €,
- p031: Kredite für Investitionen 2023-2030 (Aufnahme, Tilgung, Netto-Neuverschuldung,
  Schulden am 31.12.) in Mio. €, einschließlich der an Beteiligungen weitergegebenen Kredite,
- p032: Anteil der Beteiligungen an diesen Schulden 2024 und 2025,
- p083: Kredite für Investitionen und zur Liquiditätssicherung an vier Stichtagen in TEUR,
- p091: Verpflichtungsermächtigungen nach Entstehungsjahr und Fälligkeit in TEUR.

Alle Beträge in vue-project/src/data/schulden.json stehen in €.

Prüft: Aufnahme - Tilgung = Netto-Neuverschuldung (außer 2025, Fehler im PDF) und Vorjahresstand + Netto = Stand (S. 31),
die Schulden aus S. 31 gegen die Kredite für Investitionen aus S. 83, die Summenzeile der
Dezernatsbudgets und die Zeilen- und Spaltensummen der Verpflichtungsermächtigungen.
Exit-Code 1 bei Abweichungen.
"""

import json
from pathlib import Path

import polars as pl
import typer

from rohdaten import lies, zahl

DATEN = Path(__file__).resolve().parents[2] / "daten"
AUSGABE_JSON = Path(__file__).resolve().parents[2] / "vue-project" / "src" / "data" / "schulden.json"
DEZERNATE = "band2_p027_Vorbericht_Tabelle_t0.csv"
KREDITE = "band2_p031_Vorbericht_Tabelle_t0.csv"
BETEILIGUNGEN = "band2_p032_Vorbericht_Tabelle_t0.csv"
VERBINDLICHKEITEN = "band2_p083_Uebersicht_Verbindlichkeiten_Tabelle_t0.csv"
VE = "band2_p091_Uebersicht_Verpflichtungsermaechtigungen_Tabelle_t0.csv"

MIO = 1_000_000
TEUR = 1_000
# Mio.-Werte auf S. 31 sind einzeln gerundet; Summen aus zwei Werten weichen um bis zu 0,1 ab.
RUNDUNG_MIO = 0.15
# 2025 (Prognose): 257,6 - 51,7 = 205,9, im PDF steht 205,0. Netto und Stand passen zu S. 83,
# der Fehler liegt also bei Aufnahme oder Tilgung (siehe daten/pruefberichte/befunde.md).
BEKANNT_NETTO = {2025}

c = pl.col


def werte(df: pl.DataFrame, spalten: list[str]) -> list[list[float]]:
    """Die genannten Spalten zeilenweise als Zahlen."""
    return df.select(*[zahl(c(s)) for s in spalten]).rows()


def zeile(df: pl.DataFrame, anfang: str, datei: str) -> pl.DataFrame:
    """Genau die eine Zeile, deren erste Spalte mit anfang beginnt."""
    treffer = df.filter(c("column_1").str.starts_with(anfang))
    if treffer.height != 1:
        raise typer.BadParameter(f"{datei}: {treffer.height} Zeilen beginnen mit {anfang!r}")
    return treffer


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Schreibt schulden.json und prüft die Tabellen in sich und gegeneinander."""
    roh = daten / "raw_table_extraction"
    fehler: list[str] = []

    # S. 31: Jahreszeilen wie "2026 (Ansatz)"
    k = lies(roh / KREDITE).filter(c("column_1").str.contains(r"^\d{4} \("))
    jahre = [int(t[:4]) for t in k["column_1"]]
    arten = [t[6:-1] for t in k["column_1"]]
    aufnahme, tilgung, netto, stand = map(list, zip(*werte(k, ["column_2", "column_3", "column_4", "column_5"])))
    for i, jahr in enumerate(jahre):
        if jahr not in BEKANNT_NETTO and abs(aufnahme[i] - tilgung[i] - netto[i]) > RUNDUNG_MIO:
            fehler.append(f"S. 31 {jahr}: Aufnahme {aufnahme[i]} - Tilgung {tilgung[i]} != Netto {netto[i]}")
        if i and abs(stand[i - 1] + netto[i] - stand[i]) > RUNDUNG_MIO:
            fehler.append(f"S. 31 {jahr}: Stand Vorjahr {stand[i - 1]} + Netto {netto[i]} != Stand {stand[i]}")

    # S. 32: Anteil der Beteiligungen
    b = lies(roh / BETEILIGUNGEN).filter(c("column_1").str.contains(r"^\d{4} \("))
    beteiligungen = werte(b, ["column_3", "column_4"])

    # S. 83: Spalten 2-5 sind 01.01.2025, 01.01.2026, 31.12.2026, 31.12.2027
    v = lies(roh / VERBINDLICHKEITEN)
    spalten = ["column_2", "column_3", "column_4", "column_5"]
    invest = werte(zeile(v, "2. Verbindlichkeiten aus Krediten für Investitionen", VERBINDLICHKEITEN), spalten)[0]
    liqui = werte(zeile(v, "3. Verbindlichkeiten aus Krediten zur Liquiditätssicherung", VERBINDLICHKEITEN), spalten)[0]
    # Stand am 01.01. eines Jahres = Stand am 31.12. des Vorjahres auf S. 31
    for wert, jahr in zip(invest, (2024, 2025, 2026, 2027)):
        mio = stand[jahre.index(jahr)]
        if abs(wert / TEUR - mio) > 0.05:
            fehler.append(f"S. 83 Investkredite {wert} TEUR != S. 31 Schulden 31.12.{jahr} {mio} Mio. €")

    # S. 27: Dezernatszeilen haben eine Nummer, die Summenzeile nicht
    d = lies(roh / DEZERNATE).filter(c("column_3").str.contains(r"^[\d.]+$"))
    dez = d.filter(c("column_1").is_not_null())
    summe_dez = werte(d.filter(c("column_1").is_null()), ["column_3"])[0][0]
    betraege = [w[0] for w in werte(dez, ["column_3"])]
    if sum(betraege) != summe_dez:
        fehler.append(f"S. 27: Summe Dezernate {sum(betraege)} != Summenzeile {summe_dez}")

    # S. 91: Entstehungsjahre in Zeilen, Fälligkeit in Spalten 2-7, Summe in Spalte 8
    ve = lies(roh / VE)
    kopf = ve.row(1)
    faelligkeit = list(kopf[1:7])
    ve_spalten = [f"column_{i}" for i in range(2, 9)]
    ve_zeilen = ve.filter(c("column_1").str.contains(r"^\d{4}$"))
    matrix = werte(ve_zeilen, ve_spalten)
    summenzeile = werte(zeile(ve, "Summe", VE), ve_spalten)[0]
    for jahr, z in zip(ve_zeilen["column_1"], matrix):
        if sum(z[:-1]) != z[-1]:
            fehler.append(f"S. 91 VE {jahr}: Zeilensumme {sum(z[:-1])} != {z[-1]}")
    for i, s in enumerate(summenzeile):
        if sum(z[i] for z in matrix) != s:
            fehler.append(f"S. 91 VE Spalte {ve_spalten[i]}: Spaltensumme != {s}")

    daten_json = {
        "kredite": {
            "jahre": jahre,
            "art": arten,
            "aufnahme": [round(x * MIO) for x in aufnahme],
            "tilgung": [round(x * MIO) for x in tilgung],
            "netto": [round(x * MIO) for x in netto],
            "stand": [round(x * MIO) for x in stand],
        },
        "beteiligungen": {
            "jahre": [int(t[:4]) for t in b["column_1"]],
            "betrag": [round(x[0] * MIO) for x in beteiligungen],
            "prozent": [x[1] for x in beteiligungen],
        },
        "verbindlichkeiten": {
            "stichtage": ["01.01.2025", "01.01.2026", "31.12.2026", "31.12.2027"],
            "investitionskredite": [round(x * TEUR) for x in invest],
            "liquiditaetskredite": [round(x * TEUR) for x in liqui],
        },
        "dezernate": [
            {"nummer": n, "name": name, "betrag": round(w)}
            for n, name, w in zip(dez["column_1"], dez["column_2"], betraege)
        ],
        "verpflichtungsermaechtigungen": {
            "faelligkeit": faelligkeit,
            "entstehungsjahre": [int(j) for j in ve_zeilen["column_1"]],
            "werte": [[round(x * TEUR) for x in z[:-1]] for z in matrix],
            "summe": round(summenzeile[-1] * TEUR),
        },
    }
    AUSGABE_JSON.write_text(json.dumps(daten_json, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    for f in fehler:
        typer.echo(f"Abweichung {f}")
    typer.echo(f"{AUSGABE_JSON}: {len(jahre)} Jahre Kredite, {len(betraege)} Dezernate, {len(matrix)} VE-Jahre, {len(fehler)} Abweichungen")
    if fehler:
        raise typer.Exit(code=1)


if __name__ == "__main__":
    typer.run(main)

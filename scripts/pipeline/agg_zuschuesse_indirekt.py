"""Indirekte Zuschüsse: vergünstigte Erbbaurechte und Mieten aus dem Zuschussbericht.

Liest Anlage 3 (Erbbaurechtsverträge, Band 2, PDF-Seite 363) und Anlage 4
(Mietverträge, PDF-Seiten 364-365) des Zuschussberichts aus
daten/raw_table_extraction/. Der Zuschuss je Erbbaurecht ist der Unterschied
zwischen angemessenem Bilanzerbbauzins und tatsächlichem Erbbauzins mal
Grundstücksgröße, je Mietvertrag der Unterschied zwischen Warmmiete nach ILV und
tatsächlicher Kaltmiete. Die Mieten sind Ist-Werte 2024, keine Planwerte.

Prüft jede Zeile nach und die Summenzeilen gegen das PDF; bei Abweichung wird
nichts geschrieben (Exit-Code 1). agg_zuschuesse.py und planspiel_daten.py
bleiben davon unberührt.

Ausgabe: vue-project/public/daten/zuschuesse-indirekt.json
"""

import json
import re
from pathlib import Path

import polars as pl
import typer
from rohdaten import lies, roh_dateien

WURZEL = Path(__file__).resolve().parents[2]
DATEN = WURZEL / "daten"
AUSGABE = WURZEL / "vue-project/public/daten/zuschuesse-indirekt.json"

# Summenzeilen aus dem PDF (Band 2, S. 363 und 365).
SOLL_ERBBAU = 56_267.25
SOLL_MIETEN = (875_614.63, 274_006.60, 601_608.03)

ERBBAU_SPALTEN = [
    "nr", "produktgruppe", "amt", "objekt", "berechtigter", "zweck", "bilanzwert", "zinssatz_angemessen",
    "bilanzerbbauzins", "bodenwert", "zinssatz", "erbbauzins", "flaeche", "zuschuss", "vertragsende",
]  # fmt: skip
MIET_SPALTEN = [
    "nr", "produktgruppe", "amt", "objekt", "mieter", "flaeche", "grundlage", "warmmiete", "kaltmiete",
    "zuschuss", "anpassung_ab", "erlaeuterung",
]  # fmt: skip

# Fehler der Extraktion, die keine Regel trifft: fehlende bzw. verrutschte Leerzeichen.
KORREKTUREN = {
    "JugendhilfeMünsterland": "Jugendhilfe Münsterland",
    "JugendzentrumA melsbüren": "Jugendzentrum Amelsbüren",
}
AUSLASSUNG = re.compile(r"^(und|oder|bzw\.|u\.)$")


def text(roh: str | None) -> str:
    """Leerzeichen zusammenziehen und Silbentrennungen heilen ("Liegenschafts- ausschuss")."""
    t = re.sub(r"\s+", " ", roh or "").strip()
    for falsch, richtig in KORREKTUREN.items():
        t = t.replace(falsch, richtig)
    return re.sub(
        r"(\S)- (\S+)",
        lambda m: m[0] if m[2][0].isupper() or AUSLASSUNG.match(m[2]) else m[1] + m[2],
        t,
    )


def betrag(roh: str) -> float:
    """ "2.483,20" oder "51.880,41 €" -> Float."""
    return float(roh.replace("€", "").replace(".", "").replace(",", ".").strip())


def zeilen(daten: Path, von: int, bis: int, spalten: list[str]) -> list[dict]:
    """Datenzeilen (laufende Nummer in Spalte 1) der Roh-CSVs als Dicts."""
    df = pl.concat(
        [lies(p) for p in roh_dateien(daten, 2, von, bis, "*_Zuschussbericht_*")]
    )
    df = df.rename(dict(zip(df.columns, spalten)))
    return df.filter(pl.col("nr").str.contains(r"^\d+$")).to_dicts()


def erste_spalte(daten: Path, von: int, bis: int) -> list[str]:
    """Erste Spalte aller Zeilen (Summenzeilen und Fußnoten stehen nur dort)."""
    return [
        z
        for p in roh_dateien(daten, 2, von, bis, "*_Zuschussbericht_*")
        for z in lies(p)["column_1"]
        if z
    ]


def erbbaurechte(daten: Path, fehler: list[str]) -> dict:
    """Anlage 3 mit Zeilen- und Summenprüfung."""
    ergebnis = []
    for z in zeilen(daten, 363, 363, ERBBAU_SPALTEN):
        flaeche = betrag(z["flaeche"])
        zuschuss = betrag(z["zuschuss"])
        # Die Zinsbeträge je m² sind im PDF auf 2 Stellen gerundet, daher bis 1 ct/m² Spiel.
        rechnung = (betrag(z["bilanzerbbauzins"]) - betrag(z["erbbauzins"])) * flaeche
        if z["nr"] == "10":
            # Vertrag endet am 31.07.2026, das PDF nennt nur den Anteil für 7 von 12 Monaten.
            rechnung *= 7 / 12
        if abs(rechnung - zuschuss) > flaeche * 0.01:
            fehler.append(
                f"Erbbaurecht {z['nr']}: {zuschuss} statt rechnerisch {rechnung:.2f}"
            )
        ergebnis.append(
            {
                "nr": int(z["nr"]),
                "objekt": text(z["objekt"]),
                "berechtigter": text(z["berechtigter"]),
                "zweck": text(z["zweck"]),
                "flaeche": flaeche,
                "zuschuss": zuschuss,
                "vertragsende": z["vertragsende"].strip(),
            }
        )
    summe = round(sum(e["zuschuss"] for e in ergebnis), 2)
    pdf = next(
        betrag(s.removeprefix("Gesamtsumme"))
        for s in erste_spalte(daten, 363, 363)
        if s.startswith("Gesamtsumme")
    )
    for was, ist in [("Summe der Zeilen", summe), ("Summenzeile der CSV", pdf)]:
        if abs(ist - SOLL_ERBBAU) > 0.005:
            fehler.append(f"Erbbaurechte, {was}: {ist} statt {SOLL_ERBBAU}")
    return {"zeilen": ergebnis, "summe": summe}


def mieten(daten: Path, fehler: list[str]) -> dict:
    """Anlage 4 mit Zeilen- und Summenprüfung und den Fußnoten."""
    ergebnis = []
    for z in zeilen(daten, 364, 365, MIET_SPALTEN):
        warm, kalt, zuschuss = (
            betrag(z[k]) for k in ("warmmiete", "kaltmiete", "zuschuss")
        )
        if abs(warm - kalt - zuschuss) > 0.005:
            fehler.append(f"Miete {z['nr']}: {zuschuss} statt {warm - kalt:.2f}")
        ergebnis.append(
            {
                "nr": int(z["nr"]),
                "objekt": text(z["objekt"]),
                "mieter": text(z["mieter"]),
                "flaeche": betrag(z["flaeche"]),
                "grundlage": text(z["grundlage"]),
                "warmmiete": warm,
                "kaltmiete": kalt,
                "zuschuss": zuschuss,
                "anpassungAb": z["anpassung_ab"].strip(),
                "erlaeuterung": (z["erlaeuterung"] or "").strip(),
            }
        )
    summen = [
        round(sum(e[k] for e in ergebnis), 2)
        for k in ("warmmiete", "kaltmiete", "zuschuss")
    ]
    erste = erste_spalte(daten, 364, 365)
    pdf = [
        betrag(b)
        for b in re.findall(
            r"[\d.]+,\d{2}", next(s for s in erste if s.startswith("Summe "))
        )
    ]
    for was, ist in [("Summe der Zeilen", summen), ("Summenzeile der CSV", pdf)]:
        if any(abs(a - b) > 0.005 for a, b in zip(ist, SOLL_MIETEN, strict=True)):
            fehler.append(f"Mieten, {was}: {ist} statt {list(SOLL_MIETEN)}")
    fussnoten = {
        m[1]: text(m[2]) for s in erste if (m := re.match(r"^(\(\d\)\*?) (.*)$", s))
    }
    hinweis = next(s for s in erste if s.startswith("Da die Warmmiete"))
    unbekannt = {e["erlaeuterung"] for e in ergebnis} - set(fussnoten) - {""}
    if unbekannt or len(fussnoten) != 3:
        fehler.append(f"Fußnoten: {sorted(fussnoten)}, ohne Text: {sorted(unbekannt)}")
    return {
        "stand": 2024,
        "zeilen": ergebnis,
        "summe": dict(zip(("warmmiete", "kaltmiete", "zuschuss"), summen)),
        "hinweis": text(hinweis),
        "fussnoten": fussnoten,
    }


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Erzeugt die Liste der indirekten Zuschüsse (Erbbaurechte und Mieten).

    Quelle: Zuschussbericht, Anlagen 3 und 4, Band 2, PDF-Seiten 363-365.
    Ausgabe: vue-project/public/daten/zuschuesse-indirekt.json
    """
    fehler: list[str] = []
    ergebnis = {
        "quelle": "Haushaltsplan 2026/27, Band 2, S. 359–361 (Zuschussbericht, Anlagen 3 und 4)",
        "erbbaurechte": erbbaurechte(daten, fehler),
        "mieten": mieten(daten, fehler),
    }
    texte = [
        t
        for teil in ("erbbaurechte", "mieten")
        for z in ergebnis[teil]["zeilen"]
        for t in z.values()
    ]
    rest = [
        t
        for t in texte
        if isinstance(t, str)
        and re.search(r"\S- (?!und |oder |bzw\. |u\. )[a-zäöü]", t)
    ]
    if rest:
        fehler.append(f"Trennungsreste: {rest}")
    if fehler:
        for f in fehler:
            typer.echo(f"FEHLER: {f}", err=True)
        raise typer.Exit(1)
    AUSGABE.write_text(
        json.dumps(ergebnis, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    typer.echo(
        f"{AUSGABE}: {len(ergebnis['erbbaurechte']['zeilen'])} Erbbaurechte "
        f"({ergebnis['erbbaurechte']['summe']} €), {len(ergebnis['mieten']['zeilen'])} Mietverträge "
        f"({ergebnis['mieten']['summe']['zuschuss']} €); alle Prüfungen bestanden"
    )


if __name__ == "__main__":
    typer.run(main)

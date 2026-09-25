"""Stellenplan 2026/2027 nach Produktgruppen und nach Besoldungs-/Entgeltgruppen.

Liest die Tabellen "Stellen nach Haushaltsgliederung" (Band 2) aus
daten/raw_table_extraction/: Beamte 2026 (PDF-Seiten 41-45), Tarif 2026 (S. 46-53),
Beamte 2027 (S. 54-58), Tarif 2027 (S. 59-66). Die Besoldungs-/Entgeltgruppen
stehen als Spalten unter einer Kopfzeile ("PG", "Bezeichnung", "B10", ...); die
Stellen (VZÄ) einer Produktgruppe können auf mehrere Zeilen verteilt sein und
werden addiert.

Ausgaben:

- daten/agg_tables/Stellenplan_2026_2027.csv: Stellen Beamte, Tarif und gesamt
  je Produktgruppe (aus den Summenspalten), je Produktbereich (Summe der
  Produktgruppen) und für die Stadt.
- daten/agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv: Stellen je
  Produktgruppe, Jahr und Besoldungs-/Entgeltgruppe, dazu die Summe der Stadt.
"""

from pathlib import Path

import polars as pl
import typer

from rohdaten import lies, roh_dateien, schreibe, seite, zahl

DATEN = Path(__file__).resolve().parents[2] / "daten"
AUSGABE_SP = "agg_tables/Stellenplan_2026_2027.csv"
AUSGABE_BG = "agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv"
GESAMT = "Gesamtsumme Stadt Münster"
JAHRE = (2026, 2027)

# (erste Seite, letzte Seite, Art, Jahr)
TEILE = [
    (41, 45, "Beamte", 2026),
    (46, 53, "Tarif", 2026),
    (54, 58, "Beamte", 2027),
    (59, 66, "Tarif", 2027),
]

c = pl.col


def gruppen_spalten(kopf: tuple) -> dict[int, str]:
    """Spaltenindex -> Gruppenname aus der Kopfzeile.

    A13 kommt zweimal vor: zuerst unter "Laufbahngruppe 2 - Einstiegsamt 2", dann
    unter "Einstiegsamt 1".
    """
    namen = {}
    for i, name in enumerate(kopf):
        if i < 2 or not name:
            continue
        if name == "A13":
            name = "A13_LG2E1" if "A13_LG2E2" in namen.values() else "A13_LG2E2"
        namen[i] = {"TVÖD": "TVOEDFEST"}.get(name, name)
    return namen


def pb_bezeichnungen(zeilen: list[tuple]) -> dict[str, str]:
    """PB-Bezeichnungen aus den Textzeilen unter "Summen: Produktbereich NN".

    Die Bezeichnung ist oft auf zwei Zeilen umbrochen ("Famili-" / "enhilfe").
    """
    ergebnis = {}
    for i, zeile in enumerate(zeilen):
        summen = [z for z in zeile if z and z.startswith("Summen: Produktbereich")]
        if not summen:
            continue
        teile = []
        for folgende in zeilen[i + 1:]:
            text = [z for z in folgende if z]
            if len(text) != 1 or any(ch.isdigit() for ch in text[0]):
                break
            teile.append(text[0])
        name = teile[0]
        for teil in teile[1:]:
            name = name[:-1] + teil if name.endswith("-") and teil[0].islower() else f"{name} {teil}"
        ergebnis[summen[0].split()[-1]] = name
    return ergebnis


def lade(daten: Path) -> tuple[pl.DataFrame, list[str], dict[str, dict[str, str]]]:
    """Liest alle Stellenplanseiten.

    Gibt zurück: Langformat (Art, Jahr, Seite, zeile, Code, Bezeichnung, Gruppe, VZAE),
    die Gruppenspalten in PDF-Reihenfolge ("Beamte_B10", ...) und die
    PB-Bezeichnungen je Art.
    """
    teile, gruppen = [], []
    pb_namen: dict[str, dict[str, str]] = {"Beamte": {}, "Tarif": {}}
    for von, bis, art, jahr in TEILE:
        for pfad in roh_dateien(daten, 2, von, bis, "*_Stellenplan_*"):
            df = lies(pfad).with_row_index("zeile")
            kopf = df.filter(c("column_1") == "PG")
            # Tabellen ohne Kopfzeile oder nur mit Kopfzeilenresten (z.B. S. 44 t1) enthalten keine Werte
            if kopf.is_empty() or df.width < 5:
                continue
            spalten = gruppen_spalten(kopf.row(0)[1:])
            gruppen += [f"{art}_{g}" for g in spalten.values() if g != "Summe"]
            pb_namen[art] = pb_bezeichnungen(df.drop("zeile").rows()) | pb_namen[art]
            # Werte stehen nicht immer genau unter ihrer Überschrift (TVÖD FEST, Summenzeilen),
            # daher gehört jede Spalte zur nächstgelegenen Überschrift.
            zuordnung = {
                f"column_{i + 1}": spalten[min(spalten, key=lambda k: abs(k - i))]
                for i in range(2, df.width - 1)
            }
            teile.append(
                df.filter(c("column_1").str.contains(r"^\d{4}$"))
                .unpivot(index=["zeile", "column_1", "column_2"], on=list(zuordnung), variable_name="spalte")
                .drop_nulls("value")
                .select(
                    pl.lit(art).alias("Art"),
                    pl.lit(jahr).alias("Jahr"),
                    pl.lit(seite(pfad)).alias("Seite"),
                    "zeile",
                    c("column_1").alias("Code"),
                    c("column_2").alias("Bezeichnung"),
                    c("spalte").replace_strict(zuordnung).alias("Gruppe"),
                    zahl(c("value")).alias("VZAE"),
                )
            )
    return pl.concat(teile), list(dict.fromkeys(gruppen)), pb_namen


def stellenplan(lang: pl.DataFrame, pb_namen: dict[str, dict[str, str]]) -> pl.DataFrame:
    """Stellen Beamte/Tarif/gesamt je PG, PB und Stadt."""
    werte = [f"Stellen_{a}_VZAE_{j}" for j in JAHRE for a in ("Beamte", "Tarif", "Gesamt")]
    summen = lang.filter(c("Gruppe") == "Summe")
    # Die Bezeichnungen sind in Beamten- und Tarifteil unterschiedlich umbrochen;
    # es gilt die aus dem Tarifteil, sonst die aus dem Beamtenteil.
    namen = (
        summen.sort("Art", "Jahr", "Seite", "zeile", descending=[True, False, False, False])
        .group_by("Code", maintain_order=True)
        .agg(c("Bezeichnung").first())
    )
    pg = (
        summen.with_columns(pl.format("Stellen_{}_VZAE_{}", "Art", "Jahr").alias("spalte"))
        .pivot(on="spalte", index="Code", values="VZAE", aggregate_function="sum")
        .with_columns(pl.exclude("Code").fill_null(0.0))
        .with_columns(
            (c(f"Stellen_Beamte_VZAE_{j}") + c(f"Stellen_Tarif_VZAE_{j}")).alias(f"Stellen_Gesamt_VZAE_{j}")
            for j in JAHRE
        )
        .join(namen, on="Code")
        .sort("Code")
        .select("Code", "Bezeichnung", pl.lit("PG").alias("Ebene"), *werte)
    )
    pb = (
        pg.group_by(c("Code").str.slice(0, 2))
        .agg(c(werte).sum())
        .sort("Code")
        .select(
            "Code",
            c("Code").replace_strict(pb_namen["Beamte"] | pb_namen["Tarif"]).alias("Bezeichnung"),
            pl.lit("Produktbereich-Summe").alias("Ebene"),
            *werte,
        )
    )
    gesamt = pg.select(
        pl.lit(None, pl.String).alias("Code"),
        pl.lit(GESAMT).alias("Bezeichnung"),
        pl.lit("Summe").alias("Ebene"),
        c(werte).sum(),
    )
    return pl.concat([pg, pb, gesamt]).with_columns(c(werte).round(2))


def nach_besoldungsgruppen(lang: pl.DataFrame, gruppen: list[str]) -> pl.DataFrame:
    """Stellen je PG, Jahr und Besoldungs-/Entgeltgruppe plus Gesamtsumme der Stadt."""
    werte = lang.filter(c("Gruppe") != "Summe").sort("Jahr", "Seite", "zeile")
    # Bezeichnung: erste Nennung in PDF-Reihenfolge
    namen = werte.group_by("Code", maintain_order=True).agg(c("Bezeichnung").first())
    pg = werte.with_columns(pl.format("{}_{}", "Art", "Gruppe").alias("spalte")).pivot(
        on="spalte", index=["Code", "Jahr"], values="VZAE", aggregate_function="sum"
    )
    pg = (
        pg.join(namen, on="Code")
        .sort("Code", "Jahr")
        # Gruppen ohne jeden Wert fehlen nach dem Pivot, stehen aber im PDF-Kopf
        .select(
            "Code",
            "Bezeichnung",
            "Jahr",
            *[c(g).fill_null(0.0) if g in pg.columns else pl.lit(0.0).alias(g) for g in gruppen],
        )
    )
    gesamt = pg.group_by("Jahr").agg(c(gruppen).sum()).sort("Jahr").select(
        pl.lit(None, pl.String).alias("Code"), pl.lit(GESAMT).alias("Bezeichnung"), "Jahr", *gruppen
    )
    return (
        pl.concat([pg, gesamt])
        .with_columns(c(gruppen).round(2))
        .with_columns(pl.sum_horizontal(gruppen).round(2).alias("Summe_VZAE"))
    )


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Erzeugt den Stellenplan 2026/2027 je Produktgruppe und je Besoldungs-/Entgeltgruppe.

    Quelle: Stellen nach Haushaltsgliederung, Band 2, PDF-Seiten 41-66.
    Ausgaben: daten/agg_tables/Stellenplan_2026_2027.csv und
    daten/agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv
    """
    lang, gruppen, pb_namen = lade(daten)
    for datei, df in [(AUSGABE_SP, stellenplan(lang, pb_namen)), (AUSGABE_BG, nach_besoldungsgruppen(lang, gruppen))]:
        schreibe(df, daten / datei)
        typer.echo(f"{daten / datei}: {df.height} Zeilen")


if __name__ == "__main__":
    typer.run(main)

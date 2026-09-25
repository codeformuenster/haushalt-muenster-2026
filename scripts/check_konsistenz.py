"""Konsistenzprüfung der bereinigten Haushalts-CSVs.

Prüft, ob sich die Werte in den bereinigten CSV-Dateien unter daten/ rechnerisch
zusammenfügen:

- agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv: Produktgruppen
  summieren sich zum Produktbereich, Produktbereiche zur Gesamtsumme, und die
  Zeilenformeln (z.B. Erträge - Aufwendungen = ordentliches Ergebnis) stimmen.
- agg_tables/Stellenplan_2026_2027.csv: Beamte + Tarif = Gesamt, Produktgruppen
  summieren sich zum Produktbereich, Produktbereiche zur Gesamtsumme.
- agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv: Besoldungsgruppen
  summieren sich zu Summe_VZAE, und Summe_VZAE stimmt mit dem Stellenplan überein.

Toleranz: 1 € bei Beträgen, 0,01 bei Stellen (VZÄ).

Ausgabe: Übersicht auf der Konsole, Markdown-Bericht mit allen Abweichungen
(Standard: daten/pruefberichte/konsistenz.md). Exit-Code 1, wenn es Abweichungen gibt.
"""

from dataclasses import dataclass
from pathlib import Path

import polars as pl
import typer

DATEN = Path(__file__).resolve().parent.parent / "daten"

TOLERANZ_EUR = 1.0
TOLERANZ_VZAE = 0.01

GU_DATEI = "agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv"
SP_DATEI = "agg_tables/Stellenplan_2026_2027.csv"
BG_DATEI = "agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv"

GU_KEYS = ["kind", "year", "code"]

c = pl.col
GU_FORMELN = {
    "ordentliches_ergebnis": c("ordentliche_ertraege") - c("ordentliche_aufwendungen"),
    "saldo_laufend": c("einzahlungen_laufend") - c("auszahlungen_laufend"),
    "saldo_investitionen": c("einzahlungen_investitionen") - c("auszahlungen_investitionen"),
    "finanzmittelueberschuss_fehlbetrag": c("saldo_laufend") + c("saldo_investitionen"),
}

# Spaltenpräfix in der Gesamtübersicht -> (Planart, Spaltenname im Langformat)
GU_SPALTEN = {
    "Ertraege": ("ergebnisplanung", "ordentliche_ertraege"),
    "Aufwendungen": ("ergebnisplanung", "ordentliche_aufwendungen"),
    "OrdentlErgebnis": ("ergebnisplanung", "ordentliches_ergebnis"),
    "Einzahlungen_lfdVerw": ("finanzplanung", "einzahlungen_laufend"),
    "Auszahlungen_lfdVerw": ("finanzplanung", "auszahlungen_laufend"),
    "SaldoLfdVerw": ("finanzplanung", "saldo_laufend"),
    "Einzahlungen_Investitionstaetigkeit": ("finanzplanung", "einzahlungen_investitionen"),
    "Auszahlungen_Investitionstaetigkeit": ("finanzplanung", "auszahlungen_investitionen"),
    "SaldoInvestitionstaetigkeit": ("finanzplanung", "saldo_investitionen"),
    "Finanzmittelueberschuss_fehlbetrag": ("finanzplanung", "finanzmittelueberschuss_fehlbetrag"),
}


@dataclass
class Ergebnis:
    pruefung: str
    datei: str
    geprueft: int
    abweichungen: pl.DataFrame


def vergleichen(
    pruefung: str,
    datei: str,
    erwartet: pl.DataFrame,
    ist: pl.DataFrame,
    keys: list[str],
    werte: list[str],
    toleranz: float,
) -> Ergebnis:
    """Vergleicht zwei Tabellen Wert für Wert.

    Fehlende Zeilen und leere Werte zählen als 0, damit leere und weggelassene
    Zeilen gleich behandelt werden.
    """

    def lang(df: pl.DataFrame, name: str) -> pl.DataFrame:
        return df.select(keys + werte).unpivot(
            index=keys, on=werte, variable_name="spalte", value_name=name
        ).with_columns(c(name).cast(pl.Float64).fill_null(0.0))

    j = lang(erwartet, "erwartet").join(
        lang(ist, "ist"), on=keys + ["spalte"], how="full", coalesce=True
    ).with_columns(c("erwartet", "ist").fill_null(0.0))
    abw = j.filter((c("ist") - c("erwartet")).abs() > toleranz + 1e-9).select(
        pl.concat_str([c(k).cast(pl.String).fill_null("") for k in keys], separator=" / ").alias("schluessel"),
        "spalte",
        "erwartet",
        "ist",
        (c("ist") - c("erwartet")).alias("differenz"),
    )
    return Ergebnis(pruefung, datei, j.height, abw)


def summen(
    pruefung: str,
    datei: str,
    df: pl.DataFrame,
    kind_ebene: str,
    eltern_ebene: str,
    keys: list[str],
    werte: list[str],
    toleranz: float,
) -> Ergebnis:
    """Prüft, ob die Zeilen einer Ebene sich zur übergeordneten Ebene summieren.

    Gruppiert wird nach den ersten zwei Ziffern des Codes (Produktbereich),
    bei eltern_ebene "total" auf eine einzige Gesamtsumme.
    """
    gruppe = pl.lit("Summe") if eltern_ebene == "total" else c("code").str.slice(0, 2)
    kinder = (
        df.filter(c("level") == kind_ebene)
        .with_columns(gruppe.alias("gruppe"))
        .group_by(keys + ["gruppe"])
        .agg(c(werte).sum())
    )
    eltern = df.filter(c("level") == eltern_ebene).with_columns(gruppe.alias("gruppe"))
    return vergleichen(pruefung, datei, kinder, eltern, keys + ["gruppe"], werte, toleranz)


def formeln(
    pruefung: str,
    datei: str,
    df: pl.DataFrame,
    keys: list[str],
    formeln: dict[str, pl.Expr],
    toleranz: float,
) -> Ergebnis:
    """Prüft Zeilenformeln. Formeln mit Spalten, die in df fehlen, werden übersprungen."""
    formeln = {
        ziel: expr
        for ziel, expr in formeln.items()
        if ziel in df.columns and all(s in df.columns for s in expr.meta.root_names())
    }
    erwartet = df.select(keys + [expr.alias(ziel) for ziel, expr in formeln.items()])
    return vergleichen(pruefung, datei, erwartet, df, keys, list(formeln), toleranz)


def lade_gesamtuebersicht(daten: Path) -> tuple[pl.DataFrame, list[str]]:
    """Formt die Gesamtübersicht um: eine Zeile je Planart, Jahr und Code."""
    df = pl.read_csv(daten / GU_DATEI, schema_overrides={"Code": pl.String})
    lang = (
        df.drop("Bezeichnung")
        .rename({"Code": "code", "Ebene": "level"})
        .with_columns(
            c("code").fill_null("Summe"),
            c("level").replace_strict({"PG": "product_group", "PB": "product_area", "Summe": "total"}),
        )
        .unpivot(index=["code", "level"], variable_name="spalte_gu", value_name="wert")
        .with_columns(
            c("spalte_gu").str.extract(r"^(.*)_\d{4}_EUR$").alias("basis"),
            c("spalte_gu").str.extract(r"_(\d{4})_EUR$").cast(pl.Int64).alias("year"),
        )
        .with_columns(
            c("basis").replace_strict({k: v[0] for k, v in GU_SPALTEN.items()}).alias("kind"),
            c("basis").replace_strict({k: v[1] for k, v in GU_SPALTEN.items()}).alias("spalte"),
        )
    )
    wide = lang.pivot(on="spalte", index=GU_KEYS + ["level"], values="wert")
    werte = [s for s in wide.columns if s not in GU_KEYS + ["level"]]
    return wide.with_columns(c(werte).cast(pl.Float64).fill_null(0.0)), werte


def pruefe_finanzen(daten: Path) -> list[Ergebnis]:
    gu, werte = lade_gesamtuebersicht(daten)
    return [
        summen("Produktgruppen = Produktbereich", GU_DATEI, gu, "product_group", "product_area",
               ["kind", "year"], werte, TOLERANZ_EUR),
        summen("Produktbereiche = Gesamtsumme", GU_DATEI, gu, "product_area", "total",
               ["kind", "year"], werte, TOLERANZ_EUR),
        formeln("Zeilenformeln", GU_DATEI, gu, GU_KEYS, GU_FORMELN, TOLERANZ_EUR),
    ]


def pruefe_stellen(daten: Path) -> list[Ergebnis]:
    sp = pl.read_csv(daten / SP_DATEI, schema_overrides={"Code": pl.String}).rename(
        {"Code": "code", "Ebene": "level"}
    ).with_columns(
        c("code").fill_null("Summe"),
        c("level").replace({"PG": "product_group", "Produktbereich-Summe": "product_area", "Summe": "total"}),
    )
    sp_werte = [s for s in sp.columns if s.startswith("Stellen_")]
    jahre = [2026, 2027]
    sp_formeln = {
        f"Stellen_Gesamt_VZAE_{j}": c(f"Stellen_Beamte_VZAE_{j}") + c(f"Stellen_Tarif_VZAE_{j}")
        for j in jahre
    }

    bg = pl.read_csv(daten / BG_DATEI, schema_overrides={"Code": pl.String}).rename(
        {"Code": "code", "Jahr": "year"}
    ).with_columns(c("code").fill_null("Summe"))
    gruppen = [s for s in bg.columns if s.startswith(("Beamte_", "Tarif_"))]

    sp_gesamt = (
        sp.filter(c("level") != "product_area")
        .unpivot(index="code", on=[f"Stellen_Gesamt_VZAE_{j}" for j in jahre], value_name="Summe_VZAE")
        .with_columns(c("variable").str.extract(r"(\d{4})$").cast(pl.Int64).alias("year"))
    )

    return [
        formeln("Beamte + Tarif = Gesamt", SP_DATEI, sp, ["code"], sp_formeln, TOLERANZ_VZAE),
        summen("Produktgruppen = Produktbereich", SP_DATEI, sp, "product_group", "product_area",
               [], sp_werte, TOLERANZ_VZAE),
        summen("Produktbereiche = Gesamtsumme", SP_DATEI, sp, "product_area", "total",
               [], sp_werte, TOLERANZ_VZAE),
        formeln("Besoldungsgruppen = Summe_VZAE", BG_DATEI, bg, ["code", "year"],
                {"Summe_VZAE": pl.sum_horizontal(gruppen)}, TOLERANZ_VZAE),
        vergleichen("Besoldungsgruppen = Stellenplan", f"{BG_DATEI} vs. {SP_DATEI}",
                    bg, sp_gesamt, ["code", "year"], ["Summe_VZAE"], TOLERANZ_VZAE),
    ]


def zahl(x: float) -> str:
    return f"{x:,.2f}"


def markdown(ergebnisse: list[Ergebnis]) -> str:
    zeilen = [
        "# Konsistenzprüfung",
        "",
        "Erzeugt mit `scripts/check_konsistenz.py`. Toleranz: "
        f"{TOLERANZ_EUR:g} € bei Beträgen, {TOLERANZ_VZAE:g} bei Stellen (VZÄ).",
        "",
        "| Prüfung | Datei | Geprüfte Werte | Abweichungen |",
        "|---|---|---|---|",
    ]
    for e in ergebnisse:
        zeilen.append(f"| {e.pruefung} | `{e.datei}` | {e.geprueft} | {e.abweichungen.height} |")
    for e in ergebnisse:
        if e.abweichungen.is_empty():
            continue
        zeilen += [
            "",
            f"## {e.pruefung} (`{e.datei}`)",
            "",
            "| Schlüssel | Spalte | Erwartet | Ist | Differenz |",
            "|---|---|---:|---:|---:|",
        ]
        for r in e.abweichungen.iter_rows(named=True):
            zeilen.append(
                f"| {r['schluessel']} | {r['spalte']} | {zahl(r['erwartet'])} | {zahl(r['ist'])} "
                f"| {zahl(r['differenz'])} |"
            )
    return "\n".join(zeilen) + "\n"


def main(
    daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner."),
    bericht: Path = typer.Option(
        DATEN / "pruefberichte" / "konsistenz.md", help="Pfad für den Markdown-Bericht."
    ),
) -> None:
    """Prüft die bereinigten Haushalts-CSVs auf rechnerische Konsistenz.

    Gibt eine Übersicht auf der Konsole aus, schreibt alle Abweichungen in einen
    Markdown-Bericht und endet mit Exit-Code 1, wenn es Abweichungen gibt.
    """
    ergebnisse = pruefe_finanzen(daten) + pruefe_stellen(daten)

    for e in ergebnisse:
        n = e.abweichungen.height
        status = "OK    " if n == 0 else "FEHLER"
        typer.echo(f"{status} {e.pruefung} [{e.datei}]: {e.geprueft} Werte, {n} Abweichungen")

    bericht.parent.mkdir(parents=True, exist_ok=True)
    bericht.write_text(markdown(ergebnisse), encoding="utf-8")
    typer.echo(f"\nBericht: {bericht}")

    if any(not e.abweichungen.is_empty() for e in ergebnisse):
        raise typer.Exit(code=1)


if __name__ == "__main__":
    typer.run(main)

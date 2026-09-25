"""Investitionsmaßnahmen der sechs Bezirksvertretungen 2026/2027 je Fachthema.

Liest die Tabellen "Investitionsmaßnahmen" der Bezirksvertretungen (Band 2,
PDF-Seiten 147-328) aus daten/raw_table_extraction/. Bezirk und Fachthema stehen im
Dateinamen (band2_pNNN_Bezirksvertretung_<Bezirk>_<Fachthema>_Investitionsmassnahmen_tN.csv).
Summiert werden alle Einzahlungs- und Auszahlungszeilen (Maßnahmen oberhalb und
unterhalb der Wertgrenzen); Saldo- und Gesamtsaldozeilen werden nicht mitgezählt.
Die Teilergebnispläne (PG 0101) werden nicht gelesen.

Ist ein Fachthema in allen sechs Bezirken mit identischen Beträgen ausgewiesen,
handelt es sich um gesamtstädtische Maßnahmen, die nicht bezirksspezifisch
aufgeteilt sind (BezirksspezifischGeprueft = "NEIN ...").

Ausgabe: daten/agg_tables/Bezirksvertretungen_Investitionsmassnahmen_2026_2027.csv
"""

from pathlib import Path

import polars as pl
import typer

from rohdaten import lies, roh_dateien, schreibe, zahl

DATEN = Path(__file__).resolve().parent.parent / "daten"
AUSGABE = "agg_tables/Bezirksvertretungen_Investitionsmassnahmen_2026_2027.csv"

# Die Fachthemen stehen in den Roh-CSVs nur als Dateinamenteil (ohne Umlaute und
# Leerzeichen); die Bezeichnungen sind die Produktgruppennamen aus dem PDF.
FACHTHEMEN = {
    "Abwasserbeseitigung": "Abwasserbeseitigung",
    "Bader": "Bäder",
    "BereitstellungvonVerkehrsflachenund_anlagen": "Bereitstellung von Verkehrsflächen und -anlagen",
    "BrandschutzundfeuerwehrtechnischeHilfeleistung": "Brandschutz und feuerwehrtechnische Hilfeleistung",
    "FliessendeGewasser": "Fließende Gewässer",
    "ForderungvonKinderninTagesbetreuung": "Förderung von Kindern in Tagesbetreuung",
    "Friedhofe": "Friedhöfe",
    "GewerberechtlicheAngelegenheiten": "Gewerberechtliche Angelegenheiten",
    "Grun_undFreiflachen": "Grün- und Freiflächen",
    "Immobilienmanagement": "Immobilienmanagement",
    "Kinder_undJugendarbeit": "Kinder- und Jugendarbeit",
    "Kulturmanagement_Kulturforderung": "Kulturmanagement/Kulturförderung",
    "LeistungenfurSchulen": "Leistungen für Schulen",
    "Natur_Landschaft_Erholung_Wasserschutz": "Natur, Landschaft, Erholung, Wasserschutz",
    "Rettungsdienst": "Rettungsdienst",
    "SicherungbesonderersozialerBedarfe": "Sicherung besonderer sozialer Bedarfe",
    "SicherungdesLebensunterhalts": "Sicherung des Lebensunterhalts",
    "Sportinfrastruktur_Sportforderung_Sportveranstaltungen": "Sportinfrastruktur/Sportförderung/Sportveranstaltungen",
    "Stadt_undRegionalentwicklung_Stadtplanung": "Stadt- und Regionalentwicklung, Stadtplanung",
}

WERTE = [f"{art}_{j}_EUR" for j in (2026, 2027) for art in ("Einzahlungen", "Auszahlungen", "Saldo")]

c = pl.col


def lade(daten: Path) -> pl.DataFrame:
    """Je Quelldatei: Reihenfolge, Bezirk, Fachthema-Schlüssel und Summe der Ein-/Auszahlungen 2026/2027."""
    teile = []
    for i, pfad in enumerate(roh_dateien(daten, 2, 147, 328, "*_Bezirksvertretung_*_Investitionsmassnahmen_*")):
        # Spalten: Bezeichnung, Ergebnis 2024, Ansatz 2025, 2026, 2027, ...
        summen = lies(pfad).select(
            zahl(c(spalte)).filter(c("column_1").str.starts_with(art)).sum().alias(f"{art}en_{jahr}_EUR")
            for jahr, spalte in ((2026, "column_4"), (2027, "column_5"))
            for art in ("Einzahlung", "Auszahlung")
        )
        teile.append(summen.with_columns(pl.lit(i).alias("reihenfolge"), pl.lit(pfad.name).alias("datei")))
    return pl.concat(teile).with_columns(
        c("datei").str.extract(r"_Bezirksvertretung_(Muenster-[^_]+)_").alias("Bezirksvertretung"),
        c("datei").str.extract(r"_Bezirksvertretung_Muenster-[^_]+_(.+)_Investitionsmassnahmen_").alias("thema"),
    )


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Erzeugt die Summen der Investitionsmaßnahmen 2026/2027 je Bezirksvertretung und Fachthema.

    Quelle: Investitionsmaßnahmen der Bezirksvertretungen, Band 2, PDF-Seiten 147-328.
    Ausgabe: daten/agg_tables/Bezirksvertretungen_Investitionsmassnahmen_2026_2027.csv
    """
    df = (
        lade(daten)
        # Bezirke in der Reihenfolge des PDFs
        .with_columns(c("reihenfolge").min().over("Bezirksvertretung").alias("bezirk_pos"))
        .group_by("Bezirksvertretung", "bezirk_pos", "thema")
        .agg(
            pl.len().alias("AnzahlQuellCSVs"),
            c("^(Ein|Aus)zahlungen_.*$").sum(),
        )
        .with_columns(
            (c(f"Einzahlungen_{j}_EUR") - c(f"Auszahlungen_{j}_EUR")).alias(f"Saldo_{j}_EUR") for j in (2026, 2027)
        )
    )
    bezirke = df.select(c("Bezirksvertretung").n_unique()).item()
    gesamtstaedtisch = (
        df.group_by("thema")
        .agg(pl.len().alias("n"), *[c(w).n_unique().alias(w) for w in WERTE])
        .filter((c("n") == bezirke) & pl.all_horizontal(c(w) == 1 for w in WERTE))
        .select("thema", pl.lit("NEIN (gesamtstaedtisch, identisch je BV)").alias("BezirksspezifischGeprueft"))
    )
    df = (
        df.join(gesamtstaedtisch, on="thema", how="left")
        .sort("thema", "bezirk_pos")
        .select(
            "Bezirksvertretung",
            c("thema").replace_strict(FACHTHEMEN).alias("Fachthema"),
            c("BezirksspezifischGeprueft").fill_null("JA"),
            "AnzahlQuellCSVs",
            *WERTE,
        )
    )
    schreibe(df, daten / AUSGABE)
    typer.echo(f"{daten / AUSGABE}: {df.height} Zeilen")


if __name__ == "__main__":
    typer.run(main)

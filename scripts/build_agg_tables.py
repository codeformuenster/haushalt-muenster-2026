"""Erzeugt alle Tabellen unter daten/agg_tables/ neu aus daten/raw_table_extraction/.

Reihenfolge: Gesamtübersicht (liefert die PG-Bezeichnungen für die Zuschüsse),
Stellenplan, Zuschüsse, Investitionsmaßnahmen der Bezirksvertretungen. Danach läuft
die Konsistenzprüfung (check_konsistenz.py) und schreibt ihren Bericht nach
daten/pruefberichte/konsistenz.md.

Exit-Code 1, wenn ein Erzeugungsschritt fehlschlägt. Abweichungen der
Konsistenzprüfung werden nur gemeldet und brechen den Lauf nicht ab: Die bekannten
Abweichungen stehen so im PDF (siehe daten/pruefberichte/befunde.md).
"""

from pathlib import Path

import typer

import agg_bezirksvertretungen
import agg_gesamtuebersicht
import agg_stellenplan
import agg_zuschuesse
import check_konsistenz

DATEN = Path(__file__).resolve().parent.parent / "daten"


def main(daten: Path = typer.Option(DATEN, help="Pfad zum daten/-Ordner.")) -> None:
    """Erzeugt alle Tabellen unter daten/agg_tables/ neu und prüft sie auf Konsistenz.

    Ausgaben: die sechs CSVs unter daten/agg_tables/ und daten/pruefberichte/konsistenz.md.
    Exit-Code 1 nur, wenn ein Erzeugungsschritt fehlschlägt.
    Abweichungen der Konsistenzprüfung werden gemeldet, aber nicht als Fehler gewertet.
    """
    for skript in (agg_gesamtuebersicht, agg_stellenplan, agg_zuschuesse, agg_bezirksvertretungen):
        skript.main(daten=daten)

    typer.echo("\nKonsistenzpruefung:")
    try:
        check_konsistenz.main(daten=daten, bericht=daten / "pruefberichte" / "konsistenz.md")
    except typer.Exit as e:
        if e.exit_code:
            typer.echo("Abweichungen gefunden; bekannte Befunde: daten/pruefberichte/befunde.md")


if __name__ == "__main__":
    typer.run(main)

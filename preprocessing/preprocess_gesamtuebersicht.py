#!/usr/bin/env python3
"""Produktgruppen aus der Gesamtübersicht für die Vue-App.

Ertraege/Aufwendungen sind die ordentlichen Erträge und Aufwendungen (Zeilen 10 und 17),
Ergebnis ist das Ergebnis des Teilhaushaltes (Zeile 26, ohne interne Leistungsbeziehungen):
ordentliches Ergebnis plus Finanzergebnis plus außerordentliches Ergebnis.
EinzInvest/AuszInvest sind die Ein- und Auszahlungen aus Investitionstätigkeit (Finanzplan).
"""
import sys
import csv
from pathlib import Path

INPUT_FILE = Path(
    "../daten/agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv"
)
OUTPUT_FILE = Path(
    "../vue-project/src/assets/data/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027_preprocessed.csv"
)

# Zielspalte -> Quellspalte für die Investitionstätigkeit (Haushaltsquerschnitt Teil 2).
INVEST_COLUMNS = {
    "EinzInvest_2026": "Einzahlungen_Investitionstaetigkeit_2026_EUR",
    "AuszInvest_2026": "Auszahlungen_Investitionstaetigkeit_2026_EUR",
    "EinzInvest_2027": "Einzahlungen_Investitionstaetigkeit_2027_EUR",
    "AuszInvest_2027": "Auszahlungen_Investitionstaetigkeit_2027_EUR",
}

SOURCE_COLUMNS = [
    "Code",
    "Bezeichnung",
    "Ertraege_2026_EUR",
    "Aufwendungen_2026_EUR",
    "Ergebnis_2026_EUR",
    "Ertraege_2027_EUR",
    "Aufwendungen_2027_EUR",
    "Ergebnis_2027_EUR",
    *INVEST_COLUMNS.values(),
]

TARGET_COLUMNS = [
    "Code",
    "Bezeichnung",
    "Ertraege_2026",
    "Aufwendungen_2026",
    "Ergebnis_2026",
    "Ertraege_2027",
    "Aufwendungen_2027",
    "Ergebnis_2027",
    "Gruppe",
    *INVEST_COLUMNS,
]


def main() -> None:
    with INPUT_FILE.open("r", encoding="utf-8", newline="") as infile:
        reader = csv.DictReader(infile)

        missing = [col for col in SOURCE_COLUMNS if col not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"Missing required columns in input CSV: {missing}")

        rows_out = []
        summe = None
        for row in reader:
            code = (row.get("Code") or "").strip()
            if row.get("Ebene") == "Summe":
                summe = row

            # Only product groups (four-digit code); drops area rows ("01") and the city total (no code)
            if len(code) != 4:
                continue

            rows_out.append(
                {
                    "Code": code,
                    "Bezeichnung": (row.get("Bezeichnung") or "").strip(),
                    "Ertraege_2026": row.get("Ertraege_2026_EUR", ""),
                    "Aufwendungen_2026": row.get("Aufwendungen_2026_EUR", ""),
                    "Ergebnis_2026": row.get("Ergebnis_2026_EUR", ""),
                    "Ertraege_2027": row.get("Ertraege_2027_EUR", ""),
                    "Aufwendungen_2027": row.get("Aufwendungen_2027_EUR", ""),
                    "Ergebnis_2027": row.get("Ergebnis_2027_EUR", ""),
                    "Gruppe": code[:2],
                    **{ziel: row.get(quelle, "") for ziel, quelle in INVEST_COLUMNS.items()},
                }
            )

    # Summenprüfung: Investitionen aller Produktgruppen = Summenzeile der Gesamtübersicht.
    if summe is None:
        sys.exit("Summenzeile fehlt in der Gesamtübersicht")
    for ziel, quelle in INVEST_COLUMNS.items():
        ist = sum(float(r[ziel] or 0) for r in rows_out)
        soll = float(summe[quelle] or 0)
        if abs(ist - soll) > 0.5:
            sys.exit(f"{ziel}: Summe der Produktgruppen {ist} != Summenzeile {soll}")

    with OUTPUT_FILE.open("w", encoding="utf-8", newline="") as outfile:
        writer = csv.DictWriter(outfile, fieldnames=TARGET_COLUMNS)
        writer.writeheader()
        writer.writerows(rows_out)

    print(f"Done. Wrote {len(rows_out)} rows to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

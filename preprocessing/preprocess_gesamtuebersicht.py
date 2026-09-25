#!/usr/bin/env python3
import csv
from pathlib import Path

INPUT_FILE = Path(
    "../daten/agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv"
)
OUTPUT_FILE = Path(
    "../vue-project/src/assets/data/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027_preprocessed.csv"
)

SOURCE_COLUMNS = [
    "Code",
    "Bezeichnung",
    "Ertraege_2026_EUR",
    "Aufwendungen_2026_EUR",
    "Ertraege_2027_EUR",
    "Aufwendungen_2027_EUR",
]

TARGET_COLUMNS = [
    "Code",
    "Bezeichnung",
    "Ertraege_2026",
    "Aufwendungen_2026",
    "Ertraege_2027",
    "Aufwendungen_2027",
    "Gruppe",
]


def main() -> None:
    with INPUT_FILE.open("r", encoding="utf-8", newline="") as infile:
        reader = csv.DictReader(infile)

        missing = [col for col in SOURCE_COLUMNS if col not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"Missing required columns in input CSV: {missing}")

        rows_out = []
        for row in reader:
            code = (row.get("Code") or "").strip()

            # Remove group rows (their code has exactly two characters, e.g. "01")
            if len(code) == 2:
                continue

            rows_out.append(
                {
                    "Code": code,
                    "Bezeichnung": (row.get("Bezeichnung") or "").strip(),
                    "Ertraege_2026": row.get("Ertraege_2026_EUR", ""),
                    "Aufwendungen_2026": row.get("Aufwendungen_2026_EUR", ""),
                    "Ertraege_2027": row.get("Ertraege_2027_EUR", ""),
                    "Aufwendungen_2027": row.get("Aufwendungen_2027_EUR", ""),
                    "Gruppe": code[:2],
                }
            )

    with OUTPUT_FILE.open("w", encoding="utf-8", newline="") as outfile:
        writer = csv.DictWriter(outfile, fieldnames=TARGET_COLUMNS)
        writer.writeheader()
        writer.writerows(rows_out)

    print(f"Done. Wrote {len(rows_out)} rows to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import csv
from pathlib import Path

INPUT_FILE = Path(
    "../daten/agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv"
)
OUTPUT_FILE = Path(
    "../vue-project/src/assets/data/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027_gruppen.csv"
)

SOURCE_COLUMNS = ["Code", "Bezeichnung"]
TARGET_COLUMNS = ["Gruppe", "Gruppenbezeichnung"]


def main() -> None:
    with INPUT_FILE.open("r", encoding="utf-8", newline="") as infile:
        reader = csv.DictReader(infile)

        missing = [col for col in SOURCE_COLUMNS if col not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"Missing required columns in input CSV: {missing}")

        groups: dict[str, str] = {}
        for row in reader:
            code = (row.get("Code") or "").strip()
            bezeichnung = (row.get("Bezeichnung") or "").strip()

            # Group rows have exactly two characters in code (e.g. "01")
            if len(code) != 2:
                continue

            # Keep first occurrence, warn on conflicting duplicates
            if code in groups and groups[code] != bezeichnung:
                raise ValueError(
                    f"Conflicting group labels for {code}: "
                    f"'{groups[code]}' vs '{bezeichnung}'"
                )
            groups.setdefault(code, bezeichnung)

    rows_out = [
        {"Gruppe": gruppe, "Gruppenbezeichnung": groups[gruppe]}
        for gruppe in sorted(groups.keys())
    ]

    with OUTPUT_FILE.open("w", encoding="utf-8", newline="") as outfile:
        writer = csv.DictWriter(outfile, fieldnames=TARGET_COLUMNS)
        writer.writeheader()
        writer.writerows(rows_out)

    print(f"Done. Wrote {len(rows_out)} rows to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

# Konsistenzprüfung

Erzeugt mit `scripts/check_konsistenz.py`. Toleranz: 1 € bei Beträgen, 0.01 bei Stellen (VZÄ).

| Prüfung | Datei | Geprüfte Werte | Abweichungen |
|---|---|---|---|
| Produktgruppen = Produktbereich | `agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv` | 680 | 0 |
| Produktbereiche = Gesamtsumme | `agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv` | 40 | 2 |
| Zeilenformeln | `agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv` | 1376 | 0 |
| Beamte + Tarif = Gesamt | `agg_tables/Stellenplan_2026_2027.csv` | 158 | 0 |
| Produktgruppen = Produktbereich | `agg_tables/Stellenplan_2026_2027.csv` | 90 | 0 |
| Produktbereiche = Gesamtsumme | `agg_tables/Stellenplan_2026_2027.csv` | 6 | 0 |
| Besoldungsgruppen = Summe_VZAE | `agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv` | 128 | 0 |
| Besoldungsgruppen = Stellenplan | `agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv vs. agg_tables/Stellenplan_2026_2027.csv` | 128 | 2 |

## Produktbereiche = Gesamtsumme (`agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv`)

| Schlüssel | Spalte | Erwartet | Ist | Differenz |
|---|---|---:|---:|---:|
| finanzplanung / 2027 / Summe | einzahlungen_laufend | 1,641,910,310.00 | 1,649,088,310.00 | 7,178,000.00 |
| finanzplanung / 2027 / Summe | auszahlungen_laufend | 1,641,881,520.00 | 1,649,059,520.00 | 7,178,000.00 |

## Besoldungsgruppen = Stellenplan (`agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv vs. agg_tables/Stellenplan_2026_2027.csv`)

| Schlüssel | Spalte | Erwartet | Ist | Differenz |
|---|---|---:|---:|---:|
| Summe / 2026 | Summe_VZAE | 4,898.38 | 4,898.32 | -0.06 |
| Summe / 2027 | Summe_VZAE | 4,901.73 | 4,901.66 | -0.07 |

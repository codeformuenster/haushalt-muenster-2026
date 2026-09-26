# Von Hand übertragene Tabellen

Tabellen, die `scripts/pipeline/extrahiere_tabellen.py` nicht aus den PDFs lesen kann,
hier abgeschrieben. Namensschema wie in `daten/raw_table_extraction/`, Beträge mit
Dezimalpunkt und Einheit im Spaltennamen. Bei einer neuen Fassung des Haushaltsplans
müssen diese Dateien von Hand nachgezogen werden.

| Datei | Quelle | Warum von Hand |
|---|---|---|
| `band1_p545_PG1601_Erlaeuterungen_Steuerarten.csv` | Haushaltsplan 2026/2027, Band 1 (Stand 20.05.2026), PDF-Seite 545 (gedruckt 539), Allgemeine Finanzwirtschaft, Erläuterungen zu Zeile 01 | Tabelle ohne Linien im Erläuterungstext; `extract_tables()` findet sie nicht. |

`scripts/pipeline/planspiel_daten.py` prüft, dass die Summe der Steuerarten Zeile 01
im Teilergebnisplan der Produktgruppe 16 01 ergibt, so fallen Abschreibfehler auf.

# Schulden und Investitionen (Plan)

1. `scripts/pipeline/agg_schulden.py`: liest Band 2 p027 (investive Dezernatsbudgets), p031 (Kredite für Investitionen 2023-2030), p032 (Anteil Beteiligungen), p083 (Verbindlichkeiten), p091 (VE). Schreibt `vue-project/src/data/schulden.json`. Prüfungen, Exit-Code 1 bei Abweichung:
   - S. 31: Aufnahme − Tilgung = Netto; Vorjahresstand + Netto = Stand (Toleranz 0,15 Mio. €).
   - S. 31 gegen S. 83 Pos. 2 (01.01.2025 = 2024, 01.01.2026 = 2025, 31.12.2026, 31.12.2027; Toleranz 0,05 Mio. €).
   - p027: Summe der Dezernate = Summenzeile; p091: Zeilen- und Spaltensummen.
2. `build_agg_tables.py` ruft das Skript mit auf; `scripts/README.md` ergänzen.
3. `vue-project/src/pages/SchuldenPage.vue`: Einleitung (Defizit vs. Schulden, Link `/jahresergebnis`), Kennzahlen (Investkredite und Liquiditätskredite 31.12.2026, Netto-Neuverschuldung 2026), drei ChartCards (Schuldenstand mit Aufnahme/Tilgung, Investitionen nach Dezernat, VE nach Fälligkeit), Satz zum Beteiligungsanteil.
4. `JahresergebnisPage.vue`: ein Satz mit Link auf `/schulden`. README Seitenliste/Datenfluss.
5. Router-Eintrag nur lokal zum Testen, nicht committen; Vorschlag im Bericht.

Prüfungen: Skript ausführen, `npx vue-tsc --build`, `npx eslint` auf geänderte Dateien.

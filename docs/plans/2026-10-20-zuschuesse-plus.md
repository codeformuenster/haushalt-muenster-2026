# Zuschüsse-Seite: Jahresschalter und indirekte Zuschüsse

Freigegeben: Jahresschalter 2026/2027 für alle Aggregate; Abschnitt "Indirekte Zuschüsse" (Erbbaurechte, verbilligte Mieten) aus Band 2, PDF-S. 363-365; Erklärtext nach Vorwort S. 347. Keine Kostenaufteilung, kein Amt-/Ausschussfilter, keine Quellen-Seitenleiste für die indirekten Zuschüsse.

1. `scripts/pipeline/agg_zuschuesse_indirekt.py` (neu): liest die Roh-CSVs p363 (Erbbaurechte) und p364/p365 (Mieten), bereinigt Silbentrennungsreste, prüft Einzelzeilen (Erbbau: (Bilanzerbbauzins - Erbbauzins) x Fläche; Miete: Warmmiete - Kaltmiete = Zuschuss) und die Summenzeilen (56.267,25 €; 875.614,63 / 274.006,60 / 601.608,03 €), Exit-Code 1 bei Abweichung. Schreibt `vue-project/public/daten/zuschuesse-indirekt.json`. Läuft eigenständig, nicht in `build_agg_tables.py`; `agg_zuschuesse.py` und `planspiel_daten.py` bleiben unverändert.
2. `vue-project/src/pages/ZuschuessePage.vue`: Jahresauswahl (`wa-select` wie BezirkePage), alle Summen, Diagramme, Tabellenbeschriftungen und Sortierung nach gewähltem Jahr.
3. `vue-project/src/components/zuschuesse/IndirekteZuschuesse.vue` (neu): lädt die JSON, Erklärtext, zwei Tabellen mit Summenzeile, Fußnoten, Kennzeichnung "Mieten Stand 2024, nicht mit Planwerten summierbar". ChartCard mit `pdf` S. 363 bzw. 364.
4. README.md, scripts/README.md ergänzen.

Prüfungen: Skript ausführen (Exit 0); `node preprocessing/zuschuesse.ts` unverändert grün; `npx vue-tsc --build`; `npx eslint` auf geänderte Dateien.

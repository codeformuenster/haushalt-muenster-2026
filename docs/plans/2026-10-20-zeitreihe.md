# Zeitreihe 2024-2030 je Produktgruppe

1. `scripts/pipeline/planspiel_daten.py`: Ergebnispläne (Gesamt und je PG) für 2024-2030 lesen
   (`column_3`..`column_9`), Einzelwerte bleiben 2026/2027. Summenprüfung über alle 7 Jahre in Cent;
   Abgleich mit der Gesamtübersicht weiter nur 2026/2027. Neues Feld `jahre: [{jahr, art}]`
   (2024 "Ergebnis (Ist)", 2025-2027 "Ansatz", 2028-2030 "Planung"). Skript und `quellen_planspiel.py` ausführen.
2. `vue-project/src/components/ueberblick/ProduktgruppenReihe.vue` (neu): Säulendiagramm Zeile 26 je Jahr
   für die gewählte PG bzw. den gewählten Bereich, Fußnote zur Abweichung von der Jahresergebnis-Seite.
   Einbindung im Drilldown von `UeberblickPage.vue`. Kein Jahresschalter, Popover unverändert.
3. README / scripts/README: Schema von planspiel.json.

Prüfungen: Pipeline-Exit-Code, `npx vue-tsc --build`, `npx eslint` auf geänderte Dateien.

# Plan: Bewirtschaftungsregeln und Erläuterungen je Produktgruppe

Freigegeben: Glossar-Akkordeon zeigt alles (Regeln eingeklappt), Popover `ProduktgruppeInfo` nur Sperrvermerke,
"Keine" und Standardtext zu Zeile 27/28 gefiltert, Teilfinanzplan-Seiten als feste Liste, Originaltext.

1. `scripts/pipeline/erlaeuterungen.py` (neu): Band 1, S. 15-710, Seiten mit "Bewirtschaftungsregeln:" plus
   feste Folgeseiten (`FOLGESEITEN = {320: 319}`). Blöcke "zu Zeile …:", "allgemein:", "zu Maßnahme NNNN …"
   je Abschnitt (regel/erlaeuterung). Plan-Kennung: `FINANZ_SEITEN = {85, 322, 331, 340}`, Seiten > 560 = invest,
   sonst ergebnis. Zeilenangaben normalisieren (Spanne, Liste, "und"), Silbentrennung zusammenziehen,
   Seitenzahlen streichen. Filter: Textblock "Keine" und Zeile 27/28-Text zum Mieter-/Vermietermodell.
   Prüfungen (Exit 1, ohne zu schreiben): Blockzahl roh, Zeilen 1-29 (ergebnis) bzw. 1-40 (finanz),
   jede PG in planspiel.json, PGs ohne Seite = feste Liste. Ausgabe `vue-project/public/daten/erlaeuterungen.json`.
2. `vue-project/src/data/erlaeuterungen.ts` (neu): Typ + `ladeErlaeuterungen()` (fetch, einmal, nach PG).
3. `src/components/ui/ProduktAkkordeon.vue`: je Gruppe Abschnitt "Erläuterungen im Haushaltsplan"
   (Erläuterungen offen, Bewirtschaftungsregeln in `<details>`), mit PDF-Seite.
4. `src/components/ui/ProduktgruppeInfo.vue`: Sperrvermerke der PG in "Gut zu wissen" (nur aufgedeckt).
5. `scripts/README.md`, README (Datenfluss).

Prüfungen: Skript ausführen (Exit 0), `npx vue-tsc --build`, `npx eslint` auf geänderte Dateien.

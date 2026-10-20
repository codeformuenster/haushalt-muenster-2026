# Aufwandsarten und Investitionen auf „Ein- & Ausgaben“

Freigegeben: Aufwandsarten als gestapelter Balken (Stadt oben, darunter je PB bzw. je PG des gewählten PB),
eigener Abschnitt „Investitionen (Finanzplan)“ mit Aus- und Einzahlungen je PB, Klick zu den PG, Jahr 2026/2027.

1. `preprocessing/preprocess_gesamtuebersicht.py`: Spalten Ein-/Auszahlungen Investitionstätigkeit 2026/2027
   übernehmen; Prüfung: Summe der PG = Summenzeile, sonst Exit-Code ≠ 0. CSV neu erzeugen.
2. `vue-project/src/data/einAusgaben.ts`: `DataRow` um die vier Spalten erweitern.
3. `src/components/einausgaben/EinAusgabenAufwandsarten.vue` (neu): gestapelter Balken aus `planspiel.json`
   (`gesamt`, `produktgruppen[].werte`, Zeilen 11–16), Farben `KATEGORIE_FARBEN`.
4. `src/components/einausgaben/EinAusgabenInvestitionen.vue` (neu): Balken je PB, Klick bzw. Auswahl zeigt die PG.
5. `src/pages/EinAusgabenPage.vue`: beide Karten einbinden, Abgrenzungstext Auszahlung/Aufwand, Hinweis PB 16
   (Erwerb von Finanzanlagen, Band 1 S. 546).
6. README: Datenfluss der Seite ergänzen.

Prüfungen: Preprocessing-Skript (Exit-Code), `npx vue-tsc --build`, `npx eslint` auf geänderte Dateien.

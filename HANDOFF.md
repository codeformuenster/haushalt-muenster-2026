# Handoff: Offene Korrekturen aus dem Review vor dem Launch

Stand 27.09.2026. Dieser Branch enthält nur diese Datei. Beide Punkte sind entschieden,
aber noch nicht umgesetzt. Auf `main` ist die Zwischenlösung aktiv (siehe jeweils „Heute“).

## 1. Jahresergebnis statt ordentliches Ergebnis

**Problem.** Planspiel, Startseite und Ein-/Ausgaben rechnen mit dem ordentlichen Ergebnis
(Erträge Z. 10 minus Aufwendungen Z. 17, 2026: −25,7 Mio. €). Für den Haushaltsausgleich
maßgeblich ist nach § 75 Abs. 2 GO NRW das Jahresergebnis (Z. 26, 2026: −46,8 Mio. €,
2027: −37,9 Mio. €), also einschließlich Finanzergebnis (Z. 19 Finanzerträge 21,6 Mio. €,
Z. 20 Zinsen 42,7 Mio. €). Quelle: Band 1, PDF-S. 9; Band 2, PDF-S. 18/19 (Vorbericht:
„Der für den Haushaltsausgleich maßgebliche Ergebnisplan weist … ein Defizit von 46,8 Mio. Euro“).

**Heute (main).** Überall steht „ordentliches Ergebnis“, das Jahresergebnis wird daneben
genannt (Konstanten `JAHRESERGEBNIS` in `PlanspielPage.vue` und `EinAusgabenPage.vue`).

**Ziel.**
- Planspiel: `START` in `vue-project/src/pages/PlanspielPage.vue` wird das Jahresergebnis.
  Das Finanzergebnis kommt als fester, nicht steuerbarer Block dazu (Z. 19 und 20 in
  `planspiel_daten.py` exportieren; `zinsaufwand` ist schon da, Finanzerträge fehlen noch).
  Die Konstante `JAHRESERGEBNIS` entfällt dann zugunsten der Daten.
- Karten in `vue-project/src/components/planspiel/karten.ts` bekommen echte Wirkungen:
  - `stadtwerke`: +50 % Ausschüttung = +3,25 Mio. € (Finanzertrag).
  - `kredit`: Zinsen für das erste Jahr als negative Wirkung (Zinssatz als Annahme offenlegen).
  - `schule`: Zinsen zusätzlich zur Abschreibung, falls kreditfinanziert (Annahme offenlegen).
  - Texte „keine Wirkung auf das ordentliche Ergebnis“ anpassen.
- Erfolgstext: „Der Haushalt 2026 ist ausgeglichen“ ist dann korrekt. Einen Satz zum
  fiktiven Ausgleich ergänzen: Die Ausgleichsrücklage deckt 2026 nur 19,4 Mio. €, der Rest
  (27,4 Mio. €) verringert die allgemeine Rücklage und macht den Haushalt genehmigungspflichtig
  (Band 2, PDF-S. 18 f.; § 75 Abs. 4 GO NRW).
- Startseite (`StartPage.vue`, Dashboard): Jahresergebnis als Hauptkarte. Die Gesamtübersicht-CSV
  hat nur `OrdentlErgebnis_*`; Jahresergebnis aus Band 1 S. 9 Z. 26 ergänzen (Pipeline
  `agg_gesamtuebersicht.py` oder eigene Zeile).
- Ein-/Ausgaben: Sankey bleibt bei ordentlichen Erträgen/Aufwendungen; Hinweis bleibt.

**Betroffen.** Planspiel (thunfischtoast), Startseite (Robin), Ein-/Ausgaben (johann-vu).
Das Spiel wird schwerer (rund 21 Mio. € mehr Lücke); Reglergrenzen prüfen.

## 2. Bezirke: Mehrfachzählung je Maßnahme beseitigen

**Problem.** Viele Investitionsmaßnahmen stehen im Plan mit identischem Betrag unter
mehreren oder allen sechs Bezirksvertretungen, z. B. „4243 Velorouten Stadtregion“
(3 Mio. €, alle sechs: Band 2, PDF-S. 180, 211, 235, 265, 291, 321) oder
„Planungs- u. Baukosten Erw. Schulgebäude“ (7 Mio. €, u. a. PDF-S. 158, 279).
`scripts/pipeline/agg_bezirksvertretungen.py` erkennt Doppelungen nur, wenn ein ganzes
Fachthema in allen sechs Bezirken identisch ist (`BezirksspezifischGeprueft = NEIN`).
Grobe Schätzung aus dem Review: rund 97 Mio. € von 306 Mio. € (2026) mehrfach gezählt
(Heuristik, Größenordnung sicher, genaue Höhe nicht).

**Heute (main).** Bezirke-Seite ohne Stadtsumme, ohne Prozente, ohne Ansicht „ganze Stadt“;
Hinweis, dass bezirksübergreifende Maßnahmen mehrfach enthalten sind.

**Ziel.**
- Pipeline: Maßnahmen je Zeile auslesen (Nummer, Bezeichnung, Beträge 2026/2027), nicht nur
  Summen je Datei. Eine Maßnahme, die mit gleicher Nummer und gleichem Betrag in zwei oder
  mehr Bezirken steht, gilt als „bezirksübergreifend“ und wird einmal in einem eigenen Block
  gezählt.
- Offene Frage, vorher klären: Wiederholt der Plan den vollen Betrag je Bezirk, oder ist
  er aufgeteilt und zufällig gleich? Vorbericht/Einleitung zu den bezirksbezogenen Angaben
  (Band 2 ab PDF-S. 147) lesen, notfalls bei der Kämmerei nachfragen. Die Regel auf der
  Seite als unsere Interpretation kennzeichnen.
- Seite: Bezirkssummen ohne bezirksübergreifende Maßnahmen, dazu der Block
  „bezirksübergreifend“; danach sind Stadtsumme, Anteile und „ganze Stadt“ wieder möglich.
- Prüfung: Summe(Bezirke) + bezirksübergreifend einmal = Summe der Maßnahmen ohne Doppel;
  Stichproben gegen PDF.

**Betroffen.** Bezirke (Elina), Pipeline (`agg_bezirksvertretungen.py`, `daten/agg_tables/`).

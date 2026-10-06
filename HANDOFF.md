# Handoff: Offene Korrekturen aus dem Review vor dem Launch

Stand 06.10.2026. Der frühere Punkt 1 (Jahresergebnis statt ordentliches Ergebnis) ist auf
diesem Branch umgesetzt. Offen ist noch der folgende Punkt; er ist entschieden, aber nicht
umgesetzt. Auf `main` ist die Zwischenlösung aktiv (siehe „Heute“).

## Bezirke: Mehrfachzählung je Maßnahme beseitigen

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

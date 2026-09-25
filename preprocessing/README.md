# Preprocessing

Hier wird aus den Rohdaten in `daten/` das, was die Anwendung lädt.

**Die Rohdaten bleiben roh.** Bereinigung passiert hier, nicht im Frontend —
so bleibt `daten/` die unveränderte Quelle der Wahrheit, und die Seiten unter
`vue-project/src/pages/` stellen nur noch dar.

## Ausführen

Läuft mit blankem Node (ab v23; TypeScript wird direkt ausgeführt), keine
Abhängigkeit, kein `npm install`. Aus dem Wurzelverzeichnis des Repos:

```
node preprocessing/zuschuesse.ts
node preprocessing/bezirke.ts
```

Das Skript prüft sich am Ende gegen die Soll-Werte aus `plan.md`, Abschnitt 5,
und gegen die zweite CSV (Aggregat nach Produktgruppe). Stimmt eine Zahl nicht,
bricht es mit Exit-Code 1 ab und schreibt **nichts**.

## Ergebnis wird mitcommittet

Die erzeugten JSON-Dateien unter `vue-project/public/daten/` liegen im Git.
Sonst bräuchte jede und jeder erst dieses Skript, bevor `npm run dev`
überhaupt etwas anzeigt. Nach einer Änderung an einem Skript also neu erzeugen
und die JSON mit einchecken.

`public/` und nicht `src/assets/`, weil die JSON ein Erzeugnis ist und kein
Quelltext: sie wird per `fetch` geladen (landet also nicht im Haupt-Bundle) und
lässt sich im Browser direkt aufrufen, wenn jemand die Zahlen nachprüfen will.

## Dateien

| Datei | Was |
|---|---|
| `csv.ts` | CSV-Leser nach RFC 4180, ~80 Zeilen, ohne Abhängigkeit |
| `zuschuesse.ts` | Zuschussbericht → `vue-project/public/daten/zuschuesse-2026-2027.json` |
| `bezirke.ts` | Bezirksbezogene Angaben + Stadtbezirks-Geometrie → `vue-project/public/daten/bezirke-2026-2027.json` und `stadtbezirke.geojson` |

## Eine weitere Seite anbinden

Ein eigenes `<thema>.ts` daneben legen, `parseCsv` aus `csv.ts` benutzen und
dem Muster aus `zuschuesse.ts` folgen:

1. einlesen und filtern (Summenzeilen der Quelle raus)
2. bereinigen — jeder Schritt eine benannte Funktion mit Kommentar, **warum**
3. prüfen gegen Soll-Werte, bei Abweichung `process.exit(1)`
4. erst dann schreiben

Schritt 3 ist der wichtige: die Extraktion aus dem PDF ist stellenweise
fehlerhaft, und ein stiller Fehler in den Zahlen ist schlimmer als gar keine
Seite.

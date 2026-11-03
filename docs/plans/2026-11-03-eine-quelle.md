# Eine Quelle je Fakt (Schritt 2 des Vereinfachungs-Reviews)

Branch `refactor/eine-quelle` (von `refactor/aufraeumen`). Kein geändertes Verhalten außer den
Namen von PB 09 und PB 12 (jetzt überall die vollen Namen).

Entscheidungen (mit dem Nutzer geklärt):
- PB-Namen: volle Namen überall, z. B. „Räumliche Planung und Entwicklung/Geoinformationen“,
  „Verkehrsflächen und -anlagen, ÖPNV“ (Bindestrich, kein Halbgeviertstrich).
- Quelle der Namen: die Pipeline schreibt sie nach `planspiel.json`; das Frontend liest nur dort.
- `components/planspiel/karten.ts` bleibt, wo es ist.

## Schritte

1. **Pipeline-Namen.** `scripts/pipeline/planspiel_daten.py:~230`: `produktbereiche[].name` aus
   `daten/produkte.json` (`produktbereich` → `produktbereich_name`) statt aus der Gesamtübersicht.
   Halbgeviertstrich als Ergänzungsstrich in Bindestrich wandeln (PB 12 steht in produkte.json als
   „und –anlagen“), Kommentar warum. Prüfen, dass jeder PB-Code aus den Produktgruppen einen Namen hat,
   sonst Abweichung. Vorher einmal `uv run --project scripts scripts/pipeline/planspiel_daten.py`
   auf dem unveränderten Stand laufen lassen und bestätigen, dass `planspiel.json` unverändert bleibt;
   danach neu erzeugen und prüfen, dass sich im Diff nur die Namen von PB 09 und 12 ändern.
   Commit: `feat(pipeline): volle Namen der Produktbereiche in planspiel.json`.
2. **`src/data/ergebnisplan.ts`** (neu), liest `planspiel.json`:
   - `ZEILE`: vereinigte Map aus `karten.ts:17` und `JahresergebnisPage.vue:23` (u. a. `ertraege: 9`,
     `aufwendungen: 16`, `ordentlichesErgebnis: 17`, `finanzertraege: 18`, `zinsen: 19`,
     `finanzergebnis: 20`, `ausserordentlichesErgebnis: 24`, `jahresergebnis: 25`). Kommentar: Index =
     Zeilennummer − 1.
   - `type Jahr = keyof typeof daten.gesamt`
   - `gesamt(jahr: Jahr, zeile: number): number`
   - `produktgruppe(code: string, jahr: Jahr, zeile: number): number`
   - `produktbereich(code: string, jahr: Jahr, zeile: number): number` (Summe der PGs mit Präfix)
   - `PRODUKTBEREICHE` (= `daten.produktbereiche`) und `produktbereichName(code): string`
     (Fallback: Code).
   Docstring auf Modul und öffentlichen Funktionen.
3. **Aufrufer umstellen** auf Schritt 2:
   - `components/planspiel/karten.ts`: eigenes `ZEILE`, `gesamt`, `produktgruppe`,
     `aufwendungenProduktbereich`, `PRODUKTBEREICHE` entfernen; aus `ergebnisplan.ts` importieren
     und mit `'2026'` aufrufen (`JAHR` bleibt). Re-Exporte nur, wenn `PlanspielPage.vue` sie braucht;
     besser `PlanspielPage.vue:22-25` direkt aus `@/data/ergebnisplan` importieren lassen.
   - `pages/JahresergebnisPage.vue:23` (eigenes `ZEILE`), `:56`.
   - `pages/EinAusgabenPage.vue:33-34`.
   - `pages/StartPage.vue:177-179` (`[9, 18]`, `[16, 19]`, `[25]` → `ZEILE.…`).
   - `pages/UeberblickPage.vue:18-19, 30-36`.
   - `components/ueberblick/ErgebnisReihe.vue:17, 41`.
   - `components/einausgaben/EinAusgabenAufwandsarten.vue:27, 46-57` (`indexOf(art.zeile)` → `ZEILE`
     oder beibehalten, falls dort Labels gebraucht werden; Hauptsache keine zweite Index-Definition).
   - `BezirkePage.vue:285` `ZEILE_SCHMAL` ist eine Pixelhöhe, nicht betroffen.
4. **PB-Namen im Frontend nur noch aus `ergebnisplan.ts`:**
   - `pages/ZuschuessePage.vue:42-61` lokale Map löschen, `produktbereichName()` nutzen (`:155`, `:993`).
   - `pages/StellenplanPage.vue:82, 180, 695` und `pages/StellenplanGesamtPage.vue:68`: Namen per
     `produktbereichName()`, aber weiter nur über die Codes iterieren, die in `stellenplan.json`
     vorkommen (`daten.areas` hat nur 01-15; 16/17 dürfen nicht neu im Select auftauchen).
     `stellenplan.json` und `generate-stellenplan.py` nicht ändern (Schritt 3 verschiebt das Skript).
   - `gruppenNamen` (`data/einAusgaben.ts:94`) durch `produktbereichName` ersetzen in
     `EinAusgabenInvestitionen.vue`, `lib/mehrOderWeniger.ts`, `EinAusgabenPage.vue`, `MillionPage.vue`.
     Wo über `gruppenNamen` iteriert wird (`EinAusgabenInvestitionen.vue:30`, `:102` `has`), über
     `PRODUKTBEREICHE` iterieren. Danach `gruppenNamen` und den Import der `_gruppen.csv` aus
     `einAusgaben.ts` löschen. Die CSV und `extract_gesamtuebersicht_gruppen.py` bleiben bis Schritt 3
     liegen; in `scripts/README.md` (Datenfluss-Tabelle) und `preprocessing/README.md` vermerken,
     dass die CSV nicht mehr gelesen wird.
5. **`src/data/ruecklagen.ts`** (neu): exportiert `RUECKLAGEN` mit allen Reihen aus `ruecklagen.json`
   in € (`* 1_000_000`), außer `jahre` und `inanspruchnahmeProzent`; dazu
   `imJahr(reihe: number[], jahr: number): number`. Umstellen:
   - `JahresergebnisPage.vue:163-247, 271, 435-551` (`mio()`, `* MIO`, `index2026`). Die
     Achsenbeschriftung bei `:195` teilt weiter durch 1 Mio. für `EINE_STELLE`.
   - `SchuldenPage.vue:23-28`, `PlanspielPage.vue:52-53`.
   - Kopfkommentare, die „ruecklagen.json (Mio. €)“ nennen, anpassen.

Schritte 2-5 als ein oder zwei Commits (`refactor: …`), Schritt 1 eigener Commit.

## Prüfung

Keine Tests im Projekt. Vor Schritt 2 in `C:\Users\chris\AppData\Local\Temp\claude\22c2bb774d7a5a44\8e3eb473-5595-4a0b-94f5-1195138c6901\scratchpad\`
ein Node-Skript anlegen, das die Werte, die die Seiten ausrechnen, nicht nachbaut; stattdessen nach
den Änderungen gezielt vergleichen:
- Jede alte Index-Konstante gegen die neue `ZEILE` (gleiche Zahl für gleichen Namen).
- `produktbereich(code, '2026', ZEILE.aufwendungen)` gegen das alte `aufwendungenProduktbereich`.
- `RUECKLAGEN.x[i]` = `ruecklagen.json.x[i] * 1e6` für alle Reihen.
Danach `npm run type-check`, `npx oxlint .`, `npx eslint .` (ohne `--fix`) in `vue-project/`.
Kein `npm run build-only` (macht der Hauptagent).

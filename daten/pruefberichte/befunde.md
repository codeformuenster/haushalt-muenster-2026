# Befunde der Konsistenzprüfung

Manuell untersuchte Abweichungen aus [`konsistenz.md`](konsistenz.md) (erzeugt mit `scripts/check_konsistenz.py`). Seitenangaben sind PDF-Seiten.

## Finanzplanung 2027: Gesamtsumme um 7.178.000 € zu hoch

**Betrifft:** Haushaltsquerschnitt, Finanzplanung 2027 (Band 2, S. 79-80) und damit `agg_tables/Gesamtuebersicht_Einnahmen_Ausgaben_2026_2027.csv`, Spalten `Einzahlungen_lfdVerw_2027_EUR` und `Auszahlungen_lfdVerw_2027_EUR`.

In der Summenzeile sind die Ein- und Auszahlungen aus laufender Verwaltungstätigkeit jeweils 7.178.000 € höher als die Summe der Produktbereiche. Der Fehler steht so im PDF, die Extraktion ist korrekt.

| Quelle | Einzahlungen lfd. Verw. | Auszahlungen lfd. Verw. |
|---|---:|---:|
| Summe der Produktbereiche (Band 2, S. 79-80) | 1.641.910.310 | 1.641.881.520 |
| Gesamtfinanzplan (Band 1, S. 11) | 1.645.499.310 | 1.645.470.520 |
| Summenzeile Querschnitt (Band 2, S. 80) | 1.649.088.310 | 1.649.059.520 |

Die drei Werte liegen jeweils genau 3.589.000 € auseinander. Der Saldo (28.790 €) ist überall gleich.

**Was feststeht:**

- Band 1 ist in sich stimmig: Die Zeilen 01-08 des Gesamtfinanzplans ergeben genau 1.645.499.310 €, die Zeilen 10-15 genau 1.645.470.520 €. Der Vorbericht (Band 2, S. 28) nennt ebenfalls 1.645,5 Mio. €.
- Im Querschnitt summieren sich die Produktgruppen korrekt zu ihren Produktbereichen. Die Lücke liegt zwischen Produktbereichen und Summenzeile.
- Die Teilergebnispläne aus Band 1 (Erträge und Aufwendungen 2027) stimmen für alle 17 Produktbereiche mit dem Querschnitt überein. Der Ergebnisplan ist nicht betroffen.
- 2026 ist konsistent.

**Vermutung:** Ein Posten von 3.589.000 €, der als Ein- und als Auszahlung gleich hoch ist, fehlt in allen Produktbereichszeilen und wurde in der Summenzeile doppelt gezählt. Der Betrag kommt in keinem der beiden PDFs vor, ist also vermutlich eine Summe mehrerer Positionen.

**Nicht klärbar mit den vorliegenden Daten:** In welchem Produktbereich der Posten fehlt. Die Teilfinanzpläne in Band 1 enthalten nur die Investitionstätigkeit, eine Aufteilung der laufenden Ein- und Auszahlungen nach Produktbereichen gibt es nur im Querschnitt. Ein Vergleich der Differenzen Einzahlungen/Erträge und Auszahlungen/Aufwendungen zwischen 2026 und 2027 ergibt keinen eindeutigen Kandidaten (größte Änderung: PB 16 mit -3.089.000 € bei den Einzahlungen).

**Empfehlung:** Für die Gesamtsummen 2027 die Werte aus Band 1 verwenden (1.645.499.310 € / 1.645.470.520 €). Die Produktbereichswerte des Querschnitts sind einzeln plausibel, ergeben zusammen aber 3,6 Mio. € zu wenig. Klärung nur über das Amt für Finanzen und Beteiligungen (finanzen@stadt-muenster.de) möglich.

## Stellenplan: Gesamtsumme weicht um 0,06 / 0,07 VZÄ ab

**Betrifft:** `agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv` und `agg_tables/Stellenplan_2026_2027.csv`, Gesamtsumme der Stadt.

| Jahr | Summe der Besoldungsgruppen | Stellenplan Gesamt | Differenz |
|---|---:|---:|---:|
| 2026 | 4.898,38 | 4.898,32 | 0,06 |
| 2027 | 4.901,73 | 4.901,66 | 0,07 |

Auf Ebene der Produktgruppen stimmen beide Dateien überein. Wahrscheinlich Rundungsdifferenzen in der Quelle, nicht weiter untersucht.

## Stellenplan nach Besoldungsgruppen: TVÖD-FEST-Stellen in Spalte S02 (korrigiert)

**Betrifft:** `agg_tables/Stellenplan_2026_2027_nach_Besoldungsgruppen.csv`, Spalten `Tarif_S02` und `Tarif_TVOEDFEST` (30 Zeilen).

Die ursprünglich eingecheckte Tabelle hatte die TVÖD-FEST-Stellen zur Spalte S02 addiert, `Tarif_TVOEDFEST` war überall 0. Im PDF stehen diese Werte in der Spalte "TVÖD FEST" (Band 2, S. 46-53 und 59-66). Die Summenzeile auf S. 53 bestätigt das: S02 = 54,41, TVÖD FEST = 10,82 (alte Tabelle: 65,23 / 0,00). Seit dem Neuaufbau mit `scripts/build_agg_tables.py` ist die Tabelle korrigiert. `Summe_VZAE` und alle anderen Spalten sind unverändert.

Außerdem übernimmt `Stellenplan_2026_2027.csv` die Bezeichnung von Produktbereich 09 jetzt wie im Stellenplan gedruckt ("Räumliche Planung, Entwicklung/GeoInfo" statt vorher "Räumliche Planung und Entwicklung").

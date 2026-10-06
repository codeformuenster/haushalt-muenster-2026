# Datenquellen und Nutzungsbedingungen

Die GPL-3.0-only in `LICENSE` gilt für den selbst entwickelten Programmcode.
Sie erteilt keine Nutzungsrechte an übernommenen Daten oder Inhalten Dritter.
Dateiformate wie CSV oder JSON bestimmen keine Lizenz; maßgeblich sind die
jeweilige Quelle, gesetzliche Nutzungsgrundlagen und gegebenenfalls deren
Nutzungsbedingungen.

## Haushaltsdaten 2026/2027: gesetzliche Nutzungsgrundlage

Bereitstellerin: **Stadt Münster, Amt für Finanzen und Beteiligungen**.
Quelle: [Haushaltssatzung und Haushaltsplan](https://www.stadt-muenster.de/finanzen/muensters-haushalt/der-haushaltsplan),
Haushaltsplan 2026/2027, Band 1 und Band 2, jeweils Stand 20.05.2026.
Die direkten PDF-Links und die Seitenzuordnung stehen in `README.md`.

Daraus stammen insbesondere:

- `daten/raw_table_extraction/`: automatisch extrahierte Tabellen einschließlich Textpassagen;
- `daten/manuell/`: manuell übertragene Tabellen;
- `daten/agg_tables/` und `daten/produkte.json`: bereinigte bzw. aggregierte Haushaltsdaten;
- daraus erzeugte CSV- und JSON-Daten in `vue-project/src/assets/data/`,
  `vue-project/src/data/` und `vue-project/public/daten/`;
- mitgelieferte Originaldokumente und erzeugte PDF-Seitenausschnitte, soweit vorhanden.

Bearbeitung durch das Projekt Münster Money: PDF-Tabellenextraktion, manuelle
Übertragung, Bereinigung, Zusammenfassung und Aufbereitung für die Anwendung.
Die Bearbeitungen sind keine amtliche Veröffentlichung; die Original-PDFs sind
für die Prüfung der Angaben maßgeblich.

### Rechtliche Einordnung

**Stand 06.10.2026:** Die Nutzung der amtlichen Haushaltszahlen und Tabellen
stützt das Projekt auf folgende gesetzliche Grundlagen, ohne ihnen eine eigene
GPL- oder Open-Data-Lizenz zuzuschreiben:

- [§ 80 Abs. 3, 5 und 6 GO NRW](https://recht.nrw.de/lrgv/gesetz/01012026-gemeindeordnung-fuer-das-land-nordrhein-westfalen-bekanntmachung-der/?suchbegriff=gemeindeordnung)
  regelt die Bekanntgabe und Einsichtnahme des Entwurfs sowie die öffentliche
  Bekanntmachung der Haushaltssatzung und die Einsichtnahme in ihre Anlagen.
  Diese Öffentlichkeitspflicht ist für sich genommen keine allgemeine Datenlizenz.
- Die Haushaltssatzung selbst ist als kommunale Rechtsnorm grundsätzlich
  urheberrechtsfrei nach [§ 5 Abs. 1 UrhG](https://www.gesetze-im-internet.de/urhg/__5.html).
  Für den amtlichen Haushaltsplan und seine Tabellen spricht die gesetzlich
  vorgesehene Veröffentlichung für eine Einordnung unter § 5 Abs. 2 UrhG:
  amtliche Werke, die im amtlichen Interesse zur allgemeinen Kenntnisnahme
  veröffentlicht werden. Das ist die rechtliche Einschätzung des Projekts,
  keine abschließende Feststellung für jeden Bestandteil der PDF-Bände.
- Einzelne Haushaltszahlen und Tatsachen sind grundsätzlich keine persönlichen
  geistigen Schöpfungen im Sinne von [§ 2 Abs. 2 UrhG](https://www.gesetze-im-internet.de/urhg/__2.html).
  Bei umfangreichen Zusammenstellungen sind mögliche Rechte an Datenbankwerken
  oder Datenbanken gesondert zu berücksichtigen
  ([§ 4 UrhG](https://www.gesetze-im-internet.de/urhg/__4.html),
  [§§ 87a ff. UrhG](https://www.gesetze-im-internet.de/urhg/__87a.html)).

Bei amtlichen Werken nach § 5 Abs. 2 UrhG gelten die dort genannten Regeln zu
Änderungen und Quellenangaben (§§ 62 und 63 UrhG) entsprechend. Quellen werden
deshalb angegeben und Übertragungen, Bereinigungen und Aggregationen als eigene
Bearbeitung kenntlich gemacht. Diese Kennzeichnung ersetzt nicht die Prüfung,
ob eine konkrete Änderung nach den gesetzlichen Regeln zulässig ist.

Diese Einordnung ist kein pauschaler Freigabevermerk für sämtliche Inhalte der
PDFs: längere Erläuterungstexte, Fotos, Grafiken und beigefügte Werke Dritter
sind gesondert zu beurteilen. Das betrifft auch PDF-Ausschnitte, soweit sie solche
Inhalte enthalten, und Textpassagen in den Roh-CSVs.

Eine ausdrückliche Datenlizenz für die verwendeten Bände 2026/2027 konnte auf
der geprüften Downloadseite nicht verifiziert werden. Das allein bedeutet nicht,
dass eine zusätzliche Erlaubnis für die Nutzung urheberrechtsfreier Inhalte
erforderlich ist.

### Quellenvermerk für aufbereitete Haushaltsdaten

> Quelle: Stadt Münster, Amt für Finanzen und Beteiligungen –
> [Haushaltsplan 2026/2027](https://www.stadt-muenster.de/finanzen/muensters-haushalt/der-haushaltsplan),
> Band 1 und Band 2, Stand 20.05.2026.
> Von Münster Money aus den PDF-Tabellen übertragen, bereinigt und teilweise
> aggregiert; keine amtliche Veröffentlichung. Die jeweilige Seitenzuordnung
> steht in den Dateinamen bzw. Quellenangaben der Anwendung.

## Stadtbezirks-Geodaten

Für `daten/geo/stadtbezirke-muenster.geojson` ist im Repository die
**Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0)**
dokumentiert. Quelle, Stand und Abrufdatum stehen in
[`daten/geo/README.md`](daten/geo/README.md). Das gilt auch für die daraus
erzeugte vereinfachte Kartengrundlage `vue-project/public/daten/stadtbezirke.geojson`.

Die [Lizenz](https://www.govdata.de/dl-de/by-2-0) erlaubt auch kommerzielle
Nutzung und Bearbeitung. Der Quellenvermerk muss Bereitstellerin, Lizenz mit
Link und einen Verweis auf den Datensatz enthalten; Veränderungen sind zu kennzeichnen.

Quellenvermerk für die bearbeitete Kartengrundlage:

> Stadt Münster – [Geokoordinaten der Stadtbezirke Münster](https://opendata.stadt-muenster.de/dataset/geokoordinaten-der-stadtbezirke-m%C3%BCnster),
> [Datenlizenz Deutschland – Namensnennung – Version 2.0](https://www.govdata.de/dl-de/by-2-0).
> Für Münster Money vereinfacht und für die Kartendarstellung aufbereitet.

## Weitere Fremdinhalte

Weitere Quellen, etwa Besoldungs- und Tariftabellen, Bilder oder Dokumente,
benötigen jeweils einen eigenen Herkunfts- und gegebenenfalls Lizenznachweis.
Die Code-Lizenz ersetzt diese Nachweise nicht. Für neue Datenquellen bitte
Bereitsteller, Quelllink, Stand, Lizenznachweis und Bearbeitung dokumentieren.

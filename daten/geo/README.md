# Geodaten

## `stadtbezirke-muenster.geojson`

Die Umrisse der sechs Münsteraner Stadtbezirke — die Ebene, auf der die
Bezirksvertretungen gewählt werden und auf der Band 2 des Haushaltsplans die
bezirksbezogenen Angaben ausweist.

| | |
|---|---|
| Quelle | [Geokoordinaten der Stadtbezirke Münster](https://opendata.stadt-muenster.de/dataset/geokoordinaten-der-stadtbezirke-m%C3%BCnster), Open-Data-Portal der Stadt Münster |
| Direktlink | <https://opendata.stadt-muenster.de/sites/default/files/stadtbezirke-muenster.geojson> |
| Herausgeberin | Stadt Münster |
| Lizenz | [Datenlizenz Deutschland – Namensnennung – Version 2.0](https://www.govdata.de/dl-de/by-2-0) |
| Stand der Geometrie | 18.12.2018 |
| Abgerufen | 25.09.2025 |
| Format | GeoJSON, WGS 84 (CRS84), 6 Polygone |

Unverändert übernommen, wie alles unter `daten/`. Die schlanke Fassung für die
Karte erzeugt `preprocessing/bezirke.ts` nach
`vue-project/public/daten/stadtbezirke.geojson`.

Die Lizenz verlangt Namensnennung. Sie steht in der Fußzeile der Bezirke-Seite.

### Nicht verwendet: die Stadtteile

Es gibt auch ein [GeoJSON der 45 Stadtteile](https://opendata.stadt-muenster.de/dataset/geokoordinaten-der-stadtteil-grenzen-geometriedaten-der-kleinr%C3%A4umigen-gebietsgliederung-5).
Dazu fehlen uns aber die Zahlen: der Haushaltsplan gliedert räumlich nur nach
den sechs Bezirksvertretungen, nicht nach Stadtteilen.

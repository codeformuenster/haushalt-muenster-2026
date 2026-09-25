"""Erzeugt die Webdaten aus den beiden Stellenplan-CSVs. Aufruf aus jedem Verzeichnis möglich."""
import csv
import json
from decimal import Decimal
from pathlib import Path

project = Path(__file__).resolve().parents[1]
source = project.parent / 'daten' / 'agg_tables'
with (source / 'Stellenplan_2026_2027.csv').open(encoding='utf-8-sig', newline='') as file:
    overview = list(csv.DictReader(file))
with (source / 'Stellenplan_2026_2027_nach_Besoldungsgruppen.csv').open(encoding='utf-8-sig', newline='') as file:
    details = list(csv.DictReader(file))
areas = {row['Code']: row['Bezeichnung'] for row in overview if row['Ebene'] == 'Produktbereich-Summe'}
keys = set()
rows = []
for row in details:
    if not row['Code']:
        continue  # Summenzeilen nicht erneut addieren.
    key = (row['Code'], row['Jahr'])
    assert key not in keys, f'Doppelter Schlüssel: {key}'
    keys.add(key)
    assert row['Code'][:2] in areas, f'Unbekannter Produktbereich: {key}'
    grades = {k: Decimal(v) for k, v in row.items() if k.startswith(('Beamte_', 'Tarif_'))}
    assert all(v >= 0 for v in grades.values()), key
    assert sum(grades.values()) == Decimal(row['Summe_VZAE']), f'Inkonsistente Detailzeile: {key}'
    rows.append({'code': row['Code'], 'name': row['Bezeichnung'], 'year': row['Jahr'],
                 'total': float(row['Summe_VZAE']), 'grades': {k: float(v) for k, v in grades.items() if v}})
for year in ('2026', '2027'):
    expected = {r['Code'] for r in overview if r['Ebene'] == 'PG'}
    assert {r['code'] for r in rows if r['year'] == year} == expected
    year_rows = [r for r in details if r['Jahr'] == year and r['Code']]
    total = next(r for r in details if r['Jahr'] == year and not r['Code'])
    for column in ['Summe_VZAE', *grades]:
        assert sum(Decimal(r[column]) for r in year_rows) == Decimal(total[column]), (year, column)
output = project / 'src' / 'data' / 'stellenplan.json'
output.write_text(json.dumps({'areas': areas, 'rows': rows}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(rows)} geprüfte Produktgruppen/Jahr-Datensätze → {output}')

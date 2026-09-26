/**
 * Glossar: kurze Erklärungen zu den Fachwörtern, die in Münster Money vorkommen.
 *
 * Die Einträge erscheinen an zwei Stellen: `kurz` im Aufklappfenster von
 * <GlossarBegriff id="..."> direkt im Text, `kurz` und `lang` zusammen auf der
 * Glossar-Seite (Komponente BegriffeListe).
 *
 * Die Texte sind ein Entwurf, Review durch das Team steht aus. Sie erklären
 * allgemein, wie ein kommunaler Haushalt in NRW (NKF) funktioniert, und nennen
 * bewusst keine Zahlen aus dem Münsteraner Plan.
 *
 * Neuer Begriff: einen Eintrag unten ergänzen. Der Schlüssel ist die ID, in
 * Kleinbuchstaben ohne Umlaute und mit Bindestrichen (z. B. `freiwillige-leistung`).
 * `kurz` hat ein bis zwei Sätze und muss ins Aufklappfenster passen, `lang` ist
 * optional und ergänzt zwei bis vier Sätze für die Glossar-Seite. `siehe`
 * verweist auf verwandte Einträge. Tippfehler in IDs, sowohl in `siehe` als auch
 * in <GlossarBegriff id="...">, lassen die Typprüfung (vue-tsc) scheitern.
 */

export interface Begriff {
  /** So wie der Begriff als Überschrift erscheint. */
  begriff: string
  /** Gängige Abkürzung, erscheint in Klammern hinter dem Begriff. */
  abkuerzung?: string
  /** Ein bis zwei Sätze für das Aufklappfenster. */
  kurz: string
  /** Zwei bis vier weitere Sätze, nur auf der Glossar-Seite. */
  lang?: string
  /** IDs verwandter Begriffe. Geprüft wird das über `eintrag()` unten. */
  siehe?: readonly string[]
}

export const GLOSSAR = {
  haushalt: {
    begriff: 'Haushalt',
    kurz: 'Der Haushalt, genauer der Haushaltsplan, legt fest, mit welchen Erträgen die Stadt rechnet und wofür sie Geld ausgeben darf. Der Rat beschließt ihn als Teil der Haushaltssatzung.',
    lang: 'Für die Verwaltung ist der Haushaltsplan verbindlich: Sie darf grundsätzlich nur ausgeben, was darin vorgesehen ist. Ausnahmen für über- und außerplanmäßige Ausgaben sind eng begrenzt. In NRW besteht er vor allem aus dem Ergebnisplan, dem Finanzplan und den Teilplänen für die einzelnen Produktbereiche. Dazu kommen Anlagen wie der Stellenplan.',
    siehe: ['doppelhaushalt', 'ergebnisplan', 'finanzplan', 'stellenplan'],
  },
  doppelhaushalt: {
    begriff: 'Doppelhaushalt',
    kurz: 'Ein Doppelhaushalt regelt zwei Haushaltsjahre in einem Plan, hier 2026 und 2027. Der Rat beschließt beide Jahre auf einmal, die Zahlen stehen aber für jedes Jahr getrennt.',
    lang: 'Das spart Arbeit und gibt der Verwaltung Planungssicherheit. Die Zahlen für das zweite Jahr beruhen allerdings auf älteren Annahmen und sind unsicherer. Ändert sich die Lage stark, kann der Rat einen Nachtragshaushalt beschließen.',
    siehe: ['haushalt', 'haushaltssperre'],
  },
  ergebnisplan: {
    begriff: 'Ergebnisplan',
    kurz: 'Der Ergebnisplan stellt alle geplanten Erträge und Aufwendungen eines Jahres gegenüber. Er ähnelt der Gewinn-und-Verlust-Rechnung eines Unternehmens.',
    lang: 'Er enthält auch Posten, bei denen kein Geld fließt, zum Beispiel Abschreibungen auf Gebäude und Straßen oder Rückstellungen für Pensionen. Unter dem Strich steht das Jahresergebnis. Für jeden Produktbereich gibt es einen eigenen Teilergebnisplan, im Münsteraner Plan sogar für jede Produktgruppe.',
    siehe: ['ertraege', 'aufwendungen', 'jahresergebnis', 'finanzplan'],
  },
  finanzplan: {
    begriff: 'Finanzplan',
    kurz: 'Der Finanzplan zeigt, wie viel Geld tatsächlich in die Stadtkasse fließt und wieder hinaus, also alle Einzahlungen und Auszahlungen. Dazu gehören auch Investitionen und Kredite.',
    lang: 'Posten ohne Zahlung wie Abschreibungen fehlen hier. Der Plan ist in drei Teile gegliedert: laufende Verwaltungstätigkeit, Investitionstätigkeit und Finanzierungstätigkeit. Daran lässt sich ablesen, ob die Stadt für ihre Ausgaben Kredite aufnehmen muss.',
    siehe: ['einzahlungen-auszahlungen', 'investitionen', 'ergebnisplan'],
  },
  jahresergebnis: {
    begriff: 'Jahresergebnis',
    kurz: 'Das Jahresergebnis ist die Differenz aus allen Erträgen und Aufwendungen eines Jahres. Ist es negativ, spricht man von einem Fehlbetrag oder Defizit.',
    lang: 'Es setzt sich vor allem aus dem ordentlichen Ergebnis (laufender Betrieb der Stadt) und dem Finanzergebnis (Zinsen, Gewinnausschüttungen von Beteiligungen) zusammen. Ein Fehlbetrag verringert das Eigenkapital der Stadt: zuerst die Ausgleichsrücklage, danach die allgemeine Rücklage.',
    siehe: ['ergebnisplan', 'ausgleichsruecklage', 'haushaltssicherungskonzept'],
  },
  ertraege: {
    begriff: 'Erträge',
    kurz: 'Erträge sind alles, was der Stadt in einem Jahr an Werten zufließt, etwa Steuern, Zuweisungen vom Land oder Gebühren. Sie stehen im Ergebnisplan.',
    lang: 'Nicht jeder Ertrag bringt im selben Jahr Geld in die Kasse. Hat die Stadt zum Beispiel für einen Neubau Fördergeld bekommen, bucht sie es verteilt über die Nutzungsdauer als Ertrag, obwohl das Geld schon früher kam. Die tatsächlichen Geldeingänge zeigt der Finanzplan als Einzahlungen.',
    siehe: ['aufwendungen', 'ergebnisplan', 'einzahlungen-auszahlungen'],
  },
  aufwendungen: {
    begriff: 'Aufwendungen',
    kurz: 'Aufwendungen sind alles, was die Stadt in einem Jahr an Werten verbraucht, etwa für Personal, Sozialleistungen, Sachkosten oder Zuschüsse. Sie stehen im Ergebnisplan.',
    lang: 'Dazu zählen auch Abschreibungen, bei denen kein Geld fließt: Sie verteilen die Kosten eines Gebäudes oder einer Straße auf die Jahre, in denen sie genutzt werden. Die tatsächlichen Zahlungen zeigt der Finanzplan als Auszahlungen.',
    siehe: ['ertraege', 'ergebnisplan', 'einzahlungen-auszahlungen'],
  },
  'einzahlungen-auszahlungen': {
    begriff: 'Einzahlungen und Auszahlungen',
    kurz: 'Einzahlungen und Auszahlungen sind Geld, das tatsächlich in die Stadtkasse fließt oder sie verlässt. Sie stehen im Finanzplan.',
    lang: 'Von Erträgen und Aufwendungen unterscheiden sie sich vor allem im Zeitpunkt. Kauft die Stadt ein Feuerwehrauto, ist der Kaufpreis sofort eine Auszahlung. Als Aufwand erscheint er dagegen über viele Jahre verteilt als Abschreibung.',
    siehe: ['finanzplan', 'ertraege', 'aufwendungen'],
  },
  investitionen: {
    begriff: 'Investitionen',
    kurz: 'Investitionen sind Ausgaben für Dinge, die viele Jahre genutzt werden, etwa Schulgebäude, Straßen oder Fahrzeuge. Sie stehen im Finanzplan, die einzelnen Vorhaben als Investitionsmaßnahmen.',
    lang: 'Im Ergebnisplan tauchen sie nicht auf einmal auf, sondern verteilt über die Nutzungsdauer als Abschreibungen. Bezahlt werden Investitionen oft zum Teil mit Krediten oder mit Fördergeld von Land und Bund.',
    siehe: ['finanzplan', 'einzahlungen-auszahlungen'],
  },
  produktbereich: {
    begriff: 'Produktbereich',
    kurz: 'Ein Produktbereich fasst verwandte Aufgaben der Stadt zusammen, zum Beispiel Schulträgeraufgaben oder Kultur und Wissenschaft. Die 17 Produktbereiche gibt das Land NRW allen Kommunen einheitlich vor.',
    lang: 'Sie sind die oberste Gliederungsebene des Haushalts. Jeder Produktbereich hat einen eigenen Teilergebnisplan und Teilfinanzplan und ist in Produktgruppen unterteilt.',
    siehe: ['produktgruppe', 'produkt'],
  },
  produktgruppe: {
    begriff: 'Produktgruppe',
    kurz: 'Eine Produktgruppe ist die mittlere Gliederungsebene des Haushalts, etwa die Kindertagesbetreuung. Mehrere Produktgruppen bilden einen Produktbereich.',
    lang: 'Im Münsteraner Haushaltsplan hat jede Produktgruppe eigene Ziele und Kennzahlen sowie einen eigenen Teilergebnisplan und Teilfinanzplan. Viele Zahlen in dieser App sind deshalb nach Produktgruppen aufgeschlüsselt.',
    siehe: ['produktbereich', 'produkt'],
  },
  produkt: {
    begriff: 'Produkt',
    kurz: 'Ein Produkt ist die kleinste Einheit im Haushalt: eine bestimmte Leistung der Stadt, etwa das Meldewesen oder die Musikschule. Mehrere Produkte bilden eine Produktgruppe.',
    siehe: ['produktgruppe', 'produktbereich'],
  },
  stellenplan: {
    begriff: 'Stellenplan',
    kurz: 'Der Stellenplan legt fest, wie viele Stellen die Stadt für Beamtinnen, Beamte und Tarifbeschäftigte haben darf. Er gehört zum Haushaltsplan und ist für die Verwaltung verbindlich.',
    lang: 'Er zählt Stellen, keine Personen: Eine Stelle kann unbesetzt sein, und eine volle Stelle kann auf zwei Teilzeitkräfte verteilt sein. Angegeben werden die Stellen in Vollzeitäquivalenten.',
    siehe: ['vzae', 'beamte', 'tarifbeschaeftigte'],
  },
  vzae: {
    begriff: 'Vollzeitäquivalent',
    abkuerzung: 'VZÄ',
    kurz: 'Ein Vollzeitäquivalent (VZÄ) entspricht einer vollen Stelle. Zwei halbe Stellen ergeben zusammen 1,0 VZÄ.',
    lang: 'So lassen sich Stellen vergleichen, egal ob sie in Vollzeit oder Teilzeit besetzt sind. Wie viele Menschen tatsächlich bei der Stadt arbeiten, lässt sich daraus nicht ablesen.',
    siehe: ['stellenplan'],
  },
  beamte: {
    begriff: 'Beamtinnen und Beamte',
    kurz: 'Beamtinnen und Beamte stehen in einem besonderen Dienst- und Treueverhältnis zur Stadt. Ihre Bezahlung (Besoldung) regelt das Land NRW per Gesetz, in Besoldungsgruppen wie A 9 oder A 13.',
    lang: 'Sie dürfen nicht streiken und sind meist auf Lebenszeit ernannt. Im Ruhestand zahlt ihnen der Dienstherr eine Pension. Für diese späteren Zahlungen bildet die Stadt Rückstellungen. Sie stehen in der Bilanz, ihre jährliche Zuführung als Aufwand im Ergebnisplan.',
    siehe: ['tarifbeschaeftigte', 'stellenplan'],
  },
  tarifbeschaeftigte: {
    begriff: 'Tarifbeschäftigte',
    kurz: 'Tarifbeschäftigte arbeiten mit einem Arbeitsvertrag bei der Stadt. Ihre Bezahlung richtet sich nach dem Tarifvertrag für den öffentlichen Dienst (TVöD) der kommunalen Arbeitgeber.',
    lang: 'Der TVöD kennt Entgeltgruppen wie E 9 und darin Erfahrungsstufen. Für den Sozial- und Erziehungsdienst gibt es eigene S-Gruppen, für die Pflege eigene P-Gruppen.',
    siehe: ['beamte', 'stellenplan'],
  },
  zuschuss: {
    begriff: 'Zuschuss',
    kurz: 'Ein Zuschuss, auch Zuwendung genannt, ist Geld, das die Stadt anderen gibt, ohne dafür direkt eine Leistung zu kaufen, etwa Vereinen, Verbänden oder freien Trägern.',
    lang: 'Manche Zuschüsse muss die Stadt zahlen, weil ein Gesetz es verlangt, zum Beispiel für Kitas freier Träger. Andere sind freiwillig, über sie entscheidet der Rat selbst. Eine Übersicht steht im Zuschussbericht des Haushaltsplans.',
    siehe: ['freiwillige-leistung', 'pflichtaufgabe'],
  },
  pflichtaufgabe: {
    begriff: 'Pflichtaufgabe',
    kurz: 'Pflichtaufgaben muss die Stadt erfüllen, weil ein Gesetz es vorschreibt, zum Beispiel Sozialhilfe, Kitaplätze oder die Feuerwehr.',
    lang: 'Manchmal schreibt das Gesetz nur vor, dass es eine Leistung geben muss (pflichtig „dem Grunde nach“), manchmal auch, wie hoch sie ist („der Höhe nach“). Ein großer Teil des städtischen Haushalts ist so gebunden. Spielraum hat der Rat vor allem bei den freiwilligen Leistungen.',
    siehe: ['freiwillige-leistung', 'zuschuss'],
  },
  'freiwillige-leistung': {
    begriff: 'Freiwillige Leistung',
    kurz: 'Freiwillige Leistungen erbringt die Stadt, ohne dass ein Gesetz sie verlangt, etwa Zuschüsse für Kultur, Sport oder Vereine. Über sie entscheidet der Rat selbst.',
    lang: 'Muss eine Stadt sparen, geraten freiwillige Leistungen oft als Erstes unter Druck. Während einer Haushaltssperre oder unter einem Haushaltssicherungskonzept sind neue freiwillige Leistungen meist nur eingeschränkt möglich.',
    siehe: ['pflichtaufgabe', 'zuschuss', 'haushaltssperre'],
  },
  schluesselzuweisungen: {
    begriff: 'Schlüsselzuweisungen',
    kurz: 'Schlüsselzuweisungen sind Geld vom Land NRW, das die Kommunen frei verwenden dürfen. Wie viel eine Stadt bekommt, berechnet das Land jedes Jahr nach dem Gemeindefinanzierungsgesetz (GFG).',
    lang: 'Vereinfacht vergleicht die Berechnung, was eine Kommune für ihre Aufgaben braucht, mit dem, was sie selbst an Steuern einnehmen kann. Je höher die eigene Steuerkraft, desto weniger Schlüsselzuweisungen gibt es. Die endgültigen Beträge stehen oft erst fest, nachdem der Rat den Haushalt beschlossen hat.',
    siehe: ['ertraege', 'haushaltssperre'],
  },
  haushaltssperre: {
    begriff: 'Haushaltssperre',
    kurz: 'Mit einer Haushaltssperre stoppt die Stadt vorübergehend Ausgaben, die im Haushaltsplan eigentlich vorgesehen sind. Sie wird verhängt, wenn sich die Finanzlage deutlich verschlechtert.',
    lang: 'Weiter bezahlt wird, wozu die Stadt rechtlich verpflichtet ist, etwa Gehälter, Sozialleistungen und laufende Verträge. Neue freiwillige Ausgaben und Vorhaben, die noch nicht begonnen haben, werden in der Regel zurückgestellt.',
    siehe: ['freiwillige-leistung', 'pflichtaufgabe', 'haushalt'],
  },
  ausgleichsruecklage: {
    begriff: 'Ausgleichsrücklage',
    kurz: 'Die Ausgleichsrücklage ist ein Polster im Eigenkapital der Stadt, aus dem sie Fehlbeträge im Ergebnisplan decken darf. Solange sie reicht, gilt der Haushalt rechtlich als ausgeglichen.',
    lang: 'Gebildet wird sie aus Überschüssen früherer Jahre. Ist sie aufgebraucht, muss die Stadt die allgemeine Rücklage angreifen, und das muss die Aufsichtsbehörde genehmigen. Schrumpft die allgemeine Rücklage zu stark, wird ein Haushaltssicherungskonzept nötig.',
    siehe: ['jahresergebnis', 'haushaltssicherungskonzept'],
  },
  nkf: {
    begriff: 'Neues Kommunales Finanzmanagement',
    abkuerzung: 'NKF',
    kurz: 'Das NKF ist das Rechnungswesen der Kommunen in NRW. Es lehnt sich an die doppelte Buchführung von Unternehmen an und hat die frühere Kameralistik abgelöst.',
    lang: 'Seit spätestens 2009 wenden alle Kommunen in NRW es an. Der Haushalt zeigt dadurch auch den Werteverzehr, etwa die Abnutzung von Gebäuden, und die Stadt führt eine Bilanz mit Vermögen und Schulden.',
    siehe: ['ergebnisplan', 'finanzplan'],
  },
  haushaltssicherungskonzept: {
    begriff: 'Haushaltssicherungskonzept',
    abkuerzung: 'HSK',
    kurz: 'Ein Haushaltssicherungskonzept muss eine Kommune aufstellen, wenn Fehlbeträge ihre Rücklagen stark schrumpfen lassen. Darin legt sie fest, wie sie den Haushalt innerhalb einer gesetzlichen Frist wieder ausgleicht.',
    lang: 'In NRW ist das zum Beispiel der Fall, wenn die allgemeine Rücklage in einem Jahr um mehr als ein Viertel sinkt. Das Konzept muss die Aufsichtsbehörde genehmigen. Solange es gilt, hat die Kommune weniger Spielraum, vor allem bei freiwilligen Leistungen.',
    siehe: ['ausgleichsruecklage', 'jahresergebnis', 'freiwillige-leistung'],
  },
} as const satisfies Record<string, Begriff>

export type BegriffId = keyof typeof GLOSSAR

/**
 * Eintrag zu einer ID. Der Rückgabetyp lässt vue-tsc zugleich jeden
 * `siehe`-Verweis gegen die vorhandenen IDs prüfen.
 */
export function eintrag(id: BegriffId): Begriff & { siehe?: readonly BegriffId[] } {
  return GLOSSAR[id]
}

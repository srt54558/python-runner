export type Lesson = {
	id: string;
	group: string;
	title: string;
	text: string;
	code: string;
	output?: string;
	keywords: string[];
	filename?: string;
};

export const LESSONS: Lesson[] = [
	{
		id: 'ausgabe',
		group: 'Erste Schritte',
		title: 'Ausgabe',
		text: 'print zeigt Text und Werte an. Mehrere Werte in einem Aufruf stehen mit einem Leerzeichen dazwischen.',
		code: 'print("Hallo")\nprint("Summe", 2 + 3)',
		output: 'Hallo\nSumme 5',
		keywords: ['print', 'ausgabe', 'hello', 'hallo', 'anzeigen']
	},
	{
		id: 'kommentare',
		group: 'Erste Schritte',
		title: 'Kommentare',
		text: 'Alles hinter # ignoriert Python. So bleibt eine Notiz im Code, ohne dass sie ausgeführt wird.',
		code: '# Das ist eine Notiz\nprint("sichtbar")  # diese Notiz auch',
		output: 'sichtbar',
		keywords: ['kommentar', 'kommentare', 'comment', 'raute', 'notiz']
	},
	{
		id: 'variablen',
		group: 'Erste Schritte',
		title: 'Variablen',
		text: 'Ein Name speichert einen Wert. Du kannst ihn später wieder benutzen. Der Name steht links, der Wert rechts vom Gleichheitszeichen.',
		code: 'name = "Welt"\njahr = 2026\nprint(name, jahr)',
		output: 'Welt 2026',
		keywords: ['variable', 'variablen', 'name', 'zuweisung', 'wert']
	},
	{
		id: 'zahlen',
		group: 'Werte',
		title: 'Zahlen',
		text: 'Ganze Zahlen und Kommazahlen kannst du rechnen. Das Komma schreibt Python mit einem Punkt. * malnimmt, / teilt.',
		code: 'preis = 2.5\nanzahl = 3\nprint(preis * anzahl)',
		output: '7.5',
		keywords: ['zahl', 'zahlen', 'int', 'float', 'rechnen', 'plus', 'mal', 'math']
	},
	{
		id: 'rest',
		group: 'Werte',
		title: 'Rest und Potenz',
		text: '// teilt und streicht die Nachkommastellen. % ist der Rest beim Teilen. ** potenziert, also 2 ** 3 ist 2·2·2.',
		code: 'print(7 // 2)\nprint(7 % 2)\nprint(2 ** 3)',
		output: '3\n1\n8',
		keywords: ['modulo', 'rest', 'potenz', 'division', 'ganzzahldivision', 'prozent']
	},
	{
		id: 'umwandeln',
		group: 'Werte',
		title: 'Umwandeln',
		text: 'int, float und str machen aus einem Wert eine ganze Zahl, eine Kommazahl oder Text. int("3") klappt, int("drei") nicht.',
		code: 'print(int("3") + 1)\nprint(float("2.5"))\nprint(str(10) + " Jahre")',
		output: '4\n2.5\n10 Jahre',
		keywords: ['int', 'float', 'str', 'umwandeln', 'cast', 'konvertieren', 'typ']
	},
	{
		id: 'text',
		group: 'Werte',
		title: 'Text',
		text: 'Text steht in Anführungszeichen. len zählt die Zeichen, [0] nimmt das erste. upper macht Großbuchstaben.',
		code: 'wort = "Python"\nprint(len(wort))\nprint(wort[0])\nprint(wort.upper())',
		output: '6\nP\nPYTHON',
		keywords: ['string', 'str', 'text', 'zeichen', 'len', 'upper']
	},
	{
		id: 'einsetzen',
		group: 'Werte',
		title: 'Werte einsetzen',
		text: 'Ein f vor den Anführungszeichen setzt Werte in den Text. In den geschweiften Klammern steht ein Name oder eine Rechnung.',
		code: 'name = "Ada"\njahr = 1815\nprint(f"{name} wurde {jahr} geboren")\nprint(f"Doppelt: {2 * 21}")',
		output: 'Ada wurde 1815 geboren\nDoppelt: 42',
		keywords: ['f-string', 'fstring', 'format', 'interpolation', 'einsetzen', 'geschweift']
	},
	{
		id: 'zerlegen',
		group: 'Werte',
		title: 'Text zerlegen',
		text: 'split schneidet Text an einem Trennzeichen. join setzt die Teile wieder zusammen. replace tauscht ein Stück aus.',
		code: 'teile = "a,b,c".split(",")\nprint(teile)\nprint(" ".join(teile))\nprint("Hallo Welt".replace("Welt", "Python"))',
		output: "['a', 'b', 'c']\na b c\nHallo Python",
		keywords: ['split', 'join', 'replace', 'zerlegen', 'trennen', 'ersetzen', 'string']
	},
	{
		id: 'zeilen',
		group: 'Werte',
		title: 'Zeilenumbrüche',
		text: '\\n beginnt eine neue Zeile, \\t einen großen Abstand. Drei Anführungszeichen hintereinander erlauben mehrere Zeilen im Text.',
		code: 'print("erste\\nzweite")\nprint("""Zeile 1\nZeile 2""")',
		output: 'erste\nzweite\nZeile 1\nZeile 2',
		keywords: ['escape', 'newline', 'zeilenumbruch', 'tabulator', 'mehrzeilig', 'sonderzeichen']
	},
	{
		id: 'wahrheit',
		group: 'Werte',
		title: 'Wahr und falsch',
		text: 'True und False sind eigene Werte. Vergleiche wie > oder == ergeben ebenfalls wahr oder falsch.',
		code: 'warm = True\nprint(warm)\nprint(3 > 1)\nprint("a" == "b")',
		output: 'True\nTrue\nFalse',
		keywords: ['bool', 'boolean', 'true', 'false', 'wahr', 'falsch', 'vergleich']
	},
	{
		id: 'entscheidungen',
		group: 'Ablauf',
		title: 'Entscheidungen',
		text: 'if führt den eingerückten Block nur aus, wenn die Bedingung wahr ist. else ist der andere Fall. Die Einrückung ist meist vier Leerzeichen.',
		code: 'punkte = 12\nif punkte >= 10:\n    print("geschafft")\nelse:\n    print("noch nicht")',
		output: 'geschafft',
		keywords: ['if', 'else', 'bedingung', 'einrücken', 'indent', 'entscheidung']
	},
	{
		id: 'faelle',
		group: 'Ablauf',
		title: 'Mehrere Fälle',
		text: 'elif prüft den nächsten Fall, wenn der vorige nicht zutraf. and verlangt beides, or eines von beiden, not dreht wahr und falsch um.',
		code: 'note = 2\nif note == 1:\n    print("sehr gut")\nelif note == 2:\n    print("gut")\nelse:\n    print("andere Note")\n\nprint(True and False)\nprint(not False)',
		output: 'gut\nFalse\nTrue',
		keywords: ['elif', 'and', 'or', 'not', 'sonst', 'logisch', 'bedingung']
	},
	{
		id: 'schleifen',
		group: 'Ablauf',
		title: 'Schleifen',
		text: 'for wiederholt einen Block für jedes Element. range(3) liefert 0, 1 und 2. while wiederholt, solange die Bedingung wahr ist.',
		code: 'for zahl in range(3):\n    print(zahl)\n\nn = 0\nwhile n < 2:\n    print("nochmal")\n    n = n + 1',
		output: '0\n1\n2\nnochmal\nnochmal',
		keywords: ['for', 'while', 'schleife', 'loop', 'range', 'wiederholen']
	},
	{
		id: 'abbruch',
		group: 'Ablauf',
		title: 'Abbrechen',
		text: 'break beendet die Schleife sofort. continue springt zum nächsten Durchlauf und lässt den Rest dieses Durchlaufs aus.',
		code: 'for zahl in [1, 2, 3, 4]:\n    if zahl == 2:\n        continue\n    if zahl == 4:\n        break\n    print(zahl)',
		output: '1\n3',
		keywords: ['break', 'continue', 'abbrechen', 'überspringen', 'ueberspringen', 'schleife']
	},
	{
		id: 'enthalten',
		group: 'Ablauf',
		title: 'Enthalten',
		text: 'in prüft, ob ein Wert in einem Text, einer Liste oder einem Wörterbuch steckt. not in ist das Gegenteil.',
		code: 'print("Py" in "Python")\nprint(2 in [1, 2, 3])\nprint("a" not in {"b": 1})',
		output: 'True\nTrue\nTrue',
		keywords: ['enthalten', 'membership', 'not in', 'suchen', 'vorhanden']
	},
	{
		id: 'listen',
		group: 'Sammlungen',
		title: 'Listen',
		text: 'Eine Liste hält mehrere Werte in einer Reihenfolge. [0] ist der erste Eintrag. append hängt einen Wert hinten an.',
		code: 'farben = ["rot", "blau"]\nfarben.append("grün")\nprint(farben[0])\nprint(len(farben))',
		output: 'rot\n3',
		keywords: ['liste', 'listen', 'list', 'array', 'append', 'index']
	},
	{
		id: 'ausschnitte',
		group: 'Sammlungen',
		title: 'Ausschnitte',
		text: '[1:4] beginnt beim zweiten Eintrag und hört vor dem fünften auf. [:2] nimmt den Anfang, [-1] den letzten. Eine Lücke lässt den Rest weg.',
		code: 'wort = "Python"\nprint(wort[1:4])\nprint(wort[:2])\nzahlen = [10, 20, 30, 40]\nprint(zahlen[-1])',
		output: 'yth\nPy\n40',
		keywords: ['slice', 'ausschnitt', 'teil', 'anfang', 'letzter', 'substring']
	},
	{
		id: 'kopien',
		group: 'Sammlungen',
		title: 'Kopien',
		text: 'Zwei Namen können dieselbe Liste meinen. append siehst du dann an beiden. copy legt eine eigene Liste an.',
		code: 'original = [1, 2]\ngleich = original\ngleich.append(3)\nprint("gleich", original)\n\neigen = original.copy()\neigen.append(4)\nprint("eigen", original)',
		output: 'gleich [1, 2, 3]\neigen [1, 2, 3]',
		keywords: ['copy', 'kopie', 'kopien', 'alias', 'referenz', 'veränderlich']
	},
	{
		id: 'tupel',
		group: 'Sammlungen',
		title: 'Tupel',
		text: 'Ein Tupel ist eine feste Reihenfolge in runden Klammern. Du kannst die Werte direkt auf mehrere Namen verteilen, auch zum Tauschen.',
		code: 'punkt = (3, 4)\nx, y = punkt\nprint(x, y)\n\na, b = 1, 2\na, b = b, a\nprint(a, b)',
		output: '3 4\n2 1',
		keywords: ['tuple', 'tupel', 'auspacken', 'unpack', 'tauschen', 'paar']
	},
	{
		id: 'mengen',
		group: 'Sammlungen',
		title: 'Mengen',
		text: 'Eine Menge hält jeden Wert nur einmal. | vereinigt zwei Mengen, & behält nur die Werte, die in beiden stecken.',
		code: 'a = {1, 2, 2, 3}\nb = {3, 4}\nprint(sorted(a))\nprint(sorted(a | b))\nprint(sorted(a & b))',
		output: '[1, 2, 3]\n[1, 2, 3, 4]\n[3]',
		keywords: ['set', 'menge', 'mengen', 'eindeutig', 'vereinigung', 'schnittmenge']
	},
	{
		id: 'woerterbuecher',
		group: 'Sammlungen',
		title: 'Wörterbücher',
		text: 'Ein Wörterbuch speichert Werte unter einem Namen. Du liest sie mit dem Schlüssel in eckigen Klammern.',
		code: 'person = {"name": "Ada", "jahr": 1815}\nprint(person["name"])',
		output: 'Ada',
		keywords: ['dict', 'dictionary', 'wörterbuch', 'woerterbuch', 'schlüssel', 'key', 'map']
	},
	{
		id: 'nachschlagen',
		group: 'Sammlungen',
		title: 'Nachschlagen',
		text: 'get gibt einen Ersatz, wenn der Schlüssel fehlt, statt abzubrechen. items geht Schlüssel und Wert der Reihe nach durch.',
		code: 'person = {"name": "Ada"}\nprint(person.get("name"))\nprint(person.get("stadt", "unbekannt"))\nfor schluessel, wert in person.items():\n    print(schluessel, wert)',
		output: 'Ada\nunbekannt\nname Ada',
		keywords: ['get', 'items', 'keys', 'nachschlagen', 'fehlt', 'standardwert']
	},
	{
		id: 'verschachtelt',
		group: 'Sammlungen',
		title: 'Verschachtelt',
		text: 'Listen und Wörterbücher können wieder Listen und Wörterbücher enthalten. Jede Klammer geht eine Ebene tiefer.',
		code: 'gruppe = {"ada": [1, 2], "grace": [3]}\nprint(gruppe["ada"][1])\nfor name, zahlen in gruppe.items():\n    print(name, sum(zahlen))',
		output: '2\nada 3\ngrace 3',
		keywords: ['nested', 'verschachtelt', 'ebene', 'struktur', 'innen']
	},
	{
		id: 'kurz',
		group: 'Sammlungen',
		title: 'Kurz schreiben',
		text: 'In eckigen Klammern baust du eine neue Liste aus einer Schleife. if am Ende lässt Werte weg, die nicht passen.',
		code: 'quadrate = [n * n for n in [1, 2, 3]]\ngerade = [n for n in [1, 2, 3, 4] if n % 2 == 0]\nprint(quadrate)\nprint(gerade)',
		output: '[1, 4, 9]\n[2, 4]',
		keywords: ['comprehension', 'kurzschrift', 'generieren', 'filtern', 'list comprehension']
	},
	{
		id: 'mitzaehlen',
		group: 'Sammlungen',
		title: 'Mitzählen',
		text: 'enumerate gibt zu jedem Eintrag auch seine Position, beginnend bei 0. zip legt zwei Listen nebeneinander.',
		code: 'namen = ["Ada", "Grace"]\nfor stelle, name in enumerate(namen):\n    print(stelle, name)\n\nfor a, b in zip([1, 2], ["a", "b"]):\n    print(a, b)',
		output: '0 Ada\n1 Grace\n1 a\n2 b',
		keywords: ['enumerate', 'zip', 'position', 'mitzählen', 'mitzaehlen', 'paar']
	},
	{
		id: 'sortieren',
		group: 'Sammlungen',
		title: 'Sortieren',
		text: 'sorted gibt eine neue, sortierte Liste zurück und lässt die alte in Ruhe. min, max und sum fassen alle Werte zusammen. key sagt, wonach sortiert wird.',
		code: 'werte = [3, 1, 2]\nprint(sorted(werte))\nprint(min(werte), max(werte), sum(werte))\nprint(sorted(["bb", "a"], key=len))',
		output: "[1, 2, 3]\n1 3 6\n['a', 'bb']",
		keywords: ['sorted', 'sort', 'sortieren', 'min', 'max', 'sum', 'key']
	},
	{
		id: 'funktionen',
		group: 'Funktionen',
		title: 'Funktionen',
		text: 'def legt eine Funktion an. return gibt einen Wert zurück. Danach rufst du sie mit Klammern auf.',
		code: 'def gruss(name):\n    return "Hallo, " + name\n\nprint(gruss("Ada"))',
		output: 'Hallo, Ada',
		keywords: ['def', 'function', 'funktion', 'return', 'aufruf']
	},
	{
		id: 'standard',
		group: 'Funktionen',
		title: 'Standardwerte',
		text: 'Ein Parameter kann einen Wert mitbringen. Beim Aufruf darfst du ihn weglassen. Ein Name vor dem Wert macht klar, welcher Parameter gemeint ist.',
		code: 'def gruss(name, zeichen="!"):\n    return "Hallo " + name + zeichen\n\nprint(gruss("Ada"))\nprint(gruss("Ada", zeichen="?"))',
		output: 'Hallo Ada!\nHallo Ada?',
		keywords: ['default', 'standardwert', 'parameter', 'argument', 'keyword', 'optional']
	},
	{
		id: 'nichts',
		group: 'Funktionen',
		title: 'Nichts',
		text: 'None heißt: hier ist kein Wert. Eine Funktion ohne return gibt None zurück. is prüft, ob es genau dieser Wert ist.',
		code: 'def leer():\n    return\n\nwert = None\nprint(wert is None)\nprint(leer() is None)',
		output: 'True\nTrue',
		keywords: ['none', 'null', 'nichts', 'is', 'leer']
	},
	{
		id: 'lambda',
		group: 'Funktionen',
		title: 'Kurze Funktionen',
		text: 'lambda ist eine Funktion für einen einzigen Ausdruck, ohne def und ohne Namen. Oft gibst du sie direkt an sorted weiter.',
		code: 'doppelt = lambda n: n * 2\nprint(doppelt(4))\nprint(sorted(["ccc", "a"], key=lambda wort: len(wort)))',
		output: "8\n['a', 'ccc']",
		keywords: ['lambda', 'anonym', 'ausdruck', 'callback']
	},
	{
		id: 'alle',
		group: 'Funktionen',
		title: 'Alle oder eines',
		text: 'any ist wahr, sobald ein Wert wahr ist. all nur, wenn jeder Wert wahr ist. Leere Sammlungen machen any falsch und all wahr.',
		code: 'print(any([False, True]))\nprint(all([True, True]))\nprint(all([True, False]))',
		output: 'True\nTrue\nFalse',
		keywords: ['any', 'all', 'irgendeins', 'jeder', 'prüfen']
	},
	{
		id: 'module',
		group: 'Funktionen',
		title: 'Module',
		text: 'import holt fertige Werkzeuge. Danach steht der Modulname vor dem Punkt. from nimmt einen einzelnen Namen direkt herüber.',
		code: 'import math\nfrom random import Random\n\nprint(math.sqrt(16))\nprint(Random(1).randint(1, 6))',
		output: '4.0\n2',
		keywords: ['import', 'modul', 'module', 'math', 'random', 'bibliothek', 'from']
	},
	{
		id: 'klassen',
		group: 'Funktionen',
		title: 'Klassen',
		text: 'class beschreibt eine eigene Art von Wert. __init__ setzt die Anfangswerte. self ist das jeweilige Exemplar, Methoden sind seine Funktionen.',
		code: 'class Konto:\n    def __init__(self, stand):\n        self.stand = stand\n\n    def einzahlen(self, betrag):\n        self.stand = self.stand + betrag\n\nkonto = Konto(10)\nkonto.einzahlen(5)\nprint(konto.stand)',
		output: '15',
		keywords: ['class', 'klasse', 'objekt', 'oop', 'self', 'init', 'methode']
	},
	{
		id: 'dateien',
		group: 'Funktionen',
		title: 'Dateien',
		text: 'with open öffnet eine Datei und schließt sie danach. "w" schreibt sie neu, ohne "w" wird gelesen. Sie landet nicht in deinen Projekt-Dateien.',
		code: 'with open("notiz.txt", "w", encoding="utf-8") as datei:\n    datei.write("Hallo Datei")\n\nwith open("notiz.txt", encoding="utf-8") as datei:\n    print(datei.read())',
		output: 'Hallo Datei',
		keywords: ['datei', 'dateien', 'file', 'open', 'with', 'lesen', 'schreiben', 'encoding']
	},
	{
		id: 'fehler',
		group: 'Funktionen',
		title: 'Fehler',
		text: 'Wenn etwas schiefgeht, stoppt Python und nennt den Fehler. try versucht den Block, except fängt eine bestimmte Art von Fehler ab.',
		code: 'try:\n    zahl = int("drei")\n    print(zahl)\nexcept ValueError:\n    print("Das ist keine Zahl")',
		output: 'Das ist keine Zahl',
		keywords: ['error', 'fehler', 'exception', 'try', 'except', 'valueerror', 'traceback']
	},
	{
		id: 'werfen',
		group: 'Funktionen',
		title: 'Fehler werfen',
		text: 'raise löst selbst einen Fehler aus, wenn ein Wert nicht erlaubt ist. except kann ihn fangen und die Meldung lesen.',
		code: 'def positiv(n):\n    if n < 0:\n        raise ValueError("nur positive Zahlen")\n    return n\n\ntry:\n    print(positiv(-1))\nexcept ValueError as fehler:\n    print(fehler)',
		output: 'nur positive Zahlen',
		keywords: ['raise', 'werfen', 'auslösen', 'ausloesen', 'valueerror', 'meldung']
	}
];

export function lessonMatches(lesson: Lesson, query: string): boolean {
	const needle = query.trim().toLocaleLowerCase('de-DE');
	if (!needle) return true;
	const haystack = [lesson.group, lesson.title, lesson.text, lesson.code, ...lesson.keywords]
		.join('\n')
		.toLocaleLowerCase('de-DE');
	return haystack.includes(needle);
}

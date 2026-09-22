export type Lesson = {
	id: string;
	title: string;
	text: string;
	code: string;
	keywords: string[];
};

export const LESSONS: Lesson[] = [
	{
		id: 'ausgabe',
		title: 'Ausgabe',
		text: 'print zeigt Text und Werte an. Mehrere Werte in einem Aufruf stehen mit einem Leerzeichen dazwischen.',
		code: 'print("Hallo")\nprint("Summe", 2 + 3)',
		keywords: ['print', 'ausgabe', 'hello', 'hallo', 'anzeigen']
	},
	{
		id: 'variablen',
		title: 'Variablen',
		text: 'Ein Name speichert einen Wert. Du kannst ihn später wieder benutzen. Der Name steht links, der Wert rechts vom Gleichheitszeichen.',
		code: 'name = "Welt"\njahr = 2026\nprint(name, jahr)',
		keywords: ['variable', 'variablen', 'name', 'zuweisung', 'wert']
	},
	{
		id: 'zahlen',
		title: 'Zahlen',
		text: 'Ganze Zahlen und Kommazahlen kannst du rechnen. Das Komma schreibt Python mit einem Punkt. * malnimmt, / teilt.',
		code: 'preis = 2.5\nanzahl = 3\nprint(preis * anzahl)',
		keywords: ['zahl', 'zahlen', 'int', 'float', 'rechnen', 'plus', 'mal', 'math']
	},
	{
		id: 'text',
		title: 'Text',
		text: 'Text steht in Anführungszeichen. len zählt die Zeichen, [0] nimmt das erste. upper macht Großbuchstaben.',
		code: 'wort = "Python"\nprint(len(wort))\nprint(wort[0])\nprint(wort.upper())',
		keywords: ['string', 'str', 'text', 'zeichen', 'len', 'upper']
	},
	{
		id: 'wahrheit',
		title: 'Wahr und falsch',
		text: 'True und False sind eigene Werte. Vergleiche wie > oder == ergeben ebenfalls wahr oder falsch.',
		code: 'warm = True\nprint(warm)\nprint(3 > 1)\nprint("a" == "b")',
		keywords: ['bool', 'boolean', 'true', 'false', 'wahr', 'falsch', 'vergleich']
	},
	{
		id: 'entscheidungen',
		title: 'Entscheidungen',
		text: 'if führt den eingerückten Block nur aus, wenn die Bedingung wahr ist. else ist der andere Fall. Die Einrückung ist meist vier Leerzeichen.',
		code: 'punkte = 12\nif punkte >= 10:\n    print("geschafft")\nelse:\n    print("noch nicht")',
		keywords: ['if', 'else', 'bedingung', 'einrücken', 'indent', 'entscheidung']
	},
	{
		id: 'schleifen',
		title: 'Schleifen',
		text: 'for wiederholt einen Block für jedes Element. range(3) liefert 0, 1 und 2. while wiederholt, solange die Bedingung wahr ist.',
		code: 'for zahl in range(3):\n    print(zahl)\n\nn = 0\nwhile n < 2:\n    print("nochmal")\n    n = n + 1',
		keywords: ['for', 'while', 'schleife', 'loop', 'range', 'wiederholen']
	},
	{
		id: 'listen',
		title: 'Listen',
		text: 'Eine Liste hält mehrere Werte in einer Reihenfolge. [0] ist der erste Eintrag. append hängt einen Wert hinten an.',
		code: 'farben = ["rot", "blau"]\nfarben.append("grün")\nprint(farben[0])\nprint(len(farben))',
		keywords: ['liste', 'listen', 'list', 'array', 'append', 'index']
	},
	{
		id: 'woerterbuecher',
		title: 'Wörterbücher',
		text: 'Ein Wörterbuch speichert Werte unter einem Namen. Du liest sie mit dem Schlüssel in eckigen Klammern.',
		code: 'person = {"name": "Ada", "jahr": 1815}\nprint(person["name"])',
		keywords: ['dict', 'dictionary', 'wörterbuch', 'woerterbuch', 'schlüssel', 'key', 'map']
	},
	{
		id: 'funktionen',
		title: 'Funktionen',
		text: 'def legt eine Funktion an. return gibt einen Wert zurück. Danach rufst du sie mit Klammern auf.',
		code: 'def gruss(name):\n    return "Hallo, " + name\n\nprint(gruss("Ada"))',
		keywords: ['def', 'function', 'funktion', 'return', 'aufruf']
	},
	{
		id: 'fehler',
		title: 'Fehler',
		text: 'Wenn etwas schiefgeht, stoppt Python und nennt den Fehler. try versucht den Block, except fängt eine bestimmte Art von Fehler ab.',
		code: 'try:\n    zahl = int("drei")\n    print(zahl)\nexcept ValueError:\n    print("Das ist keine Zahl")',
		keywords: ['error', 'fehler', 'exception', 'try', 'except', 'valueerror', 'traceback']
	}
];

export function lessonMatches(lesson: Lesson, query: string): boolean {
	const needle = query.trim().toLocaleLowerCase('de-DE');
	if (!needle) return true;
	const haystack = [lesson.title, lesson.text, lesson.code, ...lesson.keywords]
		.join('\n')
		.toLocaleLowerCase('de-DE');
	return haystack.includes(needle);
}

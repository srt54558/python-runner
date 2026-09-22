import { lessonMatches, type Lesson } from './lessons';

export const WEB_LESSONS: Lesson[] = [
	{
		id: 'html-seite',
		group: 'HTML',
		title: 'Gerüst',
		text: 'Jede Seite beginnt mit dem Dokumenttyp, dann html, darin head und body. head trägt Angaben über die Seite, body das, was man sieht.',
		code: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Seite</title>
</head>
<body>
  <h1>Hallo</h1>
</body>
</html>`,
		keywords: ['doctype', 'html', 'head', 'body', 'gerüst', 'geruest', 'struktur', 'seite']
	},
	{
		id: 'html-text',
		group: 'HTML',
		title: 'Überschrift und Text',
		text: 'h1 ist die große Überschrift, p ein Absatz. Kleinere Überschriften heißen h2 und h3.',
		code: `<h1>Tagebuch</h1>
<h2>Dienstag</h2>
<p>Heute war es warm.</p>`,
		keywords: ['h1', 'h2', 'überschrift', 'ueberschrift', 'absatz', 'paragraph', 'text', 'p']
	},
	{
		id: 'html-link',
		group: 'HTML',
		title: 'Link',
		text: 'a macht Text zu einem Link. href ist das Ziel. Ein # bleibt auf derselben Seite und springt zur passenden id.',
		code: `<p>Mehr dazu im <a href="#mehr">Abschnitt</a>.</p>
<h2 id="mehr">Mehr</h2>
<p>Hier bist du.</p>`,
		keywords: ['a', 'href', 'link', 'anker', 'id', 'sprung']
	},
	{
		id: 'html-liste',
		group: 'HTML',
		title: 'Liste',
		text: 'ul ist eine Aufzählung, ol eine nummerierte Liste. Jeder Punkt steckt in li.',
		code: `<ul>
  <li>rot</li>
  <li>blau</li>
</ul>
<ol>
  <li>aufstehen</li>
  <li>frühstücken</li>
</ol>`,
		keywords: ['ul', 'ol', 'li', 'liste', 'aufzählung', 'aufzaehlung', 'nummeriert']
	},
	{
		id: 'html-grafik',
		group: 'HTML',
		title: 'Grafik',
		text: 'svg zeichnet Formen direkt in die Seite. figcaption setzt eine Bildunterschrift darunter.',
		code: `<figure>
  <svg role="img" aria-label="oranges Quadrat" width="64" height="64">
    <rect width="64" height="64" fill="#c45c26"></rect>
  </svg>
  <figcaption>Ein Quadrat</figcaption>
</figure>`,
		keywords: ['svg', 'grafik', 'bild', 'figure', 'figcaption', 'rect', 'form']
	},
	{
		id: 'html-button',
		group: 'HTML',
		title: 'Schaltfläche',
		text: 'button ist eine Schaltfläche. type="button" verhindert, dass sie ein Formular abschickt.',
		code: `<button type="button">Klick</button>`,
		keywords: ['button', 'schaltfläche', 'schaltflaeche', 'knopf', 'klick']
	},
	{
		id: 'html-eingabe',
		group: 'HTML',
		title: 'Eingabefeld',
		text: 'input ist ein Feld. label sagt, was hineingehört. Der Text im Feld ist der value.',
		code: `<label>
  Name
  <input value="Ada">
</label>`,
		keywords: ['input', 'label', 'feld', 'eingabe', 'formular', 'value']
	},
	{
		id: 'css-farbe',
		group: 'CSS',
		title: 'Farbe',
		text: 'style setzt Regeln. color färbt den Text, background die Fläche dahinter.',
		code: `<style>
  h1 { color: #c45c26; }
  p { background: #f3e6dc; }
</style>
<h1>Titel</h1>
<p>Text auf einer Fläche.</p>`,
		keywords: ['css', 'style', 'color', 'farbe', 'background', 'hintergrund']
	},
	{
		id: 'css-schrift',
		group: 'CSS',
		title: 'Schrift',
		text: 'font-family wählt die Schrift, font-size die Größe, font-weight die Stärke.',
		code: `<style>
  body { font-family: sans-serif; }
  h1 { font-size: 1.6rem; font-weight: 700; }
</style>
<h1>Groß</h1>
<p>Normaler Text.</p>`,
		keywords: ['font', 'schrift', 'font-size', 'font-family', 'größe', 'groesse', 'fett']
	},
	{
		id: 'css-abstand',
		group: 'CSS',
		title: 'Abstand',
		text: 'margin ist der Abstand nach außen, padding der Abstand innen bis zum Rand.',
		code: `<style>
  p {
    margin: 0;
    padding: 0.7rem;
    background: #f3e6dc;
  }
</style>
<p>Innenabstand</p>`,
		keywords: ['margin', 'padding', 'abstand', 'innen', 'außen', 'aussen']
	},
	{
		id: 'css-rahmen',
		group: 'CSS',
		title: 'Rahmen',
		text: 'border zeichnet einen Rand. border-radius rundet die Ecken.',
		code: `<style>
  p {
    border: 2px solid #c45c26;
    border-radius: 0.4rem;
    padding: 0.5rem 0.7rem;
  }
</style>
<p>Ein Kasten</p>`,
		keywords: ['border', 'rahmen', 'radius', 'ecke', 'rund', 'kasten']
	},
	{
		id: 'css-klasse',
		group: 'CSS',
		title: 'Klasse',
		text: 'Eine Klasse im class-Attribut triffst du mit einem Punkt davor. So gilt die Regel nur für diese Elemente.',
		code: `<style>
  .hinweis { color: #c45c26; font-weight: 700; }
</style>
<p class="hinweis">Wichtig</p>
<p>Normal</p>`,
		keywords: ['class', 'klasse', 'selektor', 'punkt', 'hinweis']
	},
	{
		id: 'css-reihe',
		group: 'CSS',
		title: 'Nebeneinander',
		text: 'display: flex legt Kinder in eine Reihe. gap ist der Abstand zwischen ihnen.',
		code: `<style>
  .reihe { display: flex; gap: 0.5rem; }
  .reihe div { padding: 0.4rem 0.6rem; background: #f3e6dc; }
</style>
<div class="reihe">
  <div>Eins</div>
  <div>Zwei</div>
</div>`,
		keywords: ['flex', 'flexbox', 'reihe', 'nebeneinander', 'gap', 'display']
	},
	{
		id: 'css-hover',
		group: 'CSS',
		title: 'Darüber',
		text: ':hover gilt, solange der Zeiger über dem Element ist.',
		code: `<style>
  button {
    background: #fff;
    border: 1px solid #c45c26;
    padding: 0.4rem 0.7rem;
  }
  button:hover {
    background: #c45c26;
    color: #fff;
  }
</style>
<button type="button">Darüber</button>`,
		keywords: ['hover', 'darüber', 'darueber', 'zeiger', 'maus', 'pseudo']
	},
	{
		id: 'css-datei',
		group: 'CSS',
		title: 'CSS-Datei',
		text: 'Eine CSS-Datei enthält nur die Regeln. Die Seite holt sie mit link und href. Ohne diesen Verweis bleibt die Datei für sich.',
		filename: 'style.css',
		code: `h1 {
  color: #c45c26;
}`,
		keywords: ['datei', 'css', 'link', 'href', 'stylesheet', 'getrennt']
	},
	{
		id: 'js-konsole',
		group: 'JavaScript',
		title: 'Konsole',
		text: 'script führt JavaScript aus. console.log schreibt einen Wert in die Konsole unter der Vorschau.',
		code: `<p>Die Werte stehen unter der Vorschau.</p>
<script>
  console.log("Hallo");
  console.log(2 + 3);
</script>`,
		keywords: ['javascript', 'script', 'console', 'log', 'konsole', 'ausgabe']
	},
	{
		id: 'js-variablen',
		group: 'JavaScript',
		title: 'Variablen',
		text: 'let ist ein Name, den du später ändern darfst. const bleibt, wie er ist. Text steht in Anführungszeichen, Zahlen nicht.',
		code: `<script>
  let name = "Ada";
  const jahr = 1815;
  name = "Grace";
  console.log(name, jahr);
</script>`,
		keywords: ['let', 'const', 'variable', 'variablen', 'name', 'zahl', 'text']
	},
	{
		id: 'js-text',
		group: 'JavaScript',
		title: 'Text ändern',
		text: 'querySelector sucht ein Element. textContent ist der Text darin.',
		code: `<h1 id="titel">Hallo</h1>
<script>
  document.querySelector("#titel").textContent = "Geändert";
</script>`,
		keywords: ['queryselector', 'textcontent', 'dom', 'ändern', 'aendern', 'element']
	},
	{
		id: 'js-klick',
		group: 'JavaScript',
		title: 'Klick',
		text: 'addEventListener("click", ...) reagiert auf einen Klick. Die Funktion in den Klammern läuft dann.',
		code: `<h1 id="titel">Hallo</h1>
<button id="knopf" type="button">Klick</button>
<script>
  document.querySelector("#knopf").addEventListener("click", () => {
    document.querySelector("#titel").textContent = "Geklickt";
    console.log("Geklickt");
  });
</script>`,
		keywords: ['click', 'klick', 'addeventlistener', 'event', 'ereignis', 'funktion']
	},
	{
		id: 'js-if',
		group: 'JavaScript',
		title: 'Entscheidung',
		text: 'if führt den Block nur aus, wenn die Bedingung wahr ist. else ist der andere Fall. >= heißt mindestens.',
		code: `<script>
  let punkte = 12;
  if (punkte >= 10) {
    console.log("geschafft");
  } else {
    console.log("noch nicht");
  }
</script>`,
		keywords: ['if', 'else', 'bedingung', 'entscheidung', 'vergleich']
	},
	{
		id: 'js-schleife',
		group: 'JavaScript',
		title: 'Schleife',
		text: 'for wiederholt einen Block. zahl startet bei 0 und wächst, solange sie kleiner als 3 ist.',
		code: `<script>
  for (let zahl = 0; zahl < 3; zahl = zahl + 1) {
    console.log(zahl);
  }
</script>`,
		keywords: ['for', 'schleife', 'loop', 'wiederholen', 'zähler', 'zaehler']
	},
	{
		id: 'js-funktion',
		group: 'JavaScript',
		title: 'Funktion',
		text: 'function legt eine Funktion an. return gibt einen Wert zurück. Danach rufst du sie mit Klammern auf.',
		code: `<script>
  function gruss(name) {
    return "Hallo, " + name;
  }
  console.log(gruss("Ada"));
</script>`,
		keywords: ['function', 'funktion', 'return', 'aufruf', 'rückgabe', 'rueckgabe']
	},
	{
		id: 'js-feld',
		group: 'JavaScript',
		title: 'Feld auslesen',
		text: 'value liest, was im Feld steht. Ein Klick kann den Text an eine andere Stelle schreiben.',
		code: `<label>
  Name
  <input id="name" value="Ada">
</label>
<button id="zeigen" type="button">Zeigen</button>
<p id="ausgabe"></p>
<script>
  document.querySelector("#zeigen").addEventListener("click", () => {
    let name = document.querySelector("#name").value;
    document.querySelector("#ausgabe").textContent = "Hallo, " + name;
  });
</script>`,
		keywords: ['value', 'input', 'feld', 'auslesen', 'queryselector', 'klick']
	},
	{
		id: 'js-datei',
		group: 'JavaScript',
		title: 'JavaScript-Datei',
		text: 'Eine JavaScript-Datei enthält nur das Programm. Die Seite holt sie mit script und src. Ohne diesen Verweis läuft sie nicht in einer anderen Seite.',
		filename: 'app.js',
		code: 'console.log("Hallo aus der Datei");',
		keywords: ['datei', 'javascript', 'script', 'src', 'getrennt', 'konsole']
	},
	{
		id: 'json-objekt',
		group: 'JSON',
		title: 'Objekt',
		text: 'JSON speichert Daten. Ein Objekt steht in geschweiften Klammern. Jeder Name steht in Anführungszeichen.',
		filename: 'daten.json',
		code: `{
  "name": "Ada",
  "jahr": 1815
}`,
		keywords: ['json', 'objekt', 'daten', 'name', 'wert', 'klammer']
	},
	{
		id: 'json-liste',
		group: 'JSON',
		title: 'Liste',
		text: 'Eine Liste steht in eckigen Klammern. Ein Komma trennt die Einträge.',
		filename: 'liste.json',
		code: '["rot", "blau", "grün"]',
		keywords: ['json', 'liste', 'array', 'komma', 'eckig']
	},
	{
		id: 'xml-element',
		group: 'XML',
		title: 'Element',
		text: 'XML zeichnet Daten mit Markierungen. Ein Element hat einen Anfang und ein Ende mit demselben Namen.',
		filename: 'daten.xml',
		code: '<name>Ada</name>',
		keywords: ['xml', 'element', 'markierung', 'anfang', 'ende', 'tag']
	},
	{
		id: 'xml-attribut',
		group: 'XML',
		title: 'Attribut',
		text: 'Ein Attribut hängt am Anfang des Elements und nennt eine Eigenschaft. Der Wert steht in Anführungszeichen.',
		filename: 'daten.xml',
		code: '<person jahr="1815">Ada</person>',
		keywords: ['xml', 'attribut', 'eigenschaft', 'wert', 'anführungszeichen']
	},
	{
		id: 'md-ueberschrift',
		group: 'Markdown',
		title: 'Überschrift',
		text: 'Eine Raute am Zeilenanfang macht eine Überschrift. Die Zeile darunter ist ein Absatz.',
		filename: 'notiz.md',
		code: `# Tagebuch

Heute war es warm.`,
		keywords: ['markdown', 'md', 'überschrift', 'ueberschrift', 'raute', 'absatz']
	},
	{
		id: 'md-liste',
		group: 'Markdown',
		title: 'Liste',
		text: 'Zwei Sterne machen fett. Ein Strich am Zeilenanfang macht einen Listenpunkt.',
		filename: 'notiz.md',
		code: `**Wichtig**

- rot
- blau`,
		keywords: ['markdown', 'liste', 'fett', 'stern', 'punkt', 'strich']
	},
	{
		id: 'txt-nur',
		group: 'Text',
		title: 'Nur Text',
		text: 'Eine Textdatei speichert Zeichen, sonst nichts. Die Vorschau zeigt sie so, wie sie dastehen.',
		filename: 'notiz.txt',
		code: '... es ist nur text :D',
		keywords: ['txt', 'text', 'zeichen', 'datei', 'easter']
	}
];

export function webLessonMatches(query: string): Lesson[] {
	return WEB_LESSONS.filter((lesson) => lessonMatches(lesson, query));
}

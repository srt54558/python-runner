import { describe, expect, it } from 'vitest';
import { lintWeb } from './web-lint';

describe('web lint', () => {
	it('checks script and style inside html at their own lines', () => {
		const source = `<h1>Hallo</h1>
<script>
const value = ;
</script>
<style>
h1 { colour: red; }
</style>`;
		const issues = lintWeb('seite.html', source);
		const script = issues.find((issue) => issue.code === 'JS');
		const style = issues.find((issue) => issue.message.includes('colour'));
		expect(script?.start_location.row).toBe(3);
		expect(style?.start_location.row).toBe(6);
		expect(style?.code).toBe('CSS');
	});

	it('keeps the html starter free of problems', () => {
		const source = `<!DOCTYPE html>
<html lang="de">
<body>
  <h1>Hallo</h1>
  <button id="knopf">Klick</button>
  <script>
    document.querySelector("#knopf").addEventListener("click", () => {
      document.querySelector("h1").textContent = "Geklickt";
      console.log("Geklickt");
    });
    console.log("Seite geladen");
  </script>
</body>
</html>`;
		expect(lintWeb('seite.html', source)).toEqual([]);
	});

	it('reports an undefined javascript name and an unused binding', () => {
		const issues = lintWeb('app.js', 'const quiet = 1;\nconsole.log(missing);\n');
		expect(issues.map((issue) => issue.message)).toEqual([
			'„missing“ ist nicht definiert.',
			'„quiet“ wird nicht verwendet.'
		]);
		expect(issues[0]?.start_location).toEqual({ row: 2, column: 13 });
		expect(issues[1]?.code).toBe('Hinweis');
	});

	it('reports a css syntax error and a json error', () => {
		expect(lintWeb('style.css', 'h1 { color red }')[0]?.code).toBe('CSS');
		const json = lintWeb('daten.json', '{ "a": }');
		expect(json[0]?.code).toBe('JSON');
		expect(json[0]?.start_location.column).toBeGreaterThan(1);
	});

	it('reports xml and markdown structure', () => {
		expect(lintWeb('note.xml', '<a></b>')[0]?.message).toContain('passt nicht');
		expect(lintWeb('note.md', '```js\nconsole.log(1)\n')[0]?.code).toBe('MD');
		expect(lintWeb('notiz.txt', 'hallo')).toEqual([]);
		expect(lintWeb('leer.js', '   ')).toEqual([]);
	});

	it('flags a mismatched html tag and an inline style', () => {
		const issues = lintWeb('seite.html', '<div style="colour: red"></span>');
		expect(issues.some((issue) => issue.code === 'CSS')).toBe(true);
		expect(issues.some((issue) => issue.message.includes('passt nicht'))).toBe(true);
	});
});

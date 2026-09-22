import { describe, expect, it } from 'vitest';
import { htmlUsingAsset } from './links';

const page = (path: string, content: string) => ({ path, content });

describe('htmlUsingAsset', () => {
	it('ignores a script that the page never loads', () => {
		const files = [page('seite.html', '<h1>Seite</h1>'), page('app.js', 'console.log(1)')];
		expect(htmlUsingAsset(files, 'app.js')).toBeNull();
		expect(htmlUsingAsset(files, 'app.js', 'seite.html')).toBeNull();
	});

	it('uses the page that loads the file, including through another file', () => {
		const files = [
			page('andere.html', '<a href="app.js">nur ein Link</a>'),
			page('seite.html', '<script src="app.js"></script><link rel="stylesheet" href="style.css">'),
			page('style.css', '@import "./extra.css";'),
			page('extra.css', 'h1 { color: red; }'),
			page('app.js', 'import "./lib.js";'),
			page('lib.js', 'console.log(1)')
		];
		expect(htmlUsingAsset(files, 'app.js')).toBe('seite.html');
		expect(htmlUsingAsset(files, 'style.css')).toBe('seite.html');
		expect(htmlUsingAsset(files, 'extra.css')).toBe('seite.html');
		expect(htmlUsingAsset(files, 'lib.js')).toBe('seite.html');
	});

	it('prefers the page that was open when several pages load the same file', () => {
		const files = [
			page('a.html', '<script src="app.js"></script>'),
			page('b.html', '<script src="app.js"></script>')
		];
		expect(htmlUsingAsset(files, 'app.js', 'b.html')).toBe('b.html');
		expect(htmlUsingAsset(files, 'app.js', 'a.html')).toBe('a.html');
	});
});

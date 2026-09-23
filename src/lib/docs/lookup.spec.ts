import { describe, expect, it } from 'vitest';
import { lessonForToken } from './lookup';

describe('lessonForToken', () => {
	it('maps python and html tokens onto their lessons', () => {
		expect(lessonForToken('python', 'def')?.id).toBe('funktionen');
		expect(lessonForToken('python', 'print')?.id).toBe('ausgabe');
		expect(lessonForToken('html', 'p')?.id).toBe('html-text');
		expect(lessonForToken('css', 'color')?.id).toBe('css-farbe');
		expect(lessonForToken('javascript', 'function')?.id).toBe('js-funktion');
	});

	it('stays inside the current language and ignores unknown words', () => {
		expect(lessonForToken('python', 'p')).toBeNull();
		expect(lessonForToken('html', 'def')).toBeNull();
		expect(lessonForToken('python', 'kein-treffer')).toBeNull();
	});
});

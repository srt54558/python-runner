import { html } from '@codemirror/lang-html';
import { python } from '@codemirror/lang-python';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { docsHitAt } from './docs-hover';

function hit(doc: string, language: 'python' | 'html', needle: string) {
	const state = EditorState.create({
		doc,
		extensions: [language === 'python' ? python() : html()]
	});
	const pos = doc.indexOf(needle);
	return docsHitAt(state, pos + Math.max(0, Math.min(needle.length - 1, 1)), -1, language);
}

describe('docs hover tokens', () => {
	it('finds python def and html p', () => {
		expect(hit('def hallo():\n    pass\n', 'python', 'def')?.lesson.id).toBe('funktionen');
		expect(hit('<p>Hallo</p>', 'html', 'p')?.lesson.id).toBe('html-text');
	});

	it('does not treat ordinary text as a docs token', () => {
		expect(hit('<p>Hallo</p>', 'html', 'Hallo')).toBeNull();
		expect(hit('xyz = 1\n', 'python', 'xyz')).toBeNull();
	});
});

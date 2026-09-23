import { CompletionContext } from '@codemirror/autocomplete';
import { html } from '@codemirror/lang-html';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { htmlTagSnippets } from './assist-web';

function complete(doc: string, pos = doc.length) {
	const state = EditorState.create({ doc, extensions: [html()] });
	return htmlTagSnippets(new CompletionContext(state, pos, false));
}

describe('html tag snippets', () => {
	it('replaces a typed tag name with the element', () => {
		const result = complete('p');
		const paragraph = result?.options.find((option) => option.label === '<p></p>');
		expect(paragraph).toBeTruthy();
		expect(result?.from).toBe(0);
		expect(result?.options[0]?.label).toBe('<p></p>');
		expect(complete('br')?.options[0]?.apply).toBe('<br>');
	});

	it('replaces an opened tag and stays out of scripts', () => {
		const opened = complete('<p');
		expect(opened?.from).toBe(0);
		expect(opened?.options[0]?.label).toBe('<p></p>');
		expect(complete('<script>\np')).toBeNull();
		expect(complete('<p class="')).toBeNull();
	});
});

import { describe, expect, it } from 'vitest';
import { applyEnter } from './indent';

function enterAtEnd(source: string) {
	return applyEnter(source, source.length);
}

describe('python enter indent', () => {
	it('indents the next line after a block colon, like VS Code', () => {
		expect(enterAtEnd('if hi:')).toEqual({ value: 'if hi:\n    ', cursor: 11 });
		expect(enterAtEnd('    if hi:').value).toBe('    if hi:\n        ');
		expect(enterAtEnd('def hi():').value).toBe('def hi():\n    ');
		expect(enterAtEnd('if hi: # note').value).toBe('if hi: # note\n    ');
	});

	it('keeps the current indent when the line does not open a block', () => {
		expect(enterAtEnd('x = 1').value).toBe('x = 1\n');
		expect(enterAtEnd('    x = 1').value).toBe('    x = 1\n    ');
		expect(enterAtEnd('x = ":"').value).toBe('x = ":"\n');
	});

	it('indents inside unclosed brackets and preserves tab indentation', () => {
		expect(enterAtEnd('print(').value).toBe('print(\n    ');
		expect(enterAtEnd('\tif hi:').value).toBe('\tif hi:\n\t\t');
	});

	it('replaces a selection and indents from the text before the cursor', () => {
		expect(applyEnter('if hi:', 2)).toEqual({ value: 'if\n hi:', cursor: 3 });
		expect(applyEnter('ab', 0, 2)).toEqual({ value: '\n', cursor: 1 });
	});
});

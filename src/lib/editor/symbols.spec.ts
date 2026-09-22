import { python } from '@codemirror/lang-python';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { symbolAt } from './symbols';

const source = `def greet(name: str, times: int = 1) -> str:
    """Say hi."""
    return name

class Box(Base):
    def __init__(self, value: int):
        self.value = value

x: int = 1
for item in items:
    pass
from os import path as p
`;

function at(name: string, occurrence = 0) {
	const pattern = new RegExp(`\\b${name}\\b`, 'g');
	let match: RegExpExecArray | null = null;
	for (let index = 0; index <= occurrence; index += 1) match = pattern.exec(source);
	const state = EditorState.create({ doc: source, extensions: [python()] });
	return symbolAt(state, (match?.index ?? 0) + 1);
}

describe('python symbol hover', () => {
	it('shows a function signature and its docstring', () => {
		expect(at('greet')).toMatchObject({
			kind: 'function',
			scheme: 'def greet(name: str, times: int = 1) -> str',
			doc: 'Say hi.'
		});
	});

	it('shows the parameter scheme where the name is used', () => {
		expect(at('name', 1)).toMatchObject({ kind: 'parameter', scheme: 'name: str' });
	});

	it('shows classes, annotated variables, loop names, and import aliases', () => {
		expect(at('Box')?.scheme).toBe('class Box(Base)');
		expect(at('x')?.scheme).toBe('x: int = 1');
		expect(at('item')?.scheme).toBe('for item in items');
		expect(at('p')?.scheme).toBe('from os import path as p');
	});

	it('shows an attribute separately from a parameter of the same name', () => {
		expect(at('value', 1)).toMatchObject({ kind: 'property', scheme: 'self.value = value' });
		expect(at('value', 2)).toMatchObject({ kind: 'parameter', scheme: 'value: int' });
	});

	it('does not describe keywords or types that were not defined here', () => {
		const state = EditorState.create({ doc: source, extensions: [python()] });
		expect(symbolAt(state, source.indexOf('return') + 1)).toBeNull();
		expect(symbolAt(state, source.indexOf('str') + 1)).toBeNull();
	});
});

import { autocompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { globalCompletion, localCompletionSource } from '@codemirror/lang-python';
import { hoverTooltip, type EditorView } from '@codemirror/view';
import { symbolAt, definitionOf, type SymbolKind } from './symbols';

const kindLabel: Record<SymbolKind, string> = {
	function: 'Funktion',
	class: 'Klasse',
	variable: 'Variable',
	parameter: 'Parameter',
	property: 'Attribut',
	import: 'Import'
};

function scopedCompletions(context: CompletionContext): CompletionResult | null {
	const result = localCompletionSource(context);
	if (!result) return null;
	return {
		...result,
		options: result.options.map((option) => withScheme(option, context))
	};
}

function withScheme(option: Completion, context: CompletionContext): Completion {
	const hit = definitionOf(context.state, option.label, context.pos);
	if (!hit || hit.name !== option.label) return option;
	return {
		...option,
		detail: kindLabel[hit.kind],
		info: hit.doc ? `${hit.scheme}\n\n${hit.doc}` : hit.scheme
	};
}

function pythonHover(view: EditorView, pos: number, side: -1 | 1) {
	const hit = symbolAt(view.state, pos, side);
	if (!hit) return null;
	return {
		pos: hit.from,
		end: hit.to,
		above: true,
		create() {
			const dom = document.createElement('div');
			dom.className = 'cm-python-hover';
			const kind = document.createElement('div');
			kind.className = 'cm-python-hover-kind';
			kind.textContent = kindLabel[hit.kind];
			const scheme = document.createElement('pre');
			scheme.className = 'cm-python-hover-scheme';
			scheme.textContent = hit.scheme;
			dom.append(kind, scheme);
			if (hit.doc) {
				const doc = document.createElement('div');
				doc.className = 'cm-python-hover-doc';
				doc.textContent = hit.doc;
				dom.append(doc);
			}
			return { dom };
		}
	};
}

export const pythonAssist = [
	autocompletion({ override: [scopedCompletions, globalCompletion] }),
	hoverTooltip(pythonHover, { hideOnChange: true })
];

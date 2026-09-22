import {
	autocompletion,
	completeFromList,
	snippet,
	type Completion,
	type CompletionContext,
	type CompletionResult,
	type CompletionSource
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';
import { htmlLanguage } from '@codemirror/lang-html';
import { jsonLanguage } from '@codemirror/lang-json';
import { javascriptLanguage, scopeCompletionSource } from '@codemirror/lang-javascript';
import { globalCompletion, localCompletionSource } from '@codemirror/lang-python';
import { xmlLanguage } from '@codemirror/lang-xml';
import { hoverTooltip, type EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { CodeLanguage } from '$lib/workspace/model';
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

let browserCompletion: CompletionSource | null = null;

const browserCompletions = javascriptLanguage.data.of({
	autocomplete(context: CompletionContext) {
		if (typeof window === 'undefined') return null;
		browserCompletion ??= scopeCompletionSource(window);
		return browserCompletion(context);
	}
});

const jsonWords = jsonLanguage.data.of({
	autocomplete: completeFromList([
		{ label: 'true', type: 'constant' },
		{ label: 'false', type: 'constant' },
		{ label: 'null', type: 'constant' }
	])
});

const HTML_TAGS =
	'a abbr address article aside audio b bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp script search section select slot small source span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr'.split(
		' '
	);
const VOID_TAGS = new Set(
	'area base br col embed hr img input link meta param source track wbr'.split(' ')
);

function insideNestedLanguage(context: CompletionContext): boolean {
	let node: SyntaxNode | null = syntaxTree(context.state).resolveInner(context.pos, -1);
	while (node) {
		if (node.name === 'Script' || node.name === 'StyleSheet' || node.name === 'Style') return true;
		if (
			node.name === 'AttributeName' ||
			node.name === 'AttributeValue' ||
			node.name === 'UnquotedAttributeValue' ||
			node.name === 'Is'
		) {
			return true;
		}
		node = node.parent;
	}
	return false;
}

export function htmlTagSnippets(context: CompletionContext): CompletionResult | null {
	if (insideNestedLanguage(context)) return null;
	const word = context.matchBefore(/<?\/?[A-Za-z][\w:-]*/u);
	if (!word || (word.from === word.to && !context.explicit)) return null;
	if (word.text.startsWith('</') || word.text.startsWith('/')) return null;
	const prefix = word.text.replace(/^</u, '').toLowerCase();
	if (!prefix) return null;
	const tags = HTML_TAGS.filter((tag) => tag.startsWith(prefix)).sort((a, b) => {
		if (a === prefix) return -1;
		if (b === prefix) return 1;
		return a.length - b.length;
	});
	if (!tags.length) return null;
	return {
		from: word.from,
		filter: false,
		validFor: /^<?\/?[A-Za-z][\w:-]*$/u,
		options: tags.map((tag) => ({
			label: VOID_TAGS.has(tag) ? `<${tag}>` : `<${tag}></${tag}>`,
			type: 'type',
			boost: tag === prefix ? 99 : 0,
			apply: VOID_TAGS.has(tag) ? `<${tag}>` : snippet(`<${tag}>\${}</${tag}>`)
		}))
	};
}

const htmlTags = htmlLanguage.data.of({ autocomplete: htmlTagSnippets });

const xmlTags = xmlLanguage.data.of({
	autocomplete(context: CompletionContext): CompletionResult | null {
		const word = context.matchBefore(/<\/?[\w:.-]*/u);
		if (!word || (word.from === word.to && !context.explicit)) return null;
		if (!word.text.startsWith('<')) return null;
		const names = ['xml', 'item', 'name', 'value', 'entry'];
		return {
			from: word.from + (word.text.startsWith('</') ? 2 : 1),
			options: names.map((label) => ({ label, type: 'type' }))
		};
	}
});

export function languageAssist(language: CodeLanguage): Extension[] {
	if (language === 'python') return pythonAssist;
	const extra: Extension[] = [autocompletion()];
	if (language === 'javascript' || language === 'html') extra.push(browserCompletions);
	if (language === 'html') extra.push(htmlTags);
	if (language === 'json') extra.push(jsonWords);
	if (language === 'xml') extra.push(xmlTags);
	return extra;
}

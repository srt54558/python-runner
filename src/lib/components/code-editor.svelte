<script lang="ts">
	import { onMount } from 'svelte';
	import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
	import { css } from '@codemirror/lang-css';
	import { html } from '@codemirror/lang-html';
	import { javascript } from '@codemirror/lang-javascript';
	import { json } from '@codemirror/lang-json';
	import { markdown } from '@codemirror/lang-markdown';
	import { python } from '@codemirror/lang-python';
	import { xml } from '@codemirror/lang-xml';
	import { bracketMatching, indentOnInput, indentUnit } from '@codemirror/language';
	import { lintGutter, setDiagnostics } from '@codemirror/lint';
	import {
		defaultKeymap,
		history,
		historyKeymap,
		indentWithTab,
		redo,
		redoDepth,
		undo,
		undoDepth
	} from '@codemirror/commands';
	import { Annotation, Compartment, EditorState, Prec } from '@codemirror/state';
	import {
		activateHover,
		drawSelection,
		EditorView,
		highlightActiveLine,
		highlightActiveLineGutter,
		keymap,
		lineNumbers
	} from '@codemirror/view';
	import { languageAssist } from '$lib/editor/assist';
	import { diagnosticsForDocument, positionToOffset } from '$lib/editor/diagnostics';
	import { themeExtensions } from '$lib/editor/themes';
	import type { RuffDiagnostic } from '$lib/runner/protocol';
	import type { AppTheme } from '$lib/theme';
	import type { CodeLanguage } from '$lib/workspace/model';

	let {
		fileId,
		value,
		language = 'python',
		diagnostics,
		theme,
		visible = true,
		wrapLines = false,
		onchange,
		onhistory
	}: {
		fileId: string;
		value: string;
		language?: CodeLanguage;
		diagnostics: RuffDiagnostic[];
		theme: AppTheme;
		visible?: boolean;
		wrapLines?: boolean;
		onchange: (value: string) => void;
		onhistory?: (state: { canUndo: boolean; canRedo: boolean }) => void;
	} = $props();

	const externalChange = Annotation.define<boolean>();
	const themeCompartment = new Compartment();
	const wrapCompartment = new Compartment();
	const languageCompartment = new Compartment();
	let host = $state<HTMLDivElement | null>(null);
	let ready = $state(false);
	let view: EditorView | undefined;
	let loadedFileId = '';
	let wasVisible = false;

	function reportHistory(state: EditorState) {
		onhistory?.({
			canUndo: undoDepth(state) > 0,
			canRedo: redoDepth(state) > 0
		});
	}

	function emitDoc(next: string) {
		if (next !== value) onchange(next);
	}

	function languageExtensions(current: CodeLanguage) {
		const labels: Record<CodeLanguage, string> = {
			python: 'Python-Code',
			html: 'HTML-Code',
			javascript: 'JavaScript-Code',
			css: 'CSS-Code',
			json: 'JSON-Code',
			xml: 'XML-Code',
			markdown: 'Markdown',
			text: 'Text'
		};
		const grammar =
			current === 'html'
				? [html({ selfClosingTags: true })]
				: current === 'javascript'
					? [javascript()]
					: current === 'css'
						? [css()]
						: current === 'json'
							? [json()]
							: current === 'xml'
								? [xml()]
								: current === 'markdown'
									? [markdown()]
									: current === 'python'
										? [python()]
										: [];
		return [
			...grammar,
			...languageAssist(current),
			EditorView.contentAttributes.of({
				spellcheck: 'false',
				autocorrect: 'off',
				autocapitalize: 'off',
				autocomplete: 'off',
				writingsuggestions: 'false',
				'aria-label': labels[current]
			})
		];
	}

	function createState(doc: string) {
		return EditorState.create({
			doc,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				drawSelection(),
				history(),
				indentUnit.of('    '),
				EditorState.tabSize.of(4),
				indentOnInput(),
				bracketMatching(),
				closeBrackets(),
				languageCompartment.of(languageExtensions(language)),
				Prec.highest(
					keymap.of([
						{ key: 'Mod-Enter', run: () => true },
						{ key: 'Ctrl-Enter', run: () => true }
					])
				),
				keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
				lintGutter(),
				themeCompartment.of(themeExtensions(theme)),
				wrapCompartment.of(wrapLines ? EditorView.lineWrapping : []),
				EditorView.updateListener.of((update) => {
					if (
						update.docChanged &&
						!update.transactions.some((transaction) => transaction.annotation(externalChange))
					) {
						emitDoc(update.state.doc.toString());
					}
					if (update.docChanged || update.transactions.length > 0) reportHistory(update.state);
				})
			]
		});
	}

	export function undoEdit() {
		if (!view) return;
		undo(view);
		view.focus();
	}

	export function redoEdit() {
		if (!view) return;
		redo(view);
		view.focus();
	}

	export function focusEditor() {
		view?.focus();
	}

	export function reveal(row: number, column: number) {
		if (!view) return;
		const lineNumber = Math.min(Math.max(row, 1), view.state.doc.lines);
		const line = view.state.doc.line(lineNumber);
		const pos = Math.min(line.to, line.from + Math.max(0, column - 1));
		view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
		view.focus();
	}

	export function showDiagnostic(row: number, column: number, endRow: number, endColumn: number) {
		if (!view) return;
		const doc = view.state.doc.toString();
		const from = positionToOffset(doc, row, column);
		let to = positionToOffset(doc, endRow, endColumn);
		if (to <= from) to = Math.min(doc.length, from + 1);
		view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
		activateHover(view, from, 1, {
			until: (transaction) => transaction.docChanged || transaction.isUserEvent('select')
		});
		view.focus();
	}

	onMount(() => {
		const parent = host;
		if (!parent) return;
		loadedFileId = fileId;
		view = new EditorView({
			parent,
			state: createState(value)
		});
		reportHistory(view.state);
		ready = true;
		return () => {
			ready = false;
			view?.destroy();
			view = undefined;
		};
	});

	$effect(() => {
		if (!ready || !view) return;
		const id = fileId;
		const next = value;
		if (id !== loadedFileId) {
			loadedFileId = id;
			if (view.state.doc.toString() !== next) view.setState(createState(next));
			reportHistory(view.state);
			return;
		}
		if (view.state.doc.toString() === next) return;
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: next },
			annotations: externalChange.of(true)
		});
	});

	$effect(() => {
		if (!ready || !view) return;
		const source = value;
		const mapped = diagnosticsForDocument(source, diagnostics);
		if (view.state.doc.toString() !== source) return;
		view.dispatch(setDiagnostics(view.state, mapped));
	});

	$effect(() => {
		if (!ready || !view) return;
		view.dispatch({ effects: themeCompartment.reconfigure(themeExtensions(theme)) });
	});

	$effect(() => {
		if (!ready || !view) return;
		view.dispatch({ effects: languageCompartment.reconfigure(languageExtensions(language)) });
	});

	$effect(() => {
		if (!ready || !view) return;
		view.dispatch({
			effects: wrapCompartment.reconfigure(wrapLines ? EditorView.lineWrapping : [])
		});
	});

	$effect(() => {
		if (!ready || !view) return;
		if (!visible) {
			wasVisible = false;
			return;
		}
		view.requestMeasure();
		const narrow = window.matchMedia('(max-width: 899px)').matches;
		if (!wasVisible && !narrow) view.focus();
		wasVisible = true;
	});
</script>

<div class="code-host" bind:this={host}></div>

<style>
	.code-host {
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}
	.code-host :global(.cm-editor) {
		height: 100%;
		max-height: 100%;
		overflow: hidden;
	}
	.code-host :global(.cm-scroller) {
		overflow: auto;
	}
</style>

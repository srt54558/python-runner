import type { Diagnostic } from '@codemirror/lint';
import type { RuffDiagnostic } from '$lib/runner/protocol';

export function positionToOffset(doc: string, row: number, column: number): number {
	const lines = doc.split('\n');
	const lineIndex = Math.min(Math.max(row, 1), Math.max(lines.length, 1)) - 1;
	let offset = 0;
	for (let index = 0; index < lineIndex; index += 1) offset += lines[index].length + 1;
	const line = lines[lineIndex] ?? '';
	return Math.min(doc.length, offset + Math.min(Math.max(column, 1) - 1, line.length));
}

export function diagnosticsForDocument(doc: string, items: readonly RuffDiagnostic[]): Diagnostic[] {
	return items.map((item) => {
		const fromStart = positionToOffset(doc, item.start_location.row, item.start_location.column);
		let from = fromStart;
		let to = positionToOffset(doc, item.end_location.row, item.end_location.column);
		if (to <= from) {
			if (from >= doc.length && from > 0) from -= 1;
			to = Math.min(doc.length, from + 1);
		}
		const code = item.code ?? 'Syntax';
		const severity = !item.code || item.code.startsWith('E9') ? 'error' : 'warning';
		return {
			from,
			to,
			severity,
			message: `${code}: ${item.message}`
		};
	});
}

import { describe, expect, it } from 'vitest';
import { diagnosticsForDocument, positionToOffset } from './diagnostics';

describe('editor diagnostics', () => {
	it('maps 1-based ruff columns onto the document', () => {
		const doc = 'x = 1\nprint(x)';
		expect(positionToOffset(doc, 1, 1)).toBe(0);
		expect(positionToOffset(doc, 2, 7)).toBe(doc.indexOf('x)'));
		const [diagnostic] = diagnosticsForDocument(doc, [
			{
				code: 'F841',
				message: '`x` is assigned but never used',
				start_location: { row: 1, column: 1 },
				end_location: { row: 1, column: 2 }
			}
		]);
		expect(diagnostic).toMatchObject({ from: 0, to: 1, severity: 'warning' });
	});

	it('treats syntax failures as errors and keeps a visible range', () => {
		const [diagnostic] = diagnosticsForDocument('if', [
			{
				code: null,
				message: 'Expected an indented block',
				start_location: { row: 1, column: 3 },
				end_location: { row: 1, column: 3 }
			}
		]);
		expect(diagnostic.severity).toBe('error');
		expect(diagnostic.to).toBeGreaterThan(diagnostic.from);
	});

	it('underlines only the line where a diagnostic starts', () => {
		const doc = '<div>\n<p>Hallo</p>\n</html>';
		const [diagnostic] = diagnosticsForDocument(doc, [
			{
				code: 'HTML',
				message: '<div> ist nicht geschlossen.',
				start_location: { row: 1, column: 1 },
				end_location: { row: 3, column: 8 }
			}
		]);
		expect(doc.slice(diagnostic.from, diagnostic.to)).toBe('<div>');
	});
});

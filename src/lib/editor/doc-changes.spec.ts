import { describe, expect, it } from 'vitest';
import { applyDocChanges } from './doc-changes';

describe('applyDocChanges', () => {
	it('patches a single insert without copying unchanged tails twice', () => {
		expect(applyDocChanges('print(1)', [{ from: 6, to: 7, insert: '2' }])).toBe('print(2)');
	});

	it('applies several changes recorded against the original document', () => {
		expect(
			applyDocChanges('abcd', [
				{ from: 1, to: 2, insert: 'X' },
				{ from: 3, to: 4, insert: 'Y' }
			])
		).toBe('aXcY');
	});
});

import { describe, expect, it } from 'vitest';
import { lineExcerpt } from './explain';

describe('problem line excerpt', () => {
	it('returns the source line and a mark under the reported columns', () => {
		const excerpt = lineExcerpt('x = 1\nprint(1)\n', {
			start_location: { row: 1, column: 1 },
			end_location: { row: 1, column: 2 }
		});
		expect(excerpt.line).toBe('x = 1');
		expect(excerpt.mark).toBe('^');
	});
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_COLORS } from './theme';

describe('theme colors', () => {
	it('matches the colors applied before paint in app.html', () => {
		const html = readFileSync('src/app.html', 'utf8');
		for (const color of Object.values(THEME_COLORS)) {
			expect(html).toContain(color);
		}
	});
});

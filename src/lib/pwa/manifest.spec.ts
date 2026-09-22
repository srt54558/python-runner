import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type ManifestIcon = { src: string; sizes: string; type: string; purpose?: string };

const manifest = JSON.parse(readFileSync('static/manifest.webmanifest', 'utf8')) as {
	name?: string;
	short_name?: string;
	start_url?: string;
	scope?: string;
	display?: string;
	prefer_related_applications?: boolean;
	icons?: ManifestIcon[];
};

describe('installable web app manifest', () => {
	it('has the fields browsers require before they offer install', () => {
		expect(manifest.name).toBe('K+ Coder');
		expect(manifest.short_name).toBe('K+ Coder');
		expect(manifest.start_url).toBe('/');
		expect(manifest.scope).toBe('/');
		expect(manifest.display).toBe('standalone');
		expect(manifest.prefer_related_applications).not.toBe(true);

		const icons = manifest.icons ?? [];
		expect(icons.some((icon) => icon.sizes === '192x192' && icon.type === 'image/png')).toBe(true);
		expect(icons.some((icon) => icon.sizes === '512x512' && icon.type === 'image/png')).toBe(true);
		expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

		for (const icon of icons) {
			const file = `static${icon.src}`;
			expect({ src: icon.src, exists: existsSync(file) }).toEqual({ src: icon.src, exists: true });
			expect(statSync(file).size).toBeGreaterThan(500);
		}
	});
});

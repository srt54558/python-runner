import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { PYODIDE_FILES, PYODIDE_VERSION } from './src/lib/runner/pyodide-runtime.ts';

function hostPyodide() {
	const root = dirname(fileURLToPath(import.meta.url));
	const source = join(root, 'node_modules/pyodide');
	const dest = join(root, 'static/pyodide', PYODIDE_VERSION);
	return {
		name: 'host-pyodide',
		buildStart() {
			mkdirSync(dest, { recursive: true });
			for (const name of PYODIDE_FILES) {
				cpSync(join(source, name), join(dest, name));
			}
		}
	};
}

export default defineConfig({
	plugins: [
		hostPyodide(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

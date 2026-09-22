import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dependencyVersions } from 'virtual:dependency-versions';

describe('dependency versions', () => {
	it('lists the installed version of every direct dependency', () => {
		const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
			dependencies: Record<string, string>;
			devDependencies: Record<string, string>;
		};
		const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
			packages: Record<string, { version?: string }>;
		};
		const expected = [false, true].flatMap((dev) => {
			const group = dev ? pkg.devDependencies : pkg.dependencies;
			return Object.keys(group)
				.sort((left, right) => left.localeCompare(right))
				.map((name) => ({
					name,
					version: lock.packages[`node_modules/${name}`]?.version,
					dev
				}));
		});
		expect(dependencyVersions).toEqual(expected);
		expect(dependencyVersions.some((item) => item.name === 'svelte' && item.version)).toBe(true);
		expect(dependencyVersions.some((item) => item.name === 'pyodide' && item.version)).toBe(true);
	});
});

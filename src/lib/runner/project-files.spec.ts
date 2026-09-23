import { describe, expect, it } from 'vitest';
import { diffProjectFiles, isSafeProjectPath } from './project-files';

describe('project files', () => {
	it('rejects paths that could leave the workspace', () => {
		expect(isSafeProjectPath('main.py')).toBe(true);
		expect(isSafeProjectPath('src/app.py')).toBe(true);
		expect(isSafeProjectPath('../secret.py')).toBe(false);
		expect(isSafeProjectPath('/abs.py')).toBe(false);
		expect(isSafeProjectPath('')).toBe(false);
	});

	it('writes only changed files and deletes missing ones', () => {
		const previous = new Map([
			['a.py', 'print(1)'],
			['b.py', 'print(2)']
		]);
		expect(diffProjectFiles(previous, { 'a.py': 'print(1)', 'c.py': 'print(3)' })).toEqual({
			writes: { 'c.py': 'print(3)' },
			deletes: ['b.py']
		});
		expect(diffProjectFiles(previous, { 'a.py': 'print(9)', 'b.py': 'print(2)' })).toEqual({
			writes: { 'a.py': 'print(9)' },
			deletes: []
		});
	});
});

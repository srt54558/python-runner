import { describe, expect, it } from 'vitest';
import { chooseWorkspace } from './database';
import { createInitialWorkspace } from './model';

describe('workspace backup selection', () => {
	it('keeps the newer copy when a reload happens before IndexedDB finishes', () => {
		const stored = createInitialWorkspace('print(1)');
		const backup = createInitialWorkspace('print(2)');
		expect(chooseWorkspace(null, { savedAt: 5, snapshot: backup }, 0)).toBe(backup);
		expect(chooseWorkspace(stored, null, 4)).toBe(stored);
		const newer = chooseWorkspace(stored, { savedAt: 10, snapshot: backup }, 4);
		expect(newer?.files[0].content).toBe('print(2)');
		expect(chooseWorkspace(stored, { savedAt: 4, snapshot: backup }, 4)).toBe(stored);
	});
});

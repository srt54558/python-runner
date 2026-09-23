import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LESSONS, lessonMatches } from './lessons';

describe('lesson search', () => {
	it('keeps every lesson when the query is empty', () => {
		expect(LESSONS.filter((lesson) => lessonMatches(lesson, '  '))).toHaveLength(LESSONS.length);
	});

	it('matches title, explanation, code, and keywords', () => {
		expect(
			LESSONS.filter((lesson) => lessonMatches(lesson, 'range')).map((lesson) => lesson.id)
		).toEqual(['schleifen']);
		expect(LESSONS.some((lesson) => lessonMatches(lesson, 'Wörterbuch'))).toBe(true);
		expect(LESSONS.some((lesson) => lessonMatches(lesson, 'ValueError'))).toBe(true);
		expect(LESSONS.some((lesson) => lessonMatches(lesson, 'elif'))).toBe(true);
		expect(LESSONS.some((lesson) => lessonMatches(lesson, 'kein-treffer'))).toBe(false);
	});

	it('gives every lesson its own id, a group, and an example that prints', () => {
		const ids = LESSONS.map((lesson) => lesson.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(LESSONS.every((lesson) => lesson.group && lesson.code.includes('print'))).toBe(true);
		expect(LESSONS.every((lesson) => (lesson.output ?? '').length > 0)).toBe(true);
	});

	it('stores the output of every example', () => {
		const python = spawnSync('python3', ['--version'], { encoding: 'utf8' });
		if (python.status !== 0) return;
		const root = mkdtempSync(join(tmpdir(), 'kplus-lessons-'));
		try {
			for (const lesson of LESSONS) {
				const result = spawnSync('python3', ['-c', lesson.code], { cwd: root, encoding: 'utf8' });
				expect(result.status, `${lesson.id}\n${result.stderr}`).toBe(0);
				expect(result.stdout.replace(/\n$/u, ''), lesson.id).toBe(lesson.output);
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

import { describe, expect, it } from 'vitest';
import { LESSONS, lessonMatches } from './lessons';

describe('lesson search', () => {
	it('keeps every lesson when the query is empty', () => {
		expect(LESSONS.filter((lesson) => lessonMatches(lesson, '  '))).toHaveLength(LESSONS.length);
	});

	it('matches title, explanation, code, and keywords', () => {
		expect(LESSONS.filter((lesson) => lessonMatches(lesson, 'range')).map((lesson) => lesson.id)).toEqual([
			'schleifen'
		]);
		expect(LESSONS.some((lesson) => lessonMatches(lesson, 'Wörterbuch'))).toBe(true);
		expect(LESSONS.some((lesson) => lessonMatches(lesson, 'ValueError'))).toBe(true);
		expect(LESSONS.some((lesson) => lessonMatches(lesson, 'kein-treffer'))).toBe(false);
	});
});

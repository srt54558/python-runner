import { describe, expect, it } from 'vitest';
import { clipBlocks, clipText, MAX_CONSOLE_BLOCKS, MAX_STREAM_CHARS } from './limits';

describe('runner limits', () => {
	it('keeps the tail of a long stream', () => {
		expect(clipText('abcd', 3)).toBe('bcd');
		expect(clipText('ok')).toBe('ok');
		expect(clipText('x'.repeat(MAX_STREAM_CHARS + 5)).length).toBe(MAX_STREAM_CHARS);
	});

	it('drops the oldest console blocks', () => {
		const blocks = Array.from({ length: MAX_CONSOLE_BLOCKS + 3 }, (_, index) => index);
		expect(clipBlocks(blocks)).toEqual(blocks.slice(3));
		expect(clipBlocks([1, 2], 4)).toEqual([1, 2]);
	});
});

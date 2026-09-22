import { describe, expect, it } from 'vitest';
import {
	canShareCode,
	createShareUrl,
	decodeCode,
	encodeCode,
	MAX_SHARE_PAYLOAD_LENGTH,
	MAX_SHARE_SOURCE_LENGTH,
	MAX_SHARE_URL_LENGTH
} from './share';

describe('share URLs', () => {
	it('round trips unicode Python source', () => {
		const source = 'name = "Welt"\nprint(f"Hallo, {name} ☃")\n';
		expect(decodeCode(encodeCode(source))).toBe(source);
	});

	it('uses an import flag and keeps source in the private URL fragment', () => {
		const url = new URL(
			createShareUrl('print(42)', { origin: 'https://python.k-plus.one', pathname: '/' })
		);
		expect(url.origin).toBe('https://python.k-plus.one');
		expect(url.searchParams.has('import')).toBe(true);
		expect(decodeCode(url.hash.slice(1))).toBe('print(42)');
	});

	it('rejects an empty payload', () => {
		expect(decodeCode('')).toBeNull();
	});

	it('round trips an intentionally empty source file', () => {
		expect(decodeCode(encodeCode(''))).toBe('');
	});

	it('rejects oversized encoded and decoded imports', () => {
		expect(decodeCode('x'.repeat(MAX_SHARE_PAYLOAD_LENGTH + 1))).toBeNull();
		expect(decodeCode(encodeCode('x'.repeat(MAX_SHARE_SOURCE_LENGTH + 1)))).toBeNull();
	});

	it('does not offer a short compressed URL that the receiver would reject', () => {
		const location = { origin: 'https://python.k-plus.one', pathname: '/' };
		const source = 'x'.repeat(MAX_SHARE_SOURCE_LENGTH + 1);
		expect(createShareUrl(source, location).length).toBeLessThan(MAX_SHARE_URL_LENGTH);
		expect(canShareCode(source, location)).toBe(false);
	});
});

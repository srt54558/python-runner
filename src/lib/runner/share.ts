import LZString from 'lz-string';

export const IMPORT_PARAM = 'import';
export const MAX_SHARE_URL_LENGTH = 8_000;
export const MAX_SHARE_PAYLOAD_LENGTH = 8_000;
export const MAX_SHARE_SOURCE_LENGTH = 250_000;

export function encodeCode(code: string): string {
	return LZString.compressToEncodedURIComponent(code);
}

export function decodeCode(payload: string): string | null {
	if (!payload || payload.length > MAX_SHARE_PAYLOAD_LENGTH) return null;
	try {
		const code = LZString.decompressFromEncodedURIComponent(payload);
		return code !== null && code.length <= MAX_SHARE_SOURCE_LENGTH ? code : null;
	} catch {
		return null;
	}
}

export function createShareUrl(
	code: string,
	location: Pick<Location, 'origin' | 'pathname'>
): string {
	const url = new URL(location.pathname, location.origin);
	url.search = `?${IMPORT_PARAM}`;
	url.hash = encodeCode(code);
	return url.toString();
}

export function canShareCode(
	code: string,
	location: Pick<Location, 'origin' | 'pathname'>
): boolean {
	return (
		code.length <= MAX_SHARE_SOURCE_LENGTH &&
		createShareUrl(code, location).length <= MAX_SHARE_URL_LENGTH
	);
}

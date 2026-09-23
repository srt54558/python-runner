export const MAX_CONSOLE_BLOCKS = 50;
export const MAX_STREAM_CHARS = 200_000;

export function clipText(value: string, max = MAX_STREAM_CHARS): string {
	if (value.length <= max) return value;
	return value.slice(value.length - max);
}

export function clipBlocks<T>(blocks: T[], max = MAX_CONSOLE_BLOCKS): T[] {
	return blocks.length > max ? blocks.slice(-max) : blocks;
}

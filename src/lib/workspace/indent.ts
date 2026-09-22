const SPACE_INDENT = '    ';

function codeOnLine(line: string): string {
	let result = '';
	let index = 0;
	while (index < line.length) {
		const char = line[index];
		if (char === '#') break;
		if (char !== '"' && char !== "'") {
			result += char;
			index += 1;
			continue;
		}
		const triple = line.startsWith(char.repeat(3), index);
		const quote = triple ? char.repeat(3) : char;
		index += quote.length;
		while (index < line.length && !line.startsWith(quote, index)) {
			if (!triple && line[index] === '\\') index += 1;
			index += 1;
		}
		index += quote.length;
		result += ' ';
	}
	return result;
}

function hasUnclosedBracket(code: string): boolean {
	let depth = 0;
	for (const char of code) {
		if (char === '(' || char === '[' || char === '{') depth += 1;
		else if (char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1);
	}
	return depth > 0;
}

function extraIndent(leading: string): string {
	return leading.includes('\t') && !leading.includes(' ') ? '\t' : SPACE_INDENT;
}

export function indentAfterEnter(lineBeforeCursor: string): string {
	const leading = lineBeforeCursor.match(/^[ \t]*/)?.[0] ?? '';
	const code = codeOnLine(lineBeforeCursor);
	const opensBlock = hasUnclosedBracket(code) || /:\s*$/.test(code.trimEnd());
	return opensBlock ? leading + extraIndent(leading) : leading;
}

export function applyEnter(
	source: string,
	selectionStart: number,
	selectionEnd = selectionStart
): { value: string; cursor: number } {
	const start = Math.min(selectionStart, selectionEnd);
	const end = Math.max(selectionStart, selectionEnd);
	const before = source.slice(0, start);
	const after = source.slice(end);
	const lineStart = before.lastIndexOf('\n') + 1;
	const insertion = `\n${indentAfterEnter(before.slice(lineStart))}`;
	return { value: before + insertion + after, cursor: before.length + insertion.length };
}

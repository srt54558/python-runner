import { describe, expect, it } from 'vitest';
import { consoleSegments, matchProblem } from './console-links';
import type { RuffDiagnostic } from './protocol';

const SYNTAX = `Traceback (most recent call last):
  File "main.py", line 6
    while while :
          ^^^^^
SyntaxError: invalid syntax`;

function problem(
	row: number,
	column: number,
	endColumn: number,
	code: string | null,
	message: string
): RuffDiagnostic {
	return {
		code,
		message,
		start_location: { row, column },
		end_location: { row, column: endColumn }
	};
}

describe('console links', () => {
	it('marks the current file frame, including the exception line and caret column', () => {
		expect(consoleSegments(SYNTAX, 'main.py')).toEqual([
			{ text: 'Traceback (most recent call last):', line: null, column: null, endColumn: null },
			{
				text: `\n  File "main.py", line 6
    while while :
          ^^^^^
SyntaxError: invalid syntax`,
				line: 6,
				column: 7,
				endColumn: 12
			}
		]);
	});

	it('leaves frames from other files as plain text', () => {
		const stderr = `Traceback (most recent call last):
  File "main.py", line 2, in <module>
  File "/lib/python314.zip/json/__init__.py", line 346, in loads
    return _default_decoder.decode(s)
json.decoder.JSONDecodeError: Expecting value`;
		const segments = consoleSegments(stderr, 'main.py');
		expect(segments[1]).toMatchObject({
			line: 2,
			column: null,
			text: '\n  File "main.py", line 2, in <module>'
		});
		expect(segments[2].line).toBeNull();
		expect(segments[2].text).toContain('json/__init__.py');
	});

	it('prefers the linter problem under the caret, then any problem on that line', () => {
		const unused = problem(6, 1, 6, 'F841', 'unused');
		const syntax = problem(6, 7, 12, null, 'invalid syntax');
		expect(matchProblem([unused, syntax], 6, 7, 12)).toBe(syntax);
		expect(matchProblem([unused], 6, 7, 12)).toBe(unused);
		expect(matchProblem([syntax], 3, null, null)).toBeNull();
	});
});

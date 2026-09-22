import { describe, expect, it } from 'vitest';
import { presentPythonError } from './python-error';

const SYNTAX_TRACE = `Traceback (most recent call last):
  File "/lib/python314.zip/_pyodide/_base.py", line 619, in eval_code_async
    await CodeRunner(
          ~~~~~~~~~~^
        source,
        ^^^^^^^
    ...<6 lines>...
        dedent=dedent,
        ^^^^^^^^^^^^^^
    )
    ^
  File "/lib/python314.zip/_pyodide/_base.py", line 294, in __init__
    self.ast = next(self._gen)
               ~~~~^^^^^^^^^^^
  File "/lib/python314.zip/_pyodide/_base.py", line 151, in _parse_and_compile_gen
    mod = compile(source, filename, mode, flags | ast.PyCF_ONLY_AST)
  File "<exec>", line 6
    while while :
          ^^^^^
SyntaxError: invalid syntax`;

describe('presentPythonError', () => {
	it('keeps the program syntax error and drops the Pyodide runner', () => {
		expect(presentPythonError(SYNTAX_TRACE, 'main.py')).toBe(`Traceback (most recent call last):
  File "main.py", line 6
    while while :
          ^^^^^
SyntaxError: invalid syntax`);
	});

	it('keeps the program stack and a standard-library frame', () => {
		const raw = `Traceback (most recent call last):
  File "/lib/python314.zip/_pyodide/_base.py", line 500, in eval_code_async
    coroutine = eval(coroutine, globals, locals)
  File "<exec>", line 2, in <module>
  File "/lib/python314.zip/json/__init__.py", line 346, in loads
    return _default_decoder.decode(s)
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)`;

		expect(presentPythonError(raw, 'daten.py')).toBe(`Traceback (most recent call last):
  File "daten.py", line 2, in <module>
  File "/lib/python314.zip/json/__init__.py", line 346, in loads
    return _default_decoder.decode(s)
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)`);
	});

	it('shows workspace files without the mount folder', () => {
		const raw = `Traceback (most recent call last):
  File "/workspace/helper.py", line 1, in <module>
NameError: name 'x' is not defined`;
		expect(presentPythonError(raw, 'main.py')).toBe(`Traceback (most recent call last):
  File "helper.py", line 1, in <module>
NameError: name 'x' is not defined`);
		const nested = `Traceback (most recent call last):
  File "/workspace/src/helper.py", line 3, in <module>
NameError: name 'x' is not defined`;
		expect(presentPythonError(nested, 'main.py')).toContain('File "src/helper.py", line 3');
	});

	it('leaves a message that is not a Python traceback unchanged', () => {
		expect(presentPythonError('Python konnte nicht geladen werden.')).toBe(
			'Python konnte nicht geladen werden.'
		);
	});
});

/** Must match the installed `pyodide` package. The runtime is copied to this URL. */
export const PYODIDE_VERSION = '314.0.7';

export const PYODIDE_BASE = `/pyodide/${PYODIDE_VERSION}/`;

/** Files the page has to serve before Python can start. */
export const PYODIDE_FILES = [
	'pyodide.mjs',
	'pyodide.asm.mjs',
	'pyodide.asm.wasm',
	'python_stdlib.zip',
	'pyodide-lock.json'
] as const;

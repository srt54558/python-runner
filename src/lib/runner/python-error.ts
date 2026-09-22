const FRAME = /^ {2}File "([^"]+)", line /;

/** Pyodide's own runner, not the program or the standard library. */
function isRuntimeFrame(path: string): boolean {
	return path.includes('/_pyodide/') || /(^|\/)pyodide\//.test(path);
}

function displayFramePath(path: string): string {
	const prefix = '/workspace/';
	return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

function renameExec(line: string, filename: string): string {
	if (!filename || /["\r\n]/.test(filename)) return line;
	return line.replaceAll('"<exec>"', `"${filename}"`);
}

/**
 * Drop Pyodide's internal frames so a console error starts at the program.
 * `filename` replaces the `<exec>` placeholder.
 */
export function presentPythonError(raw: string, filename = ''): string {
	const text = raw.replace(/^PythonError:\s*/, '').replaceAll('\r\n', '\n');
	const lines = text.split('\n');
	const kept: string[] = [];
	let skipping = false;

	for (const line of lines) {
		const frame = FRAME.exec(line);
		if (frame) {
			skipping = isRuntimeFrame(frame[1]);
			if (!skipping) {
				const shown = displayFramePath(frame[1]);
				kept.push(renameExec(shown === frame[1] ? line : line.replace(frame[1], shown), filename));
			}
			continue;
		}
		if (skipping) {
			if (line.length === 0 || line.startsWith(' ')) continue;
			skipping = false;
		}
		kept.push(renameExec(line, filename));
	}

	const body = kept.join('\n').trim();
	if (!body.includes('  File "')) {
		return body
			.split('\n')
			.filter((line) => line !== 'Traceback (most recent call last):')
			.join('\n')
			.trim();
	}
	return body;
}

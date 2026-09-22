/// <reference lib="webworker" />

import { presentPythonError } from './python-error';
import type { PythonWorkerMessage } from './protocol';
import { PYODIDE_BASE } from './pyodide-runtime';

interface PyodideRuntime {
	loadPackagesFromImports(code: string): Promise<void>;
	runPython(code: string): unknown;
	runPythonAsync(
		code: string,
		options?: { globals?: unknown; filename?: string }
	): Promise<unknown>;
	setStdout(options: { batched: (text: string) => void }): void;
	setStderr(options: { batched: (text: string) => void }): void;
	globals: PyGlobals;
}

interface PyGlobals {
	get(name: string): (...args: unknown[]) => PyProxy;
	set(name: string, value: unknown): void;
}

interface PyProxy {
	set(key: string, value: unknown): void;
	destroy(): void;
}

type LoadPyodide = (options: { indexURL: string }) => Promise<PyodideRuntime>;

function send(message: PythonWorkerMessage) {
	self.postMessage(message);
}

send({ type: 'status', status: 'loading' });

const runtimePromise = (async () => {
	const pyodideModule = (await import(/* @vite-ignore */ `${PYODIDE_BASE}pyodide.mjs`)) as {
		loadPyodide: LoadPyodide;
	};
	const runtime = await pyodideModule.loadPyodide({ indexURL: PYODIDE_BASE });
	const version = String(runtime.runPython('import sys; sys.version.split()[0]'));
	send({ type: 'status', status: 'ready', version });
	return runtime;
})().catch((error: unknown) => {
	send({ type: 'fatal', error: error instanceof Error ? error.message : String(error) });
	throw error;
});

const MOUNT_PROJECT = `
import json, os, shutil, sys
os.chdir("/")
root = "/workspace"
if os.path.isdir(root):
    shutil.rmtree(root)
os.makedirs(root)
files = json.loads(__project_files)
for path, content in files.items():
    parts = str(path).split("/")
    if not parts or any(part in ("", ".", "..") for part in parts):
        continue
    folder = root
    for part in parts[:-1]:
        folder = os.path.join(folder, part)
        os.makedirs(folder, exist_ok=True)
    with open(os.path.join(root, *parts), "w", encoding="utf-8") as handle:
        handle.write(content)
os.chdir(root)
entry = str(__project_entry or "")
script_dir = os.path.dirname(os.path.join(root, entry)) or root
sys.path[:] = [item for item in sys.path if not (isinstance(item, str) and (item == root or item.startswith(root + "/")))]
sys.path.insert(0, script_dir)
for name in list(sys.modules):
    module = sys.modules.get(name)
    module_file = getattr(module, "__file__", None)
    if isinstance(module_file, str) and (module_file == root or module_file.startswith(root + "/")):
        del sys.modules[name]
del __project_files
del __project_entry
`;

function isSafeProjectPath(path: string): boolean {
	if (!path || path.startsWith('/') || path.includes('\\') || path.includes('\0')) return false;
	return path.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}

self.onmessage = async (
	event: MessageEvent<{
		type: 'run';
		id: number;
		code: string;
		filename?: string;
		files?: { path: string; content: string }[];
	}>
) => {
	if (event.data.type !== 'run') return;

	const { id, code, filename = '', files = [] } = event.data;
	const startedAt = performance.now();
	let stdout = '';
	let stderr = '';
	let globals: PyProxy | undefined;

	try {
		const runtime = await runtimePromise;
		send({ type: 'status', status: 'running' });
		runtime.setStdout({ batched: (text) => (stdout += `${text}\n`) });
		runtime.setStderr({ batched: (text) => (stderr += `${text}\n`) });
		await runtime.loadPackagesFromImports(code);
		const mounted = Object.fromEntries(
			files.filter((file) => isSafeProjectPath(file.path)).map((file) => [file.path, file.content])
		);
		runtime.globals.set('__project_files', JSON.stringify(mounted));
		runtime.globals.set('__project_entry', filename);
		await runtime.runPythonAsync(MOUNT_PROJECT);

		const makeDict = runtime.globals.get('dict');
		globals = makeDict();
		globals.set('__name__', '__main__');
		if (filename && isSafeProjectPath(filename)) globals.set('__file__', `/workspace/${filename}`);
		await runtime.runPythonAsync(code, filename ? { globals, filename } : { globals });

		send({
			type: 'result',
			id,
			stdout: stdout.trimEnd(),
			stderr: stderr.trimEnd(),
			durationMs: performance.now() - startedAt
		});
	} catch (error: unknown) {
		send({
			type: 'error',
			id,
			error: presentPythonError(error instanceof Error ? error.message : String(error), filename),
			durationMs: performance.now() - startedAt
		});
	} finally {
		globals?.destroy();
		send({ type: 'status', status: 'ready' });
	}
};

export {};

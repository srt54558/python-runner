/// <reference lib="webworker" />

import type { PythonWorkerMessage } from './protocol';

const PYODIDE_VERSION = '314.0.7';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

interface PyodideRuntime {
	loadPackagesFromImports(code: string): Promise<void>;
	runPython(code: string): unknown;
	runPythonAsync(code: string, options?: { globals?: unknown }): Promise<unknown>;
	setStdout(options: { batched: (text: string) => void }): void;
	setStderr(options: { batched: (text: string) => void }): void;
	globals: { get(name: string): (...args: unknown[]) => PyProxy };
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

self.onmessage = async (event: MessageEvent<{ type: 'run'; id: number; code: string }>) => {
	if (event.data.type !== 'run') return;

	const { id, code } = event.data;
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

		const makeDict = runtime.globals.get('dict');
		globals = makeDict();
		globals.set('__name__', '__main__');
		await runtime.runPythonAsync(code, { globals });

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
			error: error instanceof Error ? error.message : String(error),
			durationMs: performance.now() - startedAt
		});
	} finally {
		globals?.destroy();
		send({ type: 'status', status: 'ready' });
	}
};

export {};

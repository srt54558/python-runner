import { clipText } from './limits';
import type { PythonWorkerMessage, RunnerStatus } from './protocol';

export const RUN_TIMEOUT_MS = 15_000;
export const PYTHON_IDLE_MS = 5 * 60_000;

export type PythonHostStatus = 'idle' | RunnerStatus;

export type PythonRunInput = {
	code: string;
	filename?: string;
	files?: { path: string; content: string }[];
	onOutput?: (stream: 'stdout' | 'stderr', text: string) => void;
};

export type PythonRunResult = {
	stdout: string;
	stderr: string;
	durationMs: number;
	failed: boolean;
	stopped?: boolean;
	error?: string;
};

type HostState = { status: PythonHostStatus; version?: string };
type Listener = (state: HostState) => void;

type Job = {
	id: number;
	input: PythonRunInput;
	resolve: (result: PythonRunResult) => void;
	timer?: ReturnType<typeof setTimeout>;
	generation: number;
	stdout: string;
	stderr: string;
};

let worker: Worker | undefined;
let generation = 0;
let status: PythonHostStatus = 'idle';
let version: string | undefined;
let broken = false;
let held = false;
let seq = 0;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<Listener>();
let active: Job | undefined;
const queue: Job[] = [];

function emit() {
	const snapshot: HostState = { status, version };
	for (const listener of listeners) listener(snapshot);
}

export function watchPythonHost(listener: Listener) {
	listener({ status, version });
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function clearIdle() {
	if (idleTimer) clearTimeout(idleTimer);
	idleTimer = undefined;
}

function armIdle() {
	clearIdle();
	if (held || status !== 'ready' || active || queue.length) return;
	idleTimer = setTimeout(() => {
		if (active || queue.length) return;
		teardown();
		status = 'idle';
		emit();
	}, PYTHON_IDLE_MS);
}

function teardown() {
	generation += 1;
	const dying = worker;
	worker = undefined;
	dying?.terminate();
}

function failHost(message: string) {
	broken = true;
	const pending = [active, ...queue].filter((job): job is Job => Boolean(job));
	active = undefined;
	queue.length = 0;
	teardown();
	status = 'error';
	emit();
	for (const job of pending) {
		if (job.timer) clearTimeout(job.timer);
		job.resolve({
			stdout: job.stdout,
			stderr: message,
			durationMs: 0,
			failed: true,
			error: message
		});
	}
}

function finish(result: PythonRunResult) {
	const job = active;
	active = undefined;
	if (!job) return;
	if (job.timer) clearTimeout(job.timer);
	if (status !== 'error') status = worker ? 'ready' : 'idle';
	emit();
	job.resolve(result);
	armIdle();
}

function handleMessage(message: PythonWorkerMessage) {
	if (message.type === 'status') {
		if (message.version) version = message.version;
		if (message.status === 'ready') {
			broken = false;
			status = active ? 'running' : 'ready';
			emit();
			pump();
		} else if (message.status === 'running' || message.status === 'loading') {
			status = message.status;
			emit();
		}
		return;
	}
	if (message.type === 'fatal') {
		failHost(message.error);
		return;
	}
	if (message.type === 'output') {
		if (!active || message.id !== active.id) return;
		if (message.stream === 'stdout') active.stdout = clipText(active.stdout + message.text);
		else active.stderr = clipText(active.stderr + message.text);
		active.input.onOutput?.(message.stream, message.text);
		return;
	}
	if (!active || message.id !== active.id) return;
	const job = active;
	finish(
		message.type === 'result'
			? {
					stdout: message.stdout,
					stderr: message.stderr,
					durationMs: message.durationMs,
					failed: false
				}
			: {
					stdout: job.stdout,
					stderr: message.error,
					durationMs: message.durationMs,
					failed: true,
					error: message.error
				}
	);
	pump();
}

function pump() {
	if (active || !worker || status === 'loading' || status === 'error') return;
	const next = queue.shift();
	if (!next) {
		armIdle();
		return;
	}
	if (next.generation !== generation) {
		next.resolve({
			stdout: '',
			stderr: 'Ausführung gestoppt.',
			durationMs: 0,
			failed: true,
			stopped: true,
			error: 'Ausführung gestoppt.'
		});
		pump();
		return;
	}
	active = next;
	clearIdle();
	status = 'running';
	emit();
	next.timer = setTimeout(() => {
		if (active?.id !== next.id) return;
		stopPython(`Ausführung nach ${RUN_TIMEOUT_MS / 1_000} Sekunden gestoppt.`);
	}, RUN_TIMEOUT_MS);
	worker.postMessage({
		type: 'run',
		id: next.id,
		code: next.input.code,
		filename: next.input.filename ?? '',
		files: next.input.files ?? []
	});
}

function ensureWorker() {
	if (broken || worker) return;
	status = 'loading';
	emit();
	const mine = generation;
	const next = new Worker(new URL('$lib/runner/python.worker.ts', import.meta.url), {
		type: 'module'
	});
	worker = next;
	next.onmessage = (event: MessageEvent<PythonWorkerMessage>) => {
		if (worker !== next || mine !== generation) return;
		handleMessage(event.data);
	};
	next.onerror = () => {
		if (worker !== next || mine !== generation) return;
		failHost('Der Python-Prozess wurde unerwartet beendet. Er kann erneut gestartet werden.');
	};
}

export function warmPython() {
	if (worker) return;
	if (broken) {
		broken = false;
		status = 'idle';
	}
	ensureWorker();
}

export function holdPython(hold: boolean) {
	held = hold;
	if (hold) {
		clearIdle();
		warmPython();
		return;
	}
	armIdle();
}

export function runPython(input: PythonRunInput): Promise<PythonRunResult> {
	if (broken && !worker) {
		broken = false;
		status = 'idle';
	}
	return new Promise((resolve) => {
		queue.push({ id: ++seq, input, resolve, generation, stdout: '', stderr: '' });
		ensureWorker();
		pump();
	});
}

export function stopPython(message = 'Ausführung gestoppt.') {
	clearIdle();
	const pending = [active, ...queue].filter((job): job is Job => Boolean(job));
	active = undefined;
	queue.length = 0;
	teardown();
	if (!broken) status = 'idle';
	emit();
	for (const job of pending) {
		if (job.timer) clearTimeout(job.timer);
		job.resolve({
			stdout: job.stdout,
			stderr: job.stderr,
			durationMs: 0,
			failed: true,
			stopped: true,
			error: message
		});
	}
	if (held && !broken) warmPython();
}

export function disposePython() {
	listeners.clear();
	broken = false;
	held = false;
	stopPython();
	version = undefined;
	status = 'idle';
}

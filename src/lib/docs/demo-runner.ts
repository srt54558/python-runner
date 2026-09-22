import type { PythonWorkerMessage } from '$lib/runner/protocol';

const RUN_TIMEOUT_MS = 15_000;

export type DemoState = 'loading' | 'ready' | 'error';

export type DemoResult = {
	stdout: string;
	stderr: string;
	failed: boolean;
};

type Waiter = {
	id: number;
	code: string;
	resolve: (result: DemoResult) => void;
	timer?: ReturnType<typeof setTimeout>;
};

let worker: Worker | undefined;
let ready = false;
let broken = false;
let seq = 0;
let active: Waiter | undefined;
const queue: Waiter[] = [];
const listeners = new Set<(state: DemoState) => void>();

function emit(state: DemoState) {
	for (const listener of listeners) listener(state);
}

function currentState(): DemoState {
	if (broken) return 'error';
	return ready ? 'ready' : 'loading';
}

export function watchDemoRunner(listener: (state: DemoState) => void) {
	ensureWorker();
	listener(currentState());
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function runDemo(code: string): Promise<DemoResult> {
	ensureWorker();
	return new Promise((resolve) => {
		queue.push({ id: ++seq, code, resolve });
		pump();
	});
}

function ensureWorker() {
	if (worker || broken) return;
	ready = false;
	const next = new Worker(new URL('$lib/runner/python.worker.ts', import.meta.url), {
		type: 'module'
	});
	worker = next;
	emit('loading');
	next.onmessage = (event: MessageEvent<PythonWorkerMessage>) => {
		if (worker !== next) return;
		const message = event.data;
		if (message.type === 'status') {
			if (message.status === 'ready') {
				ready = true;
				emit('ready');
				pump();
			}
			return;
		}
		if (message.type === 'fatal') {
			broken = true;
			worker = undefined;
			emit('error');
			settle(message.error);
			return;
		}
		if (!active || message.id !== active.id) return;
		const result =
			message.type === 'result'
				? {
						stdout: message.stdout,
						stderr: message.stderr,
						failed: false
					}
				: { stdout: '', stderr: message.error, failed: true };
		finishActive(result);
		pump();
	};
	next.onerror = () => {
		if (worker !== next) return;
		broken = true;
		worker = undefined;
		emit('error');
		settle('Python konnte nicht geladen werden.');
	};
}

function pump() {
	if (active || !ready || !worker) return;
	const next = queue.shift();
	if (!next) return;
	active = next;
	next.timer = setTimeout(() => {
		if (active?.id !== next.id) return;
		worker?.terminate();
		worker = undefined;
		ready = false;
		finishActive({
			stdout: '',
			stderr: 'Ausführung nach 15 Sekunden gestoppt.',
			failed: true
		});
		ensureWorker();
	}, RUN_TIMEOUT_MS);
	worker.postMessage({ type: 'run', id: next.id, code: next.code, filename: 'beispiel.py' });
}

function finishActive(result: DemoResult) {
	const current = active;
	active = undefined;
	if (!current) return;
	if (current.timer) clearTimeout(current.timer);
	current.resolve(result);
}

function settle(error: string) {
	const pending = [active, ...queue].filter((item): item is Waiter => Boolean(item));
	active = undefined;
	queue.length = 0;
	for (const waiter of pending) {
		if (waiter.timer) clearTimeout(waiter.timer);
		waiter.resolve({ stdout: '', stderr: error, failed: true });
	}
}

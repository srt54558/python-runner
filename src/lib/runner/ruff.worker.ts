/// <reference lib="webworker" />

import init, { PositionEncoding, Workspace } from '@astral-sh/ruff-wasm-web';
import type { RuffDiagnostic, RuffWorkerMessage } from './protocol';

function send(message: RuffWorkerMessage) {
	self.postMessage(message);
}

const workspacePromise = init()
	.then(() => {
		const workspace = new Workspace(
			{
				'line-length': 100,
				'indent-width': 4,
				lint: { select: ['E4', 'E7', 'E9', 'F'] }
			},
			PositionEncoding.Utf16
		);
		send({ type: 'ready', version: Workspace.version() });
		return workspace;
	})
	.catch((error: unknown) => {
		throw error instanceof Error ? error : new Error(String(error));
	});

self.onmessage = async (event: MessageEvent<{ type: 'lint'; id: number; code: string }>) => {
	if (event.data.type !== 'lint') return;

	const { id, code } = event.data;
	try {
		const workspace = await workspacePromise;
		const diagnostics = workspace.check(code) as RuffDiagnostic[];
		send({ type: 'diagnostics', id, diagnostics });
	} catch (error: unknown) {
		send({ type: 'error', id, error: error instanceof Error ? error.message : String(error) });
	}
};

export {};

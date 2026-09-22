<script lang="ts">
	import { onMount, tick } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Download from '@lucide/svelte/icons/download';
	import Files from '@lucide/svelte/icons/files';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Moon from '@lucide/svelte/icons/moon';
	import Play from '@lucide/svelte/icons/play';
	import Redo2 from '@lucide/svelte/icons/redo-2';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Square from '@lucide/svelte/icons/square';
	import Sun from '@lucide/svelte/icons/sun';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import X from '@lucide/svelte/icons/x';
	import FilesExplorer from '$lib/components/files-explorer.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import type {
		PythonWorkerMessage,
		RuffDiagnostic,
		RuffWorkerMessage,
		RunnerStatus
	} from '$lib/runner/protocol';
	import { canShareCode, createShareUrl, decodeCode, IMPORT_PARAM } from '$lib/runner/share';
	import { loadWorkspace, saveWorkspace } from '$lib/workspace/database';
	import { applyEnter } from '$lib/workspace/indent';
	import {
		closeFile,
		contentSignature,
		createInitialWorkspace,
		hasUnsavedChanges,
		LEGACY_STORAGE_KEY,
		openFile,
		selectFolder,
		updateFileContent,
		workspaceExport,
		type WorkspaceFile,
		type WorkspaceSnapshot
	} from '$lib/workspace/model';

	const RUN_TIMEOUT_MS = 15_000;
	const MAX_HISTORY_ENTRIES = 200;
	const SAVE_DELAY_MS = 500;

	let workspace = $state(createInitialWorkspace());
	let hydrated = $state(false);
	let savedSignature = $state('');
	let savedContents = $state<Record<string, string>>({});
	let output = $state('Python wird im Browser geladen.');
	let runnerStatus = $state<RunnerStatus>('loading');
	let pythonVersion = $state<string>();
	let ruffVersion = $state<string>();
	let diagnostics = $state<RuffDiagnostic[]>([]);
	let lintError = $state<string>();
	let notice = $state('');
	let theme = $state<'light' | 'dark'>('light');
	let clearOpen = $state(false);
	let filesOpen = $state(false);
	let explorerToken = $state(0);
	let pane = $state<'code' | 'problems'>('code');
	let terminalCollapsed = $state(false);
	let editorScrollTop = $state(0);
	let editorRef = $state<HTMLTextAreaElement | null>(null);
	let consoleViewport = $state<HTMLElement | null>(null);
	let history = $state<string[]>(['']);
	let historyIndex = $state(0);

	let pythonWorker: Worker | undefined;
	let ruffWorker: Worker | undefined;
	let runId = 0;
	let lintId = 0;
	let lintTimer: ReturnType<typeof setTimeout> | undefined;
	let runTimer: ReturnType<typeof setTimeout> | undefined;
	let noticeTimer: ReturnType<typeof setTimeout> | undefined;
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let saveTicket = 0;
	let saveQueue: Promise<unknown> = Promise.resolve();
	let saveErrorAnnounced = false;
	let pendingRun: { id: number; code: string; filename: string } | undefined;

	const activeFile = $derived(
		workspace.files.find((file) => file.id === workspace.activeFileId) ?? workspace.files[0]
	);
	const code = $derived(activeFile?.content ?? '');
	const openFiles = $derived(
		workspace.openFileIds
			.map((id) => workspace.files.find((file) => file.id === id))
			.filter((file): file is WorkspaceFile => Boolean(file))
	);
	const lineNumbers = $derived(
		Array.from({ length: Math.max(1, code.split('\n').length) }, (_, index) => index + 1)
	);
	const isRunning = $derived(runnerStatus === 'running');
	const canUndo = $derived(historyIndex > 0);
	const canRedo = $derived(historyIndex < history.length - 1);
	const dirty = $derived(hydrated && hasUnsavedChanges(workspace, savedSignature));
	const dirtyFileIds = $derived(
		new Set(
			workspace.files.filter((file) => savedContents[file.id] !== file.content).map((file) => file.id)
		)
	);
	const statusLabel = $derived.by(() => {
		if (runnerStatus === 'loading') return 'Python wird geladen';
		if (runnerStatus === 'running') return 'Wird ausgeführt';
		if (runnerStatus === 'error') return 'Python nicht verfügbar';
		return pythonVersion ? `Python ${pythonVersion}` : 'Python bereit';
	});

	function announce(message: string) {
		notice = message;
		if (noticeTimer) clearTimeout(noticeTimer);
		noticeTimer = setTimeout(() => (notice = ''), 3_000);
	}

	function updateOutput(value: string) {
		output = value;
		void tick().then(() => {
			if (consoleViewport) consoleViewport.scrollTop = consoleViewport.scrollHeight;
		});
	}

	function markSaved(snapshot: WorkspaceSnapshot) {
		savedSignature = contentSignature(snapshot);
		savedContents = Object.fromEntries(snapshot.files.map((file) => [file.id, file.content]));
	}

	function enqueueSave(snapshot: WorkspaceSnapshot, ticket: number): Promise<boolean> {
		const job = saveQueue.then(async () => {
			if (ticket !== saveTicket) return true;
			try {
				await saveWorkspace(snapshot);
				if (ticket !== saveTicket) return true;
				markSaved(snapshot);
				saveErrorAnnounced = false;
				return true;
			} catch {
				if (ticket === saveTicket && !saveErrorAnnounced) {
					saveErrorAnnounced = true;
					announce('Speichern im Browser ist fehlgeschlagen.');
				}
				return false;
			}
		});
		saveQueue = job.then(
			() => undefined,
			() => undefined
		);
		return job;
	}

	function flushWorkspace() {
		if (!hydrated) return;
		if (saveTimer) clearTimeout(saveTimer);
		const snapshot = $state.snapshot(workspace) as WorkspaceSnapshot;
		const ticket = ++saveTicket;
		void enqueueSave(snapshot, ticket);
	}

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (!dirty) return;
		flushWorkspace();
		event.preventDefault();
		event.returnValue = 'Es gibt ungespeicherte Änderungen.';
	}

	function editActiveFile(value: string) {
		const next = updateFileContent(workspace, workspace.activeFileId, value);
		if (next === workspace) return;
		workspace = next;
		history = [...history.slice(0, historyIndex + 1), value].slice(-MAX_HISTORY_ENTRIES);
		historyIndex = history.length - 1;
	}

	function applyWorkspace(next: WorkspaceSnapshot) {
		const activeChanged = next.activeFileId !== workspace.activeFileId;
		workspace = next;
		if (!activeChanged) return;
		const content = next.files.find((file) => file.id === next.activeFileId)?.content ?? '';
		history = [content];
		historyIndex = 0;
		pane = 'code';
	}

	function showFile(fileId: string) {
		applyWorkspace(openFile(workspace, fileId));
		pane = 'code';
		void tick().then(() => editorRef?.focus());
	}

	function closeTab(fileId: string) {
		applyWorkspace(closeFile(workspace, fileId));
	}

	function openExplorer() {
		const folderId = activeFile?.folderId;
		if (folderId && workspace.selectedFolderId !== folderId) {
			workspace = selectFolder(workspace, folderId);
		}
		explorerToken += 1;
		filesOpen = true;
	}

	async function handleEditorKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) {
			return;
		}
		const el = event.currentTarget as HTMLTextAreaElement;
		event.preventDefault();
		const next = applyEnter(el.value, el.selectionStart, el.selectionEnd);
		editActiveFile(next.value);
		await tick();
		const placeCursor = () => {
			if (!editorRef || editorRef.value !== next.value) return;
			editorRef.selectionStart = editorRef.selectionEnd = next.cursor;
		};
		placeCursor();
		requestAnimationFrame(placeCursor);
	}

	function undo() {
		if (!canUndo) return;
		historyIndex -= 1;
		workspace = updateFileContent(workspace, workspace.activeFileId, history[historyIndex]);
		void tick().then(() => editorRef?.focus());
	}

	function redo() {
		if (!canRedo) return;
		historyIndex += 1;
		workspace = updateFileContent(workspace, workspace.activeFileId, history[historyIndex]);
		void tick().then(() => editorRef?.focus());
	}

	function startPythonWorker() {
		pythonWorker?.terminate();
		runnerStatus = 'loading';
		const worker = new Worker(new URL('$lib/runner/python.worker.ts', import.meta.url), {
			type: 'module'
		});
		pythonWorker = worker;
		worker.onmessage = (event: MessageEvent<PythonWorkerMessage>) => {
			if (pythonWorker !== worker) return;
			const message = event.data;
			if (message.type === 'status') {
				runnerStatus = message.status;
				if (message.version) pythonVersion = message.version;
				if (message.status === 'ready' && pendingRun) {
					const nextRun = pendingRun;
					pendingRun = undefined;
					dispatchRun(worker, nextRun.id, nextRun.code, nextRun.filename);
				}
				return;
			}
			if (message.type === 'fatal') {
				pendingRun = undefined;
				worker.terminate();
				pythonWorker = undefined;
				runnerStatus = 'error';
				updateOutput(`Python konnte nicht geladen werden.\n${message.error}`);
				return;
			}
			if (message.id !== runId) return;
			if (runTimer) clearTimeout(runTimer);
			if (message.type === 'result') {
				const text = [message.stdout, message.stderr].filter(Boolean).join('\n');
				updateOutput(
					`${text || '(ohne Ausgabe beendet)'}\n\nBeendet in ${Math.round(message.durationMs)} ms`
				);
			} else {
				updateOutput(`${message.error}\n\nNach ${Math.round(message.durationMs)} ms beendet`);
			}
		};
		worker.onerror = (event) => {
			event.preventDefault();
			if (pythonWorker !== worker) return;
			pendingRun = undefined;
			worker.terminate();
			pythonWorker = undefined;
			runnerStatus = 'error';
			updateOutput('Der Python-Prozess wurde unerwartet beendet. Er kann erneut gestartet werden.');
		};
	}

	function startRuffWorker() {
		ruffWorker?.terminate();
		const worker = new Worker(new URL('$lib/runner/ruff.worker.ts', import.meta.url), {
			type: 'module'
		});
		ruffWorker = worker;
		worker.onmessage = (event: MessageEvent<RuffWorkerMessage>) => {
			if (ruffWorker !== worker) return;
			const message = event.data;
			if (message.type === 'ready') {
				ruffVersion = message.version;
				scheduleLint();
				return;
			}
			if (message.id !== lintId) return;
			if (message.type === 'diagnostics') {
				diagnostics = message.diagnostics;
				lintError = undefined;
			} else {
				lintError = message.error;
			}
		};
		worker.onerror = (event) => {
			event.preventDefault();
			if (ruffWorker !== worker) return;
			lintError = 'Der Ruff-Worker konnte nicht geladen werden.';
			worker.terminate();
			ruffWorker = undefined;
		};
	}

	function scheduleLint(source = code) {
		if (lintTimer) clearTimeout(lintTimer);
		lintTimer = setTimeout(() => {
			lintId += 1;
			ruffWorker?.postMessage({ type: 'lint', id: lintId, code: source });
		}, 180);
	}

	function runCode() {
		if (isRunning) {
			stopRun('Ausführung gestoppt.');
			return;
		}
		if (runnerStatus === 'loading') return;
		runId += 1;
		const filename = activeFile?.name ?? 'main.py';
		if (!pythonWorker || runnerStatus === 'error') {
			pendingRun = { id: runId, code, filename };
			updateOutput('Python wird im Browser neu geladen.');
			startPythonWorker();
			return;
		}
		dispatchRun(pythonWorker, runId, code, filename);
	}

	function dispatchRun(worker: Worker, id: number, source: string, filename: string) {
		runnerStatus = 'running';
		updateOutput(`$ python3 ${filename}\n`);
		worker.postMessage({ type: 'run', id, code: source });
		runTimer = setTimeout(
			() => stopRun(`Ausführung nach ${RUN_TIMEOUT_MS / 1_000} Sekunden gestoppt.`),
			RUN_TIMEOUT_MS
		);
	}

	function stopRun(message: string) {
		if (runTimer) clearTimeout(runTimer);
		pendingRun = undefined;
		pythonWorker?.terminate();
		pythonWorker = undefined;
		updateOutput(message);
		startPythonWorker();
	}

	function clearCode() {
		workspace = updateFileContent(workspace, workspace.activeFileId, '');
		history = [''];
		historyIndex = 0;
		announce('Code gelöscht');
	}

	function downloadCode() {
		const filename = activeFile?.name ?? 'main.py';
		const blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/x-python;charset=utf-8' }));
		const link = document.createElement('a');
		link.href = blobUrl;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(blobUrl);
		announce(`${filename} heruntergeladen`);
	}

	async function downloadDatabase() {
		const snapshot = $state.snapshot(workspace) as WorkspaceSnapshot;
		if (saveTimer) clearTimeout(saveTimer);
		const ticket = ++saveTicket;
		const stored = await enqueueSave(snapshot, ticket);
		const blobUrl = URL.createObjectURL(
			new Blob([workspaceExport(snapshot)], { type: 'application/json' })
		);
		const link = document.createElement('a');
		link.href = blobUrl;
		link.download = 'python-workspace.json';
		link.click();
		URL.revokeObjectURL(blobUrl);
		announce(
			stored
				? 'Datenbank heruntergeladen'
				: 'JSON heruntergeladen. Speichern im Browser ist fehlgeschlagen.'
		);
	}

	async function shareCode() {
		const shareUrl = createShareUrl(code, window.location);
		if (!canShareCode(code, window.location)) {
			downloadCode();
			announce('Der Code ist zu lang für eine zuverlässige URL und wurde heruntergeladen.');
			return;
		}
		try {
			if (navigator.share) {
				await navigator.share({ title: activeFile?.name ?? 'Python', url: shareUrl });
				announce('Teilen geöffnet');
			} else {
				await navigator.clipboard.writeText(shareUrl);
				announce('Link kopiert');
			}
		} catch (error: unknown) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			announce('Der Link konnte nicht geteilt werden.');
		}
	}

	function applyTheme(nextTheme: 'light' | 'dark') {
		theme = nextTheme;
		document.documentElement.classList.toggle('dark', nextTheme === 'dark');
		document.documentElement.style.colorScheme = nextTheme;
		localStorage.setItem('theme', nextTheme);
	}

	function handleShortcut(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement) return;
		if (!(event.metaKey || event.ctrlKey)) return;
		if (event.key.toLowerCase() === 's') {
			event.preventDefault();
			downloadCode();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			runCode();
		}
	}

	$effect(() => {
		if (!hydrated) return;
		const source = code;
		scheduleLint(source);
		return () => {
			if (lintTimer) clearTimeout(lintTimer);
		};
	});

	$effect(() => {
		if (!hydrated) return;
		const snapshot = $state.snapshot(workspace) as WorkspaceSnapshot;
		const ticket = ++saveTicket;
		saveTimer = setTimeout(() => void enqueueSave(snapshot, ticket), SAVE_DELAY_MS);
		return () => {
			if (saveTimer) clearTimeout(saveTimer);
		};
	});

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		applyTheme(
			savedTheme === 'dark' || savedTheme === 'light'
				? savedTheme
				: window.matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light'
		);
		const desktop = !window.matchMedia('(max-width: 899px)').matches;
		let cancelled = false;
		void boot();
		return () => {
			cancelled = true;
			pythonWorker?.terminate();
			ruffWorker?.terminate();
			if (lintTimer) clearTimeout(lintTimer);
			if (runTimer) clearTimeout(runTimer);
			if (noticeTimer) clearTimeout(noticeTimer);
			if (saveTimer) clearTimeout(saveTimer);
		};

		async function boot() {
			const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
			let loaded: { snapshot: WorkspaceSnapshot; created: boolean };
			try {
				loaded = await loadWorkspace(legacy);
			} catch {
				loaded = { snapshot: createInitialWorkspace(legacy), created: false };
				announce('Die gespeicherte Workspace konnte nicht gelesen werden.');
			}
			if (cancelled) return;
			const url = new URL(window.location.href);
			const hasImport = url.searchParams.has(IMPORT_PARAM);
			const imported = hasImport ? decodeCode(url.hash.slice(1)) : null;
			let next = loaded.snapshot;
			if (imported !== null) {
				next = updateFileContent(next, next.activeFileId, imported);
				announce('Geteilter Code importiert');
			} else if (hasImport) {
				announce('Der geteilte Code ist ungültig oder zu groß.');
			}
			if (loaded.created && legacy) localStorage.removeItem(LEGACY_STORAGE_KEY);
			markSaved(loaded.snapshot);
			workspace = next;
			const content = next.files.find((file) => file.id === next.activeFileId)?.content ?? '';
			history = [content];
			historyIndex = 0;
			hydrated = true;
			if (!desktop) return;
			startPythonWorker();
			startRuffWorker();
		}
	});
</script>

<svelte:head>
	<title>Python Runner — K+</title>
	<meta name="description" content="Python 3 direkt und vollständig lokal im Browser ausführen." />
</svelte:head>

<svelte:window
	onkeydown={handleShortcut}
	onbeforeunload={handleBeforeUnload}
	onpagehide={flushWorkspace}
/>

<div class="mobile-block">
	<div>
		<strong>Nur auf dem Desktop verfügbar</strong>
		<p>Dieser Python-Editor ist für größere Bildschirme ausgelegt.</p>
	</div>
</div>

{#if !hydrated}
	<div class="boot">Workspace wird geladen …</div>
{:else}
	<div class="app-shell">
		<header class="topbar">
			<Button variant="outline" size="sm" onclick={openExplorer} title={dirty ? 'Ungespeicherte Änderungen' : 'Files'}>
				<Files />
				Files
				{#if dirty}<i class="dirty-mark" aria-hidden="true"></i>{/if}
			</Button>
			<div class="toolbar">
				<Badge variant="outline" class="gap-1.5">
					{#if runnerStatus === 'loading'}<LoaderCircle class="size-3 animate-spin" />{:else}<i
							class:running={isRunning}
						></i>{/if}
					{statusLabel}
				</Badge>
				<ButtonGroup.Root aria-label="Ausführen und Datei">
					<Button variant="outline" size="sm" onclick={runCode} disabled={runnerStatus === 'loading'}
						>{#if isRunning}<Square /> Stopp{:else}<Play /> Ausführen{/if}</Button
					>
					<Button variant="outline" size="sm" onclick={shareCode}><Share2 /> Teilen</Button>
					<Button
						variant="outline"
						size="icon-sm"
						onclick={downloadCode}
						aria-label="{activeFile?.name ?? 'Datei'} herunterladen"
						title="Herunterladen (Cmd/Strg+S)"><Download /></Button
					>
				</ButtonGroup.Root>
				<Separator orientation="vertical" class="mx-1 h-5" />
				<ButtonGroup.Root aria-label="Darstellung">
					<Button
						variant={theme === 'light' ? 'secondary' : 'ghost'}
						size="icon-sm"
						onclick={() => applyTheme('light')}
						aria-label="Helles Design"
						aria-pressed={theme === 'light'}><Sun /></Button
					>
					<Button
						variant={theme === 'dark' ? 'secondary' : 'ghost'}
						size="icon-sm"
						onclick={() => applyTheme('dark')}
						aria-label="Dunkles Design"
						aria-pressed={theme === 'dark'}><Moon /></Button
					>
				</ButtonGroup.Root>
			</div>
		</header>

		<main class="workspace">
			{#if terminalCollapsed}
				<section class="editor-pane">{@render editor()}</section>
				<aside class="terminal-rail">
					<Button
						variant="ghost"
						size="icon-sm"
						onclick={() => (terminalCollapsed = false)}
						aria-label="Terminal einblenden"
						title="Terminal einblenden"><ChevronLeft /></Button
					>
				</aside>
			{:else}
				<Resizable.PaneGroup direction="horizontal" autoSaveId="python-runner-layout">
					<Resizable.Pane defaultSize={52} minSize={34}
						><section class="editor-pane">{@render editor()}</section></Resizable.Pane
					>
					<Resizable.Handle withHandle />
					<Resizable.Pane defaultSize={48} minSize={24}
						><section class="terminal-pane">{@render terminal()}</section></Resizable.Pane
					>
				</Resizable.PaneGroup>
			{/if}
		</main>
	</div>

	<FilesExplorer
		bind:open={filesOpen}
		openedToken={explorerToken}
		snapshot={workspace}
		onchange={applyWorkspace}
		ondownload={downloadDatabase}
		onnotice={announce}
	/>

	<AlertDialog.Root bind:open={clearOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Code löschen?</AlertDialog.Title>
				<AlertDialog.Description>
					Der Inhalt von {activeFile?.name ?? 'dieser Datei'} wird gelöscht. Die Datei bleibt im Workspace.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
				<AlertDialog.Action variant="destructive" onclick={clearCode}>Code löschen</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}

{#snippet editor()}
	<div class="editor-tabs">
		<div class="pane-header">
			<div class="file-tabs" role="tablist" aria-label="Geöffnete Dateien">
				{#each openFiles as file (file.id)}
					<div class="file-tab" class:active={pane === 'code' && file.id === activeFile?.id}>
						<button
							type="button"
							role="tab"
							class="tab-name"
							aria-selected={pane === 'code' && file.id === activeFile?.id}
							onclick={() => showFile(file.id)}
						>
							{file.name}
							{#if dirtyFileIds.has(file.id)}
								<i class="dirty-mark" aria-hidden="true"></i>
								<span class="sr-only">Ungespeichert</span>
							{/if}
						</button>
						{#if openFiles.length > 1}
							<button
								type="button"
								class="tab-close"
								aria-label="{file.name} schließen"
								onclick={() => closeTab(file.id)}
							>
								<X />
							</button>
						{/if}
					</div>
				{/each}
				<button
					type="button"
					role="tab"
					class="file-tab tab-name"
					class:active={pane === 'problems'}
					aria-selected={pane === 'problems'}
					onclick={() => (pane = 'problems')}
				>
					Probleme
					{#if diagnostics.length}<Badge variant="secondary">{diagnostics.length}</Badge>{/if}
				</button>
			</div>
			<ButtonGroup.Root aria-label="Code bearbeiten">
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={undo}
					disabled={!canUndo}
					aria-label="Rückgängig"
					title="Rückgängig"><Undo2 /></Button
				>
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={redo}
					disabled={!canRedo}
					aria-label="Wiederholen"
					title="Wiederholen"><Redo2 /></Button
				>
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={() => (clearOpen = true)}
					aria-label="Code löschen"
					title="Code löschen"><Trash2 /></Button
				>
			</ButtonGroup.Root>
		</div>
		{#if pane === 'problems'}
			<div class="problems-content">
				{#if lintError}<p class="error">Linter nicht verfügbar: {lintError}</p>
				{:else if !ruffVersion}<p class="muted">
						<LoaderCircle class="size-3.5 animate-spin" /> Ruff wird geladen …
					</p>
				{:else if diagnostics.length === 0}<p class="muted">
						Keine Probleme gefunden. Ruff {ruffVersion}
					</p>
				{:else}<ScrollArea class="h-full"
						><ul>
							{#each diagnostics as diagnostic (`${diagnostic.start_location.row}:${diagnostic.start_location.column}:${diagnostic.code}:${diagnostic.message}`)}<li>
									<code>{diagnostic.start_location.row}:{diagnostic.start_location.column}</code><span
										>{diagnostic.code ?? 'Syntax'} — {diagnostic.message}</span
									>
								</li>{/each}
						</ul></ScrollArea
					>{/if}
			</div>
		{:else}
			<div class="tab-content">
				<div class="code-editor">
					<div class="line-gutter" aria-hidden="true">
						<div style:transform={`translateY(-${editorScrollTop}px)`}>
							{#each lineNumbers as line (line)}<span>{line}</span>{/each}
						</div>
					</div>
					<Textarea
						bind:ref={editorRef}
						value={code}
						oninput={(event) => editActiveFile((event.currentTarget as HTMLTextAreaElement).value)}
						onkeydown={handleEditorKeydown}
						onscroll={(event) => (editorScrollTop = event.currentTarget.scrollTop)}
						aria-label="Python-Code"
						spellcheck="false"
						autocomplete="off"
						autocapitalize="off"
						class="code-input"
					/>
				</div>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet terminal()}
	<div class="pane-header">
		<h2>Terminal</h2>
		<ButtonGroup.Root aria-label="Terminal steuern">
			<Button variant="ghost" size="sm" onclick={() => updateOutput('')}>Ausgabe löschen</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={() => (terminalCollapsed = true)}
				aria-label="Terminal einklappen"
				title="Terminal einklappen"><ChevronRight /></Button
			>
		</ButtonGroup.Root>
	</div>
	<ScrollArea bind:viewportRef={consoleViewport} class="console-scroll"
		><pre aria-live="polite">{output}</pre></ScrollArea
	>
	<footer>Cmd/Strg + Enter</footer>
{/snippet}

{#if notice}<div class="notice" role="status">{notice}</div>{/if}

<style>
	:global(body) {
		margin: 0;
		min-width: 320px;
		min-height: 100vh;
		overflow: hidden;
	}
	.mobile-block,
	.boot {
		display: none;
	}
	.boot {
		min-height: 100svh;
		place-items: center;
		color: var(--muted-foreground);
		font-size: 0.82rem;
	}
	.app-shell {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		min-height: 100svh;
		background: var(--background);
		color: var(--foreground);
	}
	.topbar,
	.toolbar,
	.pane-header,
	footer,
	.muted,
	.file-tabs,
	.file-tab,
	.tab-name {
		display: flex;
		align-items: center;
	}
	.topbar {
		justify-content: space-between;
		gap: 1rem;
		min-height: 3.25rem;
		padding: 0.55rem 1rem;
		border-bottom: 1px solid var(--border);
	}
	h2,
	p {
		margin: 0;
	}
	footer,
	.muted {
		color: var(--muted-foreground);
		font-size: 0.71rem;
	}
	.toolbar {
		justify-content: flex-end;
		gap: 0.4rem;
	}
	.toolbar i {
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: oklch(0.64 0.16 151);
	}
	.toolbar i.running {
		background: oklch(0.72 0.16 70);
	}
	.dirty-mark {
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 50%;
		background: oklch(0.72 0.16 70);
	}
	.workspace {
		display: flex;
		min-width: 0;
		min-height: 0;
	}
	.editor-pane,
	.terminal-pane {
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
	}
	.editor-tabs {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}
	.pane-header {
		justify-content: space-between;
		gap: 0.75rem;
		min-height: 3.25rem;
		padding: 0.45rem 0.8rem;
		border-bottom: 1px solid var(--border);
	}
	.pane-header h2 {
		font: 600 0.8rem/1 var(--font-code);
	}
	.file-tabs {
		gap: 0.15rem;
		min-width: 0;
		overflow-x: auto;
	}
	.file-tab {
		gap: 0.05rem;
		flex: 0 0 auto;
		border-bottom: 2px solid transparent;
		color: var(--muted-foreground);
	}
	.file-tab.active {
		border-bottom-color: var(--foreground);
		color: var(--foreground);
	}
	.tab-name {
		gap: 0.35rem;
		min-height: 2rem;
		padding: 0 0.35rem;
		border: 0;
		background: transparent;
		color: inherit;
		font: 500 0.8rem/1 var(--font-sans);
		cursor: pointer;
	}
	.tab-close {
		display: grid;
		width: 1.15rem;
		height: 1.15rem;
		place-items: center;
		border: 0;
		border-radius: 0.25rem;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
	.tab-close:hover {
		background: var(--muted);
	}
	:global(.tab-close svg) {
		width: 0.75rem;
		height: 0.75rem;
	}
	.tab-content {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
	}
	.code-editor {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr);
		height: 100%;
		min-height: 0;
		background: var(--background);
	}
	.line-gutter {
		overflow: hidden;
		padding: 1rem 0.75rem;
		border-right: 1px solid var(--border);
		background: color-mix(in oklch, var(--muted) 30%, var(--background));
		color: var(--muted-foreground);
		font: 400 0.76rem/1.55rem var(--font-code);
		text-align: right;
		user-select: none;
	}
	.line-gutter span {
		display: block;
		height: 1.55rem;
	}
	:global(.code-input) {
		height: 100% !important;
		min-height: 0 !important;
		resize: none !important;
		border: 0 !important;
		border-radius: 0 !important;
		padding: 1rem !important;
		background: transparent !important;
		box-shadow: none !important;
		font: 400 0.84rem/1.55rem var(--font-code) !important;
		white-space: pre;
		tab-size: 4;
		field-sizing: fixed;
	}
	.problems-content {
		flex: 1;
		min-height: 0;
		padding: 1rem;
	}
	.problems-content ul {
		display: grid;
		gap: 0.55rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.problems-content li {
		display: grid;
		grid-template-columns: 3.8rem minmax(0, 1fr);
		gap: 0.6rem;
		font-size: 0.76rem;
	}
	.problems-content code {
		color: var(--muted-foreground);
	}
	.error {
		color: var(--destructive);
		font-size: 0.76rem;
	}
	.terminal-pane {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		background: color-mix(in oklch, var(--muted) 22%, var(--background));
	}
	:global(.console-scroll) {
		height: 100%;
		min-height: 0;
	}
	:global(.console-scroll) pre {
		min-height: 100%;
		margin: 0;
		padding: 1rem;
		color: color-mix(in oklch, var(--foreground) 90%, var(--muted-foreground));
		font: 400 0.82rem/1.55rem var(--font-code);
		white-space: pre-wrap;
		word-break: break-word;
	}
	footer {
		justify-content: flex-end;
		min-height: 2.3rem;
		padding: 0.45rem 0.8rem;
		border-top: 1px solid var(--border);
	}
	.terminal-rail {
		display: grid;
		width: 2.75rem;
		flex: 0 0 2.75rem;
		place-items: center;
		border-left: 1px solid var(--border);
		background: var(--secondary);
	}
	.notice {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 50;
		max-width: 24rem;
		padding: 0.65rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--popover);
		color: var(--popover-foreground);
		box-shadow: 0 10px 26px oklch(0 0 0 / 14%);
		font-size: 0.78rem;
	}
	@media (min-width: 900px) {
		.boot {
			display: grid;
		}
	}
	@media (max-width: 899px) {
		.app-shell {
			display: none;
		}
		.mobile-block {
			display: grid;
			min-height: 100svh;
			place-items: center;
			padding: 2rem;
			background: var(--background);
			color: var(--foreground);
			text-align: center;
		}
		.mobile-block strong {
			font-size: 1rem;
		}
		.mobile-block p {
			margin-top: 0.45rem;
			color: var(--muted-foreground);
			font-size: 0.82rem;
		}
	}
</style>

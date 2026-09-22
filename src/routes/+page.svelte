<script lang="ts">
	import { onMount, tick } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Download from '@lucide/svelte/icons/download';
	import Files from '@lucide/svelte/icons/files';
	import Flower2 from '@lucide/svelte/icons/flower-2';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Moon from '@lucide/svelte/icons/moon';
	import Play from '@lucide/svelte/icons/play';
	import Plus from '@lucide/svelte/icons/plus';
	import Redo2 from '@lucide/svelte/icons/redo-2';
	import Save from '@lucide/svelte/icons/save';
	import Book from '@lucide/svelte/icons/book';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Square from '@lucide/svelte/icons/square';
	import Sun from '@lucide/svelte/icons/sun';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import X from '@lucide/svelte/icons/x';
	import FilesExplorer from '$lib/components/files-explorer.svelte';
	import CodeEditor from '$lib/components/code-editor.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import type {
		PythonWorkerMessage,
		RuffDiagnostic,
		RuffWorkerMessage,
		RunnerStatus
	} from '$lib/runner/protocol';
	import { lineExcerpt } from '$lib/editor/explain';
	import { consoleSegments, matchProblem } from '$lib/runner/console-links';
	import { canShareCode, createShareUrl, decodeCode, IMPORT_PARAM } from '$lib/runner/share';
	import { WORKSPACE_ARCHIVE_NAME, workspaceExport } from '$lib/workspace/archive';
	import { loadWorkspace, saveWorkspace, writeWorkspaceBackup } from '$lib/workspace/database';
	import {
		closeFile,
		contentSignature,
		createFile,
		createInitialWorkspace,
		hasUnsavedChanges,
		importFiles,
		LEGACY_STORAGE_KEY,
		openFile,
		selectFolder,
		updateFileContent,
		type WorkspaceFile,
		type WorkspaceSnapshot
	} from '$lib/workspace/model';
	import { applyDocumentTheme, parseTheme, type AppTheme } from '$lib/theme';

	const RUN_TIMEOUT_MS = 15_000;
	const SAVE_DELAY_MS = 250;
	const SHARED_PREVIEW_ID = 'shared-preview';

	let workspace = $state(createInitialWorkspace());
	let hydrated = $state(false);
	let savedSignature = $state('');
	let savedContents = $state<Record<string, string>>({});
	type ConsoleBlock = {
		id: number;
		runId: number | null;
		kind: 'note' | 'run';
		title: string;
		filename: string;
		stdout: string;
		stderr: string;
		status: string;
		finishedAt: string;
		failed: boolean;
	};

	function clockTime(date = new Date()) {
		const pad = (value: number) => String(value).padStart(2, '0');
		return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
	}

	let consoleSeq = 1;
	let consoleBlocks = $state<ConsoleBlock[]>([]);
	let runnerStatus = $state<RunnerStatus>('loading');
	let pythonVersion = $state<string>();
	let diagnostics = $state<RuffDiagnostic[]>([]);
	let lintError = $state<string>();
	let notice = $state('');
	let theme = $state<AppTheme>('light');
	let clearOpen = $state(false);
	let filesOpen = $state(false);
	let explorerToken = $state(0);
	let sharedCode = $state<string | null>(null);
	let viewingShare = $state(false);
	let saveChooser = $state(false);
	let pane = $state<'code' | 'problems'>('code');
	let terminalCollapsed = $state(false);
	let narrow = $state(false);
	let consoleViewport = $state<HTMLElement | null>(null);
	let canUndo = $state(false);
	let canRedo = $state(false);
	let codeEditor = $state<{
		undoEdit: () => void;
		redoEdit: () => void;
		focusEditor: () => void;
		showDiagnostic: (row: number, column: number, endRow: number, endColumn: number) => void;
	} | null>(null);

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
	let lintedFileId = '';

	const activeFile = $derived(
		workspace.files.find((file) => file.id === workspace.activeFileId) ?? workspace.files[0]
	);
	const fileCode = $derived(activeFile?.content ?? '');
	const editorCode = $derived(viewingShare && sharedCode !== null ? sharedCode : fileCode);
	const editorFileId = $derived(viewingShare ? SHARED_PREVIEW_ID : (activeFile?.id ?? ''));
	const editorName = $derived(viewingShare ? 'geteilt.py' : (activeFile?.name ?? 'main.py'));
	const openFiles = $derived(
		workspace.openFileIds
			.map((id) => workspace.files.find((file) => file.id === id))
			.filter((file): file is WorkspaceFile => Boolean(file))
	);
	const isRunning = $derived(runnerStatus === 'running');
	const dirty = $derived(hydrated && hasUnsavedChanges(workspace, savedSignature));
	const dirtyFileIds = $derived(
		new Set(
			workspace.files
				.filter((file) => savedContents[file.id] !== file.content)
				.map((file) => file.id)
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

	function pushNote(block: string, failed = false) {
		const text = block.replace(/\s+$/u, '');
		if (!text) return;
		consoleBlocks = [
			...consoleBlocks,
			{
				id: ++consoleSeq,
				runId: null,
				kind: 'note',
				title: text,
				filename: '',
				stdout: '',
				stderr: '',
				status: '',
				finishedAt: '',
				failed
			}
		];
		scrollConsoleToEnd();
	}

	function beginRun(id: number, filename: string) {
		consoleBlocks = [
			...consoleBlocks,
			{
				id: ++consoleSeq,
				runId: id,
				kind: 'run',
				title: `$ python3 ${filename}`,
				filename,
				stdout: '',
				stderr: '',
				status: '',
				finishedAt: '',
				failed: false
			}
		];
		scrollConsoleToEnd();
	}

	function finishRun(
		id: number,
		patch: Pick<ConsoleBlock, 'stdout' | 'stderr' | 'status' | 'failed'>
	) {
		let updated = false;
		const finishedAt = clockTime();
		consoleBlocks = consoleBlocks.map((block) => {
			if (block.runId !== id || block.status) return block;
			updated = true;
			return { ...block, ...patch, finishedAt };
		});
		if (updated) scrollConsoleToEnd();
		return updated;
	}

	function scrollConsoleToEnd() {
		const pin = () => {
			if (!consoleViewport) return;
			consoleViewport.scrollTop = consoleViewport.scrollHeight;
		};
		void tick().then(() => {
			pin();
			requestAnimationFrame(() => {
				pin();
				requestAnimationFrame(pin);
			});
		});
	}

	function clearConsole() {
		consoleBlocks = [];
	}

	function dismissConsole(id: number) {
		consoleBlocks = consoleBlocks.filter((block) => block.id !== id);
	}

	function markSaved(snapshot: WorkspaceSnapshot) {
		savedSignature = contentSignature(snapshot);
		savedContents = Object.fromEntries(snapshot.files.map((file) => [file.id, file.content]));
	}

	function enqueueSave(
		snapshot: WorkspaceSnapshot,
		ticket: number,
		savedAt: number
	): Promise<boolean> {
		const job = saveQueue.then(async () => {
			if (ticket !== saveTicket) return true;
			try {
				await saveWorkspace(snapshot, savedAt);
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
		const savedAt = writeWorkspaceBackup(snapshot);
		void enqueueSave(snapshot, ticket, savedAt);
	}

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (!hydrated) return;
		flushWorkspace();
		if (!dirty && sharedCode === null) return;
		event.preventDefault();
		event.returnValue = 'Es gibt ungespeicherte Änderungen.';
	}

	function handleVisibility() {
		if (document.visibilityState === 'hidden') flushWorkspace();
	}

	function editActiveFile(value: string) {
		if (viewingShare && sharedCode !== null) {
			if (value === sharedCode) return;
			sharedCode = value;
			return;
		}
		const next = updateFileContent(workspace, workspace.activeFileId, value);
		if (next === workspace) return;
		workspace = next;
	}

	function applyWorkspace(next: WorkspaceSnapshot) {
		const activeChanged = next.activeFileId !== workspace.activeFileId;
		workspace = next;
		if (activeChanged) pane = 'code';
	}

	function showFile(fileId: string) {
		viewingShare = false;
		applyWorkspace(openFile(workspace, fileId));
		pane = 'code';
		void tick().then(() => codeEditor?.focusEditor());
	}

	function closeTab(fileId: string) {
		applyWorkspace(closeFile(workspace, fileId));
	}

	function addFile() {
		const folderId = activeFile?.folderId;
		if (!folderId) return;
		applyWorkspace(createFile(workspace, folderId, 'datei'));
		pane = 'code';
	}

	function toggleProblems() {
		pane = pane === 'problems' ? 'code' : 'problems';
	}

	function showLinkedProblem(diagnostic: RuffDiagnostic) {
		pane = 'code';
		const start = diagnostic.start_location;
		const end = diagnostic.end_location;
		void tick().then(() =>
			codeEditor?.showDiagnostic(start.row, start.column, end.row, end.column)
		);
	}

	function consoleWhere(block: ConsoleBlock): RuffDiagnostic | null {
		if (!block.stderr || !block.filename || block.filename !== editorName) return null;
		const matches = consoleSegments(block.stderr, block.filename).flatMap((segment) => {
			if (segment.line === null) return [];
			const diagnostic = matchProblem(
				diagnostics,
				segment.line,
				segment.column,
				segment.endColumn
			);
			return diagnostic ? [diagnostic] : [];
		});
		return matches.at(-1) ?? null;
	}

	function restoredWorkspace() {
		sharedCode = null;
		viewingShare = false;
		saveChooser = false;
		pane = 'code';
		const url = new URL(window.location.href);
		if (url.searchParams.has(IMPORT_PARAM)) {
			url.searchParams.delete(IMPORT_PARAM);
			url.hash = '';
			history.replaceState(null, '', `${url.pathname}${url.search}`);
		}
		void tick().then(() => codeEditor?.focusEditor());
	}

	function openExplorer() {
		saveChooser = false;
		const folderId = activeFile?.folderId;
		if (folderId && workspace.selectedFolderId !== folderId) {
			workspace = selectFolder(workspace, folderId);
		}
		explorerToken += 1;
		filesOpen = true;
	}

	function openSaveShare() {
		saveChooser = true;
		explorerToken += 1;
		filesOpen = true;
	}

	function saveShared(folderId: string) {
		if (sharedCode === null) return;
		const next = importFiles(workspace, folderId, [{ name: 'geteilt.py', content: sharedCode }]);
		sharedCode = null;
		viewingShare = false;
		saveChooser = false;
		filesOpen = false;
		applyWorkspace(next);
		const url = new URL(window.location.href);
		url.searchParams.delete(IMPORT_PARAM);
		url.hash = '';
		history.replaceState(null, '', `${url.pathname}${url.search}`);
		announce('Geteilte Datei gespeichert');
	}

	function undo() {
		codeEditor?.undoEdit();
	}

	function redo() {
		codeEditor?.redoEdit();
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
				pushNote(`Python konnte nicht geladen werden.\n${message.error}`, true);
				return;
			}
			if (message.id !== runId) return;
			if (runTimer) clearTimeout(runTimer);
			if (message.type === 'result') {
				finishRun(message.id, {
					stdout: message.stdout || (message.stderr ? '' : '(ohne Ausgabe beendet)'),
					stderr: message.stderr,
					status: `Beendet in ${Math.round(message.durationMs)} ms`,
					failed: false
				});
			} else {
				finishRun(message.id, {
					stdout: '',
					stderr: message.error,
					status: `Nach ${Math.round(message.durationMs)} ms beendet`,
					failed: true
				});
			}
		};
		worker.onerror = (event) => {
			event.preventDefault();
			if (pythonWorker !== worker) return;
			pendingRun = undefined;
			worker.terminate();
			pythonWorker = undefined;
			runnerStatus = 'error';
			pushNote(
				'Der Python-Prozess wurde unerwartet beendet. Er kann erneut gestartet werden.',
				true
			);
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

	function scheduleLint(source = editorCode) {
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
		terminalCollapsed = false;
		runId += 1;
		const filename = editorName;
		if (!pythonWorker || runnerStatus === 'error') {
			pendingRun = { id: runId, code: editorCode, filename };
			startPythonWorker();
			return;
		}
		dispatchRun(pythonWorker, runId, editorCode, filename);
	}

	function dispatchRun(worker: Worker, id: number, source: string, filename: string) {
		runnerStatus = 'running';
		beginRun(id, filename);
		worker.postMessage({ type: 'run', id, code: source, filename });
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
		if (!finishRun(runId, { stdout: '', stderr: '', status: message, failed: true }))
			pushNote(message, true);
		startPythonWorker();
	}

	function clearCode() {
		if (viewingShare && sharedCode !== null) {
			sharedCode = '';
			announce('Code gelöscht');
			return;
		}
		workspace = updateFileContent(workspace, workspace.activeFileId, '');
		announce('Code gelöscht');
	}

	function downloadCode() {
		const filename = editorName;
		const blobUrl = URL.createObjectURL(
			new Blob([editorCode], { type: 'text/x-python;charset=utf-8' })
		);
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
		const savedAt = writeWorkspaceBackup(snapshot);
		const stored = await enqueueSave(snapshot, ticket, savedAt);
		const blobUrl = URL.createObjectURL(
			new Blob([workspaceExport(snapshot)], { type: 'text/x-python;charset=utf-8' })
		);
		const link = document.createElement('a');
		link.href = blobUrl;
		link.download = WORKSPACE_ARCHIVE_NAME;
		link.click();
		URL.revokeObjectURL(blobUrl);
		announce(
			stored
				? 'Datenbank heruntergeladen'
				: 'Python-Datei heruntergeladen. Speichern im Browser ist fehlgeschlagen.'
		);
	}

	async function shareCode() {
		const shareUrl = createShareUrl(editorCode, window.location);
		if (!canShareCode(editorCode, window.location)) {
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

	function applyTheme(nextTheme: AppTheme) {
		theme = nextTheme;
		applyDocumentTheme(nextTheme);
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
		const source = editorCode;
		const fileId = editorFileId;
		if (fileId !== lintedFileId) {
			lintedFileId = fileId;
			diagnostics = [];
		}
		scheduleLint(source);
		return () => {
			if (lintTimer) clearTimeout(lintTimer);
		};
	});

	$effect(() => {
		if (!hydrated) return;
		const snapshot = $state.snapshot(workspace) as WorkspaceSnapshot;
		const ticket = ++saveTicket;
		const savedAt = writeWorkspaceBackup(snapshot);
		saveTimer = setTimeout(() => void enqueueSave(snapshot, ticket, savedAt), SAVE_DELAY_MS);
		return () => {
			if (saveTimer) clearTimeout(saveTimer);
		};
	});

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		applyTheme(parseTheme(savedTheme, window.matchMedia('(prefers-color-scheme: dark)').matches));
		const narrowQuery = window.matchMedia('(max-width: 899px)');
		const syncNarrow = () => {
			narrow = narrowQuery.matches;
		};
		syncNarrow();
		narrowQuery.addEventListener('change', syncNarrow);
		let cancelled = false;
		void boot();
		return () => {
			cancelled = true;
			narrowQuery.removeEventListener('change', syncNarrow);
			flushWorkspace();
			pythonWorker?.terminate();
			ruffWorker?.terminate();
			if (lintTimer) clearTimeout(lintTimer);
			if (runTimer) clearTimeout(runTimer);
			if (noticeTimer) clearTimeout(noticeTimer);
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
			if (imported !== null) {
				sharedCode = imported;
				viewingShare = true;
				announce('Geteilter Code geöffnet');
			} else if (hasImport) {
				announce('Der geteilte Code ist ungültig oder zu groß.');
			}
			if (loaded.created && legacy) localStorage.removeItem(LEGACY_STORAGE_KEY);
			markSaved(loaded.snapshot);
			workspace = loaded.snapshot;
			hydrated = true;
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
	onvisibilitychange={handleVisibility}
/>

{#if !hydrated}
	<div class="boot">Workspace wird geladen …</div>
{:else}
	<div class="app-shell">
		<header class="topbar">
			<Button
				variant="outline"
				size={narrow ? 'icon-sm' : 'sm'}
				class="files-button"
				onclick={openExplorer}
				aria-label="Files"
				title={dirty ? 'Ungespeicherte Änderungen' : 'Files'}
			>
				<Files />
				<span class="action-label">Files</span>
				{#if dirty}<i class="dirty-mark" aria-hidden="true"></i>{/if}
			</Button>
			<div class="toolbar">
				<Badge
					variant="outline"
					class="status-badge gap-1.5"
					aria-label={statusLabel}
					title={statusLabel}
				>
					{#if runnerStatus === 'loading'}<LoaderCircle class="size-3 animate-spin" />{:else}<i
							class:running={isRunning}
						></i>{/if}
					<span class="status-label">{statusLabel}</span>
				</Badge>
				<ButtonGroup.Root aria-label="Ausführen und Datei">
					<Button
						variant="outline"
						size={narrow ? 'icon-sm' : 'sm'}
						onclick={runCode}
						disabled={runnerStatus === 'loading'}
						aria-label={isRunning ? 'Stopp' : 'Ausführen'}
						title={runnerStatus === 'loading' ? 'Python wird geladen' : isRunning ? 'Stopp' : 'Ausführen'}
						>{#if isRunning}<Square />{:else}<Play />{/if}<span class="action-label"
							>{isRunning ? 'Stopp' : 'Ausführen'}</span
						></Button
					>
					<Button
						variant="outline"
						size={narrow ? 'icon-sm' : 'sm'}
						onclick={shareCode}
						aria-label="Teilen"
						title="Teilen"><Share2 /><span class="action-label">Teilen</span></Button
					>
					<Button
						variant="outline"
						size={narrow ? 'icon-sm' : 'sm'}
						href="/docs"
						target="_blank"
						rel="noopener"
						aria-label="Doku"
						title="Python-Grundlagen"><Book /><span class="action-label">Doku</span></Button
					>
					{#if sharedCode !== null}
						<Button
							variant="outline"
							size={narrow ? 'icon-sm' : 'sm'}
							onclick={openSaveShare}
							aria-label="Save to files"
							title="Save to files"><Save /><span class="action-label">Save to files</span></Button
						>
					{/if}
					<Button
						variant="outline"
						size="icon-sm"
						onclick={downloadCode}
						aria-label="{editorName} herunterladen"
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
					<Button
						variant={theme === 'coffee' ? 'secondary' : 'ghost'}
						size="icon-sm"
						onclick={() => applyTheme('coffee')}
						aria-label="Kaffee"
						title="Kaffee"
						aria-pressed={theme === 'coffee'}><Coffee /></Button
					>
					<Button
						variant={theme === 'pink' ? 'secondary' : 'ghost'}
						size="icon-sm"
						onclick={() => applyTheme('pink')}
						aria-label="Rosa"
						title="Rosa"
						aria-pressed={theme === 'pink'}><Flower2 /></Button
					>
				</ButtonGroup.Root>
			</div>
		</header>

		<main class="workspace">
			{#if terminalCollapsed}
				<section class="editor-pane">{@render editor()}</section>
				<aside class="terminal-rail">
					<button
						type="button"
						class="rail-toggle"
						onclick={() => (terminalCollapsed = false)}
						aria-label="Ausgabe einblenden"
						title="Ausgabe einblenden"
					>
						<ChevronLeft /><span class="rail-label">Ausgabe</span>
					</button>
				</aside>
			{:else}
				<Resizable.PaneGroup
					direction={narrow ? 'vertical' : 'horizontal'}
					autoSaveId={narrow ? 'python-runner-layout-mobile' : 'python-runner-layout'}
				>
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
		onrestore={restoredWorkspace}
		onsave={saveChooser ? saveShared : undefined}
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
				<AlertDialog.Action variant="destructive" onclick={clearCode}
					>Code löschen</AlertDialog.Action
				>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}

{#snippet editor()}
	<div class="editor-tabs">
		<div class="pane-header">
			<div class="file-tabs" role="tablist" aria-label="Geöffnete Dateien">
				{#each openFiles as file (file.id)}
					<div
						class="file-tab"
						class:active={pane === 'code' && !viewingShare && file.id === activeFile?.id}
					>
						<button
							type="button"
							role="tab"
							class="tab-name"
							aria-selected={pane === 'code' && !viewingShare && file.id === activeFile?.id}
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
					class="tab-plus"
					aria-label="Neue Datei"
					title="Neue Datei"
					onclick={addFile}
				>
					<Plus />
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
		<div class="tab-content" hidden={pane !== 'code'}>
			<CodeEditor
				bind:this={codeEditor}
				fileId={editorFileId}
				value={editorCode}
				{diagnostics}
				{theme}
				wrapLines={narrow}
				visible={pane === 'code'}
				onchange={editActiveFile}
				onhistory={(state) => {
					canUndo = state.canUndo;
					canRedo = state.canRedo;
				}}
			/>
		</div>
		{#if pane === 'problems'}
			<div class="problems-content">
				{#if lintError}
					<div class="problems-empty">
						<p>Prüfung nicht verfügbar</p>
					</div>
				{:else if diagnostics.length === 0}
					<div class="problems-empty">
						<p>Keine Probleme</p>
						<p class="muted">Sie erscheinen hier, sobald der Code etwas zu beanstanden hat.</p>
					</div>
				{:else}
					<div class="problems-list">
						<ul>
							{#each diagnostics as diagnostic (`${diagnostic.start_location.row}:${diagnostic.start_location.column}:${diagnostic.code}:${diagnostic.message}`)}
								{@const excerpt = lineExcerpt(editorCode, diagnostic)}
								<li>
									<button
										type="button"
										class="problem-row"
										onclick={() => showLinkedProblem(diagnostic)}
									>
										<span class="problem-meta">
											Zeile {diagnostic.start_location.row}:{diagnostic.start_location.column}
											<Badge variant="secondary">{diagnostic.code ?? 'Syntax'}</Badge>
										</span>
										<span class="problem-detail">{diagnostic.message}</span>
										<pre class="problem-source"><code>{excerpt.line || ' '}</code
											>{#if excerpt.mark}<code class="problem-mark">{excerpt.mark}</code>{/if}</pre>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}
		<div class="editor-bar">
			<button
				type="button"
				class="problems-toggle"
				aria-pressed={pane === 'problems'}
				onclick={toggleProblems}
			>
				Probleme
				{#if diagnostics.length}<Badge variant="secondary">{diagnostics.length}</Badge>{/if}
			</button>
		</div>
	</div>
{/snippet}

{#snippet terminal()}
	<div class="pane-header">
		<h2>Ausgabe</h2>
		<ButtonGroup.Root aria-label="Ausgabe steuern">
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={clearConsole}
				aria-label="Ausgabe löschen"
				title="Ausgabe löschen. Verlauf bis zum Neuladen"><Trash2 /></Button
			>
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={() => (terminalCollapsed = true)}
				aria-label="Ausgabe einklappen"
				title="Ausgabe einklappen"><ChevronRight /></Button
			>
		</ButtonGroup.Root>
	</div>
	<div class="console-scroll" bind:this={consoleViewport}>
		{#if consoleBlocks.length === 0}
			<div class="console-empty">
				<p>Keine Ausgabe</p>
				<p class="muted">Sie erscheint hier, sobald du den Code ausführst.</p>
			</div>
		{:else}
		<ol class="console-log" aria-live="polite">
			{#each consoleBlocks as block (block.id)}
				<li class="console-block" class:run={block.kind === 'run'} class:failed={block.failed}>
					<div class="console-title">
						<span>{block.title}</span>
						<button
							type="button"
							class="console-dismiss"
							aria-label="Ausgabe entfernen"
							title="Ausgabe entfernen"
							onclick={() => dismissConsole(block.id)}><X /></button
						>
					</div>
					{#if block.stdout}<pre class="console-out">{block.stdout}</pre>{/if}
					{#if block.stderr}
						{@const where = consoleWhere(block)}
						<div class="console-err">
							<pre class="console-err-text">{block.stderr}</pre>
							{#if where}
								<Button
									variant="outline"
									size="xs"
									onclick={() => showLinkedProblem(where)}
									title="Im Editor zeigen">Wo?</Button
								>
							{/if}
						</div>
					{/if}
					{#if block.status}
						<p class="console-status">
							<span>{block.status}</span>
							{#if block.finishedAt}<time>{block.finishedAt}</time>{/if}
						</p>
					{/if}
				</li>
			{/each}
		</ol>
		{/if}
	</div>
	<footer>Cmd/Strg + Enter</footer>
{/snippet}

{#if notice}<div class="notice" role="status">{notice}</div>{/if}

<style>
	:global(html),
	:global(body) {
		height: 100%;
		overflow: hidden;
	}
	:global(body) {
		margin: 0;
		min-width: 320px;
	}
	.boot {
		display: grid;
		min-height: 100dvh;
		place-items: center;
		color: var(--muted-foreground);
		font-size: 0.82rem;
	}
	.app-shell {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr);
		width: 100%;
		min-width: 0;
		height: 100dvh;
		max-height: 100dvh;
		overflow: hidden;
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
		min-width: 0;
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
		overflow: hidden;
	}
	.editor-pane,
	.terminal-pane {
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
	}
	.editor-tabs {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		overflow: hidden;
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
	.tab-close:hover,
	.tab-plus:hover {
		background: var(--muted);
	}
	.tab-plus {
		display: grid;
		width: 1.7rem;
		height: 1.7rem;
		flex: 0 0 auto;
		place-items: center;
		border: 0;
		border-radius: 0.35rem;
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
	}
	:global(.tab-close svg),
	:global(.tab-plus svg) {
		width: 0.85rem;
		height: 0.85rem;
	}
	.tab-content {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}
	.tab-content[hidden] {
		display: none;
	}
	.tab-content :global(.code-host) {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
	.problems-content {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}
	.problems-empty {
		display: grid;
		flex: 1;
		place-items: center;
		align-content: center;
		gap: 0.3rem;
		padding: 1.25rem;
		text-align: center;
	}
	.problems-empty p {
		margin: 0;
		font: 600 0.84rem/1.3 var(--font-sans);
		color: var(--foreground);
	}
	.problems-empty .muted {
		font-weight: 400;
		color: var(--muted-foreground);
	}
	.problems-list {
		min-height: 0;
		overflow: auto;
		padding: 0.5rem;
	}
	.problems-content ul {
		display: grid;
		gap: 0.45rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.problem-row {
		display: grid;
		gap: 0.28rem;
		width: 100%;
		padding: 0.65rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 0.55rem;
		background: color-mix(in oklch, var(--muted) 28%, var(--background));
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.problem-row:hover {
		border-color: color-mix(in oklch, var(--foreground) 25%, var(--border));
	}
	.problem-meta,
	.problem-detail {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.problem-meta {
		color: var(--muted-foreground);
		font-size: 0.7rem;
	}
	.problem-detail {
		font-size: 0.8rem;
	}
	.problem-source {
		display: grid;
		margin: 0.15rem 0;
		padding: 0.4rem 0.55rem;
		overflow-x: auto;
		border-radius: 0.35rem;
		background: var(--background);
		font: 400 0.76rem/1.45 var(--font-code);
		font-variant-ligatures: contextual;
		font-feature-settings: 'calt' 1, 'liga' 1;
	}
	.problem-source code {
		white-space: pre;
	}
	.problem-mark {
		color: var(--destructive);
	}
	.editor-bar {
		display: flex;
		align-items: center;
		min-height: 2.15rem;
		padding: 0 0.35rem;
		border-top: 1px solid var(--border);
		background: color-mix(in oklch, var(--muted) 35%, var(--background));
	}
	.problems-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 1.7rem;
		padding: 0 0.55rem;
		border: 0;
		border-radius: 0.35rem;
		background: transparent;
		color: var(--muted-foreground);
		font: 600 0.75rem/1 var(--font-sans);
		cursor: pointer;
	}
	.problems-toggle[aria-pressed='true'] {
		background: var(--accent);
		color: var(--accent-foreground);
	}
	.terminal-pane {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		overflow: hidden;
		background: color-mix(in oklch, var(--muted) 22%, var(--background));
	}
	.console-scroll {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: auto;
	}
	.console-empty {
		display: grid;
		flex: 1;
		place-items: center;
		align-content: center;
		gap: 0.3rem;
		padding: 1.25rem;
		text-align: center;
	}
	.console-empty p {
		margin: 0;
		font: 600 0.84rem/1.3 var(--font-sans);
		color: var(--foreground);
	}
	.console-empty .muted {
		font-weight: 400;
		color: var(--muted-foreground);
	}
	.console-log {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.console-block {
		border: 1px solid var(--border);
		border-left: 3px solid var(--muted-foreground);
		border-radius: 0;
		background: var(--background);
	}
	.console-block.run {
		border-left-color: var(--foreground);
	}
	.console-block.failed {
		border-left-color: var(--destructive);
	}
	.console-title,
	.console-status {
		margin: 0;
	}
	.console-title {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.35rem 0.35rem 0.35rem 0.7rem;
		color: var(--muted-foreground);
		font: 600 0.74rem/1.35 var(--font-code);
		white-space: pre-wrap;
		word-break: break-word;
	}
	.console-dismiss {
		display: grid;
		flex: 0 0 auto;
		place-items: center;
		width: 1.45rem;
		height: 1.45rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
	}
	.console-dismiss:hover {
		color: var(--foreground);
	}
	.console-dismiss :global(svg) {
		width: 0.85rem;
		height: 0.85rem;
	}
	.console-block.run .console-title,
	.console-block.failed .console-title {
		border-bottom: 1px solid var(--border);
		background: color-mix(in oklch, var(--muted) 65%, var(--background));
		color: var(--foreground);
	}
	.console-out,
	.console-err {
		margin: 0;
		padding: 0.65rem 0.75rem 0.7rem;
		font: 400 0.82rem/1.55rem var(--font-code);
		font-variant-ligatures: contextual;
		font-feature-settings: 'calt' 1, 'liga' 1;
		word-break: break-word;
	}
	.console-out {
		color: color-mix(in oklch, var(--foreground) 92%, var(--muted-foreground));
		white-space: pre-wrap;
	}
	.console-err {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.55rem;
		color: var(--destructive);
		background: color-mix(in oklch, var(--destructive) 8%, var(--background));
	}
	.console-err-text {
		margin: 0;
		font: inherit;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.console-out + .console-err {
		border-top: 1px dashed color-mix(in oklch, var(--destructive) 45%, var(--border));
	}
	.console-status {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.35rem 0.75rem 0.45rem;
		border-top: 1px solid var(--border);
		color: var(--muted-foreground);
		font: 550 0.7rem/1.3 var(--font-sans);
	}
	.console-status time {
		flex: 0 0 auto;
		font-variant-numeric: tabular-nums;
		font-family: var(--font-code);
		font-weight: 500;
	}
	footer {
		justify-content: flex-end;
		min-height: 2.3rem;
		padding: 0.45rem 0.8rem;
		border-top: 1px solid var(--border);
	}
	.terminal-rail {
		display: flex;
		width: 2.75rem;
		flex: 0 0 2.75rem;
		border-left: 1px solid var(--border);
		background: var(--secondary);
	}
	.rail-toggle {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--foreground);
		cursor: pointer;
	}
	.rail-toggle:hover {
		background: color-mix(in oklch, var(--foreground) 7%, transparent);
	}
	.rail-toggle :global(svg) {
		width: 1rem;
		height: 1rem;
	}
	.rail-label {
		display: none;
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
	@media (max-width: 899px) {
		.topbar {
			gap: 0.45rem;
			min-height: 0;
			padding: calc(0.4rem + env(safe-area-inset-top)) 0.6rem 0.4rem;
		}
		.topbar > :global(:first-child) {
			flex: 0 0 auto;
		}
		.action-label,
		.status-label {
			display: none;
		}
		:global(.files-button) {
			position: relative;
		}
		:global(.files-button .dirty-mark) {
			position: absolute;
			top: 0.28rem;
			right: 0.28rem;
		}
		.toolbar {
			min-width: 0;
			flex: 1 1 auto;
			justify-content: flex-start;
			overflow-x: auto;
			overscroll-behavior-x: contain;
			scrollbar-width: none;
		}
		.toolbar::-webkit-scrollbar {
			display: none;
		}
		.workspace {
			flex-direction: column;
		}
		.workspace > .editor-pane {
			flex: 1 1 auto;
			height: auto;
			min-height: 0;
		}
		.workspace :global([data-slot='resizable-pane-group']) {
			min-height: 0;
			flex: 1 1 auto;
			flex-direction: column !important;
		}
		.workspace :global([data-slot='resizable-handle']) {
			width: 100% !important;
			height: 0.75rem !important;
			flex: 0 0 0.75rem !important;
		}
		.workspace :global([data-slot='resizable-handle'] > div) {
			transform: rotate(90deg);
		}
		.terminal-pane {
			border-top: 1px solid var(--border);
		}
		.terminal-pane footer {
			display: none;
		}
		.terminal-pane :global([aria-label='Ausgabe einklappen'] svg) {
			transform: rotate(90deg);
		}
		.terminal-rail {
			width: 100%;
			height: calc(2.75rem + env(safe-area-inset-bottom));
			flex: 0 0 auto;
			border-top: 1px solid var(--border);
			border-left: 0;
			padding-bottom: env(safe-area-inset-bottom);
		}
		.terminal-rail :global(svg) {
			transform: rotate(90deg);
		}
		.rail-label {
			display: inline;
			font: 600 0.78rem/1 var(--font-sans);
		}
		.notice {
			right: 0.6rem;
			bottom: calc(0.6rem + env(safe-area-inset-bottom));
			left: 0.6rem;
			max-width: none;
		}
	}
</style>

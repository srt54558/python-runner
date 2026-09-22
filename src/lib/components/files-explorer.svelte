<script lang="ts">
	import Download from '@lucide/svelte/icons/download';
	import FileCode from '@lucide/svelte/icons/file-code';
	import FilePlus from '@lucide/svelte/icons/file-plus';
	import Folder from '@lucide/svelte/icons/folder';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import {
		createFile,
		createFolder,
		deleteFile,
		deleteFolder,
		filesInFolder,
		folderPath,
		folderRows,
		openFile,
		renameFile,
		renameFolder,
		ROOT_FOLDER_ID,
		selectFolder,
		type WorkspaceFile,
		type WorkspaceFolder,
		type WorkspaceSnapshot
	} from '$lib/workspace/model';

	let {
		open = $bindable(false),
		openedToken = 0,
		snapshot,
		onchange,
		ondownload,
		onnotice
	}: {
		open?: boolean;
		openedToken?: number;
		snapshot: WorkspaceSnapshot;
		onchange: (next: WorkspaceSnapshot) => void;
		ondownload: () => void;
		onnotice?: (message: string) => void;
	} = $props();

	let draft = $state('');
	let picked = $state<{ token: number; fileId: string | null } | null>(null);
	let deleteOpen = $state(false);
	let pendingDelete = $state<{ kind: 'file' | 'folder'; id: string; name: string } | null>(null);
	let renaming = $state<{ kind: 'file' | 'folder'; id: string; name: string } | null>(null);

	const rows = $derived(folderRows(snapshot.folders));
	const visibleFiles = $derived(filesInFolder(snapshot, snapshot.selectedFolderId));
	const currentPath = $derived(folderPath(snapshot.folders, snapshot.selectedFolderId));
	const soleFile = $derived(snapshot.files.length <= 1);
	const selectedFileId = $derived.by(() => {
		if (picked?.token === openedToken) return picked.fileId;
		const active = snapshot.files.find((file) => file.id === snapshot.activeFileId);
		return active?.folderId === snapshot.selectedFolderId ? active.id : null;
	});

	function focusRename(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function pickFile(fileId: string | null) {
		picked = { token: openedToken, fileId };
	}

	function chooseFolder(folderId: string) {
		pickFile(null);
		onchange(selectFolder(snapshot, folderId));
	}

	function addFolder() {
		pickFile(null);
		onchange(createFolder(snapshot, snapshot.selectedFolderId, draft));
		draft = '';
	}

	function addFile() {
		const next = createFile(snapshot, snapshot.selectedFolderId, draft);
		const created = next.files.find((file) => !snapshot.files.some((existing) => existing.id === file.id));
		draft = '';
		pickFile(created?.id ?? null);
		onchange(next);
	}

	function openSelected(fileId: string) {
		onchange(openFile(snapshot, fileId));
		open = false;
	}

	function startRename(kind: 'file' | 'folder', id: string, name: string) {
		renaming = { kind, id, name };
	}

	function commitRename() {
		if (!renaming) return;
		const current = renaming;
		renaming = null;
		if (!current.name.trim()) return;
		const next =
			current.kind === 'folder'
				? renameFolder(snapshot, current.id, current.name)
				: renameFile(snapshot, current.id, current.name);
		if (next !== snapshot) onchange(next);
	}

	function handleRenameKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitRename();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			renaming = null;
		}
	}

	function askDeleteFolder(folder: WorkspaceFolder) {
		if (folder.id === ROOT_FOLDER_ID) return;
		if (deleteFolder(snapshot, folder.id) === snapshot) {
			onnotice?.('Dieser Ordner enthält die letzten Dateien und bleibt erhalten.');
			return;
		}
		pendingDelete = { kind: 'folder', id: folder.id, name: folder.name };
		deleteOpen = true;
	}

	function askDeleteFile(file: WorkspaceFile) {
		if (soleFile) {
			onnotice?.('Die letzte Datei bleibt erhalten.');
			return;
		}
		pendingDelete = { kind: 'file', id: file.id, name: file.name };
		deleteOpen = true;
	}

	function confirmDelete() {
		if (!pendingDelete) return;
		const next =
			pendingDelete.kind === 'folder'
				? deleteFolder(snapshot, pendingDelete.id)
				: deleteFile(snapshot, pendingDelete.id);
		if (next === snapshot) {
			onnotice?.(
				pendingDelete.kind === 'folder'
					? 'Dieser Ordner enthält die letzten Dateien und bleibt erhalten.'
					: 'Die letzte Datei bleibt erhalten.'
			);
		} else {
			if (pendingDelete.kind === 'file' && selectedFileId === pendingDelete.id) pickFile(null);
			onchange(next);
		}
		pendingDelete = null;
		deleteOpen = false;
	}

</script>

<Dialog.Root
	bind:open
	onOpenChange={(value) => {
		if (!value) pendingDelete = null;
	}}
>
	<Dialog.Content class="gap-0 overflow-hidden p-0 sm:max-w-3xl">
		<div class="explorer-header">
			<div>
				<Dialog.Title>Files</Dialog.Title>
				<Dialog.Description class="mt-1 text-xs">
					Ordner und Dateien bleiben in diesem Browser gespeichert.
				</Dialog.Description>
			</div>
			<Button variant="outline" size="sm" onclick={ondownload}><Download /> Download DB</Button>
		</div>
		<div class="explorer-panes">
			<section class="pane" aria-label="Ordner">
				<p class="pane-label">Ordner</p>
				<ScrollArea class="pane-scroll">
					<ul>
						{#each rows as row (row.folder.id)}
							<li class:selected={snapshot.selectedFolderId === row.folder.id}>
								{#if renaming?.kind === 'folder' && renaming.id === row.folder.id}
									<input
										class="rename-input"
										style:margin-left={`${0.7 + row.depth * 0.9}rem`}
										{@attach focusRename}
										bind:value={renaming.name}
										aria-label="Neuer Ordnername"
										onkeydown={handleRenameKeydown}
										onblur={commitRename}
									/>
								{:else}
									<button
										type="button"
										class="row"
										style:padding-left={`${0.7 + row.depth * 0.9}rem`}
										aria-current={snapshot.selectedFolderId === row.folder.id ? 'true' : undefined}
										onclick={() => chooseFolder(row.folder.id)}
									>
										<Folder />
										<span>{row.folder.name}</span>
									</button>
									<button
										type="button"
										class="icon-btn"
										aria-label={`${row.folder.name} umbenennen`}
										onclick={() => startRename('folder', row.folder.id, row.folder.name)}
									>
										<Pencil />
									</button>
									<button
										type="button"
										class="icon-btn"
										aria-label={`${row.folder.name} löschen`}
										title={row.folder.id === ROOT_FOLDER_ID ? 'Der Hauptordner bleibt erhalten' : 'Ordner löschen'}
										disabled={row.folder.id === ROOT_FOLDER_ID}
										onclick={() => askDeleteFolder(row.folder)}
									>
										<Trash2 />
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				</ScrollArea>
			</section>
			<section class="pane" aria-label="Dateien">
				<div class="pane-label files-label">
					<span>{currentPath}</span>
					<Button
						variant="outline"
						size="xs"
						disabled={!selectedFileId}
						onclick={() => selectedFileId && openSelected(selectedFileId)}>Öffnen</Button
					>
				</div>
				<ScrollArea class="pane-scroll">
					{#if visibleFiles.length === 0}
						<p class="empty">Dieser Ordner enthält keine Dateien.</p>
					{:else}
						<ul>
							{#each visibleFiles as file (file.id)}
								<li class:selected={selectedFileId === file.id}>
									{#if renaming?.kind === 'file' && renaming.id === file.id}
										<input
											class="rename-input"
											{@attach focusRename}
											bind:value={renaming.name}
											aria-label="Neuer Dateiname"
											onkeydown={handleRenameKeydown}
											onblur={commitRename}
										/>
									{:else}
										<button
											type="button"
											class="row"
											aria-current={selectedFileId === file.id ? 'true' : undefined}
											onclick={() => pickFile(file.id)}
											ondblclick={() => openSelected(file.id)}
										>
											<FileCode />
											<span>{file.name}</span>
											{#if file.id === snapshot.activeFileId}<em>Offen</em>{/if}
										</button>
										<button
											type="button"
											class="icon-btn"
											aria-label={`${file.name} umbenennen`}
											onclick={() => startRename('file', file.id, file.name)}
										>
											<Pencil />
										</button>
										<button
											type="button"
											class="icon-btn"
											aria-label={`${file.name} löschen`}
											title={soleFile ? 'Die letzte Datei bleibt erhalten' : 'Datei löschen'}
											disabled={soleFile}
											onclick={() => askDeleteFile(file)}
										>
											<Trash2 />
										</button>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</ScrollArea>
			</section>
		</div>
		<form
			class="explorer-footer"
			onsubmit={(event) => {
				event.preventDefault();
				addFile();
			}}
		>
			<Input
				bind:value={draft}
				placeholder="Name"
				aria-label="Name für neue Datei oder neuen Ordner"
				autocomplete="off"
			/>
			<Button type="submit" variant="outline" size="sm"><FilePlus /> Datei</Button>
			<Button type="button" variant="outline" size="sm" onclick={addFolder}><FolderPlus /> Ordner</Button>
		</form>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{pendingDelete?.kind === 'folder' ? 'Ordner löschen?' : 'Datei löschen?'}</AlertDialog.Title>
			<AlertDialog.Description>
				{#if pendingDelete?.kind === 'folder'}
					„{pendingDelete.name}“ und alles darin wird aus dem Workspace entfernt.
				{:else}
					„{pendingDelete?.name}“ wird aus dem Workspace entfernt.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={confirmDelete}>Löschen</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<style>
	.explorer-header,
	.explorer-footer,
	.files-label,
	.row {
		display: flex;
		align-items: center;
	}
	.explorer-header {
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 3.2rem 0.9rem 1rem;
	}
	.explorer-panes {
		display: grid;
		grid-template-columns: minmax(13rem, 0.85fr) minmax(0, 1.15fr);
		height: min(26rem, calc(100svh - 12rem));
		min-height: 16rem;
		border-block: 1px solid var(--border);
	}
	.pane {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		min-width: 0;
		min-height: 0;
	}
	.pane + .pane {
		border-left: 1px solid var(--border);
	}
	.pane-label {
		margin: 0;
		padding: 0.55rem 0.75rem;
		color: var(--muted-foreground);
		font-size: 0.68rem;
		font-weight: 650;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.files-label {
		justify-content: space-between;
		gap: 0.5rem;
		text-transform: none;
		letter-spacing: 0;
		font: 500 0.75rem/1.2 var(--font-code);
	}
	.files-label span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.pane-scroll) {
		height: 100%;
		min-height: 0;
	}
	ul {
		margin: 0;
		padding: 0.2rem;
		list-style: none;
	}
	li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		min-height: 2rem;
		border-radius: 0.4rem;
	}
	li.selected {
		background: var(--accent);
		color: var(--accent-foreground);
	}
	.row {
		gap: 0.45rem;
		width: 100%;
		min-width: 0;
		height: 2rem;
		padding-right: 0.35rem;
		border: 0;
		background: transparent;
		color: inherit;
		font: 400 0.78rem/1 var(--font-code);
		text-align: left;
		cursor: pointer;
	}
	.row span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.row em {
		margin-left: auto;
		color: var(--muted-foreground);
		font-style: normal;
		font-size: 0.65rem;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}
	.icon-btn {
		display: grid;
		width: 1.55rem;
		height: 1.55rem;
		place-items: center;
		border: 0;
		border-radius: 0.3rem;
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
	}
	li:hover .icon-btn,
	li:focus-within .icon-btn,
	li.selected .icon-btn {
		opacity: 1;
		pointer-events: auto;
	}
	.icon-btn:hover:not(:disabled) {
		background: var(--background);
		color: var(--foreground);
	}
	li:hover .icon-btn:disabled,
	li:focus-within .icon-btn:disabled,
	li.selected .icon-btn:disabled {
		cursor: not-allowed;
		opacity: 0.35;
		pointer-events: none;
	}
	.rename-input {
		grid-column: 1 / -1;
		width: auto;
		height: 1.7rem;
		margin: 0.15rem 0.3rem;
		border: 1px solid var(--border);
		border-radius: 0.35rem;
		background: var(--background);
		color: var(--foreground);
		font: 400 0.78rem/1 var(--font-code);
		padding: 0 0.4rem;
	}
	.empty {
		margin: 0;
		padding: 1rem 0.8rem;
		color: var(--muted-foreground);
		font-size: 0.78rem;
	}
	.explorer-footer {
		gap: 0.45rem;
		padding: 0.75rem;
	}
	.explorer-footer :global(input) {
		flex: 1;
		font-family: var(--font-code);
	}
	:global(.icon-btn svg) {
		width: 0.85rem;
		height: 0.85rem;
	}
	:global(.row svg) {
		width: 0.9rem;
		height: 0.9rem;
		flex: 0 0 auto;
	}
</style>

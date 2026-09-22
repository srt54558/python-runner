export const WORKSPACE_VERSION = 1;
export const ROOT_FOLDER_ID = 'root';
export const LEGACY_STORAGE_KEY = 'kplus-python-code';

export interface WorkspaceFolder {
	id: string;
	name: string;
	parentId: string | null;
}

export interface WorkspaceFile {
	id: string;
	name: string;
	folderId: string;
	content: string;
	updatedAt: number;
}

export interface WorkspaceLayout {
	problemsOpen: boolean;
	problemsSize: number;
	terminalCollapsed: boolean;
}

export interface WorkspaceSnapshot {
	version: number;
	folders: WorkspaceFolder[];
	files: WorkspaceFile[];
	openFileIds: string[];
	activeFileId: string;
	selectedFolderId: string;
	layout: WorkspaceLayout;
}

export const STARTER_CODE = `from datetime import datetime

name = "Welt"
print(f"Hallo, {name}!")
print("Python-Zeit:", datetime.now().strftime("%H:%M:%S"))
`;

export function createId(prefix: 'file' | 'folder'): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

export function createInitialWorkspace(legacyDraft?: string | null): WorkspaceSnapshot {
	const mainId = createId('file');
	return {
		version: WORKSPACE_VERSION,
		folders: [{ id: ROOT_FOLDER_ID, name: 'Projekt', parentId: null }],
		files: [
			{
				id: mainId,
				name: 'main.py',
				folderId: ROOT_FOLDER_ID,
				content: legacyDraft ?? STARTER_CODE,
				updatedAt: Date.now()
			}
		],
		openFileIds: [mainId],
		activeFileId: mainId,
		selectedFolderId: ROOT_FOLDER_ID,
		layout: { problemsOpen: false, problemsSize: 30, terminalCollapsed: false }
	};
}

export function normalizeName(value: string): string {
	return value.trim().replace(/[\\/]/g, '-');
}

export function normalizeFileName(value: string): string {
	const normalized = normalizeName(value);
	return normalized || 'datei.py';
}

export function isPythonFile(name: string): boolean {
	return name.toLocaleLowerCase('de').endsWith('.py');
}

export function uniqueName(existing: string[], requested: string): string {
	const key = (name: string) => name.toLocaleLowerCase('de');
	const taken = new Set(existing.map(key));
	if (!taken.has(key(requested))) return requested;
	const dot = requested.lastIndexOf('.');
	const stem = dot > 0 ? requested.slice(0, dot) : requested;
	const extension = dot > 0 ? requested.slice(dot) : '';
	const numbered = /^(.*) \((\d+)\)$/u.exec(stem);
	const base = numbered?.[1] ?? stem;
	let suffix = numbered ? Number(numbered[2]) + 1 : 2;
	while (taken.has(key(`${base} (${suffix})${extension}`))) suffix += 1;
	return `${base} (${suffix})${extension}`;
}

export function folderPath(folders: WorkspaceFolder[], folderId: string): string {
	const parts: string[] = [];
	const visited = new Set<string>();
	let current = folders.find((folder) => folder.id === folderId);
	while (current && !visited.has(current.id)) {
		visited.add(current.id);
		parts.unshift(current.name);
		current = current.parentId
			? folders.find((folder) => folder.id === current?.parentId)
			: undefined;
	}
	return parts.join('/');
}

export function sanitizeWorkspace(value: WorkspaceSnapshot): WorkspaceSnapshot {
	const folders = value.folders?.length
		? value.folders
		: [{ id: ROOT_FOLDER_ID, name: 'Projekt', parentId: null }];
	const validFolderIds = new Set(folders.map((folder) => folder.id));
	const files = (value.files ?? []).filter((file) => validFolderIds.has(file.folderId));
	if (!files.length) return createInitialWorkspace();
	const validFileIds = new Set(files.map((file) => file.id));
	const openFileIds = (value.openFileIds ?? []).filter((id) => validFileIds.has(id));
	const activeFileId = validFileIds.has(value.activeFileId)
		? value.activeFileId
		: (openFileIds[0] ?? files[0].id);
	if (!openFileIds.includes(activeFileId)) openFileIds.push(activeFileId);
	return {
		version: WORKSPACE_VERSION,
		folders,
		files,
		openFileIds,
		activeFileId,
		selectedFolderId: validFolderIds.has(value.selectedFolderId)
			? value.selectedFolderId
			: folders[0].id,
		layout: {
			problemsOpen: Boolean(value.layout?.problemsOpen),
			problemsSize: Math.min(55, Math.max(20, value.layout?.problemsSize ?? 30)),
			terminalCollapsed: Boolean(value.layout?.terminalCollapsed)
		}
	};
}

export interface FolderRow {
	folder: WorkspaceFolder;
	depth: number;
}

export function contentSignature(snapshot: WorkspaceSnapshot): string {
	return JSON.stringify({
		folders: snapshot.folders.map(({ id, name, parentId }) => ({ id, name, parentId })),
		files: snapshot.files.map(({ id, name, folderId, content }) => ({ id, name, folderId, content }))
	});
}

export function hasUnsavedChanges(snapshot: WorkspaceSnapshot, savedSignature: string): boolean {
	return contentSignature(snapshot) !== savedSignature;
}

export function folderRows(folders: WorkspaceFolder[]): FolderRow[] {
	const rows: FolderRow[] = [];
	const seen = new Set<string>();
	const childrenOf = (parentId: string | null) =>
		folders
			.filter((folder) => folder.parentId === parentId)
			.sort((a, b) => a.name.localeCompare(b.name, 'de'));
	const walk = (folder: WorkspaceFolder, depth: number) => {
		if (seen.has(folder.id)) return;
		seen.add(folder.id);
		rows.push({ folder, depth });
		for (const child of childrenOf(folder.id)) walk(child, depth + 1);
	};
	for (const root of childrenOf(null)) walk(root, 0);
	return rows;
}

export function filesInFolder(snapshot: WorkspaceSnapshot, folderId: string): WorkspaceFile[] {
	return snapshot.files
		.filter((file) => file.folderId === folderId)
		.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

function siblingFolderNames(
	snapshot: WorkspaceSnapshot,
	parentId: string | null,
	exceptId?: string
): string[] {
	return snapshot.folders
		.filter((folder) => folder.parentId === parentId && folder.id !== exceptId)
		.map((folder) => folder.name);
}

function siblingFileNames(snapshot: WorkspaceSnapshot, folderId: string, exceptId?: string): string[] {
	return snapshot.files
		.filter((file) => file.folderId === folderId && file.id !== exceptId)
		.map((file) => file.name);
}

function fileNameFromInput(value: string): string {
	const normalized = normalizeFileName(value);
	if (normalized === '.' || normalized === '..') return 'datei.py';
	return normalized.includes('.') ? normalized : `${normalized}.py`;
}

export function updateFileContent(
	snapshot: WorkspaceSnapshot,
	fileId: string,
	content: string
): WorkspaceSnapshot {
	const current = snapshot.files.find((file) => file.id === fileId);
	if (!current || current.content === content) return snapshot;
	return {
		...snapshot,
		files: snapshot.files.map((file) =>
			file.id === fileId ? { ...file, content, updatedAt: Date.now() } : file
		)
	};
}

export function selectFolder(snapshot: WorkspaceSnapshot, folderId: string): WorkspaceSnapshot {
	if (
		snapshot.selectedFolderId === folderId ||
		!snapshot.folders.some((folder) => folder.id === folderId)
	) {
		return snapshot;
	}
	return { ...snapshot, selectedFolderId: folderId };
}

export function openFile(snapshot: WorkspaceSnapshot, fileId: string): WorkspaceSnapshot {
	const file = snapshot.files.find((item) => item.id === fileId);
	if (!file) return snapshot;
	const alreadyOpen = snapshot.openFileIds.includes(fileId);
	if (
		alreadyOpen &&
		snapshot.activeFileId === fileId &&
		snapshot.selectedFolderId === file.folderId
	) {
		return snapshot;
	}
	return {
		...snapshot,
		openFileIds: alreadyOpen ? snapshot.openFileIds : [...snapshot.openFileIds, fileId],
		activeFileId: fileId,
		selectedFolderId: file.folderId
	};
}

export function closeFile(snapshot: WorkspaceSnapshot, fileId: string): WorkspaceSnapshot {
	if (snapshot.openFileIds.length <= 1 || !snapshot.openFileIds.includes(fileId)) return snapshot;
	const index = snapshot.openFileIds.indexOf(fileId);
	const openFileIds = snapshot.openFileIds.filter((id) => id !== fileId);
	const activeFileId =
		snapshot.activeFileId === fileId ? openFileIds[Math.max(0, index - 1)] : snapshot.activeFileId;
	return { ...snapshot, openFileIds, activeFileId };
}

export function createFolder(
	snapshot: WorkspaceSnapshot,
	parentId: string,
	rawName: string
): WorkspaceSnapshot {
	if (!snapshot.folders.some((folder) => folder.id === parentId)) return snapshot;
	const name = uniqueName(siblingFolderNames(snapshot, parentId), normalizeName(rawName) || 'Ordner');
	const folder: WorkspaceFolder = { id: createId('folder'), name, parentId };
	return { ...snapshot, folders: [...snapshot.folders, folder], selectedFolderId: folder.id };
}

export function importFiles(
	snapshot: WorkspaceSnapshot,
	folderId: string,
	incoming: { name: string; content: string }[]
): WorkspaceSnapshot {
	if (!incoming.length || !snapshot.folders.some((folder) => folder.id === folderId)) return snapshot;
	let next = snapshot;
	let lastId = '';
	for (const item of incoming) {
		const name = uniqueName(siblingFileNames(next, folderId), fileNameFromInput(item.name));
		const file: WorkspaceFile = {
			id: createId('file'),
			name,
			folderId,
			content: item.content,
			updatedAt: Date.now()
		};
		next = { ...next, files: [...next.files, file], selectedFolderId: folderId };
		lastId = file.id;
	}
	return openFile(next, lastId);
}

export function createFile(
	snapshot: WorkspaceSnapshot,
	folderId: string,
	rawName: string
): WorkspaceSnapshot {
	if (!snapshot.folders.some((folder) => folder.id === folderId)) return snapshot;
	const name = uniqueName(siblingFileNames(snapshot, folderId), fileNameFromInput(rawName));
	const file: WorkspaceFile = {
		id: createId('file'),
		name,
		folderId,
		content: '',
		updatedAt: Date.now()
	};
	return openFile({ ...snapshot, files: [...snapshot.files, file], selectedFolderId: folderId }, file.id);
}

export function renameFolder(
	snapshot: WorkspaceSnapshot,
	folderId: string,
	rawName: string
): WorkspaceSnapshot {
	const folder = snapshot.folders.find((item) => item.id === folderId);
	if (!folder) return snapshot;
	const name = uniqueName(
		siblingFolderNames(snapshot, folder.parentId, folderId),
		normalizeName(rawName) || folder.name
	);
	if (name === folder.name) return snapshot;
	return {
		...snapshot,
		folders: snapshot.folders.map((item) => (item.id === folderId ? { ...item, name } : item))
	};
}

export function renameFile(
	snapshot: WorkspaceSnapshot,
	fileId: string,
	rawName: string
): WorkspaceSnapshot {
	const file = snapshot.files.find((item) => item.id === fileId);
	if (!file) return snapshot;
	const name = uniqueName(siblingFileNames(snapshot, file.folderId, fileId), fileNameFromInput(rawName));
	if (name === file.name) return snapshot;
	return {
		...snapshot,
		files: snapshot.files.map((item) =>
			item.id === fileId ? { ...item, name, updatedAt: Date.now() } : item
		)
	};
}

export function deleteFile(snapshot: WorkspaceSnapshot, fileId: string): WorkspaceSnapshot {
	if (snapshot.files.length <= 1 || !snapshot.files.some((file) => file.id === fileId)) return snapshot;
	const files = snapshot.files.filter((file) => file.id !== fileId);
	let openFileIds = snapshot.openFileIds.filter((id) => id !== fileId);
	let activeFileId = snapshot.activeFileId === fileId ? '' : snapshot.activeFileId;
	if (!files.some((file) => file.id === activeFileId)) {
		activeFileId = openFileIds.find((id) => files.some((file) => file.id === id)) ?? files[0].id;
	}
	if (!openFileIds.includes(activeFileId)) openFileIds = [activeFileId, ...openFileIds];
	return { ...snapshot, files, openFileIds, activeFileId };
}

export function deleteFolder(snapshot: WorkspaceSnapshot, folderId: string): WorkspaceSnapshot {
	if (folderId === ROOT_FOLDER_ID) return snapshot;
	const folder = snapshot.folders.find((item) => item.id === folderId);
	if (!folder) return snapshot;
	const removeIds = new Set<string>();
	const collect = (id: string) => {
		if (removeIds.has(id)) return;
		removeIds.add(id);
		for (const item of snapshot.folders) {
			if (item.parentId === id) collect(item.id);
		}
	};
	collect(folderId);
	const files = snapshot.files.filter((file) => !removeIds.has(file.folderId));
	if (!files.length) return snapshot;
	const folders = snapshot.folders.filter((item) => !removeIds.has(item.id));
	const removedFileIds = new Set(
		snapshot.files.filter((file) => removeIds.has(file.folderId)).map((file) => file.id)
	);
	let openFileIds = snapshot.openFileIds.filter((id) => !removedFileIds.has(id));
	let activeFileId = removedFileIds.has(snapshot.activeFileId) ? '' : snapshot.activeFileId;
	if (!files.some((file) => file.id === activeFileId)) activeFileId = files[0].id;
	if (!openFileIds.includes(activeFileId)) openFileIds = [activeFileId, ...openFileIds];
	const selectedFolderId = removeIds.has(snapshot.selectedFolderId)
		? (folder.parentId ?? ROOT_FOLDER_ID)
		: snapshot.selectedFolderId;
	return { ...snapshot, folders, files, openFileIds, activeFileId, selectedFolderId };
}

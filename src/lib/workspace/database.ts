import { openDB, type IDBPDatabase } from 'idb';
import {
	createInitialWorkspace,
	sanitizeWorkspace,
	type WorkspaceSnapshot
} from './model';

const DATABASE_NAME = 'kplus-python-workspace';
const STORE_NAME = 'workspace';
const SNAPSHOT_KEY = 'current';
const BACKUP_KEY = 'kplus-python-workspace-backup';
const BACKUP_AT_KEY = 'kplus-python-workspace-backup-at';
const IDB_AT_KEY = 'kplus-python-workspace-idb-at';

let lastBackupAt = 0;

let databasePromise: Promise<IDBPDatabase> | undefined;

function database(): Promise<IDBPDatabase> {
	databasePromise ??= openDB(DATABASE_NAME, 1, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
		}
	});
	return databasePromise;
}

export function writeWorkspaceBackup(snapshot: WorkspaceSnapshot): number {
	let savedAt = Date.now();
	if (savedAt <= lastBackupAt) savedAt = lastBackupAt + 1;
	lastBackupAt = savedAt;
	try {
		localStorage.setItem(BACKUP_KEY, JSON.stringify(snapshot));
		localStorage.setItem(BACKUP_AT_KEY, String(savedAt));
	} catch {
		// IndexedDB remains the durable copy when localStorage is full.
	}
	return savedAt;
}

export function markWorkspaceStored(savedAt: number) {
	try {
		localStorage.setItem(IDB_AT_KEY, String(savedAt));
	} catch {
		// The next reload still reads IndexedDB when no newer backup exists.
	}
}

function readBackup(): { savedAt: number; snapshot: WorkspaceSnapshot } | null {
	try {
		const raw = localStorage.getItem(BACKUP_KEY);
		if (!raw) return null;
		const savedAt = Number(localStorage.getItem(BACKUP_AT_KEY) || 0);
		return { savedAt, snapshot: sanitizeWorkspace(JSON.parse(raw) as WorkspaceSnapshot) };
	} catch {
		return null;
	}
}

export function chooseWorkspace(
	stored: WorkspaceSnapshot | null,
	backup: { savedAt: number; snapshot: WorkspaceSnapshot } | null,
	idbSavedAt: number
): WorkspaceSnapshot | null {
	if (!stored) return backup?.snapshot ?? null;
	if (!backup) return stored;
	return backup.savedAt > idbSavedAt ? backup.snapshot : stored;
}

export async function loadWorkspace(legacyDraft?: string | null): Promise<{
	snapshot: WorkspaceSnapshot;
	created: boolean;
}> {
	const db = await database();
	const storedRaw = (await db.get(STORE_NAME, SNAPSHOT_KEY)) as WorkspaceSnapshot | undefined;
	const stored = storedRaw ? sanitizeWorkspace(storedRaw) : null;
	const chosen = chooseWorkspace(stored, readBackup(), Number(localStorage.getItem(IDB_AT_KEY) || 0));
	if (chosen) return { snapshot: chosen, created: false };
	const snapshot = createInitialWorkspace(legacyDraft);
	await db.put(STORE_NAME, snapshot, SNAPSHOT_KEY);
	return { snapshot, created: true };
}

export async function saveWorkspace(snapshot: WorkspaceSnapshot, savedAt = Date.now()): Promise<void> {
	const db = await database();
	await db.put(STORE_NAME, snapshot, SNAPSHOT_KEY);
	markWorkspaceStored(savedAt);
}

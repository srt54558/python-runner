import { openDB, type IDBPDatabase } from 'idb';
import {
	createInitialWorkspace,
	sanitizeWorkspace,
	type WorkspaceSnapshot
} from './model';

const DATABASE_NAME = 'kplus-python-workspace';
const STORE_NAME = 'workspace';
const SNAPSHOT_KEY = 'current';

let databasePromise: Promise<IDBPDatabase> | undefined;

function database(): Promise<IDBPDatabase> {
	databasePromise ??= openDB(DATABASE_NAME, 1, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
		}
	});
	return databasePromise;
}

export async function loadWorkspace(legacyDraft?: string | null): Promise<{
	snapshot: WorkspaceSnapshot;
	created: boolean;
}> {
	const db = await database();
	const stored = (await db.get(STORE_NAME, SNAPSHOT_KEY)) as WorkspaceSnapshot | undefined;
	if (stored) return { snapshot: sanitizeWorkspace(stored), created: false };
	const snapshot = createInitialWorkspace(legacyDraft);
	await db.put(STORE_NAME, snapshot, SNAPSHOT_KEY);
	return { snapshot, created: true };
}

export async function saveWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
	const db = await database();
	await db.put(STORE_NAME, snapshot, SNAPSHOT_KEY);
}

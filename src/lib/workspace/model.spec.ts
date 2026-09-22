import { describe, expect, it, vi } from 'vitest';
import {
	contentSignature,
	createFile,
	createFolder,
	createInitialWorkspace,
	deleteFile,
	deleteFolder,
	folderPath,
	folderRows,
	hasUnsavedChanges,
	isPythonFile,
	normalizeFileName,
	ROOT_FOLDER_ID,
	uniqueName,
	updateFileContent,
	workspaceExport
} from './model';

describe('workspace model', () => {
	it('normalizes paths and creates unique file names', () => {
		expect(normalizeFileName('  src/test.py ')).toBe('src-test.py');
		expect(uniqueName(['test.py', 'test 2.py'], 'test.py')).toBe('test 3.py');
		expect(isPythonFile('MAIN.PY')).toBe(true);
	});

	it('builds a stable folder path without looping through malformed parents', () => {
		expect(
			folderPath(
				[
					{ id: 'root', name: 'Projekt', parentId: null },
					{ id: 'src', name: 'src', parentId: 'root' }
				],
				'src'
			)
		).toBe('Projekt/src');
	});

	it('exports the complete workspace as readable JSON', () => {
		vi.stubGlobal('crypto', { randomUUID: () => 'test-id' });
		const workspace = createInitialWorkspace('print(42)');
		const exported = JSON.parse(workspaceExport(workspace));
		expect(exported.application).toBe('python.k-plus.one');
		expect(exported.workspace.files[0].content).toBe('print(42)');
		vi.unstubAllGlobals();
	});

	it('keeps folders on the left model and files inside the selected folder', () => {
		const initial = createInitialWorkspace('print(1)');
		const withFolder = createFolder(initial, ROOT_FOLDER_ID, 'src');
		const folder = withFolder.folders.find((item) => item.name === 'src');
		expect(folderRows(withFolder.folders).map((row) => `${row.depth}:${row.folder.name}`)).toEqual([
			'0:Projekt',
			'1:src'
		]);
		const withFile = createFile(withFolder, folder?.id ?? '', 'hi');
		expect(withFile.files.find((file) => file.name === 'hi.py')?.folderId).toBe(folder?.id);
		expect(withFile.activeFileId).toBe(withFile.files.find((file) => file.name === 'hi.py')?.id);
		expect(createFile(initial, ROOT_FOLDER_ID, 'main.py').files.map((file) => file.name).sort()).toEqual([
			'main 2.py',
			'main.py'
		]);
	});

	it('refuses to delete the root folder or the last file and tracks unsaved edits', () => {
		const initial = createInitialWorkspace('print(1)');
		expect(deleteFolder(initial, ROOT_FOLDER_ID)).toBe(initial);
		expect(deleteFile(initial, initial.files[0].id)).toBe(initial);
		const saved = contentSignature(initial);
		const edited = updateFileContent(initial, initial.files[0].id, 'print(2)');
		expect(hasUnsavedChanges(edited, saved)).toBe(true);
		expect(hasUnsavedChanges(initial, saved)).toBe(false);
		expect(updateFileContent(initial, initial.files[0].id, 'print(1)')).toBe(initial);
	});
});

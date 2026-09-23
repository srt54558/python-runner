export function isSafeProjectPath(path: string): boolean {
	if (!path || path.startsWith('/') || path.includes('\\') || path.includes('\0')) return false;
	return path.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}

export function diffProjectFiles(
	previous: Map<string, string>,
	next: Record<string, string>
): { writes: Record<string, string>; deletes: string[] } {
	const writes: Record<string, string> = {};
	const deletes: string[] = [];
	for (const [path, content] of Object.entries(next)) {
		if (previous.get(path) !== content) writes[path] = content;
	}
	for (const path of previous.keys()) {
		if (!Object.hasOwn(next, path)) deletes.push(path);
	}
	return { writes, deletes };
}

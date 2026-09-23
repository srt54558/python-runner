export type DocChange = { from: number; to: number; insert: string };

/** Apply CM-style changes recorded against the original document, last change first. */
export function applyDocChanges(doc: string, changes: readonly DocChange[]): string {
	let next = doc;
	for (let index = changes.length - 1; index >= 0; index -= 1) {
		const change = changes[index];
		next = `${next.slice(0, change.from)}${change.insert}${next.slice(change.to)}`;
	}
	return next;
}

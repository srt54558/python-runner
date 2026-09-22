<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { requestDocsPopup } from '$lib/docs/popup';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	if (browser) {
		requestDocsPopup();
		void goto(resolve('/'), { replaceState: true });
	}
</script>

{@render children()}

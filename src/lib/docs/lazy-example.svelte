<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		eager = false,
		children
	}: {
		eager?: boolean;
		children: Snippet;
	} = $props();

	let revealed = $state(false);
	let node = $state<HTMLElement | null>(null);
	const shown = $derived(eager || revealed);

	$effect(() => {
		if (shown || !node) return;
		const embedded = node.closest('.docs.embedded');
		const root = embedded instanceof Element ? embedded.querySelector('main') : null;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) revealed = true;
			},
			{
				root: root instanceof Element ? root : null,
				rootMargin: '800px 0px',
				threshold: 0
			}
		);
		observer.observe(node);
		return () => observer.disconnect();
	});
</script>

<div bind:this={node} class="lazy">
	{#if shown}
		{@render children()}
	{:else}
		<div class="lazy-slot" aria-hidden="true"></div>
	{/if}
</div>

<style>
	.lazy-slot {
		min-height: 10rem;
	}
</style>

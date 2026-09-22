<script lang="ts">
	import { onMount } from 'svelte';
	import Play from '@lucide/svelte/icons/play';
	import { Button } from '$lib/components/ui/button/index.js';
	import { runDemo, watchDemoRunner, type DemoState } from './demo-runner';

	let { code }: { code: string } = $props();

	let edited = $state<string | null>(null);
	let python = $state<DemoState>('loading');
	let running = $state(false);
	let ran = $state(false);
	let stdout = $state('');
	let stderr = $state('');
	let alive = true;

	const draft = $derived(edited ?? code);
	const dirty = $derived(edited !== null && edited !== code);
	const runLabel = $derived(
		python === 'loading' ? 'Python wird geladen' : running ? 'Läuft' : 'Ausführen'
	);

	onMount(() => {
		const stop = watchDemoRunner((state) => (python = state));
		return () => {
			alive = false;
			stop();
		};
	});

	async function execute() {
		if (python !== 'ready' || running) return;
		running = true;
		ran = true;
		stdout = '';
		stderr = '';
		const result = await runDemo(draft);
		if (!alive) return;
		stdout = result.stdout;
		stderr = result.stderr;
		running = false;
	}
</script>

<div class="demo">
	<textarea
		spellcheck="false"
		autocorrect="off"
		autocapitalize="off"
		autocomplete="off"
		aria-label="Beispiel"
		value={draft}
		oninput={(event) => (edited = event.currentTarget.value)}
	></textarea>
	<div class="demo-actions">
		<Button
			variant="outline"
			size="sm"
			onclick={execute}
			disabled={python !== 'ready' || running}
			title={runLabel}><Play />{runLabel}</Button
		>
		{#if dirty}
			<Button variant="ghost" size="sm" onclick={() => (edited = null)}>Zurücksetzen</Button>
		{/if}
	</div>
	{#if ran}
		{#if stdout}<pre class="demo-out">{stdout}</pre>{/if}
		{#if stderr}<pre class="demo-err">{stderr}</pre>{/if}
		{#if !stdout && !stderr}<pre class="demo-out">Keine Ausgabe</pre>{/if}
	{/if}
</div>

<style>
	.demo {
		display: grid;
		gap: 0.55rem;
	}
	textarea {
		width: 100%;
		min-height: 6.5rem;
		margin: 0;
		padding: 0.7rem 0.75rem;
		resize: vertical;
		border: 1px solid var(--border);
		border-radius: 0.4rem;
		background: color-mix(in oklch, var(--muted) 35%, var(--background));
		color: var(--foreground);
		font: 400 0.82rem/1.55 var(--font-code);
		font-variant-ligatures: contextual;
		font-feature-settings: 'calt' 1, 'liga' 1;
		field-sizing: content;
	}
	textarea:focus {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}
	.demo-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.demo-out,
	.demo-err {
		margin: 0;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0;
		font: 400 0.8rem/1.5 var(--font-code);
		font-variant-ligatures: contextual;
		font-feature-settings: 'calt' 1, 'liga' 1;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.demo-out {
		color: var(--foreground);
		background: var(--background);
	}
	.demo-err {
		color: var(--destructive);
		background: color-mix(in oklch, var(--destructive) 8%, var(--background));
	}
</style>

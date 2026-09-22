<script lang="ts">
	import ExampleDemo from '$lib/docs/example-demo.svelte';
	import Guide from '$lib/docs/guide.svelte';
	import WebDemo from '$lib/docs/web-demo.svelte';
	import { LESSONS, type Lesson } from '$lib/docs/lessons';
	import { WEB_LESSONS } from '$lib/docs/web-lessons';

	let { fill = false }: { fill?: boolean } = $props();

	const topics = [
		{ id: 'HTML', label: 'HTML', lead: 'Elemente, Text und das Gerüst einer Seite.' },
		{ id: 'CSS', label: 'CSS', lead: 'Farben, Abstände und Layout.' },
		{ id: 'JavaScript', label: 'JavaScript', lead: 'Verhalten in der Seite und in eigenen Dateien.' },
		{ id: 'JSON', label: 'JSON', lead: 'Daten als Text.' },
		{ id: 'XML', label: 'XML', lead: 'Strukturierte Daten mit Tags.' },
		{ id: 'Markdown', label: 'Markdown', lead: 'Text mit einfacher Auszeichnung.' },
		{ id: 'Text', label: 'Text', lead: 'Zeichen, sonst nichts.' },
		{ id: 'Python', label: 'Python', lead: 'Kurz erklärt. Jedes Beispiel kannst du ändern und ausführen.' }
	] as const;

	let topicId = $state<(typeof topics)[number]['id'] | ''>('');

	const topic = $derived(topics.find((item) => item.id === topicId));
	const lessons = $derived.by(() => {
		if (!topic) return [];
		if (topic.id === 'Python') return LESSONS;
		return WEB_LESSONS.filter((lesson) => lesson.group === topic.id);
	});
</script>

{#snippet example(lesson: Lesson)}
	{#if topicId === 'Python'}
		<ExampleDemo code={lesson.code} />
	{:else}
		<WebDemo code={lesson.code} filename={lesson.filename} />
	{/if}
{/snippet}

<div class="browser" class:fill>
	{#if topic}
		<Guide
			title={topic.label}
			lead={topic.lead}
			{lessons}
			{example}
			embedded={fill}
			onback={() => (topicId = '')}
		/>
	{:else}
		<div class="home">
			<p class="kicker">K+ Coder</p>
			<h1>Doku</h1>
			<p class="lead">Wähle ein Thema.</p>
			<div class="topics">
				{#each topics as item (item.id)}
					<button type="button" onclick={() => (topicId = item.id)}>{item.label}</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.browser {
		min-height: 100dvh;
		background: var(--background);
		color: var(--foreground);
	}
	.browser.fill {
		min-height: 0;
		height: 100%;
	}
	.home {
		height: 100%;
		overflow: auto;
		padding: 1.5rem 3.25rem 2rem 1.35rem;
	}
	.kicker {
		margin: 0 0 0.35rem;
		color: var(--muted-foreground);
		font: 600 0.72rem/1.2 var(--font-sans);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		font: 650 1.7rem/1.15 var(--font-sans);
	}
	.lead {
		margin: 0.4rem 0 0;
		color: var(--muted-foreground);
		font-size: 0.95rem;
	}
	.topics {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
		gap: 0.6rem;
		margin-top: 1.25rem;
	}
	.topics button {
		padding: 0.95rem 1rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: transparent;
		color: inherit;
		font: 640 1.02rem/1.3 var(--font-sans);
		text-align: left;
		cursor: pointer;
	}
	.topics button:hover {
		background: color-mix(in oklch, var(--foreground) 5%, var(--background));
	}
	.topics button:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
</style>

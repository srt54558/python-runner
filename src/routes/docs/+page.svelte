<script lang="ts">
	import { LESSONS, lessonMatches } from '$lib/docs/lessons';
	import ExampleDemo from '$lib/docs/example-demo.svelte';

	let query = $state('');

	const visible = $derived(LESSONS.filter((lesson) => lessonMatches(lesson, query)));
</script>

<svelte:head>
	<title>Python-Grundlagen — Python Runner</title>
	<meta name="description" content="Python-Grundlagen, kurz erklärt, mit Beispielen zum Ausführen." />
</svelte:head>

<div class="docs">
	<header>
		<div class="heading">
			<p class="kicker">Python Runner</p>
			<h1>Python-Grundlagen</h1>
			<p class="lead">Kurz erklärt. Jedes Beispiel kannst du ändern und ausführen.</p>
		</div>
		<label>
			<span class="sr">Suche</span>
			<input type="search" placeholder="Suchen" bind:value={query} autocomplete="off" />
		</label>
	</header>
	<div class="layout">
		<nav aria-label="Inhalt">
			<p>Inhalt</p>
			{#if visible.length === 0}
				<p class="empty-nav">Keine Treffer</p>
			{:else}
				<ol>
					{#each visible as lesson (lesson.id)}
						<li><a href={`#${lesson.id}`}>{lesson.title}</a></li>
					{/each}
				</ol>
			{/if}
		</nav>
		<main>
			{#if visible.length === 0}
				<div class="empty">
					<p>Nichts gefunden</p>
					<p class="muted">Such nach einem Wort aus den Erklärungen oder dem Beispielcode.</p>
				</div>
			{:else}
				{#each visible as lesson (lesson.id)}
					<section id={lesson.id}>
						<h2>{lesson.title}</h2>
						<p>{lesson.text}</p>
						<ExampleDemo code={lesson.code} />
					</section>
				{/each}
			{/if}
		</main>
	</div>
</div>

<style>
	.docs {
		min-height: 100dvh;
		background: var(--background);
		color: var(--foreground);
	}
	header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem 1.5rem;
		padding: 1.4rem 1.25rem 1rem;
		border-bottom: 1px solid var(--border);
	}
	.kicker {
		margin: 0 0 0.2rem;
		color: var(--muted-foreground);
		font: 600 0.72rem/1.2 var(--font-sans);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		font: 650 1.55rem/1.15 var(--font-sans);
	}
	.lead {
		margin: 0.35rem 0 0;
		color: var(--muted-foreground);
		font-size: 0.92rem;
	}
	label {
		flex: 1 1 16rem;
		max-width: 22rem;
	}
	input {
		width: 100%;
		height: 2.25rem;
		padding: 0 0.7rem;
		border: 1px solid var(--border);
		border-radius: 0.4rem;
		background: var(--background);
		color: var(--foreground);
		font: 400 0.9rem/1 var(--font-sans);
	}
	input:focus {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	.layout {
		display: grid;
		grid-template-columns: 13.5rem minmax(0, 42rem);
		justify-content: center;
		gap: 2rem;
		padding: 1.25rem 1.25rem 3rem;
	}
	nav {
		position: sticky;
		top: 1rem;
		align-self: start;
	}
	nav p {
		margin: 0 0 0.45rem;
		color: var(--muted-foreground);
		font: 600 0.72rem/1.2 var(--font-sans);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	nav ol {
		display: grid;
		gap: 0.15rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	nav a {
		display: block;
		padding: 0.28rem 0;
		color: var(--foreground);
		font-size: 0.88rem;
		text-decoration: none;
	}
	nav a:hover {
		text-decoration: underline;
		text-underline-offset: 0.18em;
	}
	.empty-nav {
		text-transform: none;
		letter-spacing: 0;
		font-size: 0.82rem;
		font-weight: 400;
	}
	section {
		scroll-margin-top: 1rem;
		padding: 1.15rem 0 1.35rem;
		border-bottom: 1px solid var(--border);
	}
	section:first-child {
		padding-top: 0.2rem;
	}
	h2 {
		margin: 0 0 0.4rem;
		font: 640 1.12rem/1.25 var(--font-sans);
	}
	section > p {
		margin: 0 0 0.85rem;
		color: color-mix(in oklch, var(--foreground) 88%, var(--muted-foreground));
		font-size: 0.95rem;
		line-height: 1.5;
	}
	.empty {
		display: grid;
		gap: 0.3rem;
		padding: 2.5rem 0;
	}
	.empty p {
		margin: 0;
		font: 600 0.95rem/1.3 var(--font-sans);
	}
	.muted {
		color: var(--muted-foreground);
		font-weight: 400;
		font-size: 0.88rem;
	}
	@media (max-width: 800px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
			gap: 1.25rem;
		}
		nav {
			position: static;
		}
	}
</style>

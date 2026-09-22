<script lang="ts">
	import type { Snippet } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import { lessonMatches, type Lesson } from './lessons';

	let {
		title,
		lead,
		lessons,
		example,
		onback,
		embedded = false
	}: {
		title: string;
		lead: string;
		lessons: Lesson[];
		example: Snippet<[Lesson]>;
		onback: () => void;
		embedded?: boolean;
	} = $props();

	let query = $state('');
	let menuOpen = $state(false);

	const visible = $derived(lessons.filter((lesson) => lessonMatches(lesson, query)));

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function focusMenu(node: HTMLElement) {
		node.focus();
	}

	function showLesson(id: string) {
		menuOpen = false;
		document.getElementById(id)?.scrollIntoView({ block: 'start' });
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && menuOpen) menuOpen = false;
	}}
/>

<div class="docs" class:embedded>
	<header class="intro">
		<p class="kicker">K+ Coder</p>
		<h1>{title}</h1>
		<p class="lead">{lead}</p>
	</header>
	{#if menuOpen}
		<button type="button" class="backdrop" aria-label="Inhalt schließen" onclick={() => (menuOpen = false)}
		></button>
	{/if}
	<div class="toolbar">
		<div class="toolbar-inner">
			<button type="button" class="icon-btn" aria-label="Themen" onclick={onback}><ChevronLeft /></button>
			<label>
				<span class="sr">Suche</span>
				<input type="search" placeholder="Suchen" bind:value={query} autocomplete="off" />
			</label>
			<button
				type="button"
				class="icon-btn burger"
				aria-expanded={menuOpen}
				aria-controls="docs-inhalt"
				aria-label={menuOpen ? 'Inhalt schließen' : 'Inhalt'}
				onclick={toggleMenu}
			>
				{#if menuOpen}
					<X />
				{:else}
					<Menu />
				{/if}
			</button>
			{#if menuOpen}
				<nav
					id="docs-inhalt"
					class="menu"
					aria-label="Inhalt"
					tabindex="-1"
					{@attach focusMenu}
				>
					{@render contents()}
				</nav>
			{/if}
		</div>
	</div>
	<div class="layout">
		<nav class="sidebar" aria-label="Inhalt">
			{@render contents()}
		</nav>
		<main>
			{#if visible.length === 0}
				<div class="empty">
					<p>Nichts gefunden</p>
					<p class="muted">Such nach einem Wort aus den Erklärungen oder dem Beispielcode.</p>
				</div>
			{:else}
				{#each visible as lesson, index (lesson.id)}
					<section id={lesson.id}>
						{#if index === 0 || visible[index - 1].group !== lesson.group}
							<p class="group">{lesson.group}</p>
						{/if}
						<h2>{lesson.title}</h2>
						<p>{lesson.text}</p>
						{@render example(lesson)}
					</section>
				{/each}
			{/if}
		</main>
	</div>
</div>

{#snippet contents()}
	<p class="nav-label">Inhalt</p>
	{#if visible.length === 0}
		<p class="empty-nav">Keine Treffer</p>
	{:else}
		<ol>
			{#each visible as lesson, index (lesson.id)}
				{#if index === 0 || visible[index - 1].group !== lesson.group}
					<li class="nav-group">{lesson.group}</li>
				{/if}
				<li>
					<button type="button" onclick={() => showLesson(lesson.id)}>{lesson.title}</button>
				</li>
			{/each}
		</ol>
	{/if}
{/snippet}

<style>
	.docs {
		--docs-bar: 3.45rem;
		--docs-width: 58rem;
		--docs-gutter: 1.15rem;
		min-height: 100dvh;
		background: var(--background);
		color: var(--foreground);
	}
	.intro,
	.toolbar-inner,
	.layout {
		width: min(100%, var(--docs-width));
		margin-inline: auto;
		padding-inline: var(--docs-gutter);
	}
	.intro {
		padding-top: 1.35rem;
		padding-bottom: 0.85rem;
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
	.toolbar {
		position: sticky;
		top: 0;
		z-index: 5;
		border-bottom: 1px solid var(--border);
		background: var(--background);
	}
	.toolbar-inner {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-height: var(--docs-bar);
		padding-block: 0.55rem;
	}
	label {
		flex: 1;
		min-width: 0;
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
	input:focus,
	.icon-btn:focus-visible,
	.menu:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}
	.icon-btn {
		display: grid;
		width: 2.25rem;
		height: 2.25rem;
		place-items: center;
		flex: none;
		border: 1px solid var(--border);
		border-radius: 0.4rem;
		background: var(--background);
		color: var(--foreground);
		text-decoration: none;
		cursor: pointer;
	}
	.icon-btn:hover {
		background: color-mix(in oklch, var(--foreground) 6%, var(--background));
	}
	.icon-btn :global(svg) {
		width: 1rem;
		height: 1rem;
	}
	.burger {
		display: none;
	}
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 4;
		border: 0;
		background: transparent;
		cursor: default;
	}
	.menu {
		position: absolute;
		top: calc(100% + 0.35rem);
		right: var(--docs-gutter);
		left: var(--docs-gutter);
		z-index: 6;
		max-height: min(70dvh, 28rem);
		overflow: auto;
		padding: 0.75rem 0.85rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: 0.45rem;
		background: var(--background);
		box-shadow: 0 12px 32px color-mix(in oklch, var(--foreground) 14%, transparent);
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
		grid-template-columns: 13.5rem minmax(0, 1fr);
		align-items: start;
		gap: 2rem;
		padding-top: 1.15rem;
		padding-bottom: 3rem;
	}
	.sidebar {
		position: sticky;
		top: var(--docs-bar);
		align-self: start;
		max-height: calc(100dvh - var(--docs-bar) - 1rem);
		overflow: auto;
	}
	.nav-label {
		margin: 0 0 0.45rem;
		color: var(--muted-foreground);
		font: 600 0.72rem/1.2 var(--font-sans);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.sidebar ol,
	.menu ol {
		display: grid;
		gap: 0.15rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.nav-group,
	.group {
		color: var(--muted-foreground);
		font: 600 0.68rem/1.2 var(--font-sans);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.nav-group {
		margin: 0.8rem 0 0.1rem;
	}
	.sidebar ol li:first-child.nav-group,
	.menu ol li:first-child.nav-group {
		margin-top: 0;
	}
	.group {
		margin: 0 0 0.35rem;
	}
	.sidebar button,
	.menu button {
		display: block;
		width: 100%;
		padding: 0.28rem 0;
		border: 0;
		background: transparent;
		color: var(--foreground);
		font: inherit;
		font-size: 0.88rem;
		text-align: left;
		cursor: pointer;
	}
	.menu button {
		padding: 0.42rem 0;
	}
	.sidebar button:hover,
	.menu button:hover {
		text-decoration: underline;
		text-underline-offset: 0.18em;
	}
	.empty-nav {
		margin: 0;
		color: var(--muted-foreground);
		font-size: 0.82rem;
	}
	section {
		scroll-margin-top: calc(var(--docs-bar) + 0.75rem);
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
			gap: 0;
		}
		.sidebar {
			display: none;
		}
		.burger {
			display: grid;
		}
	}
	@media (min-width: 801px) {
		.menu,
		.backdrop {
			display: none;
		}
	}
	.docs.embedded {
		display: flex;
		height: 100%;
		min-height: 0;
		flex-direction: column;
		overflow: hidden;
	}
	.docs.embedded .intro {
		flex: none;
	}
	.docs.embedded .toolbar {
		position: static;
		flex: none;
	}
	.docs.embedded .toolbar-inner {
		padding-right: 3.25rem;
	}
	.docs.embedded .layout {
		flex: 1 1 auto;
		grid-template-rows: minmax(0, 1fr);
		align-items: stretch;
		min-height: 0;
		overflow: hidden;
		width: 100%;
		padding-bottom: 0;
	}
	.docs.embedded .sidebar,
	.docs.embedded main {
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
	}
	.docs.embedded .sidebar {
		position: static;
		align-self: stretch;
		max-height: none;
		padding-bottom: 1rem;
	}
	.docs.embedded main {
		padding-bottom: 1.5rem;
	}
</style>

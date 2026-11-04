<script lang="ts">
	// the bar across the top of the office. ctrl+k or / from anywhere, arrows to
	// move, enter to go. it finds settings as well as records, and lands on them.
	import { goto } from '$app/navigation';
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { searchOffice, shortcuts, type SearchAction, type SearchEntry } from '$lib/features/office/search';
	import OfficeIcon from './OfficeIcon.svelte';

	let { onaction }: { onaction: (action: SearchAction) => void } = $props();
	const office = useOffice();

	let query = $state('');
	let open = $state(false);
	let active = $state(0);
	let root: HTMLDivElement;
	let input: HTMLInputElement;

	const groups = $derived(query.trim() ? searchOffice(office.document, query) : shortcuts());
	const hits = $derived(groups.flatMap((g) => g.hits));

	function choose(hit: SearchEntry | undefined) {
		if (!hit) return;
		open = false;
		query = '';
		input.blur();
		if (hit.action) onaction(hit.action);
		else if (hit.href) void goto(hit.href);
	}

	function keys(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const step = e.key === 'ArrowDown' ? 1 : -1;
			active = (active + step + hits.length) % Math.max(hits.length, 1);
			requestAnimationFrame(() => root.querySelector('.active')?.scrollIntoView({ block: 'nearest' }));
		} else if (e.key === 'Enter') {
			e.preventDefault();
			choose(hits[active]);
		} else if (e.key === 'Escape') {
			open = false;
			input.blur();
		}
	}

	function summon(e: KeyboardEvent) {
		const typing = (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]');
		if (((e.ctrlKey || e.metaKey) && e.key === 'k') || (e.key === '/' && !typing)) {
			e.preventDefault();
			input.focus();
			input.select();
		}
	}

	const position = (hit: SearchEntry) => hits.indexOf(hit);
</script>

<svelte:window
	onkeydown={summon}
	onpointerdown={(e) => {
		if (!root?.contains(e.target as Node)) open = false;
	}}
/>

<div class="office-search" bind:this={root}>
	<OfficeIcon name="search" size={17} />
	<input
		bind:this={input}
		type="search"
		role="combobox"
		aria-label="Search the office"
		aria-expanded={open}
		aria-controls="office-search-results"
		aria-activedescendant={open && hits.length ? `office-hit-${active}` : undefined}
		autocomplete="off"
		placeholder="Find any setting, course, batch or person…"
		bind:value={query}
		oninput={() => {
			open = true;
			active = 0;
		}}
		onfocus={() => (open = true)}
		onkeydown={keys}
	/>
	{#if !query}<kbd aria-hidden="true">Ctrl K</kbd>{/if}
	{#if open}
		<div class="office-search-results" id="office-search-results" role="listbox" aria-label="Search results">
			{#each groups as group (group.title)}
				<p>{group.title}</p>
				{#each group.hits as hit (hit.label + hit.href)}
					{@const i = position(hit)}
					<a
						id="office-hit-{i}"
						role="option"
						aria-selected={i === active}
						class:active={i === active}
						tabindex="-1"
						href={hit.href ?? '#'}
						onmouseenter={() => (active = i)}
						onclick={(e) => {
							e.preventDefault();
							choose(hit);
						}}
					>
						<OfficeIcon name={hit.icon} size={18} />
						<span><b>{hit.label}</b><small>{hit.detail}</small></span>
					</a>
				{/each}
			{:else}
				<p>Nothing matches “{query}”</p>
			{/each}
		</div>
	{/if}
</div>

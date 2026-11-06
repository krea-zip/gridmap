<script lang="ts">
	// The count and sort controls sit quietly between the filters and results.
	import { fade } from 'svelte/transition';
	import { usePlan } from '$lib/planner/context';
	import type { CatalogueSort } from '$lib/planner/catalogue';
	import { reducedMotion } from '$lib/ui/transitions';

	const plan = usePlan();

	const SORTS: CatalogueSort[] = ['relevance', 'code', 'title', 'credits'];
</script>

<div class="ribbon">
	<label class="sort">
		sort by
		<select aria-label="sort courses" bind:value={plan.catalogueSort}>
			{#each SORTS as sort (sort)}
				<option value={sort}>{sort}</option>
			{/each}
		</select>
	</label>
	{#if plan.narrowed}
		<button
			class="clear"
			title="clear every filter"
			transition:fade={{ duration: reducedMotion() ? 0 : 160 }}
			onclick={() => plan.clearNarrowing()}>clear</button
		>
	{/if}
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.ribbon {
		position: relative;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		min-height: 3.6rem;
		padding: 0.4rem 1.4rem;
		font-size: 1.2rem;
		color: var(--color-text-muted);
		border-bottom: 1px solid var(--color-border-divider);
		contain: inline-size;
	}

	.clear {
		margin-left: auto;
		padding: 0;
		font: inherit;
		color: var(--color-accent);
		background: none;
		border: 0;
		cursor: pointer;
	}

	.sort {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;

		select {
			padding: 0.25rem 0.5rem;
			font: inherit;
			color: var(--color-text);
			background: var(--color-bg-light);
			border: 1px solid var(--color-border-card);
			border-radius: 4px;
			cursor: pointer;
		}
	}
</style>

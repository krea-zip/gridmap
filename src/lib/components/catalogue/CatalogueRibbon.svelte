<script lang="ts">
	// the band between the filters and the cards: how many courses are left and
	// how they're sorted. it sits outside the filters' scroll, so it stays put
	// and its shadow falls over the cards as they pass underneath.
	import { fade } from 'svelte/transition';
	import { usePlan } from '$lib/planner/context';
	import type { CatalogueSort } from '$lib/planner/catalogue';
	import { reducedMotion } from '$lib/ui/transitions';

	const plan = usePlan();

	const SORTS: CatalogueSort[] = ['relevance', 'code', 'title', 'credits'];
</script>

<div class="ribbon">
	<p class="count" role="status">
		{plan.catalogue.length} course{plan.catalogue.length === 1 ? '' : 's'}
	</p>
	{#if plan.narrowed}
		<button
			class="clear"
			title="clear every filter"
			transition:fade={{ duration: reducedMotion() ? 0 : 160 }}
			onclick={() => plan.clearNarrowing()}>clear</button
		>
	{/if}
	<label class="sort">
		sort
		<select aria-label="sort courses" bind:value={plan.catalogueSort}>
			{#each SORTS as sort (sort)}
				<option value={sort}>{sort}</option>
			{/each}
		</select>
	</label>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.ribbon {
		position: relative;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 1rem;
		min-height: 2.8rem;
		padding: 0.2rem 1.8rem;
		font-size: var(--text-body);
		color: var(--color-text-muted);
		// a touch darker than whatever it sits on, with a faint outline
		background: rgba(60, 10, 35, 0.06);
		border-block: 1px solid color-mix(in srgb, var(--color-border-card) 55%, transparent);
		// set into the panel: a soft inner shadow along the top, a thin highlight along the bottom
		box-shadow:
			inset 0 2px 4px rgba(98, 58, 82, 0.14),
			inset 0 -1px 0 rgba(255, 255, 255, 0.6);
		contain: inline-size;
	}

	.count {
		font-variant-numeric: tabular-nums; // the digits don't jitter as filters change
		white-space: nowrap;
	}

	.clear {
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
		margin-left: auto;
		white-space: nowrap;

		select {
			padding: 0;
			font: inherit;
			color: var(--color-text);
			background: none;
			border: 0;
			cursor: pointer;
		}
	}
</style>

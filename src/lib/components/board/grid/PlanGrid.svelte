<script lang="ts">
	// the plan as a grid: a row per year, a column per trimester. drops are
	// handled here, on the whole grid (see GridDrag), not on each cell.
	import { usePlan } from '$lib/planner/context';
	import { useBoard } from '../boardState.svelte';
	import PrereqLines from '../PrereqLines.svelte';
	import TrimHead from './TrimHead.svelte';
	import YearHead from './YearHead.svelte';
	import TrimesterCell from './TrimesterCell.svelte';
	import YearControls from './YearControls.svelte';

	let { touchLayout = false }: { touchLayout?: boolean } = $props();
	const plan = usePlan();
	const board = useBoard();

	// state, so the prerequisite arrows wait for the grid to exist
	let grid = $state<HTMLDivElement>();
	$effect(() => {
		board.drag.grid = grid;
	});
</script>

<div
	class="overview"
	class:dragging={plan.dragging !== null}
	style:--cols={plan.trims.length}
	role="list"
	aria-label="course plan grid"
	bind:this={grid}
	ondragover={(e) => board.drag.over(e)}
	ondragleave={(e) => board.drag.leave(e)}
	ondrop={(e) => board.drag.drop(e)}
>
	<div class="corner"></div>
	{#each plan.trims as trim (trim)}
		<TrimHead {trim} />
	{/each}

	{#each plan.years as year (year)}
		<YearHead {year} />
		{#each plan.trims as trim (trim)}
			<TrimesterCell {year} {trim} {touchLayout} />
		{/each}
	{/each}

	<!-- the prerequisite chain's arrows, over everything -->
	{#if board.chain && grid}
		<PrereqLines
			{grid}
			edges={board.chain.edges}
			version="{JSON.stringify(plan.placements)}|{plan.showTitles}|{plan.showCodes}"
		/>
	{/if}

	<YearControls />
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.overview {
		position: relative;
		display: grid;
		grid-template-columns: 6rem repeat(var(--cols), 1fr);
		gap: 1rem;
		padding: 2.4rem var(--board-gutter, 3.2rem);
	}

	@include mobile {
		.overview {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.8rem;
			padding: 1.2rem 1.6rem;
		}

		.corner {
			display: none;
		}

		@container plan (min-width: 720px) {
			.overview {
				grid-template-columns: repeat(3, minmax(0, 1fr));
			}
		}
	}
</style>

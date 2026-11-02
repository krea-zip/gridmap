<script lang="ts">
	// The board: the four-year grid, or one trimester zoomed in. The columns
	// around it belong to the planner layout.
	import { usePlan } from '$lib/planner/context';
	import { viewport } from '$lib/planner/viewport.svelte';
	import OverviewGrid from '$lib/components/board/OverviewGrid.svelte';
	import TrimesterZoom from '$lib/components/board/TrimesterZoom.svelte';

	const plan = usePlan();
</script>

<div class="board-main" data-tour="board">
	{#if plan.zoom}
		<TrimesterZoom touchLayout={!viewport.desktop} />
	{:else}
		<OverviewGrid touchLayout={!viewport.desktop} />
	{/if}
</div>

<style>
	/* grows to fill a short board, never shrinks below its own content, so a
	   long one still scrolls */
	.board-main {
		flex: 1 0 auto;
	}
</style>

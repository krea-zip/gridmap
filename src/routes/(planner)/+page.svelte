<script lang="ts">
	// The board: the four-year grid, or one trimester zoomed in. The columns
	// around it belong to the planner layout.
	import { usePlan } from '$lib/planner/context';
	import { viewport } from '$lib/planner/viewport.svelte';
	import OverviewGrid from '$lib/components/board/OverviewGrid.svelte';
	import TrimesterZoom from '$lib/components/board/TrimesterZoom.svelte';
	import { fade } from 'svelte/transition';
	import { reducedMotion } from '$lib/ui/transitions';

	const plan = usePlan();
</script>

<div class="board-main" data-tour="board">
	{#if plan.zoom}
		<div in:fade={{ duration: reducedMotion() || !viewport.desktop ? 0 : 120 }}>
			<TrimesterZoom touchLayout={!viewport.desktop} />
		</div>
	{:else}
		<div in:fade={{ duration: reducedMotion() || !viewport.desktop ? 0 : 120 }}>
			<OverviewGrid touchLayout={!viewport.desktop} />
		</div>
	{/if}
</div>

<style>
	/* grows to fill a short board, never shrinks below its own content, so a
	   long one still scrolls */
	.board-main {
		flex: 1 0 auto;
	}
</style>

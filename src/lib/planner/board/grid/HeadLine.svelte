<script lang="ts">
	// the small line under a board heading (a trimester's months, a year's
	// academic year). a click on any one hides them all down to a faint ···,
	// and a click on that brings them back. old and new fade across each
	// other in one grid cell, so nothing pops or shifts.
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { headLine } from './headLine.svelte';
	import { reducedMotion } from '$lib/ui/transitions';

	let { text }: { text: string } = $props();
	onMount(() => headLine.restore());

	const swap = () => ({ duration: reducedMotion() ? 0 : 160 });
</script>

<button
	class="head-line"
	class:hidden={!headLine.shown}
	title={headLine.shown ? 'hide the dates under the headings' : `show the dates under the headings (${text})`}
	onclick={() => headLine.toggle()}
>
	{#key `${headLine.shown}${text}`}
		<span in:fade={swap()} out:fade={swap()}>{headLine.shown ? text : '···'}</span>
	{/key}
</button>

<style lang="scss">
	.head-line {
		display: inline-grid;
		padding: 0;
		font: inherit;
		font-size: 1.05rem;
		font-weight: 600;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
		background: none;
		border: 0;
		border-radius: 6px;
		cursor: pointer;
		transition:
			color 0.15s ease,
			opacity 0.15s ease;

		span {
			grid-area: 1 / 1;
		}

		&:hover,
		&:focus-visible {
			color: var(--color-accent);
			opacity: 1;
		}

		// tucked away, a quiet mark to bring them back by
		&.hidden {
			opacity: 0.5;
		}
	}
</style>

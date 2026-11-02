<script lang="ts">
	// grow or shrink the grid by a year: a dashed row waiting to exist, and
	// the way back off the last one, never below the degree's own length.
	// taking off a year that has courses asks twice, like emptying the grid.
	import { usePlan } from '$lib/planner/context';
	import { useBoard } from '../boardState.svelte';
	import { armed } from './armed.svelte';

	const plan = usePlan();
	const board = useBoard();

	let last = $derived(plan.years.length);
	let courses = $derived(plan.trims.reduce((n, t) => n + plan.slotCourses(last, t).length, 0));
	const confirm = armed(() => plan.removeYear());
	const plural = (n: number) => `${n} course${n === 1 ? '' : 's'}`;
</script>

{#if plan.view === 'plan' && (last < plan.maxYears || plan.canRemoveYear)}
	<div class="year-acts">
		{#if last < plan.maxYears}
			<button class="add" onclick={() => board.addYear()}>+ add year {last + 1}</button>
		{/if}
		{#if plan.canRemoveYear}
			<button
				class:confirming={confirm.armed}
				title="take year {last} off the grid{courses ? `, with its ${plural(courses)}` : ''}"
				onclick={() => (courses ? confirm.press() : plan.removeYear())}
			>
				{confirm.armed
					? `click again: ${plural(courses)} come${courses === 1 ? 's' : ''} off`
					: `− remove year ${last}`}
			</button>
		{/if}
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	// under the last year, spanning the trimester columns
	.year-acts {
		grid-column: 2 / -1;
		display: flex;
		gap: 1rem;
	}

	button {
		padding: 1rem 1.6rem;
		font: inherit;
		font-size: 1.25rem;
		color: var(--color-text-muted);
		background: transparent;
		border: 1px dashed color-mix(in srgb, var(--color-board-text) 45%, transparent);
		border-radius: 8px;
		cursor: pointer;
		transition:
			color 0.15s ease,
			background-color 0.15s ease,
			border-color 0.15s ease,
			transform 0.14s var(--spring);

		&:hover {
			color: var(--color-text);
			background-color: var(--color-drop-hint);
			border-color: var(--color-control);
		}

		&:active {
			transform: scale(0.98);
		}
	}

	// the empty zone a new year would fill
	.add {
		flex: 1;
	}

	.confirming {
		color: var(--color-on-accent);
		background-color: var(--color-danger);
		border-style: solid;
		border-color: var(--color-danger-deep);
	}

	@include touch {
		button {
			min-height: 4.4rem;
		}
	}

	@include mobile {
		.year-acts {
			grid-column: 1 / -1;
			flex-wrap: wrap;
			padding: 1.6rem;
		}
	}
</style>

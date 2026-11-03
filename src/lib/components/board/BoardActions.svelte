<script lang="ts">
	// bulk grid actions. changing the degree never moves a course by itself,
	// the new recommendation shows as ghosts, and these bring the grid in line
	// with it all at once. each shows only while it has work and says what it
	// will move in plain words: greyed-out buttons reading "0" confused people.
	// filling in first, taking away after; emptying sits apart at the far end.
	import { fade } from 'svelte/transition';
	import { usePlan } from '$lib/planner/context';
	import { reducedMotion } from '$lib/ui/transitions';
	import { armed } from './grid/armed.svelte';

	const plan = usePlan();
	const empty = armed(() => plan.clearPlan());

	const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
	const appear = () => ({ duration: reducedMotion() ? 0 : 260 });
	let others = $derived(plan.otherPlacedCodes.length);
</script>

{#if plan.view === 'plan' && !plan.welcoming}
	<div class="acts-row" data-tour="board-actions">
		{#if plan.fillCount}
			<button
				class="fill"
				title="add every dashed suggestion where it sits, and fit in any required course the suggestions leave out"
				onclick={() => plan.fillIn()}
				transition:fade={appear()}>+ fill in {count(plan.fillCount, 'course')}</button
			>
		{/if}

		{#if others}
			<button
				class="strip"
				title="take off every course that counts toward none of your major, minor or concentration"
				onclick={() => plan.removeOtherCourses()}
				transition:fade={appear()}>− drop {others} that {others === 1 ? 'doesn’t' : 'don’t'} count</button
			>
		{/if}

		{#if plan.placed.length}
			<button
				class="strip empty"
				class:confirming={empty.armed}
				title="take every course off the grid"
				onclick={empty.press}
				transition:fade={appear()}>{empty.armed ? 'sure? click again' : 'empty the grid'}</button
			>
		{/if}
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	// one quiet row with room above and below; only the fill colour marks the
	// one that matters most
	.acts-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.8rem;
		margin: 1.6rem 0 2.4rem;
		padding: 0 calc(var(--board-gutter, 3.2rem) + 7rem); // in line with the trimesters, past the year labels
	}

	.fill,
	.strip {
		min-height: 3.6rem;
		padding: 0.7rem 1.6rem;
		font: inherit;
		font-size: 1.3rem;
		border: 1px solid var(--color-border-card);
		border-radius: 6px;
		cursor: pointer;
	}

	// the primary, in the accent without being any bigger
	.fill {
		font-weight: 600;
		color: var(--color-on-accent);
		background-color: var(--color-accent);
		border-color: var(--color-control-deep);
		@include glossy-accent;
		transition:
			background-color 140ms ease,
			box-shadow 140ms ease,
			transform 140ms var(--spring);

		&:hover {
			filter: brightness(1.07);
		}

		&:active:not(:disabled) {
			transform: translateY(1px) scale(0.98);
			transition-duration: 70ms;
		}
	}

	// the tidy-ups: app store price-tag buttons, so they never compete with
	// the plum one beside them
	.strip {
		@include store-button($armable: true);
	}

	// wiping the grid is a different kind of thing, off at the far end
	.empty {
		margin-left: auto;
	}

	@include touch {
		.fill,
		.strip {
			min-height: 4.4rem;
		}
	}

	@include mobile {
		.acts-row {
			padding: 1.6rem;
		}
	}
</style>

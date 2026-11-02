<script lang="ts">
	// dashed courses that aren't on the plan yet: in what-if, what the tried
	// degree still needs; in the plan, the department's suggested path where
	// it would go. not a second plan and not a mode, a click takes one and
	// ignoring it leaves it be. a ghost wears the shape of the chip it would
	// become at a fraction of the weight, so the grid reads as "your plan,
	// plus what's missing".
	import { flip } from 'svelte/animate';
	import { usePlan } from '$lib/planner/context';
	import { courseShift } from '$lib/transitions';
	import type { TrimNum } from '$lib/types';
	import { useBoard } from '../boardState.svelte';

	let { year, trim }: { year: number; trim: TrimNum } = $props();
	const plan = usePlan();
	const board = useBoard();
</script>

{#each board.neededIn(year, trim) as n (n.code)}
	<button
		class="ghost"
		class:titled={plan.showTitles}
		data-type={plan.whatIfType(n.code)}
		style:--hue={plan.whatIfHue(n.code)}
		title="still needed{n.why === 'prerequisite' && n.for
			? `, first, for ${plan.courseLabel(n.for)}`
			: ''}: {plan.courseLabel(n.code)}"
		onclick={(e) => {
			e.stopPropagation();
			plan.select(n.code);
		}}
	>
		<span class="label">{plan.courseLabel(n.code)}</span>
		<span class="plus" aria-hidden="true">+</span>
	</button>
{/each}

<!-- hidden outside the plan view: grades and the other views are about what
     you have, not what you could add -->
{#if plan.view === 'plan'}
	{#each plan.suggestionsFor(year, trim) as code (code)}
		<button
			class="ghost"
			class:titled={plan.showTitles}
			data-type={plan.courseType(code)}
			title="suggested here, click to add {plan.courseLabel(code)}"
			animate:flip={courseShift}
			onclick={(e) => {
				e.stopPropagation();
				plan.acceptSuggestion(code);
			}}
		>
			<span class="label">{plan.courseLabel(code)}</span>
			<span class="plus" aria-hidden="true">+</span>
		</button>
	{/each}
{/if}

<style lang="scss">
	.ghost {
		order: 9999; // after every placed chip and the landing slot
		// the dashed edge takes the colour of the course type it suggests
		--edge: color-mix(in srgb, var(--color-text-muted) 45%, transparent);
		position: relative;
		display: flex;
		align-items: center;
		height: fit-content;
		padding: 0.7rem 2.2rem 0.7rem 1rem; // a chip's own box, so it's the same size
		font: inherit;
		font-size: 1.3rem;
		text-align: left;
		color: var(--color-text-muted);
		background: transparent;
		border: 1px dashed var(--edge);
		border-radius: 5px;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease,
			transform 0.25s var(--spring);

		&[data-type='core'] {
			--edge: var(--color-course-core-deep);
		}
		&[data-type='required'] {
			--edge: var(--color-course-required-deep);
		}
		&[data-type='elective'] {
			--edge: var(--color-course-elective-deep);
		}
		&[data-type='other'] {
			--edge: var(--color-border-audit);
		}

		&.titled {
			flex-basis: 100%;

			.label {
				white-space: normal;
			}
		}

		// on hover only the edge firms up, a solid line a shade deeper
		&:hover {
			border-style: solid;
			border-color: color-mix(in srgb, var(--edge) 60%, var(--color-text));
		}

		&:active {
			transform: scale(0.97);
		}
	}

	.label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	// where a placed chip keeps its ×
	.plus {
		position: absolute;
		top: 50%;
		right: 0.7rem;
		translate: 0 -50%;
		font-weight: 700;
		opacity: 0.55;
	}
</style>

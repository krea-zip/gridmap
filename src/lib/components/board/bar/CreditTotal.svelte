<script lang="ts">
	// where the plan stands: the cgpa in grade view, otherwise the credits
	// placed against a target. the count and its min/max switch share one
	// recessed capsule so they read as one thing, "104 of 128, to the minimum".
	import { usePlan } from '$lib/planner/context';
	import { viewport } from '$lib/planner/viewport.svelte';
	import { useBoard } from '../boardState.svelte';

	const plan = usePlan();
	const board = useBoard();

	let minimum = $derived(plan.creditTargetMode === 'minimum');
</script>

{#if plan.gradeMode}
	<button
		class="pill"
		title="enter grades, see your CGPA and what you need to recover"
		onclick={() => board.openGrades()}
	>
		{#if plan.cgpa === null}enter grades{:else}<span class="cgpa">CGPA</span> {plan.cgpa.toFixed(2)}{/if}
	</button>
{:else}
	<div class="goal" data-tour="credits">
		<button
			class="pill total"
			class:over={plan.totalPlacedCredits > plan.creditTarget}
			class:conflict={plan.creditsConflict}
			title={plan.creditsConflict
				? `your programmes need ${plan.creditMinimum} credits, more than the ${plan.creditCeiling} a ${plan.fourYear ? 'four' : 'three'}-year degree allows, only courses counting for two programmes can make it fit. Click for the credit rules`
				: `${plan.totalPlacedCredits} placed of the ${plan.creditTarget} ${minimum ? 'you need to graduate' : 'you may register at most'}, click for the credit rules`}
			onclick={() => (board.creditsOpen = true)}
		>
			{plan.totalPlacedCredits}<em>/</em>{plan.creditTarget} cr
		</button>
		<!-- one switch, not two buttons: a click anywhere on it flips sides.
		     laptop-only: a phone counts against the minimum -->
		{#if viewport.desktop}
			<button
				class="seg"
				class:maximum={!minimum}
				title={minimum
					? `counting against the credits you need to graduate (${plan.creditMinimum}), click for the maximum`
					: `counting against the most you may register over your tenure (${plan.creditCeiling}), click for the minimum`}
				aria-label="count credits against the {plan.creditTargetMode}, click to switch"
				onclick={() => (plan.creditTargetMode = minimum ? 'maximum' : 'minimum')}
			>
				<span class:active={minimum}>min</span>
				<span class:active={!minimum}>max</span>
			</button>
		{/if}
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.pill {
		padding: 0.4rem 1rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text);
		font-variant-numeric: tabular-nums;
		background-color: var(--color-bg-light);
		border: 1px solid var(--color-border-card);
		border-radius: 999px;
		cursor: pointer;
		@include glossy;

		em {
			font-style: normal;
			color: var(--color-text-muted);
			padding: 0 0.2rem;
		}
	}

	.cgpa {
		font-size: 1.1rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		color: var(--color-text-muted);
	}

	.total {
		&.over {
			color: var(--color-danger);
			border-color: var(--color-danger);
		}

		// the programmes can't fit under the ceiling at all
		&.conflict {
			color: var(--color-danger);
			border-color: var(--color-danger);
			border-style: dashed;
		}
	}

	.goal {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 3px;
		background: var(--bar-well);
		border: 0; // the recess alone frames it, no ring around the rings
		border-radius: 999px;
		box-shadow:
			inset 0 1px 2px rgba(20, 30, 50, 0.14),
			0 1px 0 var(--bar-hi);
	}

	.seg {
		position: relative;
		isolation: isolate;
		display: inline-grid;
		grid-template-columns: 1fr 1fr;
		padding: 2px;
		font: inherit;
		background: var(--color-bg-light);
		border: 1px solid var(--color-border-card);
		border-radius: 999px;
		box-shadow: var(--shadow-well);
		cursor: pointer;
		// the knob slides across on a spring and squashes under the finger
		// while held, so the switch feels mechanical
		--knob-x: 0%;
		--knob-s: 1;

		&::before {
			content: '';
			position: absolute;
			z-index: -1;
			inset: 2px auto 2px 2px;
			width: calc((100% - 4px) / 2);
			border-radius: 999px;
			background: var(--color-accent);
			box-shadow: var(--shadow-inset);
			transform: translateX(var(--knob-x)) scale(calc(2 - var(--knob-s)), var(--knob-s));
			transition: transform 320ms var(--spring);
		}

		&.maximum {
			--knob-x: 100%;
		}

		&:active {
			--knob-s: 0.88;
		}

		&:active::before {
			transition-duration: 90ms;
		}

		span {
			padding: 0.25rem 0.8rem;
			font-size: 1.1rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: var(--color-text-muted);
			transition: color 0.2s ease;

			&.active {
				color: var(--color-on-accent);
			}
		}

		// the side a click would switch to brightens, so it reads as one control
		&:hover span:not(.active) {
			color: var(--color-text);
		}
	}

	@include touch {
		.pill {
			min-height: 4rem;
		}

		.seg span {
			padding: 0.8rem 1.1rem;
		}
	}
</style>

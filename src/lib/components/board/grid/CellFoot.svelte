<script lang="ts">
	// a trimester's footer: through the degree, its number on the left; its
	// credits on the right, coloured only when the load is off (light, heavy,
	// over), so a normal trimester's number stays quiet.
	import { academicYear } from '$lib/planner/calendar';
	import { usePlan } from '$lib/planner/context';
	import type { TrimNum } from '$lib/types';
	import { fade } from 'svelte/transition';
	import { reducedMotion } from '$lib/ui/transitions';

	let { year, trim, now }: { year: number; trim: TrimNum; now: boolean } = $props();
	const plan = usePlan();

	let credits = $derived(plan.slotCredits(year, trim));
	let load = $derived(plan.slotLoad(year, trim));
	let numbered = $derived(plan.trimNaming === 'degree');
	let tgpa = $derived(plan.gradeMode ? plan.slotTgpa(year, trim) : null);
</script>

<!-- always there, so the number can fade in and out on its own instead of
     arriving with the whole foot -->
<div class="foot">
	{#if numbered}
		<span
			class="term"
			class:now
			transition:fade={{ duration: reducedMotion() ? 0 : 180 }}
			title="{plan.trimSpelled(year, trim)}, {academicYear(plan.batchStartYear, year)}{now
				? ', the one you’re in now'
				: ''}">{plan.trimName(year, trim)}</span
		>
	{/if}
	{#if credits > 0}
		<span class="cell-credits" data-status={plan.gradeMode ? undefined : load.status}>
			{#if plan.gradeMode}
				<span title="term GPA, this trimester's grade average">TGPA {tgpa === null ? '–' : tgpa.toFixed(2)}</span>
			{:else}
				<!-- amber when light or heavy, red when over; hover says why -->
				<span class="credits" title={load.note || undefined}>{credits} cr</span>
			{/if}
			<button
				class="clear"
				title="clear this trimester"
				aria-label="clear {plan.trimName(year, trim)}"
				onclick={(e) => {
					e.stopPropagation();
					plan.clearSlot(year, trim);
				}}>×<span class="word">clear</span></button
			>
		</span>
	{/if}
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.foot {
		position: absolute;
		left: 1rem;
		right: 0.9rem;
		bottom: 0.7rem;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}

	// the one you're in matches its ring and "now" tag
	.term {
		flex: none;
		font-size: 1.2rem;
		font-weight: 700;
		white-space: nowrap;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;

		&.now {
			color: var(--color-now);
		}
	}

	.cell-credits {
		margin-left: auto;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--color-text-muted);

		&[data-status='under'],
		&[data-status='heavy'] {
			color: color-mix(in srgb, var(--color-hint-caution-deep) 65%, var(--color-text));
		}

		&[data-status='over'] {
			color: var(--color-danger);
		}
	}

	.credits {
		flex: none;
		white-space: nowrap;
	}

	// shows on hover only, so a full board isn't a field of ×s
	.clear {
		padding: 0 0.2rem;
		font-size: 1.3rem;
		line-height: 1;
		color: var(--color-text-muted);
		background: none;
		border: none;
		opacity: 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			opacity 0.2s ease,
			color 0.2s ease;

		:global(.cell:hover) & {
			opacity: 1;
		}

		&:hover {
			color: var(--color-text);
		}
	}

	// nothing waits on a hover that never comes
	@include touch {
		.clear {
			opacity: 0.7;
		}
	}

	.word {
		display: none;
	}

	// phones: the foot joins the flow under the last course, and the clear
	// button says what it does
	@include mobile {
		.foot {
			position: static;
			order: 9999;
			width: 100%;
			justify-content: flex-end;
		}

		.word {
			display: inline;
			margin-left: 0.3rem;
			font-size: 1.2rem;
		}

		.term {
			display: none; // the trimester's own button names it
		}

		.cell-credits {
			font-size: 1.3rem;
		}

		.clear {
			opacity: 1;
			min-height: 3.2rem;
			min-width: 4.4rem;
		}
	}
</style>

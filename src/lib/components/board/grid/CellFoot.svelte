<script lang="ts">
	// a trimester's footer: through the degree, its number on the left; its
	// load and credits on the right. in a narrow trimester the meter gives way
	// first, so nothing runs into anything.
	import { academicYear } from '$lib/calendar';
	import { TRIM_HARD_MAX, TRIM_NORMAL_MAX } from '$lib/data';
	import { usePlan } from '$lib/planner/context';
	import type { TrimNum } from '$lib/types';

	let { year, trim, now }: { year: number; trim: TrimNum; now: boolean } = $props();
	const plan = usePlan();

	// one segment per ordinary 4-credit course, up to the cap
	const STEP = 4;
	const SEGMENTS = Array.from({ length: Math.ceil(TRIM_HARD_MAX / STEP) }, (_, i) => i * STEP);

	let credits = $derived(plan.slotCredits(year, trim));
	let load = $derived(plan.slotLoad(year, trim));
	let numbered = $derived(plan.trimNaming === 'degree');
	let tgpa = $derived(plan.gradeMode ? plan.slotTgpa(year, trim) : null);
	const fill = (from: number) => Math.max(0, Math.min(1, (load.credits - from) / STEP)) * 100;
</script>

{#if numbered || credits > 0}
	<div class="foot">
		{#if numbered}
			<span
				class="term"
				class:now
				title="{plan.trimSpelled(year, trim)}, {academicYear(plan.batchStartYear, year)}{now
					? ', the one you’re in now'
					: ''}">{plan.trimName(year, trim)}</span
			>
		{/if}
		{#if credits > 0}
			<span class="cell-credits" data-status={plan.gradeMode ? undefined : load.status}>
				<!-- the last segment, past the normal load, is the faintly striped extra load -->
				{#if !plan.gradeMode && load.status !== 'exempt'}
					<span class="meter" aria-hidden="true">
						{#each SEGMENTS as from, i (i)}
							<i class:extra={from >= TRIM_NORMAL_MAX}><b style:width="{fill(from)}%"></b></i>
						{/each}
					</span>
				{/if}
				{#if plan.gradeMode}
					<span title="term GPA, this trimester's grade average">TGPA {tgpa === null ? '–' : tgpa.toFixed(2)}</span>
				{:else}
					<!-- red past the hard cap, or when more trimesters are heavy than
					     allowed; hover says how the load stands -->
					<span class="credits" title={load.note || undefined}>{credits} cr</span>
				{/if}
				<button
					class="clear"
					title="clear this trimester"
					aria-label="clear {plan.trimName(year, trim)}"
					onclick={(e) => {
						e.stopPropagation();
						plan.clearSlot(year, trim);
					}}>×</button
				>
			</span>
		{/if}
	</div>
{/if}

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

	// the one you're in is in the accent, matching its ring and "now" tag
	.term {
		flex: none;
		font-size: 1.2rem;
		font-weight: 700;
		white-space: nowrap;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;

		&.now {
			color: var(--color-accent);
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

		&[data-status='over'] {
			color: var(--color-danger);
			--load: var(--color-danger);
		}
	}

	// the credits never give way; the meter beside them does
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

	// a glossy capsule like the sidebar's progress bars
	.meter {
		display: inline-flex;
		flex: 0 1 auto;
		min-width: 0;
		overflow: hidden;
		gap: 2px;
		height: 0.8rem;
		padding: 1px;
		margin-right: 0.4rem;
		@include progress-track;

		i {
			width: 0.8rem;
			overflow: hidden;
			border-radius: 1px;
			background: color-mix(in srgb, var(--color-text) 7%, transparent);

			&:first-child {
				border-radius: 999px 1px 1px 999px;
			}

			&:last-child {
				border-radius: 1px 999px 999px 1px;
			}

			&.extra {
				background: repeating-linear-gradient(
					-45deg,
					color-mix(in srgb, var(--color-text) 10%, transparent) 0 2px,
					transparent 2px 4px
				);
			}
		}

		b {
			display: block;
			height: 100%;
			background-color: var(--load, var(--color-hint-good-deep));
			@include progress-fill;
			box-shadow: none;
			transition: width 0.35s var(--spring);
		}
	}

	// nothing waits on a hover that never comes
	@include touch {
		.clear {
			opacity: 0.7;
		}
	}

	@include mobile {
		.term {
			display: none; // the trimester's own button names it
		}

		.cell-credits {
			font-size: 1.3rem;
		}

		.clear {
			opacity: 1;
			min-width: 4.4rem;
		}
	}
</style>

<script lang="ts">
	// the suggested path as a grid, compared with your plan: a tick for what you
	// have, colour and a click for what's missing. `plain` only shows the route,
	// every course in its colour, under the board's own year and trimester
	// headings, for the welcome.
	import { usePlan } from '$lib/planner/context';
	import { byCode } from '$lib/curriculum/data';
	import { academicYear, termMonths } from '$lib/planner/calendar';
	import type { TrimNum } from '$lib/types';

	let { plain = false }: { plain?: boolean } = $props();
	const plan = usePlan();

	const at = (year: number, trim: TrimNum) => plan.recommended[`${year}-${trim}`] ?? [];
</script>

{#snippet label(code: string)}
	<span class="rc-label"><b>{plan.shownCode(code)}</b> {byCode(code).title}</span>
{/snippet}

<div class="path" class:plain style="--cols: {plan.trims.length}">
	{#if plain}
		<div></div>
		{#each plan.trims as t (t)}
			<!-- through the degree a column has no one number, so only its months -->
			<div class="head">
				{#if plan.trimNaming === 'year'}<b>t{t}</b>{/if}
				<small>{termMonths(t)}</small>
			</div>
		{/each}
	{/if}

	{#each plan.years as y (y)}
		{#if plain}
			<div class="head year">
				<b>y{y}</b>
				<small>{academicYear(plan.batchStartYear, y)}</small>
			</div>
		{/if}
		{#each plan.trims as t (t)}
			{@const codes = at(y, t)}
			<div class="cell">
				{#each codes as code (code)}
					{#if plain}
						<span
							class="rc"
							data-type={plan.courseType(code)}
							style:--hue={plan.hueOf(code)}
							title="{plan.shownCode(code)} {byCode(code).title}">{@render label(code)}</span
						>
					{:else}
						{@const have = plan.placedCodes.has(code)}
						<button
							class="rc"
							class:have
							data-type={plan.courseType(code)}
							style:--hue={plan.hueOf(code)}
							title={have
								? `${plan.shownCode(code)} ${byCode(code).title} is on your plan`
								: `add ${plan.shownCode(code)} ${byCode(code).title} to your plan`}
							onclick={() => (have ? (plan.selected = byCode(code)) : plan.acceptSuggestion(code))}
						>
							<span class="rc-mark" aria-hidden="true">{have ? '✓' : '+'}</span>
							{@render label(code)}
						</button>
					{/if}
				{/each}

				<!-- the room the degree leaves you: credits the path doesn't
				     spend on required courses, which you fill with electives
				     of your own choosing -->
				{#if plan.electivesFor(y, t)}
					{@const n = plan.electivesFor(y, t)}
					<span class="elective">{n} elective{n === 1 ? '' : 's'}</span>
				{/if}

				{#if !codes.length && !plan.electivesFor(y, t)}
					<span class="none">–</span>
				{/if}
			</div>
		{/each}
	{/each}
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.path {
		display: grid;
		// minmax(0, …): a long title shortens with an ellipsis instead of
		// stretching its column off the panel
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		gap: 0.5rem;

		&.plain {
			grid-template-columns: 4.8rem repeat(var(--cols), minmax(0, 1fr));
		}
	}

	// the board's headings: the name over the dates it falls on
	.head {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		color: var(--color-text-muted);

		b {
			font-size: 1.6rem;
			font-weight: 400;
			line-height: 1.2;
			color: var(--color-text);
		}

		small {
			font-size: 1rem;
			white-space: nowrap;
		}

		&.year {
			align-self: center;
		}
	}

	.cell {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-height: 4rem;
		padding: 0.4rem;
		background: var(--color-grid-cell);
		border-radius: 6px;
	}

	// one line per course. on your plan already: grey text and a tick, no
	// fill, it needs nothing from you
	.rc {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
		padding: 0.3rem 0.5rem;
		font: inherit;
		font-size: 1.15rem;
		text-align: left;
		color: var(--color-text-muted);
		background: none;
		border: 1px solid transparent;
		border-radius: 4px;
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;

		.rc-mark {
			flex: none;
			font-weight: 700;
		}

		&.have .rc-mark {
			color: var(--color-hint-good-deep);
		}

		.rc-label {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;

			b {
				font-weight: 650;
			}
		}

		&.have:hover .rc-label {
			color: var(--color-text);
			text-decoration: underline;
			text-underline-offset: 0.2em;
		}

		// not on your plan: the one thing in colour, the board's own chip
		&:not(.have) {
			color: var(--color-text);
			@include course-type-fill(false);
			@include card-shine;
		}
	}

	button.rc {
		cursor: pointer;

		&:not(.have):hover {
			transform: translateY(-1px);
			@include card-shine-hover;
		}
	}

	// not a course, the room the degree leaves open: one quiet dashed line a
	// trimester, with no action, there's nothing to add until you pick one
	.elective {
		padding: 0.25rem 0.5rem;
		font-size: 1.1rem;
		font-style: italic;
		text-align: center;
		color: var(--color-text-muted);
		border: 1px dashed color-mix(in srgb, var(--color-text-muted) 45%, transparent);
		border-radius: 4px;
	}

	.none {
		font-size: 1.1rem;
		color: var(--color-text-muted);
		opacity: 0.5;
	}
</style>

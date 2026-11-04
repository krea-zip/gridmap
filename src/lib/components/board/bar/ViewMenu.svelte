<script lang="ts">
	import { usePlan } from '$lib/planner/context';
	// The board's view menu, drawn with the board's own parts. Every view is
	// shown by what it does to one of YOUR courses: the same chip the grid
	// draws, wearing the same mark that view adds (its grade, how often it
	// ran, the arrow from its prerequisite). So the menu is a
	// preview of the board, not a list of names. Opens with the bar's spring,
	// like the colour key beside it.
	import { fade, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { reducedMotion } from '$lib/ui/transitions';
	import { BOARD_VIEWS, type BoardView } from '$lib/planner/plan.svelte';
	import { COURSES, byCode, hasCode, isCore, satisfiedBy } from '$lib/curriculum/data';
	import { isGradeLetter } from '$lib/planner/grades';
	import { runRecord } from '$lib/planner/boardViews';
	import type { TrimNum } from '$lib/types';

	let { onpick }: { onpick: (view: BoardView) => void } = $props();
	const plan = usePlan();

	const GROUPS = [
		{ id: 'yours', label: 'your plan' },
		{ id: 'explore', label: 'explore' }
	] as const;

	// the course the samples show: one of yours, preferably a required one
	// whose prerequisite is on the plan too, so the arrow sample is a real
	// pair; any course of yours otherwise, any course at all on an empty plan
	let sample = $derived.by(() => {
		const before = (code: string) =>
			byCode(code)
				.prereqs.filter(hasCode)
				.flatMap((pre) => [byCode(pre).code, ...satisfiedBy(pre)])
				.find((c) => plan.placedCodes.has(c));
		const mine = plan.placed.filter((p) => !isCore(p.code));
		const paired = mine.filter((p) => before(p.code));
		const at =
			paired.find((p) => plan.courseType(p.code) === 'required') ??
			paired[0] ??
			mine.find((p) => plan.courseType(p.code) === 'required') ??
			mine[0];
		const code = at?.code ?? COURSES.find((c) => !isCore(c.code))!.code;
		const trim: TrimNum = at?.trim ?? byCode(code).offered[0] ?? 1;
		const grade = plan.gradeOf(code);
		return {
			code,
			pre: before(code),
			run: runRecord(code, trim).kind,
			grade: isGradeLetter(grade) ? grade : 'A'
		};
	});

	// open on the current view; the arrow keys walk the list
	let menuEl: HTMLDivElement;
	$effect(() => {
		menuEl.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
	});
	function walk(e: KeyboardEvent) {
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
		e.preventDefault();
		const items = [...menuEl.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
		const at = items.indexOf(document.activeElement as HTMLButtonElement);
		items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
	}
</script>

<!-- a course chip at menu size: the grid's own fill, shine, dot and code -->
{#snippet chip(code: string, type = plan.courseType(code), hue = plan.hueOf(code))}
	<span class="mini" data-type={type} style:--hue={hue}>
		{#if type === 'required'}<i class="req-dot"></i>{/if}<b>{plan.shownCode(code)}</b>
	</span>
{/snippet}

<div
	id="view-list"
	class="view-menu"
	role="radiogroup"
	aria-label="board view"
	tabindex="-1"
	bind:this={menuEl}
	onkeydown={walk}
	in:scale|global={{ start: 0.94, duration: reducedMotion() ? 0 : 260, easing: backOut }}
	out:fade|global={{ duration: reducedMotion() ? 0 : 100 }}
>
	{#each GROUPS as group (group.id)}
		<div class="vm-group">
			<span class="vm-head" aria-hidden="true">{group.label}</span>
			{#each BOARD_VIEWS.filter((v) => v.group === group.id) as v (v.id)}
				{@const on = plan.view === v.id}
				<button
					role="radio"
					aria-checked={on}
					tabindex={on ? 0 : -1}
					class:on
					class:wip={'wip' in v}
					onclick={() => onpick(v.id)}
				>
					<span class="vm-sample" aria-hidden="true">
						{#if v.id === 'plan'}
							<span class="with-x">{@render chip(sample.code)}<span class="x">×</span></span>
						{:else if v.id === 'grades'}
							<span class="grade">{sample.grade}</span>{@render chip(sample.code)}
						{:else if v.id === 'runs'}
							{@render chip(sample.code)}<i class="run-mark" data-kind={sample.run}></i>
						{:else if v.id === 'prereqs'}
							{#if sample.pre}{@render chip(sample.pre)}{:else}<span class="mini ghost">?</span>{/if}
							<svg class="arrow" viewBox="0 0 20 10" width="20" height="10">
								<path d="M1 5 H14" /><path class="head" d="M13 1 L19 5 L13 9 z" />
							</svg>
							{@render chip(sample.code)}
						{:else if v.id === 'whatif'}
							<!-- the same course, read as another degree would: no longer counting -->
							{@render chip(sample.code, 'other', undefined)}<i class="wi-mark" data-change="stops">−</i>
						{/if}
					</span>
					<span class="vm-text"
						><b>
							<!-- still being built: the view works, but it's unfinished -->
							{#if 'wip' in v}<i class="wip-mark" role="img" aria-label="under construction" title="under construction"
									>🚧</i
								>{/if}{v.label}
						</b><span>{v.note}</span></span
					>
					<span class="vm-check" aria-hidden="true">{on ? '✓' : ''}</span>
				</button>
			{/each}
		</div>
	{/each}
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	// the bar's dropdown card, as the colour key's
	.view-menu {
		position: absolute;
		top: calc(100% + 0.6rem);
		left: 0;
		z-index: 3;
		width: max-content;
		min-width: 32rem;
		padding: 0.5rem;
		background: var(--color-bg-card-start);
		border: 1px solid var(--bar-edge);
		border-radius: 6px;
		box-shadow: 0 6px 18px rgba(20, 30, 50, 0.18);
		transform-origin: top left;
		outline: none;
		// one set of columns for every row, groups included: the samples' column
		// is as wide as the widest sample, so the names all line up beside it
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr) 1.4rem;
	}

	.vm-group,
	button {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
	}

	// the two groups part on the board's dotted rule
	.vm-group + .vm-group {
		margin-top: 0.4rem;
		padding-top: 0.4rem;
		border-top: 1px dotted color-mix(in srgb, var(--bar-text-muted) 55%, transparent);
	}

	.vm-head {
		grid-column: 1 / -1;
		padding: 0.6rem 1rem 0.3rem;
		@include section-label;
		font-size: 1.05rem;
	}

	button {
		align-items: center;
		gap: 1.2rem;
		width: 100%;
		padding: 0.7rem 1rem;
		font: inherit;
		text-align: left;
		color: var(--color-text);
		background: none;
		border: 0;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 120ms ease;

		&:hover,
		&:focus-visible {
			background: var(--bar-well);
			outline: none;
		}

		// the sample lifts a little under the pointer, as a chip on the grid does
		&:hover .vm-sample {
			transform: translateY(-1px);
		}

		&.on {
			background: var(--bar-well);

			.vm-text b {
				color: var(--color-accent);
			}
		}
	}

	.vm-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;

		b {
			font-size: 1.3rem;
		}

		span {
			font-size: 1.15rem;
			color: var(--color-text-muted);
		}
	}

	// unfinished views step back, and come forward again under the pointer
	button.wip:not(.on) {
		.vm-sample,
		.vm-text {
			opacity: 0.6;
			transition: opacity 120ms ease;
		}

		&:hover .vm-sample,
		&:hover .vm-text,
		&:focus-visible .vm-sample,
		&:focus-visible .vm-text {
			opacity: 0.9;
		}
	}

	.wip-mark {
		margin-right: 0.4rem;
		font-style: normal;
	}

	.vm-check {
		font-weight: 700;
		color: var(--color-accent);
	}

	// ── the samples: drawn in the page's palette, not the bar's, so they look
	//    exactly like the board they preview ──
	.vm-sample {
		--color-text: var(--color-text-page);
		--color-accent: var(--color-accent-page);
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
		transition: transform 0.15s var(--spring);
	}

	.mini {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.65rem;
		font-size: 1.05rem;
		line-height: 1.3;
		white-space: nowrap;
		border-radius: 4px;
		@include course-type-fill($audits: false);
		@include card-shine;

		b {
			font-weight: 650;
		}

		.req-dot {
			@include required-dot;
			width: 0.55rem;
			height: 0.55rem;
		}

		// no prerequisite on the plan to show: an empty slot where it would be
		&.ghost {
			color: var(--color-text-muted);
			background: none;
			border: 1px dashed color-mix(in srgb, var(--color-text-muted) 60%, transparent);
			box-shadow: none;
		}
	}

	// plan: the chip as it sits on the grid, its × in the corner
	.with-x {
		position: relative;
		display: inline-flex;

		.mini {
			padding-right: 1.6rem;
		}

		.x {
			position: absolute;
			top: 50%;
			right: 0.5rem;
			font-size: 1.1rem;
			line-height: 1;
			color: var(--color-course-ink);
			transform: translateY(-50%);
		}
	}

	// grades: the grid's grade badge
	.grade {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.9rem;
		padding: 0 0.4rem;
		font-size: 1.05rem;
		font-weight: 700;
		line-height: 1.4;
		color: var(--color-text);
		background: var(--color-bg-card-start);
		border: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent);
		border-radius: 999px;
		font-variant-numeric: tabular-nums;
	}

	.run-mark {
		@include run-mark;
	}

	// what-if: the "would stop counting" mark
	.wi-mark {
		@include whatif-mark(stops);
		width: 1.3rem;
		height: 1.3rem;
		font-size: 1rem;
	}

	// prerequisites: the grid's arrow, in order
	.arrow {
		flex-shrink: 0;
		overflow: visible;

		path {
			fill: none;
			stroke: var(--color-accent);
			stroke-width: 1.6;
		}

		.head {
			fill: var(--color-accent);
			stroke: none;
		}
	}
</style>

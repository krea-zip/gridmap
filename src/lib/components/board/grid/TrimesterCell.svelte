<script lang="ts">
	// one trimester on the grid. the cell is tinted by its courses, ringed by
	// its state (now, a warning, a drag's fit) and opens the trimester view
	// when clicked anywhere that isn't a course.
	import { slotOrder, termMonths } from '$lib/planner/calendar';
	import { usePlan } from '$lib/planner/context';
	import type { TrimNum } from '$lib/types';
	import { useBoard } from '../boardState.svelte';
	import { cellTone } from './cellTone';
	import CourseChips from './CourseChips.svelte';
	import Ghosts from './Ghosts.svelte';
	import CellFoot from './CellFoot.svelte';

	let { year, trim, touchLayout = false }: { year: number; trim: TrimNum; touchLayout?: boolean } = $props();
	const plan = usePlan();
	const board = useBoard();

	let key = $derived(`${year}-${trim}`);
	let codes = $derived(plan.slotCourses(year, trim));
	let off = $derived(plan.breakAt(year, trim));
	let coreSlot = $derived(plan.coreOnly(year, trim));
	let order = $derived(slotOrder(year, trim));
	let whatIf = $derived(plan.view === 'whatif');
	// what-if marks "you are here" itself and greys the past, so the plain
	// "now" ring would say it twice
	let now = $derived(!whatIf && order === board.hereAt);
	let dragging = $derived(plan.dragging);
	let landing = $derived(board.drag.landingIn(key));

	const open = () => (plan.zoom = { year, trim });

	// a press that starts on a course, a ghost or the clear button is about
	// that thing: if the pointer slips off before release (the chip shrinks
	// under the press), the click lands on the cell and mustn't zoom
	let pressOnItem = false;
</script>

<div
	class="cell"
	class:now
	class:here={whatIf && order === board.hereAt}
	class:past={whatIf && order < board.hereAt}
	class:off={!!off}
	class:fresh={year === board.freshYear}
	class:core-slot={coreSlot}
	class:problem={plan.slotHasProblem(year, trim)}
	class:lit={plan.highlight.length > 0 && codes.some((c) => plan.highlight.includes(c))}
	class:drop-target={dragging !== null && board.drag.target === key}
	class:can-drop={dragging !== null && plan.canDrop(dragging, year, trim)}
	class:no-fit={dragging !== null && !plan.canDrop(dragging, year, trim)}
	style:--t={trim}
	style:--mix={cellTone(plan, codes)}
	data-year={year}
	data-trim={trim}
	data-core-only={coreSlot || undefined}
	role="button"
	tabindex="0"
	aria-label="open {plan.trimSpelled(year, trim)}"
	onpointerdown={(e) => (pressOnItem = !!(e.target as Element).closest('.chip, .ghost, .cell-credits'))}
	onclick={() => !pressOnItem && open()}
	onkeydown={(e) => {
		if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			open();
		}
	}}
>
	<!-- phones have no column headings, so each trimester names itself -->
	<button
		class="phone-term"
		aria-label="view {plan.trimSpelled(year, trim)}"
		onclick={(e) => {
			e.stopPropagation();
			open();
		}}>{plan.trimName(year, trim)} · {termMonths(trim)}<span>view trimester →</span></button
	>

	<!-- a break, a suspension or a term away, set and lifted in the trimester's own view -->
	{#if off}
		<span class="off-card">
			<b>{off.kind === 'away' ? 'away' : off.kind === 'suspension' ? 'suspended' : 'on a break'}</b>
			{#if off.kind === 'away'}<span>{off.credits ?? 0} cr from elsewhere</span>{/if}
		</span>
	{/if}

	{#if now || (whatIf && order === board.hereAt)}
		<span
			class="here-tag"
			title="the trimester you're in now, from your batch and today's date (you can change it in what-if)">now</span
		>
	{/if}

	<!-- named only while the cell is empty; once courses are in, the core tint
	     alone marks the slot -->
	{#if coreSlot && codes.length === 0 && (plan.view !== 'plan' || plan.suggestionsFor(year, trim).length === 0)}
		<span class="core-note">kccs courses</span>
	{/if}

	<CourseChips {year} {trim} {codes} {touchLayout} />

	<!-- the course in hand's footprint, opening where it would land (placed by
	     CSS order, see GridDrag.order) -->
	{#if landing && dragging}
		<span class="landing" class:titled={plan.showTitles} style:order={landing.index * 4} aria-hidden="true">
			<span class="label">{plan.courseLabel(dragging)}</span>
			<span class="plus">+</span>
		</span>
	{/if}

	<Ghosts {year} {trim} />

	<CellFoot {year} {trim} {now} />
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.cell {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 0.8rem;
		min-height: 13rem;
		padding: 1rem 1rem 2.6rem;
		background: var(--mix, var(--color-grid-cell));
		border-radius: 8px;
		cursor: zoom-in;
		// every cell carries the same inset dashed rule; the states below only
		// recolour or firm it up, so nothing shifts
		outline: 1px dashed color-mix(in srgb, var(--color-board-text) 35%, transparent);
		outline-offset: -4px;
		transition:
			background 0.25s ease,
			box-shadow 0.25s ease,
			opacity 0.25s ease,
			outline-color 0.25s ease;
		@include card-shine;
		box-shadow: var(--shadow-inset); // the inset shine without the outer shadow

		// states are in cascade order, later ones win when two apply: a drag
		// beats a warning beats "now", and a pointed-at hint beats them all
		&.drop-target {
			outline: 2px solid var(--color-accent);
			outline-offset: -3px;
			box-shadow: inset 0 0 0 5px color-mix(in srgb, var(--color-accent) 10%, transparent);
		}

		// darkens whatever the cell already is by laying 10% black over it
		&:hover {
			box-shadow:
				var(--shadow-inset),
				inset 0 0 0 100vmax rgba(0, 0, 0, 0.1);
		}

		// a straight rule where the others are dashed
		&.now {
			outline: 2px solid color-mix(in srgb, var(--color-accent) 70%, transparent);
			outline-offset: -3px;
		}

		// year 1's t1/t2 are reserved for the foundation core, tinted like the
		// core chips so the pairing is obvious
		&.core-slot {
			background: var(--mix, color-mix(in srgb, var(--color-course-core) 45%, var(--color-grid-cell)));
			outline-color: var(--color-course-core-deep);
		}

		// the courses keep their colours; the warning rides on the rule
		&.problem {
			outline-color: var(--color-hint-warn-deep);
		}

		// mid-drag: mint where the course fits cleanly, and every trimester it
		// doesn't (not offered then, wrong year, prerequisite after it) fades
		// back. still, not pulsing: the whole grid breathing at once was noise.
		// a faded slot still takes the drop; the hints flag it
		&.can-drop {
			background: var(--color-drop-ok);
			outline: 2px solid var(--color-drop-ok-edge);
		}

		&.no-fit {
			opacity: 0.4;
			filter: saturate(0.4);
		}

		&.off {
			background-image: repeating-linear-gradient(
				135deg,
				transparent 0 8px,
				color-mix(in srgb, var(--color-text-muted) 7%, transparent) 8px 9px
			);
		}

		// what-if: the past steps back and "you are here" is ringed
		&.past {
			opacity: 0.55;
		}

		&.here {
			outline: 2px solid color-mix(in srgb, var(--color-accent) 70%, transparent);
			outline-offset: -3px;
		}

		// holds a pointed-at hint's courses
		&.lit {
			outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
			outline-offset: -3px;
		}

		&.fresh {
			@include drop-in;
		}
	}

	.phone-term {
		display: none;
	}

	.here-tag {
		position: absolute;
		top: -0.9rem;
		left: 0.8rem;
		z-index: 1;
		padding: 0 0.6rem;
		font-size: 1.05rem;
		font-weight: 650;
		line-height: 1.6;
		color: var(--color-on-accent);
		background: var(--color-accent);
		border-radius: 999px;
	}

	.core-note {
		@include section-label;
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		transform: translateY(-50%);
		text-align: center;
		font-size: 1rem;
		pointer-events: none;
	}

	// a trimester off holds one quiet card instead of courses
	.off-card {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		width: 100%;
		padding: 1rem 1.2rem;
		font-size: 1.25rem;
		color: var(--color-text-muted);
		border: 1px dashed color-mix(in srgb, var(--color-text-muted) 55%, transparent);
		border-radius: 5px;

		b {
			font-weight: 650;
			color: var(--color-text);
		}

		span {
			font-size: 1.15rem;
		}
	}

	// the chip's own footprint, dashed, popping in on a spring
	.landing {
		position: relative;
		display: flex;
		align-items: center;
		height: fit-content;
		padding: 0.7rem 2.2rem 0.7rem 1rem; // a chip's own box, so the sizes match
		font-size: 1.3rem;
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		border: 1px dashed var(--color-accent);
		border-radius: 5px;
		pointer-events: none;
		animation: landing-pop 240ms var(--spring) both;

		.label {
			visibility: hidden;
			white-space: nowrap;
		}

		.plus {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			font-weight: 700;
			color: var(--color-accent);
		}

		&.titled {
			flex-basis: 100%;

			.label {
				white-space: normal;
			}
		}
	}

	@keyframes landing-pop {
		from {
			opacity: 0;
			transform: scale(0.6);
		}
	}

	@include mobile {
		.cell {
			grid-column: 1;
			min-width: 0;
			min-height: 13rem;
			padding: 1.4rem 1.4rem 4.8rem;
			gap: 0.8rem;
		}

		.phone-term {
			order: -1;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
			width: 100%;
			padding: 0 0 0.8rem;
			font-size: 1.5rem;
			font-weight: 600;
			text-align: left;
			color: var(--color-text);
			background: none;
			border: 0;
			cursor: pointer;

			span {
				font-size: 1.1rem;
				font-weight: 400;
				color: var(--color-text-muted);
			}
		}

		@container plan (min-width: 720px) {
			.cell {
				grid-column: auto;
			}

			.phone-term {
				flex-wrap: wrap;
				gap: 0.5rem;
			}
		}
	}
</style>

<script lang="ts">
	// the welcome's one hands-on window: the year the student is in, as a single
	// row of the grid, with the courses left to choose beneath it. a ghost cursor
	// drags one over once to show the move, then it's their turn, and what they
	// drop lands on their real plan. beside it, the two things worth a try: what
	// a course shows, and the two ways of naming a trimester.
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { byCode } from '$lib/curriculum/data';
	import { academicYear, degreeTrim, termMonths, trimName, type TrimNaming } from '$lib/planner/calendar';
	import { usePlan } from '$lib/planner/context';
	import { electiveChoices } from '$lib/planner/electives';
	import type { TrimNum } from '$lib/types';
	import { carried, carry } from '$lib/ui/courseDrag';
	import { reducedMotion } from '$lib/ui/transitions';
	import LabelKeys from '../board/bar/LabelKeys.svelte';
	import Rolling from '../Rolling.svelte';

	const plan = usePlan();
	const NAMINGS: TrimNaming[] = ['year', 'degree'];
	const CHIPS_IN_VIEW = 10; // the demo picks from these, the rest may be scrolled away

	const choices = () => electiveChoices(plan).flatMap((group) => group.codes);
	const fitsRow = (code: string, year: number) => plan.trims.some((trim) => plan.canDrop(code, year, trim));

	// the year they're in, fixed on arrival so a drop can't swap the row. a first
	// year's trimesters are reserved for the core, so they practise on year 2
	const year =
		plan.years.find((y) => y >= Math.max(plan.here.year, 2) && choices().some((code) => fitsRow(code, y))) ??
		plan.here.year;

	let stage = $state<HTMLElement>();
	let codes = $derived(choices().filter((code) => fitsRow(code, year)));
	let pointed = $state<string | null>(null);
	let ghost = $state<{ code: string; x: number; y: number; landed: boolean } | null>(null);
	let dropped = new SvelteSet<string>(); // what the student put down here

	// the course whose trimesters are lit: in the demo, in hand, or pointed at
	let focus = $derived(ghost?.code ?? plan.dragging ?? pointed);

	const fitsOf = (code: string) =>
		plan.trims.filter((trim) => plan.canDrop(code, year, trim)).map((trim) => ({ code, trim }));
	/** the demo's course: the one that lights the most trimesters, since seeing
	 *  them go green is the point */
	const bestFit = () =>
		codes
			.slice(0, CHIPS_IN_VIEW)
			.map(fitsOf)
			.sort((a, b) => b.length - a.length)[0]?.[0];

	/** where the ghost sits over an element, in the stage's own coordinates */
	function spot(el: Element | null | undefined) {
		const from = stage!.getBoundingClientRect();
		const to = el!.getBoundingClientRect();
		return { x: to.left - from.left + 8, y: to.top - from.top + 6 };
	}

	// each wait reports whether this run is still the current one, so a stopped
	// or restarted demo ends itself and nothing fires once the window has gone
	let run = 0;
	function watch() {
		const fit = bestFit();
		if (!fit || !stage) return;
		const chip = stage.querySelector(`[data-chip="${CSS.escape(fit.code)}"]`);
		const cell = stage.querySelector(`[data-trim="${fit.trim}"]`);
		const mine = ++run;
		const wait = (ms: number) => new Promise<boolean>((done) => setTimeout(() => done(mine === run), ms));
		void (async () => {
			ghost = { code: fit.code, ...spot(chip), landed: false };
			if (!(await wait(900))) return; // long enough to see what's lit
			ghost = { code: fit.code, ...spot(cell), landed: false };
			if (!(await wait(1000))) return;
			ghost = { code: fit.code, ...spot(cell), landed: true };
			if (!(await wait(1200))) return;
			ghost = null;
		})();
	}

	function takeOver() {
		run++;
		ghost = null;
	}

	function drop(e: DragEvent, trim: TrimNum) {
		e.preventDefault();
		const code = carried(e);
		plan.dragging = null;
		if (!code || !plan.canDrop(code, year, trim)) return;
		plan.place(code, year, trim);
		dropped.add(code);
	}

	function takeBack(code: string) {
		plan.remove(code);
		dropped.delete(code);
	}

	function dragstart(e: DragEvent, code: string) {
		carry(e, code);
		plan.dragging = code;
	}

	// the names flip on their own until the student picks the one they think in
	let naming = $state<TrimNaming>('degree');
	let flipping: ReturnType<typeof setInterval>;

	function chooseNaming(choice: TrimNaming) {
		clearInterval(flipping);
		naming = choice;
		plan.trimNaming = choice;
	}

	onMount(() => {
		if (reducedMotion()) return;
		flipping = setInterval(() => (naming = naming === 'year' ? 'degree' : 'year'), 2000);
		const start = setTimeout(watch, 500); // once the window has slid in
		return () => {
			clearInterval(flipping);
			clearTimeout(start);
			run++;
		};
	});
</script>

{#snippet label(code: string)}
	{#if plan.showCodes}<b>{plan.shownCode(code)}</b>{/if}
	{#if plan.showTitles}<span>{byCode(code).title}</span>{/if}
{/snippet}

<p class="lead">
	this is {year === plan.here.year ? "the year you're in" : 'your next year'}. drag a course around, the trimesters it
	can go in turn green.
</p>

<div class="stage" role="presentation" bind:this={stage} onpointerdown={takeOver}>
	<div class="row" style="--cols: {plan.trims.length}">
		<div></div>
		{#each plan.trims as t (t)}
			<div class="head">
				<b><Rolling value={naming === 'year' ? `t${t}` : `t${degreeTrim(year, t)}`} /></b>
				<small>{termMonths(t)}</small>
			</div>
		{/each}

		<div class="head year">
			<b>y{year}</b>
			<small>{academicYear(plan.batchStartYear, year)}</small>
		</div>
		{#each plan.trims as t (t)}
			{@const fits = !!focus && plan.canDrop(focus, year, t)}
			<div
				class="cell"
				role="listitem"
				data-trim={t}
				class:fits
				class:no-fit={!!focus && !fits}
				ondragover={(e) => fits && e.preventDefault()}
				ondrop={(e) => drop(e, t)}
			>
				{#each plan.slotCourses(year, t) as code (code)}
					<div
						class="chip"
						role="listitem"
						draggable="true"
						data-type={plan.courseType(code)}
						style:--hue={plan.hueOf(code)}
						ondragstart={(e) => dragstart(e, code)}
						ondragend={() => (plan.dragging = null)}
						onpointerenter={() => (pointed = code)}
						onpointerleave={() => (pointed = null)}
					>
						{@render label(code)}
						{#if dropped.has(code)}
							<button aria-label="take {plan.shownCode(code)} back off" onclick={() => takeBack(code)}>×</button>
						{/if}
					</div>
				{/each}
				<span class="credits">{plan.slotCredits(year, t)} cr</span>
			</div>
		{/each}
	</div>

	<div class="pool" role="list" aria-label="courses left to choose">
		{#each codes as code (code)}
			<div
				class="chip"
				role="listitem"
				draggable="true"
				data-chip={code}
				data-type={plan.courseType(code)}
				class:lifted={focus === code}
				style:--hue={plan.hueOf(code)}
				title="{plan.shownCode(code)} {byCode(code).title}"
				ondragstart={(e) => dragstart(e, code)}
				ondragend={() => (plan.dragging = null)}
				onpointerenter={() => (pointed = code)}
				onpointerleave={() => (pointed = null)}
			>
				{@render label(code)}
			</div>
		{:else}
			<p class="empty">nothing left to choose this year.</p>
		{/each}
	</div>

	{#if ghost}
		<div
			class="chip ghost"
			class:landed={ghost.landed}
			data-type={plan.courseType(ghost.code)}
			style:--hue={plan.hueOf(ghost.code)}
			style:transform="translate({ghost.x}px, {ghost.y}px)"
			aria-hidden="true"
		>
			{@render label(ghost.code)}
			<svg viewBox="0 0 16 16" width="18" height="18"
				><path d="M2 1v12l3.2-3 2.2 5 2-.9-2.2-4.9H12Z" fill="#fff" stroke="#2b2230" stroke-width="1.1" /></svg
			>
		</div>
	{/if}
</div>

<button class="again" disabled={!!ghost} onclick={watch}>watch it again</button>

<div class="extras">
	<div>
		<LabelKeys />
		<p>pick what a course shows: its code, its title, or both</p>
	</div>
	<div>
		<div class="names" role="group" aria-label="how to name trimesters">
			{#each NAMINGS as choice (choice)}
				<button class:active={naming === choice} aria-pressed={naming === choice} onclick={() => chooseNaming(choice)}>
					{trimName(year, 2, choice)}
				</button>
			{/each}
		</div>
		<p>
			one trimester, two names: {trimName(year, 2, 'year')} counts inside the year, {trimName(year, 2, 'degree')} through
			your degree
		</p>
	</div>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.lead {
		margin-bottom: 1.4rem;
		font-size: 1.3rem;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	.stage {
		position: relative;
	}

	.row {
		display: grid;
		grid-template-columns: 4.8rem repeat(var(--cols), minmax(0, 1fr));
		gap: 0.5rem;
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
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 0.3rem;
		min-height: 10rem;
		padding: 0.5rem;
		background: var(--color-grid-cell);
		border-radius: 6px;
		outline: 1px dotted transparent;
		transition:
			background-color 0.18s ease,
			opacity 0.18s ease;

		&.fits {
			background: var(--color-drop-ok);
			outline: 2px dotted var(--color-drop-ok-edge);
		}

		&.no-fit {
			opacity: 0.45;
		}
	}

	.credits {
		width: 100%;
		margin-top: auto;
		font-size: 1.1rem;
		font-weight: 700;
		text-align: right;
		color: var(--color-text-muted);
	}

	.pool {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		max-height: 11rem;
		margin-top: 1rem;
		padding: 0.2rem 0 0.2rem 5.3rem; // in line with the trimesters, past the year
		overflow-y: auto;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		max-width: 100%;
		padding: 0.2rem 0.7rem;
		font-size: 1.15rem;
		border-radius: 4px;
		cursor: grab;
		@include course-type-fill(false);
		transition: transform 0.2s var(--spring);

		&.lifted {
			transform: translateY(-2px);
		}

		b {
			font-weight: 650;
		}

		span {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		button {
			padding: 0;
			font: inherit;
			color: inherit;
			background: none;
			border: 0;
			cursor: pointer;
		}
	}

	.empty {
		font-size: 1.3rem;
		color: var(--color-text-muted);
	}

	// the demo's course in hand: glides from the pool to its trimester, then
	// settles with a little overshoot
	.ghost {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
		pointer-events: none;
		box-shadow: 0 6px 14px rgba(20, 30, 50, 0.22);
		transition:
			transform 0.95s var(--ease-out),
			box-shadow 0.2s ease;

		&.landed {
			box-shadow: none;
			animation: settle 0.42s var(--spring);
		}

		svg {
			position: absolute;
			right: -1.1rem;
			bottom: -1.2rem;
		}
	}

	@keyframes settle {
		from {
			scale: 1.08;
		}
	}

	.again {
		margin-top: 0.6rem;
		padding: 0;
		font: inherit;
		font-size: 1.2rem;
		color: var(--color-text-muted);
		background: none;
		border: 0;
		text-decoration: underline;
		text-underline-offset: 0.2em;
		cursor: pointer;

		&:disabled {
			opacity: 0.5;
			cursor: default;
		}
	}

	// the two small tries, side by side on a dotted rule
	.extras {
		--key-pressed: inset 0 2px 3px rgba(20, 30, 50, 0.32), inset 0 1px 1px rgba(20, 30, 50, 0.2);
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 2rem;
		margin-top: 1.2rem;
		padding-top: 1.2rem;
		border-top: 1px dotted var(--color-border-light);

		> div {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.7rem;
		}

		p {
			font-size: 1.2rem;
			line-height: 1.4;
			color: var(--color-text-muted);
		}
	}

	.names {
		@include segmented;
	}
</style>

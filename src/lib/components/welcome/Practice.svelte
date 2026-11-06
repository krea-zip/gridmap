<script lang="ts">
	// The tour uses the planner's own controls on an unsaved copy.
	import { onMount, untrack } from 'svelte';
	import { usePlan, providePlan } from '$lib/planner/context';
	import { Plan } from '$lib/planner/plan.svelte';
	import { COURSES, byCode, canAudit, facultyOf } from '$lib/curriculum/data';
	import { viewport } from '$lib/planner/viewport.svelte';
	import { BoardState, provideBoard } from '../board/boardState.svelte';
	import type { Lesson } from './lessons';
	import TrimHead from '../board/grid/TrimHead.svelte';
	import YearHead from '../board/grid/YearHead.svelte';
	import PlanGrid from '../board/grid/PlanGrid.svelte';
	import TrimesterZoom from '../board/TrimesterZoom.svelte';
	import OverviewGrid from '../board/OverviewGrid.svelte';
	import DegreeProgress from '../sidebar/DegreeProgress.svelte';
	import ChoicePools from '../sidebar/ChoicePools.svelte';
	import Hints from '../sidebar/Hints.svelte';
	import Catalogue from '../catalogue/Catalogue.svelte';
	import CatalogueCard from '../catalogue/CatalogueCard.svelte';
	import DetailsPanel from '../details/DetailsPanel.svelte';
	import DisplayLesson from './DisplayLesson.svelte';

	let { lesson }: { lesson: Lesson } = $props();
	const source = usePlan();
	const plan = providePlan(
		untrack(() => {
			const copy = new Plan();
			copy.rehearsing = true;
			copy.restore(JSON.parse(JSON.stringify(source.snapshot())));
			copy.welcoming = true;
			copy.touched = true;
			copy.showCodes = true;
			copy.showTitles = false;
			copy.trimNaming = 'year';
			copy.view = 'plan';
			copy.now = { year: 2, trim: 3 };
			copy.clearNarrowing();
			copy.search = '';
			copy.placements = {};
			copy.audited = [];
			copy.grades = {};
			copy.breaks = {};
			copy.waived = [];
			copy.place('KCCS190', 1, 1);
			for (let i = 0; i < copy.programmes.length; i++) {
				for (const kind of ['required', 'elective']) {
					const course = COURSES.find((c) => copy.programmeOf(c.code) === i && copy.courseType(c.code) === kind);
					if (!course) continue;
					const at = copy.years
						.flatMap((year) => copy.trims.map((trim) => ({ year, trim })))
						.find((p) => copy.canDrop(course.code, p.year, p.trim));
					if (at) copy.place(course.code, at.year, at.trim);
				}
			}
			return copy;
		})
	);
	const board = provideBoard(new BoardState(plan));
	onMount(() => plan.startHistory());
	const example = untrack(
		() =>
			COURSES.find((c) => plan.programmeOf(c.code) === 0 && canAudit(c.code) && facultyOf(c.code).length)?.code ??
			'KCCS190'
	);
	untrack(() => {
		if (lesson === 'details') plan.select(example);
		if (lesson === 'catalogue') plan.filters = [plan.programmes[0].subject];
	});
</script>

<div class="tour-demo" data-lesson={lesson}>
	{#if lesson === 'terms'}
		<div class="term-demo" aria-label="trimester numbering example">
			<YearHead year={2} />
			{#each plan.trims as trim (trim)}<TrimHead {trim} />{/each}
		</div>
		<p class="caption">{plan.trimName(2, 3)} · year 2, trimester 3</p>
	{:else if lesson === 'display'}
		<DisplayLesson />
	{:else if lesson === 'board'}
		{#if plan.zoom}<TrimesterZoom touchLayout={!viewport.desktop} />{:else}<PlanGrid
				touchLayout={!viewport.desktop}
			/>{/if}
	{:else if lesson === 'catalogue'}
		<div class="catalogue-demo"><Catalogue mobile={!viewport.desktop} /></div>
	{:else if lesson === 'progress'}
		<div class="rail-demo"><DegreeProgress /><ChoicePools /></div>
	{:else if lesson === 'hints'}
		<div class="rail-demo"><Hints /></div>
	{:else if lesson === 'details'}
		<div class="course-example">
			<CatalogueCard
				course={byCode(example)}
				type={plan.courseType(example)}
				placed={plan.onBoard(example)}
				mobile={!viewport.desktop}
			/>
		</div>
	{:else if lesson === 'views'}
		{#if !viewport.desktop}<p class="caption">these views are available on desktop.</p>{/if}
		{#if plan.zoom}<TrimesterZoom touchLayout={!viewport.desktop} />{:else}<OverviewGrid
				touchLayout={!viewport.desktop}
			/>{/if}
	{/if}
	{#if plan.selected}
		<div class="course-demo"><DetailsPanel /></div>
	{/if}
</div>

<style lang="scss">
	.tour-demo {
		--board-gutter: 1.2rem;
		min-width: 0;
		padding: 1.4rem;
		border: 1px solid var(--color-border-card);
		border-radius: 14px;
		background: color-mix(in srgb, var(--color-accent) 3%, var(--color-bg-light));
	}
	.term-demo {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
		padding: 1.2rem 0;
	}
	.term-demo :global(.trim-head) {
		display: flex;
	}
	.term-demo :global(.year-head) {
		grid-column: auto;
		flex-direction: column;
		padding: 0;
	}
	.caption {
		margin-top: 1rem;
		text-align: center;
		font-size: 1.2rem;
		color: var(--color-text-muted);
	}
	.rail-demo,
	.course-example,
	.course-demo {
		max-width: 40rem;
		margin-inline: auto;
	}
	.rail-demo {
		max-height: 36rem;
		overflow-y: auto;
	}
	.catalogue-demo {
		height: 36rem;
		min-height: 0;
		overflow: auto;
	}
	.catalogue-demo :global(.catalogue) {
		height: 100%;
		min-height: 0;
	}
	.course-demo {
		margin-top: 1.4rem;
		border: 1px solid var(--color-border-card);
		border-radius: 10px;
		background: var(--color-bg-light);
	}
	.tour-demo :global(.overview) {
		padding: 1rem 0;
		gap: 0.6rem;
		grid-template-columns: 3rem repeat(3, minmax(0, 1fr));
	}
	.tour-demo :global(.overview .cell) {
		min-height: 6rem;
	}
	.tour-demo :global(.overview .chip) {
		max-width: 100%;
		padding-left: 0.5rem;
	}
	.tour-demo :global(.overview .chip .label) {
		white-space: nowrap;
	}
	.tour-demo :global(.board-bar) {
		position: relative;
		padding: 0.6rem;
		gap: 0.8rem;
		border-radius: 8px;
	}
	@media (max-width: 600px) {
		.tour-demo {
			padding: 1rem;
		}
		.tour-demo :global(.overview) {
			grid-template-columns: minmax(0, 1fr);
		}
		.term-demo {
			gap: 0.6rem;
		}
	}
</style>

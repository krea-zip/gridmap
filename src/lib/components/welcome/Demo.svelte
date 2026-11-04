<script lang="ts">
	import { untrack } from 'svelte';
	import { usePlan } from '$lib/planner/context';
	import { usePractice } from './practice-context';
	import { isCapstone, subjectById } from '$lib/curriculum/data';
	import { trimName } from '$lib/planner/calendar';
	import { carry } from '$lib/ui/courseDrag';
	import Task from './Task.svelte';
	import CourseChip from './CourseChip.svelte';
	import LabelKeys from '../board/bar/LabelKeys.svelte';
	import Keys from '../board/bar/Keys.svelte';
	import CatalogueFilters from '../catalogue/CatalogueFilters.svelte';
	import CatalogueRibbon from '../catalogue/CatalogueRibbon.svelte';
	let { variant }: { variant: 'board' | 'labels' | 'terms' | 'catalogue' } = $props();
	const plan = usePlan();
	const practice = usePractice();
	const year = practice.year;
	const code = practice.course;
	const interaction = practice.interaction;
	let step = $state(0);
	let picked = $derived(interaction.picked);
	let selected = $state<string | null>(null);
	const canMove =
		plan.years.flatMap((y) => plan.trims.map((t) => ({ y, t }))).filter((p) => plan.canDrop(code, p.y, p.t)).length > 1;
	const moveSteps = canMove
		? [
				'tap the course to pick it up.',
				'place it in a green trimester.',
				'pick it up again and move it to another green trimester.',
				'tap × to take it off your plan.'
			]
		: ['tap the course to pick it up.', 'place it in a green trimester.', 'tap × to take it off your plan.'];
	untrack(() => {
		if (variant === 'board') {
			plan.remove(code);
		}
		if (variant === 'labels') {
			plan.showCodes = true;
			plan.showTitles = true;
		}
		if (variant === 'terms') {
			plan.trimNaming = 'year';
			plan.zoom = null;
		}
		if (variant === 'catalogue') {
			plan.clearNarrowing();
			plan.catalogueSubject = plan.programmes[0].subject;
			plan.search = '';
			plan.zoom = null;
		}
	});
	function pick(c: string) {
		interaction.picked = picked === c ? null : c;
		if (picked && step === 0) step = 1;
	}
	$effect(() => {
		interaction.revision;
		if (variant === 'board') {
			if (interaction.action === 'pick' && picked) step = Math.max(step, 1);
			if (interaction.action === 'place') step = Math.max(step, 2);
			if (interaction.action === 'move') step = Math.max(step, 3);
			if (interaction.action === 'remove') step = moveSteps.length;
		}
		if (variant === 'terms' && interaction.action === 'heading' && step >= 1) step = plan.zoom ? 2 : 3;
		if (variant === 'labels') {
			if (step === 0 && !plan.showTitles) step = 1;
			else if (step === 1 && plan.showTitles) step = 2;
			else if (step === 2 && !plan.showCodes) step = 3;
		}
		if (variant === 'catalogue') {
			if (step === 0 && plan.filters.includes(plan.programmes[0].subject)) step = 1;
			else if (step === 1 && plan.search.trim()) step = 2;
			else if (
				step === 2 &&
				(plan.catalogueTerms.length || plan.catalogueCredits.length || plan.quick.length || plan.kinds.length)
			)
				step = 3;
			else if (step === 3 && !plan.narrowed) step = 4;
		}
	});
	let results = $derived(plan.catalogue.filter((c) => !isCapstone(c.code)).slice(0, 3));
	let target = $derived(
		selected
			? plan.years
					.flatMap((year) => plan.trims.map((trim) => ({ year, trim })))
					.find(({ year, trim }) => plan.canDrop(selected!, year, trim))
			: undefined
	);
</script>

{#if variant === 'board'}
	<Task steps={moveSteps} at={step} complete="a course moves; its credit total follows." />
	<div class="scene">
		<div class="sample narrow course-pool">
			<p class="eyebrow">catalogue</p>
			{#if !plan.placedCodes.has(code)}<CourseChip
					{code}
					selected={picked === code}
					onclick={() => pick(code)}
					ondragstart={(e) => {
						carry(e, code);
						interaction.picked = code;
						step = Math.max(step, 1);
					}}
				/>{:else}<p class="feedback">✓ on your plan above</p>{/if}
		</div>
		<p class="feedback">green = it fits · tap or drag</p>
	</div>
{:else if variant === 'labels'}
	<Task
		steps={['tap titles to hide the title.', 'tap titles again to show both.', 'tap codes to show just the title.']}
		at={step}
		complete="the same switches change course labels across the planner."
	/>
	<div class="scene narrow labels-scene">
		<p class="eyebrow">course labels</p>
		<div class="control-centre"><LabelKeys /></div>
	</div>
{:else if variant === 'terms'}
	<Task
		steps={[
			'switch to ' + trimName(year, 2, 'degree') + '.',
			'tap a trimester heading to see its courses.',
			'tap that heading again to show every term.'
		]}
		at={step}
		complete="one term, two names. headings filter the catalogue."
	/>
	<div class="scene">
		<div class="control-centre names">
			<Keys label="trimester names"
				>{#each ['year', 'degree'] as naming (naming)}<button
						class:active={plan.trimNaming === naming}
						aria-pressed={plan.trimNaming === naming}
						onclick={() => {
							plan.trimNaming = naming as 'year' | 'degree';
							if (naming === 'degree') step = Math.max(step, 1);
						}}>{trimName(year, 2, naming as 'year' | 'degree')}</button
					>{/each}</Keys
			>
		</div>
		<div class="sample narrow">
			<div class="spread">
				<span class="eyebrow">catalogue</span><b class="muted"
					>{plan.catalogue.length} courses {plan.zoom ? `· offered t${plan.zoom.trim}` : ''}</b
				>
			</div>
			<div class="mini-courses">
				{#each results.slice(0, 2) as c (c.code)}<CourseChip code={c.code} />{/each}
			</div>
		</div>
	</div>
{:else}
	<Task
		steps={[
			'tap the ' + subjectById(plan.programmes[0].subject).short + ' subject pill.',
			'try a course code or title in search.',
			'open advanced filters and select a filter.',
			'tap clear to reset the filters.',
			'tap a result and add it to your plan.'
		]}
		at={step}
		complete="filters narrow the list; your pick goes onto your plan."
	/>
	<div class="scene catalogue-scene">
		<div class="sample catalogue-controls">
			<input
				class="search"
				type="search"
				aria-label="search practice catalogue"
				placeholder="search course or professor"
				bind:value={plan.search}
			/><CatalogueFilters /><CatalogueRibbon />
		</div>
		<div class="catalogue-results">
			<div class="mini-courses">
				{#each results as c (c.code)}<CourseChip
						code={c.code}
						selected={selected === c.code}
						onclick={() => {
							selected = c.code;
						}}
					/>{:else}<p class="feedback">no examples · clear a filter to try again</p>{/each}
			</div>
			{#if selected}<div class="picked-result">
					<span class="muted">{plan.shownCode(selected)}</span>{#if plan.placedCodes.has(selected)}<button
							class="action"
							onclick={() => {
								plan.remove(selected!);
								step = 5;
							}}>take off plan</button
						>{:else if target}<button
							class="action"
							onclick={() => {
								plan.place(selected!, target!.year, target!.trim);
								step = 5;
							}}>+ add to {plan.trimName(target.year, target.trim)}</button
						>{:else}<span class="muted">needs an earlier prerequisite</span>{/if}
				</div>{/if}
		</div>
	</div>
{/if}

<style>
	.course-pool {
		margin-inline: auto;
	}
	.names {
		margin-bottom: 1.3rem;
	}
	.catalogue-scene {
		max-width: 55rem;
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: 1.2rem;
		align-items: start;
	}
	.catalogue-results {
		padding-top: 1rem;
	}
	.picked-result {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.7rem;
		margin-top: 1rem;
		padding: 0.8rem;
		border: 1px dashed var(--color-border-card);
		border-radius: 6px;
	}
	@media (max-width: 600px) {
		.catalogue-scene {
			grid-template-columns: minmax(0, 1fr);
		}
		.catalogue-results {
			padding-top: 0;
		}
	}
</style>

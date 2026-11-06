<script lang="ts">
	// everything that narrows the catalogue under its search box: browse and
	// your subjects up front, the rest folded away, saying what's on while shut.
	// every switch here is the same pill as the 4yup one.
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { COURSES, SUBJECTS, subjectById } from '$lib/curriculum/data';
	import { usePlan } from '$lib/planner/context';
	import { toggled, type CourseKind, type QuickFilter } from './select';
	import { reducedMotion } from '$lib/ui/transitions';
	import type { TrimNum } from '$lib/types';
	import PixelIcon from '$lib/ui/PixelIcon.svelte';

	const plan = usePlan();

	const TERMS: TrimNum[] = [1, 2, 3];
	const CREDITS = [...new Set(COURSES.map((c) => c.credits))].filter((c) => c > 0).sort((a, b) => a - b);

	// the open minor has no courses of its own, so it gets no pill
	let subjects = $derived([...new Set([...plan.selectedSubjects.filter((s) => s !== 'open'), 'core'])]);
	let next = $derived(plan.laterSlots[0]);

	// a pill that could never match isn't offered
	let quick = $derived<{ id: QuickFilter; label: string; note: string }[]>([
		{ id: 'needed', label: 'needed', note: 'required courses not on your plan, still offered later' },
		{ id: 'ready', label: 'ready', note: 'not on your plan, prerequisites done, fits a trimester to come' },
		...(next
			? [
					{
						id: 'next' as const,
						label: 'next term',
						note: `not on your plan and can go in ${plan.trimName(next.year, next.trim)}`
					}
				]
			: []),
		{ id: 'unplanned', label: 'not planned', note: 'hides everything already on your plan' }
	]);

	// cross-listed only means something once two of your subjects can share a course
	let kinds = $derived<{ id: CourseKind; label: string; note?: string }[]>([
		{ id: 'required', label: 'required' },
		{ id: 'elective', label: 'elective' },
		...(subjects.length > 2
			? [{ id: 'crosslisted' as const, label: 'cross-listed', note: 'listed under two or more of your subjects' }]
			: [])
	]);

	let advanced = $state(false);
	let explaining = $state(false);
	let ticked = $derived([
		...quick.filter((q) => plan.quick.includes(q.id)).map((q) => q.label),
		...kinds.filter((k) => plan.kinds.includes(k.id)).map((k) => k.label),
		...plan.catalogueTerms.map((t) => `t${t}`),
		...plan.catalogueCredits.map((c) => `${c} cr`)
	]);
	const motion = () => ({ duration: reducedMotion() ? 0 : 240, easing: cubicOut });
</script>

{#snippet pill(label: string, on: boolean, toggle: () => void, note?: string, hue?: number)}
	<button class="pill" style:--hue={hue} aria-pressed={on} title={note} onclick={toggle}>{label}</button>
{/snippet}

<label class="browse">
	<span>browse</span>
	<select aria-label="browse department" bind:value={plan.catalogueSubject}>
		<option value="">{plan.filters.length ? 'your programme filters' : 'all departments'}</option>
		{#each SUBJECTS.filter((s) => s.id !== 'open') as subject (subject.id)}
			<option value={subject.id}>{subject.label}</option>
		{/each}
	</select>
</label>

<div class="pills subjects" role="group" aria-label="subjects">
	{#each subjects as id (id)}
		{@render pill(
			subjectById(id).short,
			!plan.catalogueSubject && plan.filters.includes(id),
			() => {
				plan.catalogueSubject = '';
				plan.toggleFilter(id);
			},
			undefined,
			plan.hueFor(id)
		)}
	{/each}
	<button
		class="advanced"
		class:on={advanced}
		class:active={!advanced && ticked.length > 0}
		aria-expanded={advanced}
		aria-label="advanced filters"
		title={!advanced && ticked.length ? `advanced filters: ${ticked.join(', ')}` : 'advanced filters'}
		onclick={() => (advanced = !advanced)}><PixelIcon name="sliders" snap /></button
	>
</div>

{#if advanced}
	<div class="fold" transition:slide={motion()}>
		<div class="line">
			<span>show</span>
			<div class="pills" role="group" aria-label="planning filters">
				{#each quick as q (q.id)}
					{@render pill(q.label, plan.quick.includes(q.id), () => (plan.quick = toggled(plan.quick, q.id)), q.note)}
				{/each}
				<button
					class="explain"
					class:on={explaining}
					aria-expanded={explaining}
					aria-label="what these filters mean"
					title="what these filters mean"
					onclick={() => (explaining = !explaining)}><PixelIcon name="help" snap /></button
				>
			</div>
		</div>
		{#if explaining}
			<dl class="notes" transition:slide={motion()}>
				{#each quick as q (q.id)}
					<dt>{q.label}</dt>
					<dd>{q.note}</dd>
				{/each}
			</dl>
		{/if}
		<div class="line">
			<span>type</span>
			<div class="pills" role="group" aria-label="course type">
				{#each kinds as k (k.id)}
					{@render pill(k.label, plan.kinds.includes(k.id), () => (plan.kinds = toggled(plan.kinds, k.id)), k.note)}
				{/each}
			</div>
		</div>
		<div class="line">
			<span>offered</span>
			<div class="pills" role="group" aria-label="offered in">
				{#each TERMS as t (t)}
					{@render pill(
						`t${t}`,
						plan.catalogueTerms.includes(t),
						() => (plan.catalogueTerms = toggled(plan.catalogueTerms, t))
					)}
				{/each}
			</div>
		</div>
		<div class="line">
			<span>credits</span>
			<div class="pills" role="group" aria-label="credits">
				{#each CREDITS as c (c)}
					{@render pill(
						`${c}`,
						plan.catalogueCredits.includes(c),
						() => (plan.catalogueCredits = toggled(plan.catalogueCredits, c))
					)}
				{/each}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	// a label and its control on one line, like the sidebar's pickers
	.browse {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-top: 1.2rem;
		font-size: var(--text-body);
		color: var(--color-text-muted);
		contain: inline-size;

		select {
			@include flat-select;
			flex: 1;
			width: auto;
		}
	}

	.pills {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.subjects {
		padding: 1rem 0.2rem 1.1rem;
	}

	// the advanced-filters switch sits at the end of the subject row; a dot
	// says filters are ticked while it's shut
	.advanced {
		position: relative;
		display: flex;
		margin-left: auto;
		padding: 0.3rem;
		color: var(--color-text-muted);
		background: none;
		border: 0;
		cursor: pointer;
		transition:
			color 0.15s ease,
			transform 0.18s var(--spring);

		&:hover,
		&.on {
			color: var(--color-accent);
		}

		&:active {
			transform: scale(0.86);
		}

		&.active::after {
			content: '';
			position: absolute;
			top: 0;
			right: 0;
			width: 0.6rem;
			height: 0.6rem;
			background: var(--color-accent);
			border-radius: 50%;
		}
	}

	.fold {
		padding: 0.9rem 0.4rem;
		border-top: 1px dotted color-mix(in srgb, var(--color-text-muted) 55%, transparent);
	}

	.pill {
		@include toggle-pill;
		font-size: 1.2rem;
	}

	// the ones you reach for most get a little more room
	.subjects .pill {
		padding: 0.4rem 1.1rem;

		// on, it wears the subject's own hue at the plum's exact depth, so every
		// subject looks equally weighty. kccs has no hue of its own: its blush's
		&[aria-pressed='true'] {
			background-color: oklch(from var(--color-accent) l c var(--hue, 25));
			border-color: oklch(from var(--color-control-deep) l c var(--hue, 25));
		}
	}

	.line {
		display: grid;
		grid-template-columns: 5.6rem minmax(0, 1fr);
		align-items: baseline;
		font-size: var(--text-body);
		color: var(--color-text-muted);

		& + & {
			margin-top: 0.7rem;
		}
	}

	.explain {
		display: flex;
		padding: 0.2rem;
		color: var(--color-text-muted);
		background: none;
		border: 0;
		cursor: pointer;
		transition:
			color 0.15s ease,
			transform 0.18s var(--spring);

		&:hover,
		&.on {
			color: var(--color-accent);
		}

		&:active {
			transform: scale(0.86);
		}
	}

	.notes {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: 0.4rem 0.8rem;
		padding: 0.7rem 0 0.2rem;
		font-size: var(--text-body);
		line-height: 1.35;
		color: var(--color-text-muted);

		dt {
			font-weight: 600;
			color: var(--color-text);
		}
	}

	button:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	// by finger: pills you can hit
	@include touch {
		.pill {
			min-height: 3.6rem;
			padding-inline: 1.1rem;
		}

		.advanced,
		.explain {
			min-width: 3.6rem;
			min-height: 3.6rem;
			align-items: center;
			justify-content: center;
		}
	}
</style>

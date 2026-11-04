<script lang="ts">
	import { untrack } from 'svelte';
	import { usePlan } from '$lib/planner/context';
	import { usePractice } from './practice-context';
	import { byCode } from '$lib/curriculum/data';
	import Progress from '../sidebar/Progress.svelte';
	import Task from './Task.svelte';
	import CourseChip from './CourseChip.svelte';
	let { variant }: { variant: 'progress' | 'choices' } = $props();
	const plan = usePlan();
	const { course: code, year } = usePractice();
	let step = $state(0);
	let open = $state<number | null>(null);
	const choice = plan.choices.find((p) => p.role === 'major');
	const initial = choice?.groups[0];
	untrack(() => {
		if (variant === 'progress') plan.remove(code);
		else for (const c of initial?.courses ?? []) if (c.code) plan.remove(byCode(c.code).code);
	});
	let pool = $derived(plan.choices.find((p) => p.role === 'major')?.groups[0]);
	let selected = $state<string | null>(null);
	let feedback = $state('');
	let choiceAt = $derived(
		selected
			? (plan.placed.find((p) => p.code === selected) ??
					plan.years
						.flatMap((y) => plan.trims.map((t) => ({ year: y, trim: t })))
						.find((p) => plan.canDrop(selected!, p.year, p.trim)))
			: undefined
	);
	function place(c: string) {
		if (plan.placedCodes.has(c)) {
			plan.remove(c);
			feedback = 'course removed · credits updated';
			return;
		}
		const slot = plan.years
			.flatMap((y) => plan.trims.map((t) => ({ year: y, trim: t })))
			.find(({ year, trim }) => plan.canDrop(c, year, trim));
		plan.place(c, slot?.year ?? year, slot?.trim ?? 1);
		feedback = `+${byCode(c).credits} cr · total and progress updated`;
		step = Math.max(step, 1);
	}
</script>

{#if variant === 'progress'}
	<Task
		steps={['tap + to add the course below.', 'tap your programme to open its breakdown.']}
		at={step}
		complete="the course, total and bar are connected."
	/>
	<div class="scene narrow">
		<div class="sample information">
			<p class="eyebrow">information</p>
			<div class="spread"><b>total</b><b data-total>{plan.totalPlacedCredits}/{plan.creditTarget} cr</b></div>
			{#each plan.stats as stat, i (stat.subject + stat.role)}
				<button
					class="programme"
					aria-expanded={open === i}
					onclick={() => {
						open = open === i ? null : i;
						if (open !== null && step >= 1) step = 2;
					}}
				>
					<span class="spread"><b>{stat.label}</b><span class="muted">{stat.role} {open === i ? '⌄' : '›'}</span></span>
					<Progress
						required={{ done: stat.requiredDone, needed: stat.requiredNeeded }}
						elective={{ done: stat.electiveDone, needed: stat.electiveNeeded }}
						hue={plan.hueFor(stat.subject)}
					/>
				</button>
				{#if open === i}<div class="breakdown">
						<div class="spread"><span>required</span><b>{stat.requiredDone}/{stat.requiredNeeded} cr</b></div>
						<div class="spread"><span>electives</span><b>{stat.electiveDone}/{stat.electiveNeeded} cr</b></div>
					</div>{/if}
			{/each}
		</div>
		<div class="add-course">
			<CourseChip {code} selected={plan.placedCodes.has(code)} onclick={() => place(code)} /><button
				class="action add-button"
				aria-label="add example course"
				aria-pressed={plan.placedCodes.has(code)}
				onclick={() => place(code)}>{plan.placedCodes.has(code) ? '✓' : '+'}</button
			>
		</div>
		<p class="feedback" role="status">{feedback || `${byCode(code).credits} credits waiting to be added`}</p>
	</div>
{:else if pool}
	<Task
		steps={['tap a course in the choice list.', 'add it to the little plan below.']}
		at={step}
		complete="one course planned, one choice dot filled."
	/>
	<div class="scene narrow">
		<div class="sample choice-pool">
			<p class="eyebrow">choices · {choice?.label}</p>
			<div class="spread">
				<b>pick {pool.pick} {pool.counts}</b><span
					class="choice-dots"
					role="img"
					aria-label="{Math.min(pool.chosen, pool.pick)} of {pool.pick} picked"
					>{#each { length: pool.pick } as _, i (i)}<i class:on={i < pool.chosen}></i>{/each}</span
				>
			</div>
			<div class="mini-courses">
				{#each pool.courses.filter((c) => c.code).slice(0, 3) as c (c.code)}{@const id = byCode(
						c.code!
					).code}<CourseChip
						code={id}
						selected={selected === id}
						onclick={() => {
							selected = id;
							step = Math.max(step, 1);
						}}
					/>{/each}
			</div>
		</div>
		<div class="sample tiny-target">
			<span class="eyebrow">your plan{choiceAt ? ' · ' + plan.trimName(choiceAt.year, choiceAt.trim) : ''}</span
			>{#if selected}<CourseChip
					code={selected}
					selected={plan.placedCodes.has(selected)}
					onclick={() => {
						place(selected!);
						step = 2;
					}}
				/><button
					class="action"
					onclick={() => {
						place(selected!);
						step = 2;
					}}>{plan.placedCodes.has(selected) ? 'take off plan' : '+ add to plan'}</button
				>{:else}<p class="muted">your pick appears here</p>{/if}
		</div>
		<p class="feedback" role="status">{feedback}</p>
	</div>
{/if}

<style>
	.programme {
		display: block;
		width: 100%;
		margin-top: 1rem;
		padding: 1rem 0 0;
		text-align: left;
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		border-top: 1px dotted var(--color-border-light);
		cursor: pointer;
	}
	.breakdown {
		display: grid;
		gap: 0.4rem;
		margin-top: 1rem;
		font-size: 1.15rem;
	}
	.add-course {
		display: flex;
		align-items: stretch;
		gap: 0.5rem;
	}
	.add-course :global(.course-piece) {
		flex: 1;
		min-width: 0;
	}
	.add-button {
		min-width: 3.6rem;
		font-size: 1.6rem;
	}
	.choice-dots {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		max-width: 8rem;
	}
	.choice-dots i {
		width: 0.7rem;
		height: 0.7rem;
		background: var(--color-border-light);
		border-radius: 50%;
	}
	.choice-dots i.on {
		background: var(--color-accent);
	}
	.choice-pool .mini-courses {
		margin-top: 1rem;
	}
	.tiny-target .action {
		margin-top: 0.7rem;
		width: 100%;
	}
</style>

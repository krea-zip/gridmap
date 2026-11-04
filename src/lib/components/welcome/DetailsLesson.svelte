<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { usePlan } from '$lib/planner/context';
	import { usePractice } from './practice-context';
	import { baseCode, byCode, canAudit, facultyOf, hasCode, isAttemptId, subjectById } from '$lib/curriculum/data';
	import { descriptionOf, loadDescriptions } from '$lib/curriculum/descriptions.svelte';
	import { slotOrder } from '$lib/planner/calendar';
	import type { TrimNum } from '$lib/types';
	import CourseFaculty from '../details/CourseFaculty.svelte';
	import CourseChip from './CourseChip.svelte';
	import Task from './Task.svelte';
	let { variant }: { variant: 'details' | 'record' | 'about' | 'faculty' } = $props();
	const plan = usePlan();
	const { detail: initial, year, interaction } = usePractice();
	plan.select(initial);
	plan.showCodes = true;
	plan.showTitles = true;
	const firstSlot = plan.years
		.flatMap((y) => plan.trims.map((t) => ({ year: y, trim: t })))
		.find((p) => p.year >= 2 && plan.canDrop(initial, p.year, p.trim));
	if (!plan.onBoard(initial)) plan.place(initial, firstSlot?.year ?? year, firstSlot?.trim ?? 1);
	let course = $derived(plan.selected ?? byCode(initial));
	let sid = $derived(plan.selectedId && baseCode(plan.selectedId) === course.code ? plan.selectedId : course.code);
	let placed = $derived(plan.attempts.find((p) => p.id === sid));
	let step = $state(0);
	let opened = $state(untrack(() => variant !== 'details'));
	let expanded = $state(false);
	let target = $state(`${year}-2`);
	let feedback = $state('');
	let description = $derived(descriptionOf(course.code));
	let prerequisites = $derived(course.prereqs.filter(hasCode));
	const firstPre = byCode(initial).prereqs.find(hasCode);
	untrack(() => {
		if (variant === 'about' && firstPre) {
			const later = plan.years
				.flatMap((y) => plan.trims.map((t) => ({ year: y, trim: t })))
				.reverse()
				.find((p) => plan.canDrop(initial, p.year, p.trim));
			if (later) plan.place(initial, later.year, later.trim);
			plan.remove(byCode(firstPre).code);
		}
	});
	let roles = $derived(plan.rolesIn(course.code));
	let failedOnce = $state(false);
	$effect(() => {
		interaction.revision;
		if (variant === 'details' && interaction.action === 'open') {
			opened = true;
			step = Math.max(step, 1);
		}
	});
	function fit(pre: string) {
		const before = placed ? slotOrder(placed.year, placed.trim) : slotOrder(year, 3);
		return plan.years
			.flatMap((y) => plan.trims.map((t) => ({ year: y, trim: t })))
			.find((p) => slotOrder(p.year, p.trim) < before && plan.canDrop(pre, p.year, p.trim));
	}
	function move() {
		const [y, t] = target.split('-').map(Number);
		plan.place(sid, y, t as TrimNum);
		step = Math.max(step, 2);
		feedback = `${plan.shownCode(course.code)} → ${plan.trimName(y, t as TrimNum)}`;
	}
	function audit() {
		plan.toggleAudit(course.code);
		if (plan.isAudit(course.code)) step = 1;
		else if (step >= 1) step = 2;
	}
	function result(failed: boolean) {
		plan.setGrade(sid, failed ? 'U' : null);
		if (failed) failedOnce = true;
		else if (failedOnce) step = 3;
	}
	function visit(code: string) {
		plan.select(code);
		expanded = false;
		step = 3;
		feedback = `opened ${plan.shownCode(code)}`;
	}
	onMount(() => {
		void loadDescriptions();
	});
	const aboutSteps = firstPre
		? [
				'tap the + trimester beside “not planned”.',
				'open “leads to” to see the next courses.',
				'tap a linked course to open it.'
			]
		: ['open “about the course”, then tap read more.', 'open “how it counts”.', 'tap a linked course to explore it.'];
</script>

{#if variant === 'details'}<Task
		steps={[
			'tap the course to open it.',
			'choose a trimester and press move.',
			'tap remove to send it back to the catalogue.'
		]}
		at={step}
		complete="the course panel can place, move and remove courses."
	/>
{:else if variant === 'record'}<Task
		steps={[
			'tick audit and watch the credits.',
			'untick audit to count the credits again.',
			'choose failed, then not failed.'
		]}
		at={step}
		complete="checkboxes toggle; radio buttons choose one result."
	/>
{:else if variant === 'about'}<Task
		steps={aboutSteps}
		at={step}
		complete="a prerequisite goes before; “leads to” comes after."
	/>
{:else}<Task
		steps={['open “Contact & teaching”.', 'close the details again.']}
		at={step}
		complete="contact details and past teaching live in this fold."
	/>{/if}
<div class="scene narrow details-scene">
	<CourseChip
		code={course.code}
		selected={opened}
		onclick={() => {
			opened = !opened;
			if (opened && variant === 'details') step = Math.max(step, 1);
		}}
	/>
	{#if opened}<div class="sample course-panel">
			{#if variant === 'details'}
				<p class="eyebrow">your plan</p>
				<label for="demo-term" class="muted">trimester</label><select id="demo-term" bind:value={target}
					>{#each plan.years as y (y)}{#each plan.trims as t (t)}<option value="{y}-{t}"
								>Year {y} · Trimester {t}</option
							>{/each}{/each}</select
				>
				<div class="actions">
					<button class="action" onclick={move}>{placed ? 'move' : 'add to plan'}</button><button
						class="action"
						disabled={!placed}
						onclick={() => {
							plan.remove(sid);
							step = 3;
							feedback = 'back in the catalogue · ready to plan again';
						}}>remove</button
					>
				</div>
				<p class="feedback" role="status">
					{feedback || 'on your plan · ' + (placed ? plan.trimName(placed.year, placed.trim) : 'not placed')}
				</p>
			{:else if variant === 'record'}
				<div class="spread">
					<span class="eyebrow">audit & result</span><b class="credit-result"
						>{plan.isAudit(sid) || plan.gradeOf(sid) === 'U' ? 0 : course.credits} cr</b
					>
				</div>
				{#if canAudit(course.code) && !isAttemptId(sid)}<label class="check"
						><input type="checkbox" checked={plan.isAudit(course.code)} onchange={audit} />audit this course
						<span class="muted">no credits or grade</span></label
					>{/if}
				<fieldset>
					<legend>result</legend><label class="check"
						><input
							type="radio"
							name="mini-result"
							checked={plan.gradeOf(sid) !== 'U'}
							onchange={() => result(false)}
						/>not failed</label
					><label class="check"
						><input
							type="radio"
							name="mini-result"
							checked={plan.gradeOf(sid) === 'U'}
							onchange={() => result(true)}
						/>failed</label
					>
				</fieldset>
				<p class="feedback" role="status">
					{plan.gradeOf(sid) === 'U'
						? 'failed attempt kept · course can be taken again'
						: plan.isAudit(course.code)
							? 'audit · 0 credits'
							: 'for credit · ' + course.credits + ' credits'}
				</p>
			{:else if variant === 'about'}
				<p class="eyebrow">in your degree</p>
				{#if prerequisites.length}<p class="eyebrow needs-label">needs first</p>
					<div class="prerequisites">
						{#each prerequisites.slice(0, 2) as pre (pre)}{@const code = byCode(pre).code}{@const at = plan.placed.find(
								(p) => p.code === code
							)}{@const suggested = fit(code)}
							<div class="pre-row">
								<button class="related-course" onclick={() => visit(code)}
									><b>{plan.shownCode(code)} · {byCode(code).title}</b><small class:missing={!at}
										>{at ? plan.trimName(at.year, at.trim) : 'not planned'}</small
									></button
								>{#if !at && suggested}<button
										class="suggested-term"
										onclick={() => {
											plan.place(code, suggested.year, suggested.trim);
											step = Math.max(step, 1);
											feedback = `${plan.shownCode(code)} added to ${plan.trimName(suggested.year, suggested.trim)}`;
										}}>+ {plan.trimName(suggested.year, suggested.trim)}</button
									>{/if}
							</div>{/each}
					</div>{/if}
				<details
					class="small-fold"
					ontoggle={(e) => {
						if (e.currentTarget.open) step = Math.max(step, firstPre ? 2 : 1);
					}}
				>
					<summary>leads to <span class="count">{course.unlocks.filter(hasCode).length}</span></summary>
					<div class="related-list">
						{#each course.unlocks.filter(hasCode).slice(0, 3) as code (code)}<button
								class="related-course"
								onclick={() => visit(code)}>{plan.shownCode(code)} · {byCode(code).title}</button
							>{:else}<span class="muted">no later courses listed</span>{/each}
					</div>
				</details>
				<details
					class="small-fold"
					ontoggle={(e) => {
						if (e.currentTarget.open && !firstPre) step = Math.max(step, 2);
					}}
				>
					<summary>how it counts</summary>{#each roles as r (r.subject + r.role)}<p class="muted">
							{subjectById(r.subject).label} · {r.role}
						</p>{/each}
				</details>
				<details class="small-fold">
					<summary>about the course</summary>
					<p class="description">
						{description
							? expanded
								? description
								: description.slice(0, 140) + (description.length > 140 ? '…' : '')
							: 'description not available yet.'}
					</p>
					{#if description && description.length > 140}<button
							class="read"
							aria-expanded={expanded}
							onclick={() => {
								expanded = !expanded;
								if (!firstPre && expanded) step = Math.max(step, 1);
							}}>{expanded ? 'read less' : 'read more'}</button
						>{/if}
				</details>
				{#if course.code !== initial}<button class="read return" onclick={() => plan.select(initial)}
						>← back to {plan.shownCode(initial)}</button
					>{/if}
				<p class="feedback" role="status">{feedback}</p>
			{:else}
				<div
					class="faculty-preview"
					role="presentation"
					onclick={async (e) => {
						const b = (e.target as Element).closest('.d-taught-head');
						if (b) {
							await tick();
							const expanded = b.getAttribute('aria-expanded') === 'true';
							step = expanded ? 1 : 2;
						}
					}}
				>
					<CourseFaculty {course} />
				</div>
				{#if !facultyOf(course.code).length}<p class="muted">no teaching records for this course yet.</p>{/if}
			{/if}
		</div>{/if}
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;
	.course-panel {
		margin-top: 1rem;
	}
	select {
		@include flat-select;
		width: 100%;
		margin: 0.5rem 0 0.8rem;
	}
	.actions {
		display: flex;
		gap: 0.6rem;
	}
	.actions button:first-child {
		flex: 1;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0.8rem 0;
		font-size: 1.15rem;
		cursor: pointer;
	}
	.check .muted {
		margin-left: auto;
		font-size: 1rem;
	}
	input {
		accent-color: var(--color-accent);
	}
	fieldset {
		padding: 0.4rem 1rem;
		border: 1px solid var(--color-border-light);
		border-radius: 5px;
		margin-top: 1rem;
	}
	legend {
		font-size: 1.1rem;
		color: var(--color-text-muted);
	}
	.credit-result {
		font-size: 1.6rem;
	}
	.needs-label {
		margin-top: 1rem;
	}
	.pre-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: stretch;
		margin-top: 0.5rem;
	}
	.related-course {
		@include glossy;
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 0.5rem 0.8rem;
		font: inherit;
		font-size: 1.15rem;
		text-align: left;
		color: var(--color-text);
		border: 1px solid var(--color-border-card);
		border-radius: 5px;
		cursor: pointer;
	}
	.related-course b {
		font-size: 1.15rem;
	}
	.related-course small {
		font-size: 1rem;
		color: var(--color-text-muted);
	}
	.related-course small.missing {
		color: var(--color-hint-caution-deep);
	}
	.suggested-term {
		padding: 0.4rem 0.7rem;
		font: inherit;
		font-size: 1.15rem;
		white-space: nowrap;
		color: var(--color-accent);
		background: none;
		border: 1px dashed var(--color-border-card);
		border-radius: 5px;
		cursor: pointer;
	}
	.small-fold {
		margin-top: 1rem;
		padding-top: 0.7rem;
		border-top: 1px dotted var(--color-border-light);
	}
	summary {
		cursor: pointer;
		color: var(--color-text-muted);
		font-size: 1.15rem;
	}
	.count {
		padding: 0.1rem 0.4rem;
		border: 1px solid var(--color-border-card);
		border-radius: 4px;
		font-size: 1rem;
	}
	.related-list {
		display: grid;
		gap: 0.5rem;
		margin-top: 0.7rem;
	}
	.description {
		font-size: 1.15rem;
		line-height: 1.5;
	}
	.read {
		padding: 0;
		font: inherit;
		font-size: 1.15rem;
		color: var(--color-accent);
		background: none;
		border: 0;
		text-decoration: underline;
		cursor: pointer;
	}
	.return {
		display: block;
		margin-top: 1rem;
	}
	.faculty-preview :global(.d-profs) {
		max-height: 29rem;
		overflow-y: auto;
	}
	.faculty-preview :global(.d-prof:not(:first-child)) {
		display: none;
	}
</style>

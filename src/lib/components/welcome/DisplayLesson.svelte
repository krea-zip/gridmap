<script lang="ts">
	import { tick } from 'svelte';
	import { usePlan } from '$lib/planner/context';
	import { COURSES, subjectById } from '$lib/curriculum/data';
	import ColourKey from '../board/bar/ColourKey.svelte';
	import Task from './Task.svelte';
	const plan = usePlan();
	const groups = plan.programmes
		.map((p, i) => ({
			...p,
			required: COURSES.find((c) => plan.programmeOf(c.code) === i && plan.courseType(c.code) === 'required')?.code,
			elective: COURSES.find((c) => plan.programmeOf(c.code) === i && plan.courseType(c.code) === 'elective')?.code
		}))
		.filter((p) => p.subject !== 'open');
	for (const group of groups)
		for (const c of [group.required, group.elective])
			if (c && !plan.placedCodes.has(c)) {
				const slots = plan.years
					.flatMap((year) => plan.trims.map((trim) => ({ year, trim })))
					.filter((p) => plan.canDrop(c, p.year, p.trim));
				const slot = slots.find((p) => !plan.slotCourses(p.year, p.trim).length) ?? slots[0];
				if (slot) plan.place(c, slot.year, slot.trim);
			}
	plan.showCodes = true;
	plan.showTitles = true;
	let step = $state(0);
	let subject = $state<string | null>(null);
	async function click(e: MouseEvent) {
		const button = (e.target as Element).closest('button');
		if (!button) return;
		const text = button.textContent?.trim() ?? '';
		await tick();
		if (text.startsWith('display')) step = Math.max(step, 1);
		else if (text.includes('required (filled)')) step = Math.max(step, 2);
		else if (text.includes('elective (outlined)')) step = Math.max(step, 3);
		else {
			const hit = groups.find((p) => text.includes(subjectById(p.subject).label));
			if (hit) {
				if (subject === hit.subject && button.getAttribute('aria-pressed') === 'false') step = 5;
				else {
					subject = hit.subject;
					step = Math.max(step, 4);
				}
			}
		}
	}
</script>

<Task
	steps={[
		'open display.',
		'tap “required (filled)”.',
		'tap “elective (outlined)”.',
		'tap a subject colour.',
		'tap that subject again to deselect it.'
	]}
	at={step}
	complete="filled = required · outlined = elective · each subject has its own colour"
/>
<div class="scene colour-scene">
	<div class="legend-sample" role="presentation" onclick={click}><ColourKey /></div>
</div>

<style>
	.colour-scene {
		display: block;
	}
	.legend-sample :global(.pop) {
		position: relative;
		top: auto;
		left: auto;
		right: auto;
		width: 100%;
		max-width: 100%;
		max-height: 26rem;
		margin-top: 0.6rem;
		box-shadow: none;
	}
	.legend-sample :global(.colour-key) {
		position: relative;
	}
	.legend-sample :global(.labels) {
		display: none;
	}
	.legend-sample :global(.section-label) {
		padding: 0.4rem 0.5rem;
		font-size: 1rem;
	}
	.legend-sample :global(li > button) {
		padding: 0.4rem 0.5rem;
		min-height: 2.3rem;
		font-size: 1.05rem;
	}
	.legend-sample :global(.foot) {
		display: none;
	}
</style>

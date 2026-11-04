<script lang="ts">
	import { untrack } from 'svelte';
	import { usePlan, providePlan } from '$lib/planner/context';
	import { Plan } from '$lib/planner/plan.svelte';
	import { COURSES, canAudit, facultyOf, byCode } from '$lib/curriculum/data';
	import { providePractice, type PracticeInteraction } from './practice-context';
	import MiniPlan from './MiniPlan.svelte';
	import type { Lesson } from './lessons';
	import ProgressLesson from './ProgressLesson.svelte';
	import Demo from './Demo.svelte';
	import HintLesson from './HintLesson.svelte';
	import DisplayLesson from './DisplayLesson.svelte';
	import DetailsLesson from './DetailsLesson.svelte';
	import './practice.scss';
	let { lesson }: { lesson: Lesson } = $props();
	const source = usePlan();
	const practice = untrack(() => {
		const copy = new Plan();
		copy.rehearsing = true;
		copy.restore(JSON.parse(JSON.stringify(source.snapshot())));
		copy.showCodes = true;
		copy.showTitles = true;
		copy.trimNaming = 'year';
		copy.yearCount = copy.fourYear ? 4 : 3;
		copy.placements = {};
		copy.audited = [];
		copy.grades = {};
		return copy;
	});
	providePlan(practice);
	const interaction = $state<PracticeInteraction>({ picked: null, action: '', code: null, revision: 0 });
	const example = providePractice(
		untrack(() => {
			const own = COURSES.filter(
				(c) => practice.programmeOf(c.code) === 0 && practice.courseType(c.code) === 'required'
			);
			const course = own.find((c) => c.credits === 4 && canAudit(c.code)) ?? own[0] ?? byCode('KCCS190');
			const detail =
				own
					.filter((c) => canAudit(c.code) && facultyOf(c.code).length)
					.sort(
						(a, b) =>
							(b.unlocks.length ? 50 : 0) +
							(b.prereqs.length ? 20 : 0) +
							b.unlocks.length -
							(a.unlocks.length ? 50 : 0) -
							(a.prereqs.length ? 20 : 0) -
							a.unlocks.length
					)[0] ?? course;
			return {
				year: Math.min(practice.yearCount, Math.max(2, practice.here.year)),
				course: course.code,
				detail: detail.code,
				interaction
			};
		})
	);
	untrack(() => {
		// The entire teaching plan is only a handful of the selected programmes' courses.
		practice.place('KCCS190', 1, 1);
		for (let i = 0; i < practice.programmes.length; i++) {
			const own = COURSES.filter((c) => practice.programmeOf(c.code) === i && c.code !== example.course);
			for (const kind of ['required', 'elective']) {
				const c = own.find(
					(c) =>
						practice.courseType(c.code) === kind &&
						practice.years.some((y) => practice.trims.some((t) => practice.canDrop(c.code, y, t)))
				);
				if (!c) continue;
				const slots = practice.years
					.flatMap((year) => practice.trims.map((trim) => ({ year, trim })))
					.filter((p) => practice.canDrop(c.code, p.year, p.trim));
				const slot = slots.find((p) => !practice.slotCourses(p.year, p.trim).length) ?? slots[0];
				if (slot) practice.place(c.code, slot.year, slot.trim);
			}
		}
	});
	$effect(() => {
		lesson;
		untrack(() => {
			interaction.picked = null;
			interaction.action = '';
			practice.highlight = [];
			practice.highlightSlots = [];
		});
	});
</script>

<div class="welcome-practice">
	<MiniPlan {lesson} />
	{#key lesson}
		{#if lesson === 'progress' || lesson === 'choices'}<ProgressLesson variant={lesson} />
		{:else if lesson === 'board' || lesson === 'labels' || lesson === 'terms' || lesson === 'catalogue'}<Demo
				variant={lesson}
			/>
		{:else if lesson === 'hints'}<HintLesson />
		{:else if lesson === 'display'}<DisplayLesson />
		{:else}<DetailsLesson variant={lesson} />{/if}
	{/key}
</div>

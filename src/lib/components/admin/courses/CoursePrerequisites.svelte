<script lang="ts">
	// what a student needs first. every group must be met; within one, any
	// course will do. the sentence on top is the rule as a student would read
	// it, a second way to catch a mistake.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { admissionFor, applyAdmission, type AdmissionRule, type OfficeCourse } from '$lib/features/office/model';
	import CoursePicker from '../CoursePicker.svelte';

	let { course }: { course: OfficeCourse } = $props();
	const office = useOffice();
	const courses = $derived(office.document!.curriculum.courses);
	const others = $derived(courses.filter((c) => c.code !== course.code));
	const rule = $derived(admissionFor(course));

	let adding = $state('');
	let problem = $state('');

	/** the first edit turns the old plain list into a full rule */
	function edit(change: (r: AdmissionRule) => void) {
		course.admission ??= admissionFor(course);
		change(course.admission);
		applyAdmission(course, course.admission);
	}

	function add() {
		const code = adding.toUpperCase().trim();
		if (!others.some((c) => c.code === code)) {
			problem = 'Choose a different catalogue course.';
			return;
		}
		edit((r) => r.groups.push({ codes: [code], concurrent: false }));
		adding = '';
		problem = '';
	}

	const sentence = $derived(
		rule.groups.length
			? `Complete ${rule.groups
					.map((g) => g.codes.join(' or ') + (g.concurrent ? ' (may be taken at the same time)' : ''))
					.join(', and ')}.`
			: 'No prerequisites.'
	);
</script>

<section>
	<h3>prerequisites</h3>
	<p class="office-note">{sentence}{rule.permission ? ' Instructor permission is required.' : ''}</p>

	{#each rule.groups as group, i (i)}
		<div class="group">
			<CoursePicker
				courses={others}
				bind:values={() => group.codes, (codes) => edit((r) => (r.groups[i].codes = codes))}
				label="Any one of"
				id="prerequisite-{i}"
			/>
			<div class="office-actions">
				<label class="office-check"
					><input
						type="checkbox"
						checked={group.concurrent}
						onchange={(e) => {
							const concurrent = e.currentTarget.checked;
							edit((r) => (r.groups[i].concurrent = concurrent));
						}}
					/> May be taken in the same trimester</label
				>
				<button class="danger" onclick={() => edit((r) => r.groups.splice(i, 1))}>remove</button>
			</div>
		</div>
	{/each}

	<div class="office-row">
		<label>add a prerequisite<input list="course-codes" bind:value={adding} placeholder="Course code" /></label>
		<button onclick={add}>add</button>
	</div>
	<datalist id="course-codes">
		{#each courses as c (c.code)}<option value={c.code}>{c.title}</option>{/each}
	</datalist>
	{#if problem}<p class="office-note error" role="alert">{problem}</p>{/if}

	<label class="office-check"
		><input
			type="checkbox"
			checked={rule.permission}
			onchange={(e) => {
				const permission = e.currentTarget.checked;
				edit((r) => (r.permission = permission));
			}}
		/> Instructor permission required</label
	>

	<details>
		<summary>recommended background and notes</summary>
		<CoursePicker
			courses={others}
			bind:values={() => rule.recommended, (codes) => edit((r) => (r.recommended = codes))}
			label="Recommended, not compulsory"
			id="recommended"
		/>
		<label
			>note for students
			<textarea
				rows="2"
				value={rule.note}
				onchange={(e) => {
					const note = e.currentTarget.value;
					edit((r) => (r.note = note));
				}}
			></textarea>
		</label>
		{#if rule.source}<p class="office-pre">{rule.source}</p>{/if}
	</details>
</section>

<style>
	.group {
		display: grid;
		gap: 0.6rem;
		padding: 0.8rem 0;
		border-bottom: var(--office-rule);
	}
</style>

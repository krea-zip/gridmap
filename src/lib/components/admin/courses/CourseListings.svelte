<script lang="ts">
	// one course can have a different code in each department: the same course,
	// listed twice, not two courses.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import type { OfficeCourse } from '$lib/features/office/model';

	let { course }: { course: OfficeCourse } = $props();
	const office = useOffice();
	const doc = $derived(office.document!);

	let subject = $state('');
	let code = $state('');
	let problem = $state('');

	function add() {
		const alias = code.toUpperCase().trim();
		if (!subject || !/^[A-Z]{2,5}\d{3}[A-Z]?$/.test(alias)) {
			problem = 'Choose a department and enter its course code.';
			return;
		}
		if (doc.curriculum.courses.some((c) => c.code !== course.code && c.codes.includes(alias))) {
			problem = 'That code belongs to another course.';
			return;
		}
		course.codesBySubject[subject] = alias;
		course.subjects = [...new Set([...course.subjects, subject])];
		course.codes = [...new Set([course.code, ...Object.values(course.codesBySubject)])];
		subject = code = problem = '';
	}

	function remove(department: string, alias: string) {
		delete course.codesBySubject[department];
		course.subjects = course.subjects.filter((s) => s !== department);
		course.codes = course.codes.filter((c) => c !== alias);
	}
</script>

<section>
	<h3>cross-listing</h3>
	<div class="office-tags">
		{#each Object.entries(course.codesBySubject) as [department, alias] (department)}
			<span class="office-tag">
				{alias} · {department}
				{#if alias !== course.code}
					<button aria-label="Remove {alias}" onclick={() => remove(department, alias)}>×</button>
				{/if}
			</span>
		{/each}
	</div>
	<div class="office-row">
		<label
			>Also listed in
			<select bind:value={subject}>
				<option value="">Department</option>
				{#each doc.curriculum.subjects as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
			</select>
		</label>
		<label>as<input bind:value={code} placeholder="Code" /></label>
		<button onclick={add}>add</button>
	</div>
	{#if problem}<p class="office-note error" role="alert">{problem}</p>{/if}
	<label
		>Credit sharing
		<select
			value={course.share ?? ''}
			onchange={(e) => (course.share = (e.currentTarget.value || undefined) as 'one' | 'all' | undefined)}
		>
			<option value="">Use university default</option>
			<option value="one">Count toward one programme</option>
			<option value="all">Count toward every matching programme</option>
		</select>
	</label>
</section>

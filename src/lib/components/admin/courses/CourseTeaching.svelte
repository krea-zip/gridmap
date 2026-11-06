<script lang="ts">
	// who's listed with the course in the directory. who teaches a section in a
	// particular term belongs to that term's offering.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import type { OfficeCourse } from '$lib/features/office/model';

	let { course }: { course: OfficeCourse } = $props();
	const office = useOffice();
	const faculty = $derived(office.document!.curriculum.lecturers);
	const listed = $derived(faculty.filter((f) => course.lecturers.includes(f.id)));
</script>

<section>
	<h3>faculty</h3>
	<div class="office-tags">
		{#each listed as f (f.id)}
			<span class="office-tag">
				{f.name}
				<button
					aria-label="Remove {f.name}"
					onclick={() => (course.lecturers = course.lecturers.filter((id) => id !== f.id))}>×</button
				>
			</span>
		{/each}
	</div>
	<div class="office-row">
		<label
			>add someone
			<select
				value=""
				onchange={(e) => {
					if (e.currentTarget.value) course.lecturers = [...course.lecturers, e.currentTarget.value];
					e.currentTarget.value = '';
				}}
			>
				<option value="">choose a faculty member</option>
				{#each faculty.filter((f) => !course.lecturers.includes(f.id)) as f (f.id)}
					<option value={f.id}>{f.name}</option>
				{/each}
			</select>
		</label>
	</div>
	<label>other teaching information<input bind:value={course.faculty} /></label>
	<p class="office-help">For one term, use <a href="/admin/offerings">terms</a>.</p>
</section>

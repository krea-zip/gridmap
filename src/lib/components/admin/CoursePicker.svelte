<script lang="ts">
	import type { OfficeCourse } from '$lib/features/office/model';
	let {
		courses,
		values = $bindable(),
		label = 'Courses',
		id = 'course-picker'
	}: { courses: OfficeCourse[]; values: string[]; label?: string; id?: string } = $props();
	let query = $state('');
	const found = $derived(
		courses
			.filter((c) => !values.includes(c.code) && `${c.code} ${c.title}`.toLowerCase().includes(query.toLowerCase()))
			.slice(0, 12)
	);
	function add(code: string) {
		if (!values.includes(code)) values = [...values, code];
		query = '';
	}
</script>

<div class="office-picker">
	<label for={id}>{label}</label>
	<div class="office-tags">
		{#each values as code (code)}<span class="office-tag"
				>{code}<button
					type="button"
					aria-label="Remove {code} from {label}"
					onclick={() => (values = values.filter((v) => v !== code))}>×</button
				></span
			>{/each}
	</div>
	<input {id} type="search" bind:value={query} placeholder="Search by code or course title" autocomplete="off" />
	{#if query}<div class="office-results">
			{#each found as course}<button type="button" onclick={() => add(course.code)}
					><b>{course.code}</b> {course.title}</button
				>{:else}<p>No matching courses.</p>{/each}
		</div>{/if}
</div>

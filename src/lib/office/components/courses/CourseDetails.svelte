<script lang="ts">
	// a course's lasting facts. who teaches it in a given term, and whether it
	// counts as required for a programme, live elsewhere.
	import { useOffice } from '$lib/office/workspace.svelte';
	import { ELIGIBILITY, moveCourse, toggleOffered, type OfficeCourse } from '$lib/office/model';

	let { course }: { course: OfficeCourse } = $props();
	const office = useOffice();
	const doc = $derived(office.document!);
	const subjects = $derived(doc.curriculum.subjects.filter((s) => s.id !== 'open'));

	const toggleYear = (y: number) =>
		(course.eligibleYears = course.eligibleYears.includes(y)
			? course.eligibleYears.filter((n) => n !== y)
			: [...course.eligibleYears, y].sort());
</script>

<section>
	<h3>details</h3>
	<div class="office-form">
		<label class="wide">title<input bind:value={course.title} /></label>
		<label
			>department
			<select value={course.subject} onchange={(e) => moveCourse(course, e.currentTarget.value)}>
				{#each subjects as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
			</select>
		</label>
		<label
			>credits
			<input
				type="number"
				min="0"
				max="30"
				step="0.5"
				bind:value={course.credits}
				onchange={() => (course.pendingCredits = false)}
			/>
		</label>
		<label class="wide"
			>Description
			<textarea
				rows="6"
				value={doc.descriptions[course.code] ?? ''}
				oninput={(e) => (doc.descriptions[course.code] = e.currentTarget.value)}
			></textarea>
		</label>
		<fieldset class="wide">
			<legend>usual trimesters</legend>
			<div class="office-actions">
				{#each [1, 2, 3] as const as t (t)}
					<label class="office-check"
						><input type="checkbox" checked={course.offered.includes(t)} onchange={() => toggleOffered(course, t)} />
						t{t}</label
					>
				{/each}
			</div>
		</fieldset>
		<fieldset class="wide">
			<legend>usual eligible years</legend>
			<div class="office-actions">
				{#each [1, 2, 3, 4, 5] as y (y)}
					<label class="office-check"
						><input type="checkbox" checked={course.eligibleYears.includes(y)} onchange={() => toggleYear(y)} />
						year {y}</label
					>
				{/each}
			</div>
		</fieldset>
		<label
			>Status
			<select
				value={course.retired ? 'retired' : 'active'}
				onchange={(e) => (course.retired = e.currentTarget.value === 'retired')}
			>
				<option value="active">active</option>
				<option value="retired">retired</option>
			</select>
		</label>
		<label
			>Audit policy
			<select
				value={course.audit ?? 'unknown'}
				onchange={(e) => (course.audit = e.currentTarget.value as typeof course.audit)}
			>
				{#each ELIGIBILITY.filter((e) => e.value !== 'repeaters') as e (e.value)}
					<option value={e.value}>{e.value === 'unknown' ? 'Use university policy' : e.label}</option>
				{/each}
			</select>
		</label>
		<label class="wide"
			>note for students
			<textarea rows="2" bind:value={course.notes} placeholder="Optional clarification shown with this course"
			></textarea>
		</label>
		<label class="office-check wide"
			><input type="checkbox" bind:checked={course.required} /> Marked required in the university catalogue</label
		>
	</div>
	<p class="office-help">
		Required for one major, minor or batch? That's set under <a href="/admin/requirements">degrees</a>.
	</p>
</section>

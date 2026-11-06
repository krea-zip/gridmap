<script lang="ts">
	// the department's suggested order: which trimester each course sits in.
	// the planner lays out the suggested path from this.
	import type { ProgrammeRequirements } from '$lib/curriculum/snapshot';
	import type { OfficeCourse } from '$lib/features/office/model';

	let { programme, courses }: { programme: ProgrammeRequirements; courses: OfficeCourse[] } = $props();

	const inOrder = $derived(
		[...programme.pathway.keys()].sort((a, b) => {
			const [x, y] = [programme.pathway[a], programme.pathway[b]];
			return x.year - y.year || x.trim - y.trim;
		})
	);
</script>

<datalist id="pathway-courses">
	{#each courses as c (c.code)}<option value={c.code}>{c.title}</option>{/each}
</datalist>

{#if programme.pathway.length}
	<div class="office-table-scroll">
		<table>
			<thead><tr><th>Year</th><th>Trimester</th><th>Course</th><th></th></tr></thead>
			<tbody>
				{#each inOrder as i (i)}
					{@const slot = programme.pathway[i]}
					<tr>
						<td>
							<select aria-label="Year for {slot.code}" bind:value={slot.year}>
								{#each [1, 2, 3, 4, 5] as y (y)}<option value={y}>Year {y}</option>{/each}
							</select>
						</td>
						<td>
							<select aria-label="Trimester for {slot.code}" bind:value={slot.trim}>
								{#each [1, 2, 3] as t (t)}<option value={t}>T{t}</option>{/each}
							</select>
						</td>
						<td><input aria-label="Course" list="pathway-courses" bind:value={slot.code} /></td>
						<td>
							<button
								aria-label="Remove {slot.code}"
								onclick={() => (programme.pathway = programme.pathway.filter((_, n) => n !== i))}>×</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<p class="office-help">No suggested path yet.</p>
{/if}
<button onclick={() => programme.pathway.push({ year: 1, trim: 1, code: '' })}>add a course to the path</button>

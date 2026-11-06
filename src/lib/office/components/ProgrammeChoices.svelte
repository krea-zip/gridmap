<script lang="ts">
	// "pick 2 of these" pools. the planner counts these courses toward the
	// required credits, so `picks` follows whatever the pools hold.
	import type { ChoiceGroup, ProgrammeRequirements } from '$lib/curriculum/snapshot';
	import type { OfficeCourse } from '$lib/office/model';
	import CoursePicker from './CoursePicker.svelte';

	let { programme, courses }: { programme: ProgrammeRequirements; courses: OfficeCourse[] } = $props();

	const codesOf = (g: ChoiceGroup) => g.courses.flatMap((c) => (c.code ? [c.code] : []));
	const syncPicks = () => (programme.picks = [...new Set(programme.choices.flatMap(codesOf))]);

	/** a pool can name something with no catalogue code; those stay put */
	function setCodes(g: ChoiceGroup, codes: string[]) {
		const named = g.courses.filter((c) => !c.code);
		const titled = codes.map((code) => ({ code, title: courses.find((c) => c.code === code)?.title ?? code }));
		g.courses = [...titled, ...named];
		syncPicks();
	}

	function remove(g: ChoiceGroup) {
		programme.choices = programme.choices.filter((x) => x !== g);
		syncPicks();
	}
</script>

{#each programme.choices as group, i (i)}
	<div class="pool">
		<div class="office-form">
			<label class="wide"
				>name of the pool<input bind:value={group.rule} placeholder="Pick one analysis course" /></label
			>
			<label>how many to pick<input type="number" min="1" bind:value={group.pick} /></label>
		</div>
		<CoursePicker
			{courses}
			bind:values={() => codesOf(group), (codes) => setCodes(group, codes)}
			label="Courses in this pool"
			id="pool-{i}"
		/>
		{#each group.courses.filter((c) => !c.code) as c (c.title)}<p class="office-help">Also: {c.title}</p>{/each}
		<button onclick={() => remove(group)}>remove this pool</button>
	</div>
{/each}
<button onclick={() => programme.choices.push({ rule: '', pick: 1, courses: [] })}>add a pool</button>

<style>
	.pool {
		display: grid;
		gap: 1rem;
		justify-items: start;
		padding: 1.4rem 0;
		border-bottom: 1px dotted var(--office-line);
	}

	.pool > :global(.office-form),
	.pool > :global(.office-picker) {
		width: 100%;
	}
</style>

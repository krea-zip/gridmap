<script lang="ts">
	// one batch, everything that can differ about it. each section has its own
	// address, so search and the checks can land on exactly the right one.
	import { page } from '$app/state';
	import { useOffice } from '$lib/office/workspace.svelte';
	import { batchDifferences, batchStage } from '$lib/office/batches';
	import { setFor } from '$lib/office/requirements';
	import Keys from '$lib/planner/board/bar/Keys.svelte';
	import OfficeScope from '$lib/office/components/OfficeScope.svelte';
	import BatchOverview from '$lib/office/components/batches/BatchOverview.svelte';
	import BatchProgrammes from '$lib/office/components/batches/BatchProgrammes.svelte';
	import BatchCurriculum from '$lib/office/components/batches/BatchCurriculum.svelte';
	import BatchCourses from '$lib/office/components/batches/BatchCourses.svelte';
	import BatchLog from '$lib/office/components/batches/BatchLog.svelte';

	let { data } = $props();
	const office = useOffice();
	const doc = $derived(office.document);
	const batch = $derived(data.year);
	const section = $derived(page.url.searchParams.get('section') ?? 'overview');
	const differences = $derived(doc ? batchDifferences(doc, batch).length : 0);
	const rules = $derived(doc?.curriculum.batchRules.filter((r) => r.batch === batch).length ?? 0);

	const sections = $derived([
		{ id: 'overview', label: differences ? `what's different (${differences})` : "what's different" },
		{ id: 'programmes', label: 'programmes' },
		{ id: 'requirements', label: rules ? `requirements (${rules})` : 'requirements' }
	]);
</script>

<svelte:head><title>{batch} batch · Academic office</title></svelte:head>

<div class="office-page-heading">
	<div>
		<p class="office-eyebrow"><a href="/admin/batches">all batches</a> · {batchStage(batch)}</p>
		<h1>{batch} entering batch</h1>
	</div>
	<div class="office-actions">
		<a class="button" href="/admin/batches/{batch - 1}?section={section}">← {batch - 1}</a>
		<a class="button" href="/admin/batches/{batch + 1}?section={section}">{batch + 1} →</a>
	</div>
</div>

{#if doc}
	<OfficeScope
		editing={[`${batch} entering batch`]}
		applies="Follows “{setFor(doc, batch)?.name}”. Reaches students in this batch from the next publish."
	/>
{/if}

<div class="office-actions">
	<Keys label="parts of this batch">
		{#each sections as s (s.id)}
			<a
				href="?section={s.id}"
				data-sveltekit-noscroll
				class:active={section === s.id}
				aria-current={section === s.id ? 'page' : undefined}>{s.label}</a
			>
		{/each}
	</Keys>
</div>

{#if doc}
	{#key batch}
		{#if section === 'programmes'}
			<BatchProgrammes {batch} />
		{:else if section === 'requirements'}
			<BatchCurriculum {batch} />
			<BatchCourses {batch} />
		{:else}
			<BatchOverview {batch} />
			<BatchLog {batch} />
		{/if}
	{/key}
{/if}

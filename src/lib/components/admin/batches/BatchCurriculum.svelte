<script lang="ts">
	// which requirement set this batch graduates under. sets are shared between
	// batches, so anything changed in one reaches them all; a batch that needs
	// to differ gets its own copy first.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { VARIANTS } from '$lib/features/office/model';
	import { assignSet, forkSet } from '$lib/features/office/batches';
	import { setFor } from '$lib/features/office/requirements';

	let { batch }: { batch: number } = $props();
	const office = useOffice();
	const doc = $derived(office.document!);

	const sets = $derived(doc.curriculum.requirementSets);
	const set = $derived(setFor(doc, batch));
	const sharedWith = $derived(set?.batches?.filter((b) => b !== batch) ?? []);
	const alone = $derived(!!set?.batches && !sharedWith.length);

	let search = $state('');
	const programmes = $derived(
		(set?.programmes ?? []).filter((p) =>
			`${p.subject} ${trackOf(p.variant)}`.toLowerCase().includes(search.trim().toLowerCase())
		)
	);
	const trackOf = (variant: string) => VARIANTS.find((v) => v.id === variant)?.label ?? variant;
</script>

<section class="office-card">
	<h2>the curriculum this batch follows</h2>
	<div class="office-row">
		<label
			>Follows
			<select value={set?.id} onchange={(e) => assignSet(doc, batch, e.currentTarget.value)}>
				{#each sets as s (s.id)}
					<option value={s.id}>{s.name}{s.batches ? '' : ' (default)'}</option>
				{/each}
			</select>
		</label>
		{#if !alone}
			<button class="primary" onclick={() => forkSet(doc, batch)}>Give this batch its own copy</button>
		{/if}
	</div>
	{#if alone}
		<p class="office-help">Only this batch follows it, so changes to it affect nobody else.</p>
	{:else if set?.batches}
		<p class="office-note">
			Shared with the {sharedWith.join(', ')}
			{sharedWith.length === 1 ? 'batch' : 'batches'}: editing it changes theirs too. To change only this batch, give it
			its own copy first.
		</p>
	{:else}
		<p class="office-note">
			This is the default, followed by any batch no other curriculum names. To change only this batch, give it its own
			copy first.
		</p>
	{/if}
</section>

<section class="office-card">
	<div class="office-section-heading">
		<h2>its programmes</h2>
		<span class="office-badge">{programmes.length}</span>
	</div>
	<label>Find a programme<input type="search" bind:value={search} placeholder="e.g. computer science double" /></label>
	<div class="office-table-scroll">
		<table>
			<thead>
				<tr><th>Department</th><th>Track</th><th>Total credits</th><th>Required</th><th>Electives</th><th></th></tr>
			</thead>
			<tbody>
				{#each programmes as p (p.subject + p.variant)}
					<tr>
						<td><b>{p.subject}</b></td>
						<td>{trackOf(p.variant)}</td>
						<td>{p.credits.total}</td>
						<td>{p.required.length}</td>
						<td>{p.electives.length}</td>
						<td>
							<a href="/admin/requirements?set={set?.id}&subject={encodeURIComponent(p.subject)}&variant={p.variant}"
								>Edit</a
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

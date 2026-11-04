<script lang="ts">
	// what makes this batch different from the one before, worked out from the
	// draft, so it's always true. plus the office's own note and a way to reuse
	// another batch's decisions.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { batchDifferences, copyBatch, fellBack, profileOf, setBatchNote } from '$lib/features/office/batches';
	import { batchYears } from '$lib/features/office/requirements';

	let { batch }: { batch: number } = $props();
	const office = useOffice();
	const doc = $derived(office.document!);

	let against = $state<number | null>(null);
	const compared = $derived(against ?? batch - 1);
	const differences = $derived(batchDifferences(doc, batch, compared));
	const headline = $derived(differences.filter((d) => d.kind !== 'requirements'));
	let search = $state('');
	const requirements = $derived(
		differences.filter(
			(d) => d.kind === 'requirements' && `${d.title} ${d.detail}`.toLowerCase().includes(search.trim().toLowerCase())
		)
	);

	let from = $state<number | null>(null);
	let copied = $state<string>('');
	const others = $derived(batchYears(doc).filter((y) => y !== batch));
	function copy() {
		if (from === null) return;
		const n = copyBatch(doc, from, batch);
		copied = n
			? `Brought over ${n} ${n === 1 ? 'decision' : 'decisions'} from ${from}.`
			: `Nothing new to bring over from ${from}.`;
	}
</script>

{#if fellBack(doc, batch)}
	<p class="office-note error">
		Nobody has chosen a curriculum for this batch, so it falls back to the default instead of following the {batch - 1}
		batch. <a href="?section=requirements">Choose one</a>.
	</p>
{/if}

<section class="office-card">
	<div class="office-section-heading">
		<h2>different from the {compared} batch</h2>
		<label class="compare"
			>Compare with
			<select bind:value={against}>
				<option value={null}>The batch before</option>
				{#each others as y (y)}<option value={y}>{y}</option>{/each}
			</select>
		</label>
	</div>
	{#if headline.length}
		<ul class="office-attention-list">
			{#each headline as d (d.title)}
				<li><span class="office-issue-dot"></span><span><b>{d.title}</b><span>{d.detail}</span></span></li>
			{/each}
		</ul>
	{:else}
		<p class="office-help">Nothing: this batch has the same programmes and rules as the {compared} batch.</p>
	{/if}
</section>

{#if differences.some((d) => d.kind === 'requirements')}
	<section class="office-card">
		<div class="office-section-heading">
			<h2>changes in the degree requirements</h2>
			<span class="office-badge">{requirements.length}</span>
		</div>
		<p class="office-help">This batch follows a different curriculum, so these programmes change.</p>
		<label>Find a programme<input type="search" bind:value={search} placeholder="e.g. mathematics" /></label>
		<div class="office-table-scroll">
			<table>
				<thead><tr><th>Programme</th><th>What changes</th></tr></thead>
				<tbody>
					{#each requirements as d (d.title)}<tr><td><b>{d.title}</b></td><td>{d.detail}</td></tr>{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

<section class="office-card">
	<h2>notes on this batch</h2>
	<label
		>For the office only
		<textarea
			rows="4"
			value={profileOf(doc, batch)?.note ?? ''}
			onchange={(e) => setBatchNote(doc, batch, e.currentTarget.value)}
			placeholder="Anything the next person should know about this batch"
		></textarea>
	</label>
</section>

<details class="office-card">
	<summary>reuse another batch</summary>
	<p class="office-help">
		Brings over its programme decisions and course rules. Anything this batch has already decided stays as it is.
	</p>
	<div class="office-row">
		<label
			>Bring over from
			<select bind:value={from}>
				<option value={null}>Choose a batch</option>
				{#each others as y (y)}<option value={y}>{y}</option>{/each}
			</select>
		</label>
		<button disabled={from === null} onclick={copy}>Bring over</button>
	</div>
	{#if copied}<p class="office-note" role="status">{copied}</p>{/if}
</details>

<style>
	.compare {
		flex-direction: row;
		align-items: center;
		gap: 0.8rem;
		font-size: 1.2rem;
		font-weight: 500;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
</style>

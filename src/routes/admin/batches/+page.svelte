<script lang="ts">
	// every batch at a glance, then every change anyone has recorded, across all
	// of them. this is the answer to "what's different for which batch?"
	import { goto } from '$app/navigation';
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { CHANGE_AREAS, CHANGE_STATUSES } from '$lib/features/office/model';
	import { allChanges, batchSummary, nextBatch, planBatch } from '$lib/features/office/batches';
	import { batchYears } from '$lib/features/office/requirements';

	const office = useOffice();
	const doc = $derived(office.document);
	const next = nextBatch();

	const summaries = $derived(
		doc
			? batchYears(doc)
					.toReversed()
					.map((year) => batchSummary(doc, year))
			: []
	);
	const newest = $derived(summaries[0]?.batch ?? next);

	function plan() {
		if (!doc) return;
		const year = newest + 1; // planning it moves `newest` on
		planBatch(doc, year);
		void goto(`/admin/batches/${year}`);
	}

	let search = $state('');
	let area = $state('');
	let status = $state('');
	const recorded = $derived(doc ? allChanges(doc).length : 0);
	const feed = $derived(
		(doc ? allChanges(doc) : []).filter(
			(c) =>
				(!area || c.area === area) &&
				(!status || c.status === status) &&
				`${c.batch} ${c.title} ${c.detail} ${c.subject} ${c.reference} ${c.by}`
					.toLowerCase()
					.includes(search.trim().toLowerCase())
		)
	);
	const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
		list.find((x) => x.value === value)?.label ?? value;
</script>

<div class="office-page-heading">
	<div>
		<h1>batches</h1>
		<p class="office-lead">
			Every batch can differ: new majors, another curriculum, a course that’s required for one year only. Open a batch
			to change anything about it.
		</p>
	</div>
</div>

<div class="batches">
	{#each summaries as b (b.batch)}
		<a href="/admin/batches/{b.batch}" class:next={b.batch === next}>
			<span class="year">{b.batch}<small>{b.stage}</small></span>
			<span class="curriculum">{b.curriculum}{b.own ? ' · its own' : ''}</span>
			<span class="counts">
				<span>{b.differences} {b.differences === 1 ? 'difference' : 'differences'}</span>
				<span>{b.logged} recorded</span>
			</span>
		</a>
	{/each}
	<!-- newest first, so the next year out leads the list -->
	<button class="plan" id="plan" onclick={plan}>+ plan the {newest + 1} batch</button>
</div>

<section class="office-card">
	<div class="office-section-heading">
		<h2>every recorded change</h2>
		<span class="office-badge">{feed.length}</span>
	</div>
	{#if recorded}
		<div class="office-row">
			<label>Search<input type="search" bind:value={search} placeholder="A word, a person, a reference" /></label>
			<label
				>Area
				<select bind:value={area}>
					<option value="">All areas</option>
					{#each CHANGE_AREAS as a (a.value)}<option value={a.value}>{a.label}</option>{/each}
				</select>
			</label>
			<label
				>Status
				<select bind:value={status}>
					<option value="">Any status</option>
					{#each CHANGE_STATUSES as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
				</select>
			</label>
		</div>
	{/if}
	{#if feed.length}
		<div class="office-table-scroll">
			<table>
				<thead>
					<tr><th>Batch</th><th>Change</th><th>Area</th><th>Status</th><th>Recorded</th></tr>
				</thead>
				<tbody>
					{#each feed as c (c.id)}
						<tr>
							<td><a href="/admin/batches/{c.batch}#log">{c.batch}</a></td>
							<td
								><b>{c.title}</b>{#if c.detail}<br /><span class="office-help">{c.detail}</span>{/if}</td
							>
							<td>{labelOf(CHANGE_AREAS, c.area)}</td>
							<td>{labelOf(CHANGE_STATUSES, c.status)}</td>
							<td
								>{c.on}{#if c.by}<br /><span class="office-help">{c.by}</span>{/if}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="office-help">
			{recorded
				? 'Nothing matches.'
				: 'Nothing yet. Each batch has a change log for what changed, why and who decided.'}
		</p>
	{/if}
</section>

<style lang="scss">
	.batches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(23rem, 1fr));
		gap: 1.2rem;
		margin: 2.4rem 0;
	}

	.batches a {
		display: grid;
		gap: 0.7rem;
		padding: 1.6rem 1.8rem;
		color: var(--color-text);
		text-decoration: none;
		background: var(--color-bg-light);
		border: 1px solid var(--office-line);
		border-radius: 6px;
		transition: border-color 0.15s ease;

		&:hover {
			border-color: var(--color-accent);
		}

		&.next {
			border-color: var(--color-accent);
			box-shadow: inset 0 3px 0 var(--office-sky);
		}
	}

	// dashed, like the board's + add year
	.plan {
		min-height: 9rem;
		color: var(--color-text-muted);
		text-shadow: none;
		background: none;
		border: 1px dashed var(--color-border-card);
		border-radius: 6px;
		box-shadow: none;

		&:hover:not(:disabled) {
			color: var(--color-text);
			background: var(--color-hover);
			border-color: var(--color-accent);
		}
	}

	.year {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		font-size: 2.4rem;
		font-weight: 650;
		letter-spacing: -0.02em;

		small {
			font-size: 1.15rem;
			font-weight: 500;
			letter-spacing: 0;
			color: var(--color-text-muted);
		}
	}

	.curriculum {
		font-size: 1.25rem;
		color: var(--color-text-muted);
	}

	.counts {
		display: flex;
		gap: 1.4rem;
		font-size: 1.15rem;
		font-weight: 550;
		color: var(--color-accent);
	}
</style>

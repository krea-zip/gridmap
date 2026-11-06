<script lang="ts">
	// the human record for a batch: what changed, why, and who decided. the
	// office's own, it never reaches students. the edits themselves are made in
	// the other sections; this says why they were made.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { CHANGE_AREAS, CHANGE_STATUSES, type ChangeArea, type ChangeStatus } from '$lib/features/office/model';
	import { logChange, profileOf, removeChange } from '$lib/features/office/batches';

	let { batch }: { batch: number } = $props();
	const office = useOffice();
	const doc = $derived(office.document!);
	const changes = $derived(profileOf(doc, batch)?.changes ?? []);
	const subjects = $derived(doc.curriculum.subjects.filter((s) => s.id !== 'open'));

	const today = () => new Date().toISOString().slice(0, 10);
	const blank = () => ({
		title: '',
		area: 'programme' as ChangeArea,
		subject: '',
		status: 'proposed' as ChangeStatus,
		reference: '',
		detail: ''
	});
	let draft = $state(blank());

	function add() {
		if (!draft.title.trim()) return;
		logChange(doc, batch, { ...draft, title: draft.title.trim(), by: office.name, on: today() });
		draft = blank();
	}
</script>

{#snippet fields(entry: {
	title: string;
	area: ChangeArea;
	subject: string;
	status: ChangeStatus;
	reference: string;
	detail: string;
})}
	<div class="office-form">
		<label class="wide"
			>What changed<input bind:value={entry.title} placeholder="Philosophy offered as a major" /></label
		>
		<label
			>Area
			<select bind:value={entry.area}>
				{#each CHANGE_AREAS as a (a.value)}<option value={a.value}>{a.label}</option>{/each}
			</select>
		</label>
		<label
			>department
			<select bind:value={entry.subject}>
				<option value="">Not specific to one</option>
				{#each subjects as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
			</select>
		</label>
		<label
			>Status
			<select bind:value={entry.status}>
				{#each CHANGE_STATUSES as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</select>
		</label>
		<label>reference<input bind:value={entry.reference} placeholder="Senate minutes, circular, email" /></label>
		<label class="wide">Why, and any detail<textarea rows="3" bind:value={entry.detail}></textarea></label>
	</div>
{/snippet}

<section class="office-card" id="log">
	<h2>record a change</h2>
	<p class="office-help">Office only. This explains a change; make the change itself in the other sections.</p>
	{@render fields(draft)}
	<button class="primary" disabled={!draft.title.trim()} onclick={add}>add to the log</button>
</section>

<section class="office-card">
	<div class="office-section-heading">
		<h2>the {batch} log</h2>
		<span class="office-badge">{changes.length}</span>
	</div>
	{#each changes as change (change.id)}
		<details>
			<summary>
				<b>{change.title || 'Untitled change'}</b>
				<span class="office-help">
					{CHANGE_STATUSES.find((s) => s.value === change.status)?.label} · {change.on}{change.by
						? ` · ${change.by}`
						: ''}
				</span>
			</summary>
			{@render fields(change)}
			<button class="danger" onclick={() => removeChange(doc, batch, change.id)}>remove from the log</button>
		</details>
	{:else}
		<p class="office-help">Nothing recorded for this batch yet.</p>
	{/each}
</section>

<style>
	details {
		padding: 1rem 0;
		border-top: 1px dotted var(--office-line);
	}

	summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1rem;
		align-items: baseline;
		cursor: pointer;
	}

	.danger {
		margin-top: 1rem;
		color: var(--color-danger);
	}
</style>

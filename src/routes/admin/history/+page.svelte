<script lang="ts">
	// opening an old revision puts it in the editor unsaved, so nothing is
	// lost until someone reviews it and saves it as the newest revision
	import { enhance } from '$app/forms';
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import type { OfficeDocument } from '$lib/features/office/model';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const office = useOffice();

	const when = (iso: string) =>
		new Date(iso).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
</script>

<h1>Change history</h1>
<p class="office-lead">The last 100 saves, review steps and releases. Open any of them to roll back to it.</p>

{#if office.dirty}
	<p class="office-note error">Save or discard your current changes before opening an older revision.</p>
{/if}

<div class="office-table-scroll">
	<table>
		<thead><tr><th>Revision</th><th>When</th><th>Step</th><th>Note</th><th></th></tr></thead>
		<tbody>
			{#each data.history as h (h.revision)}
				<tr>
					<td
						>{h.revision}{#if h.revision === office.revision}<span class="office-badge">current</span>{/if}</td
					>
					<td>{when(h.created_at)}</td>
					<td>{h.action}</td>
					<td>{h.note}</td>
					<td>
						{#if h.revision !== office.revision && office.canEdit}
							<form
								method="POST"
								action="?/open"
								use:enhance={() =>
									async ({ result }) => {
										if (result.type === 'success' && result.data?.document) {
											office.document = result.data.document as OfficeDocument;
											office.message = `Revision ${result.data.revision} opened, unsaved. Save to make it the newest.`;
										}
									}}
							>
								<input type="hidden" name="revision" value={h.revision} />
								<button disabled={office.dirty}>Open as draft</button>
							</form>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="office-empty">No history yet. It starts with the first save.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

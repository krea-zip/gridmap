<script lang="ts">
	// past releases. opening one puts it in the editor unsaved, so nothing
	// changes until someone saves and publishes it again
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

<h1>Past releases</h1>
<p class="office-lead">What students were shown, newest first. Open one as a draft to go back to it.</p>

{#if office.dirty}
	<p class="office-note error">Save or discard your current changes before opening an older revision.</p>
{/if}

<div class="office-table-scroll">
	<table>
		<thead><tr><th>Published</th><th>Release</th><th></th></tr></thead>
		<tbody>
			{#each data.history as h (h.revision)}
				<tr>
					<td
						>{when(h.created_at)}{#if h.revision === office.revision}<span class="office-badge">current</span>{/if}</td
					>
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
											office.message = `Release opened as an unsaved draft. Save and publish to bring it back.`;
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
				<tr><td colspan="3" class="office-empty">Nothing published yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

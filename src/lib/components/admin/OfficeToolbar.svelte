<script lang="ts">
	// the strip over every office page: where the draft stands, and the
	// actions that apply to all of it (preview, save, sign out). a save
	// conflict offers a download first, so nobody loses an afternoon's work.
	import { invalidateAll } from '$app/navigation';
	import { account } from '$lib/features/auth/account.svelte';
	import { useOffice } from '$lib/features/office/workspace.svelte';

	const office = useOffice();
	let confirmReload = $state(false);

	async function signOut() {
		if (office.dirty && !confirm('Sign out and leave unsaved changes?')) return;
		await account.signOut();
		await invalidateAll();
	}

	async function downloadDraft() {
		const { download } = await import('$lib/features/office/spreadsheet');
		download('unsaved-office-draft.json', JSON.stringify(office.document), 'application/json');
	}
</script>

<header class="office-toolbar">
	<div>
		<b>Shared workspace</b>
		<span class="office-save-state" role="status">
			{office.busy ? 'Working…' : office.dirty ? 'Unsaved changes' : office.message}
		</span>
	</div>
	<div class="office-actions">
		{#if office.document && office.canEdit}
			<button onclick={() => office.preview()}>Student preview</button>
			<button
				class="primary"
				disabled={office.busy || office.conflict || (!office.dirty && office.revision > 0)}
				onclick={() => office.save()}>Save draft</button
			>
		{/if}
		<button onclick={signOut}>Sign out</button>
	</div>
</header>

{#if office.error}
	<div class="office-alert" role="alert">
		{office.error}
		{#if office.conflict}
			<p>Your unsaved work is still here. Download a backup before reloading the shared draft.</p>
			<div class="office-actions">
				<button onclick={downloadDraft}>Download my draft</button>
				<button onclick={() => (confirmReload = true)}>Reload shared draft</button>
			</div>
		{/if}
	</div>
{/if}

{#if confirmReload}
	<div class="office-confirm" role="alertdialog" aria-label="Reload shared draft">
		<p>Reloading replaces the unsaved draft on this screen. Have you downloaded anything you need to keep?</p>
		<button
			onclick={() => {
				confirmReload = false;
				void office.reload();
			}}>Reload draft</button
		>
		<button onclick={() => (confirmReload = false)}>Keep editing</button>
	</div>
{/if}

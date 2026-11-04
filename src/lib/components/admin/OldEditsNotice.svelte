<script lang="ts">
	// shown once, in a browser that still holds edits from the old admin
	// pages: they were never shared, so they're offered to the draft here
	import { onMount } from 'svelte';
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { applyOldEdits, clearOldEdits, findOldEdits, type OldEdits } from '$lib/features/office/oldEdits';

	const office = useOffice();
	let found = $state<OldEdits | null>(null);

	onMount(() => {
		found = findOldEdits();
	});

	function add() {
		if (!office.document || !found) return;
		const n = applyOldEdits(office.document, found);
		clearOldEdits();
		found = null;
		office.message = `${n} edits from the old admin added to the draft. Check them under Review & publish, then save.`;
	}

	function discard() {
		if (!confirm('Delete the old admin edits from this browser? They were never shared with anyone.')) return;
		clearOldEdits();
		found = null;
	}
</script>

{#if found}
	<div class="office-banner" role="status">
		<p>
			This browser still has edits from the old admin pages ({Object.keys(found).length} kinds of record). They were only
			ever saved here. Add them to the shared draft?
		</p>
		<div class="office-actions">
			<button class="primary" onclick={add}>Add to the draft</button>
			<button onclick={discard}>Discard them</button>
		</div>
	</div>
{/if}

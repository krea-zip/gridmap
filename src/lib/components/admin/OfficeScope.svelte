<script lang="ts">
	// what's being edited and who it reaches. a right rule on the wrong batch is
	// still wrong, so this sits above the controls on every page that sets one.
	let { editing, applies }: { editing: string[]; applies: string } = $props();
</script>

<p class="office-scope"><b>Editing: {editing.join(' / ')}</b> <span>{applies}</span></p>

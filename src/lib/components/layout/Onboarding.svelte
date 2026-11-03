<script lang="ts">
	// a first visit opens the welcome card (batch and degree).
	// once it's closed, it never comes back in this browser
	import { onMount } from 'svelte';
	import Welcome from '$lib/components/Welcome.svelte';

	let { skip = false }: { skip?: boolean } = $props();

	// the old key, so anyone who already saw the welcome-and-tour isn't asked again
	const SEEN_KEY = 'kcal-intro-seen';

	let welcome = $state(false);

	onMount(() => {
		if (skip) return;
		try {
			welcome = !localStorage.getItem(SEEN_KEY);
		} catch {
			welcome = true;
		}
	});

	function done() {
		welcome = false;
		try {
			localStorage.setItem(SEEN_KEY, '1');
		} catch {
			// closing still works when browser storage is unavailable
		}
	}
</script>

{#if welcome}
	<Welcome ondone={done} />
{/if}

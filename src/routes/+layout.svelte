<script lang="ts">
	import '../app.scss';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { account } from '$lib/features/plans/account.svelte';
	import { getSupabase } from '$lib/infrastructure/supabase/browser';

	let { children }: { children: Snippet } = $props();
	onMount(() => {
		let stop = () => {};
		let disposed = false;
		void account.refresh().then(async () => {
			if (!account.configured || disposed) return;
			try {
				const client = await getSupabase();
				if (disposed) return;
				const { data } = client.auth.onAuthStateChange(() => {
					void account.refresh();
				});
				stop = () => data.subscription.unsubscribe();
			} catch {
				/* Guest planning remains available. */
			}
		});
		const refresh = () => {
			if (document.visibilityState === 'visible') void account.refresh();
		};
		document.addEventListener('visibilitychange', refresh);
		return () => {
			disposed = true;
			stop();
			document.removeEventListener('visibilitychange', refresh);
		};
	});
</script>

{@render children()}

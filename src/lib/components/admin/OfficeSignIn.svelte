<script lang="ts">
	// the office is staff-only: sign in with google, or be told plainly that
	// this account hasn't been given access (an admin adds it under staff)
	import { account } from '$lib/features/auth/account.svelte';

	let { email = '' }: { email?: string } = $props();
</script>

<section class="office-card">
	<h1>Staff sign-in</h1>
	{#if email}
		<p>
			<b>{email}</b> doesn't have academic-office access. Ask an office administrator to add it under Staff access, or sign
			in with a different account.
		</p>
	{:else}
		<p>Use an account that has been granted academic-office access.</p>
	{/if}
	<button class="primary" disabled={account.busy} onclick={() => account.signIn('/admin')}>Sign in with Google</button>
	{#if account.error}<p role="alert">{account.error}</p>{/if}
</section>

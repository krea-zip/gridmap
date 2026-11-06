<script lang="ts">
	import { account } from './account.svelte';
	let { snapshot }: { snapshot?: () => Record<string, unknown> } = $props();
</script>

<section class="account" aria-label="Krea account">
	<div class="heading">
		<h3>{account.eligible ? 'your Krea account' : 'keep your plans with you'}</h3>
		<span>{account.eligible ? 'signed in' : 'guest'}</span>
	</div>
	{#if account.loading}
		<p role="status">Checking sign-in…</p>
	{:else if account.user}
		<p class="email">{account.user.email}</p>
		{#if account.eligible}
			<p>
				Saved plans are private to you and available on your other devices. Your working draft stays in this browser.
			</p>
		{:else}
			<p>Use your @krea.ac.in Google account to save plans and share links.</p>
			<button disabled={account.busy} onclick={() => account.signIn(snapshot?.())}>Use another account</button>
		{/if}
		<button class="secondary" disabled={account.busy} onclick={() => account.signOut()}>Sign out</button>
	{:else}
		<p>
			Sign in with your Krea email to save plans across devices and create share links. Your current draft will stay
			exactly as it is.
		</p>
		<button class="google" disabled={account.busy || !account.configured} onclick={() => account.signIn(snapshot?.())}>
			<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"
				><path
					fill="#4285F4"
					d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
				/><path
					fill="#34A853"
					d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.07v2.59A10 10 0 0 0 12 22Z"
				/><path fill="#FBBC05" d="M6.41 13.94a6 6 0 0 1 0-3.88V7.47H3.07a10 10 0 0 0 0 9.06l3.34-2.59Z" /><path
					fill="#EA4335"
					d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.34 2.59A6 6 0 0 1 12 5.96Z"
				/></svg
			>
			{account.busy ? 'Opening Google…' : 'Log in with Google'}
		</button>
		{#if !account.configured}<p>Google sign-in is being set up. You can still browse, plan and export a PDF.</p>{/if}
	{/if}
	{#if account.error}<p class="error" role="alert">{account.error}</p>
		<button class="secondary" onclick={() => account.refresh()}>Retry account check</button>{/if}
</section>

<style>
	.account {
		padding: 1.6rem;
		border: 1px solid var(--color-border-card);
		border-radius: 10px;
		background: var(--color-bg-light);
	}
	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	h3 {
		font-size: 1.5rem;
		font-weight: 650;
	}
	.heading span {
		font-size: 1.1rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	p {
		margin: 0.9rem 0;
		color: var(--color-text-muted);
		font-size: 1.3rem;
		line-height: 1.55;
	}
	.email {
		color: var(--color-text);
		overflow-wrap: anywhere;
	}
	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		min-height: 4.4rem;
		padding: 0.8rem 1.4rem;
		font: inherit;
		font-size: 1.3rem;
		border: 1px solid var(--color-border-card);
		border-radius: 6px;
		background: var(--color-bg);
		color: var(--color-text);
		cursor: pointer;
	}
	.google {
		width: 100%;
		margin-top: 0.5rem;
	}
	.secondary {
		background: none;
		margin-top: 0.6rem;
	}
	button:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.error {
		color: var(--color-danger);
	}
</style>

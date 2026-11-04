<script lang="ts">
	// the office's one shared password, plus a name for the history. the
	// server checks the password and remembers the sign-in for a week
	import { invalidate } from '$app/navigation';

	let name = $state('');
	let password = $state('');
	let busy = $state(false);
	let problem = $state('');

	async function signIn(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		problem = '';
		try {
			const response = await fetch('/api/admin/session', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name, password })
			});
			if (!response.ok) {
				problem = (await response.json().catch(() => null))?.message ?? 'Sign-in failed. Try again.';
				return;
			}
			password = '';
			await invalidate('office:workspace');
		} finally {
			busy = false;
		}
	}
</script>

<section class="office-card">
	<h1>Academic office</h1>
	<p>Enter the office password. Your name goes into the history next to the changes you make.</p>
	<form class="office-form" onsubmit={signIn}>
		<label>Your name<input bind:value={name} required maxlength="60" autocomplete="name" /></label>
		<label>Password<input type="password" bind:value={password} required autocomplete="current-password" /></label>
		<div class="office-actions wide">
			<button class="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
		</div>
	</form>
	{#if problem}<p class="office-note error" role="alert">{problem}</p>{/if}
</section>

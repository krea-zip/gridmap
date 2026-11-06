<script lang="ts">
	import { account, accountRequest } from './account.svelte';
	import { usePlan } from '$lib/planner/context';
	import { subjectById } from '$lib/curriculum/data';
	import { savedPlans } from './local-plans.svelte';
	import type { PlanRow } from '$lib/infrastructure/supabase/database.types';

	const plan = usePlan();
	let plans = $state<PlanRow[]>([]);
	let links = $state<{ id: string; name: string; created_at: string }[]>([]);
	let name = $state('');
	let error = $state('');
	let status = $state('');
	let busy = $state(false);
	let loading = $state(false);
	let confirmation = $state('');
	let revision = $state(0);
	let newLink = $state('');
	let suggested = $derived(plan.programmes.map((p) => subjectById(p.subject).short).join(' + ') + ' plan');
	const date = (value: string) =>
		new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	const link = (id: string) => `${location.origin}/?share=${id}`;

	$effect(() => {
		const user = account.eligible ? account.user?.id : null;
		revision;
		plans = [];
		links = [];
		newLink = '';
		confirmation = '';
		error = '';
		status = '';
		if (!user) return;
		let cancelled = false;
		loading = true;
		void Promise.all([accountRequest<PlanRow[]>('/api/plans'), accountRequest<typeof links>('/api/shares')])
			.then(([p, l]) => {
				if (!cancelled) {
					plans = p;
					links = l;
				}
			})
			.catch((e) => {
				if (!cancelled) error = e.message;
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	async function run(action: () => Promise<void>) {
		if (busy || !account.eligible) return;
		busy = true;
		error = '';
		status = '';
		try {
			await action();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Please try again.';
		} finally {
			busy = false;
		}
	}

	function save() {
		const owner = account.user?.id;
		void run(async () => {
			const entry = await accountRequest<PlanRow>('/api/plans', 'POST', {
				name: name.trim() || suggested,
				snapshot: plan.snapshot()
			});
			if (owner !== account.user?.id) return;
			plans = [entry, ...plans];
			name = '';
			status = 'Saved privately to your Krea account.';
		});
	}

	function load(entry: PlanRow) {
		if (confirmation !== `load-${entry.id}`) {
			confirmation = `load-${entry.id}`;
			return;
		}
		// Keep the previous working draft locally before replacing the board.
		if (savedPlans.full) {
			error = 'Your browser backups are full. Remove an old browser copy before replacing this draft.';
			return;
		}
		savedPlans.save('Before loading ' + entry.name, plan.snapshot());
		if (savedPlans.error) {
			error = savedPlans.error;
			return;
		}
		plan.restore(entry.snapshot);
		confirmation = '';
		status = 'Plan loaded. Edits stay in this browser until you save a new copy.';
	}

	function remove(entry: PlanRow) {
		if (confirmation !== `delete-${entry.id}`) {
			confirmation = `delete-${entry.id}`;
			return;
		}
		void run(async () => {
			await accountRequest('/api/plans', 'DELETE', { id: entry.id, revision: entry.revision });
			plans = plans.filter((p) => p.id !== entry.id);
			confirmation = '';
			status = 'Saved plan deleted.';
		});
	}

	function share() {
		const owner = account.user?.id;
		void run(async () => {
			const entry = await accountRequest<(typeof links)[number]>('/api/shares', 'POST', { snapshot: plan.snapshot() });
			if (owner !== account.user?.id) return;
			links = [entry, ...links];
			newLink = link(entry.id);
			status = 'Link created. Copy it below; anyone with it can view this snapshot.';
		});
	}

	async function copy(id: string) {
		newLink = link(id);
		try {
			await navigator.clipboard.writeText(newLink);
			status = 'Link copied.';
		} catch {
			status = 'Select and copy the link below.';
		}
	}

	function revoke(id: string) {
		if (confirmation !== `revoke-${id}`) {
			confirmation = `revoke-${id}`;
			return;
		}
		void run(async () => {
			await accountRequest('/api/shares', 'DELETE', { id });
			links = links.filter((l) => l.id !== id);
			newLink = '';
			confirmation = '';
			status = 'Link disabled. Copies already saved by others are unaffected.';
		});
	}
</script>

<section>
	<div class="heading">
		<h3>saved plans</h3>
		{#if account.eligible}<button disabled={busy || loading} onclick={() => revision++}>Refresh</button>{/if}
	</div>
	{#if account.eligible}
		<p>
			Save a named copy to open on any device. Your working draft autosaves in this browser; save again to keep a newer
			version in your account.
		</p>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<label class="sr-only" for="cloud-plan-name">Plan name</label>
			<input id="cloud-plan-name" bind:value={name} maxlength="100" placeholder={suggested} />
			<button disabled={busy || loading}>Save this plan</button>
		</form>
		{#if loading}<p role="status">Loading saved plans…</p>{/if}
		<ul>
			{#each plans as entry (entry.id)}<li>
					<div><strong>{entry.name}</strong><small>{date(entry.updated_at)}</small></div>
					<button disabled={busy} onclick={() => load(entry)}
						>{confirmation === `load-${entry.id}` ? 'Replace draft?' : 'Load'}</button
					>
					<button disabled={busy} aria-label={`Delete ${entry.name}`} onclick={() => remove(entry)}
						>{confirmation === `delete-${entry.id}` ? 'Confirm delete' : 'Delete'}</button
					>
				</li>{/each}
		</ul>
		{#if !loading && !plans.length}<p>No saved plans yet.</p>{/if}
	{:else}
		<p>Your draft is saved in this browser. Account saving is currently unavailable.</p>
	{/if}
</section>
<section>
	<h3>share a plan</h3>
	<p>
		Share a read-only snapshot without your email or grades. Your plans stay private until you create a link. Later
		edits do not change an existing link.
	</p>
	{#if account.eligible}
		<button disabled={busy || loading} onclick={share}>Create share link</button>
		{#if newLink}<label class="link"
				>Share link<input readonly value={newLink} onclick={(e) => e.currentTarget.select()} /></label
			>{/if}
		<ul>
			{#each links as entry (entry.id)}<li>
					<div><strong>Shared snapshot</strong><small>{date(entry.created_at)}</small></div>
					<button disabled={busy} onclick={() => copy(entry.id)}>Copy link</button>
					<button disabled={busy} onclick={() => revoke(entry.id)}
						>{confirmation === `revoke-${entry.id}` ? 'Confirm disable' : 'Disable link'}</button
					>
				</li>{/each}
		</ul>
	{:else}<p>Share links are currently unavailable.</p>{/if}
	{#if confirmation}<button class="cancel" onclick={() => (confirmation = '')}>Cancel</button>{/if}
	{#if error}<p class="error" role="alert">{error}</p>{/if}
	{#if status}<p role="status">{status}</p>{/if}
</section>

<style>
	section {
		margin-top: 2rem;
		padding-top: 1.6rem;
		border-top: 1px solid var(--color-border-card);
	}
	section:first-child {
		margin-top: 0;
		padding-top: 0;
		border-top: 0;
	}
	h3 {
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	p {
		margin: 0.8rem 0 1.2rem;
		font-size: 1.25rem;
		line-height: 1.55;
		color: var(--color-text-muted);
	}
	button,
	input {
		min-height: 3.8rem;
		padding: 0.7rem 1rem;
		border: 1px solid var(--color-border-card);
		border-radius: 5px;
		font: inherit;
		font-size: 1.25rem;
		color: var(--color-text);
		background: var(--color-bg-light);
	}
	button {
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	form {
		display: flex;
		gap: 0.7rem;
	}
	input {
		min-width: 0;
		width: 100%;
	}
	form input {
		flex: 1;
	}
	ul {
		list-style: none;
		padding: 0;
		margin-top: 1rem;
	}
	li {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.6rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-border-card);
	}
	li div {
		flex: 1 1 12rem;
		min-width: 0;
	}
	strong {
		display: block;
		overflow-wrap: anywhere;
		font-size: 1.3rem;
	}
	small {
		display: block;
		color: var(--color-text-muted);
		font-size: 1.1rem;
		margin-top: 0.3rem;
	}
	.link {
		display: block;
		margin-top: 1rem;
		font-size: 1.2rem;
	}
	.link input {
		margin-top: 0.5rem;
	}
	.cancel {
		margin-top: 0.8rem;
	}
	.error {
		color: var(--color-danger);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	@media (pointer: coarse) {
		button,
		input {
			min-height: 4.4rem;
		}
	}
</style>

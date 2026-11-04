<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import { byCode, hasCode, SUBJECTS } from '$lib/curriculum/data';
	import { readSharedPlan } from './share';
	import { planDocument } from './document';
	import { account, accountRequest } from './account.svelte';
	// google sign-in is off for now, see Settings.svelte
	// import AccountPanel from './AccountPanel.svelte';

	let { encoded = null, shareId = null }: { encoded?: string | null; shareId?: string | null } = $props();
	let shared = $state<Record<string, unknown> | null>(null);
	let error = $state('');
	let loading = $state(false);
	let closed = $state(false);
	let saving = $state(false);
	let copied = $state(false);
	let copyError = $state('');

	$effect(() => {
		if (!encoded && !shareId) return;
		let cancelled = false;
		loading = true;
		const request = shareId
			? accountRequest<{ snapshot: unknown }>(`/api/shares/${encodeURIComponent(shareId)}`).then((data) =>
					planDocument(data.snapshot)
				)
			: readSharedPlan(encoded!);
		void request
			.then((doc) => {
				if (!cancelled) shared = doc as Record<string, unknown>;
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

	let terms = $derived(
		Object.entries((shared?.placements ?? {}) as Record<string, string[]>).sort(([a], [b]) => a.localeCompare(b))
	);
	let courseCount = $derived(terms.reduce((total, [, codes]) => total + codes.filter(hasCode).length, 0));
	let subjects = $derived(
		[...new Set(Object.values((shared?.picks ?? {}) as Record<string, unknown>))]
			.map((id) => SUBJECTS.find((s) => s.id === id)?.label)
			.filter(Boolean)
			.join(' · ')
	);

	async function copy() {
		if (!account.eligible || !shared) return;
		saving = true;
		copyError = '';
		try {
			// Recheck availability at copy time so a revoked link cannot be copied from stale UI.
			const snapshot = shareId
				? (await accountRequest<{ snapshot: unknown }>(`/api/shares/${encodeURIComponent(shareId)}`)).snapshot
				: shared;
			await accountRequest('/api/plans', 'POST', { name: 'Copy of shared plan', snapshot });
			copied = true;
		} catch (e) {
			copyError = e instanceof Error ? e.message : 'This plan could not be copied.';
		} finally {
			saving = false;
		}
	}
</script>

{#if !closed && (loading || shared || error)}
	<Modal
		title="a shared plan"
		width="60rem"
		onclose={() => {
			closed = true;
			history.replaceState(history.state, '', '/');
		}}
	>
		<div class="preview">
			{#if loading}<p role="status">Loading shared plan…</p>
			{:else if error}<p role="alert">{error}</p>
			{:else if shared}
				<span class="badge">read-only snapshot</span>
				<h3>{courseCount} courses on a {shared.fourYear === false ? '3' : '4'}-year plan</h3>
				<p>{subjects}</p>
				<p>Your own draft is unchanged. This link does not give anyone access to edit the original plan.</p>
				<div class="terms">
					{#each terms as [slot, codes] (slot)}
						{#if codes.length}<section>
								<h4>Year {slot.split('-')[0]} · term {slot.split('-')[1]}</h4>
								<ul>
									{#each codes.filter((code) => hasCode(code) && !code.includes('~')) as code}<li>
											<b>{code}</b>
											{byCode(code).title}
										</li>{/each}
								</ul>
							</section>{/if}
					{/each}
				</div>
				{#if account.eligible}
					<button disabled={saving || copied} onclick={copy}
						>{copied ? 'Copied to your saved plans' : saving ? 'Copying…' : 'Copy to my plans'}</button
					>
					{#if copied}<p role="status">
							Open Settings → saved plans to load your copy. Your current draft is still here.
						</p>{/if}
					<!-- {:else}
					<p>Log in with your Krea account to save a copy to your plans.</p>
					<AccountPanel /> -->
				{/if}
				{#if copyError}<p role="alert">{copyError}</p>{/if}
			{/if}
		</div>
	</Modal>
{/if}

<style>
	.preview {
		font-size: 1.3rem;
		line-height: 1.55;
	}
	p {
		margin: 0.8rem 0 1.2rem;
		color: var(--color-text-muted);
	}
	h3 {
		margin-top: 0.7rem;
		font-size: 1.7rem;
	}
	.badge {
		font-size: 1.1rem;
		color: var(--color-accent);
	}
	.terms {
		margin: 1.6rem 0;
	}
	section {
		margin: 1rem 0;
		padding: 1.2rem;
		border: 1px solid var(--color-border-card);
		border-radius: 6px;
	}
	h4 {
		font-size: 1.3rem;
	}
	ul {
		list-style: none;
		padding: 0;
	}
	li {
		padding-top: 0.6rem;
	}
	button {
		min-height: 4.4rem;
		padding: 0.8rem 1.4rem;
		font: inherit;
		color: var(--color-text);
		border: 1px solid var(--color-border-card);
		border-radius: 6px;
		background: var(--color-bg-light);
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
</style>

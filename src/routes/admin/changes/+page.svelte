<script lang="ts">
	// how a draft reaches students: saved, then published. this page shows
	// where the draft stands, what blocks it, and what changed since the last
	// publish; publishing is a plain form, so it works before the page's
	// script has loaded.
	import { enhance } from '$app/forms';
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { changesBetween } from '$lib/features/office/model';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const office = useOffice();

	const STEPS = [
		['draft', 'Saved draft'],
		['published', 'Published']
	] as const;
	const at = $derived(STEPS.findIndex(([s]) => s === office.status));

	const byArea = <T extends { area: string }>(rows: T[]) =>
		Object.entries(Object.groupBy(rows, (r) => r.area)) as [string, T[]][];

	// publishing takes the saved draft, so unsaved edits block it
	const blocked = $derived(
		office.dirty ? 'Save your changes first.' : office.errors.length ? 'Resolve the errors first.' : ''
	);
	let pending = $state(false);
	const submitting = () => {
		pending = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			pending = false;
		};
	};
	const short = (v: string) => (v.length > 140 ? v.slice(0, 140) + '…' : v);
</script>

<h1>review & publish</h1>
<p class="office-lead">
	Check the saved draft, look at the student preview, then publish it. The live site keeps showing the last release
	until then.
</p>

<ol class="office-steps" aria-label="Where the draft stands">
	{#each STEPS as [status, label], i (status)}
		<li aria-current={i === at ? 'step' : undefined} class:done={i < at}>
			<b>{label}</b>{#if i === at}<span>revision {office.revision}</span>{/if}
		</li>
	{/each}
</ol>

{#if form?.message}<p class="office-note" role="status">{form.message}</p>{/if}

<section class="office-card">
	<h2>next step</h2>
	{#if blocked && office.status !== 'published'}<p class="office-note error">{blocked}</p>{/if}
	<form method="POST" action="?/publish" use:enhance={submitting} class="office-form">
		<input type="hidden" name="revision" value={office.revision} />
		<div class="office-actions wide">
			<button class="primary" disabled={pending || !!blocked || office.revision === 0 || office.status === 'published'}
				>publish to students</button
			>
			<button type="button" onclick={() => office.preview()}>student preview</button>
		</div>
	</form>
	{#if office.release}
		<p class="office-help">
			Current release <b>{office.release}</b> · {office.deployment || 'no website update requested yet'}
		</p>
		<form method="POST" action="?/redeploy" use:enhance={submitting}>
			<input type="hidden" name="revision" value={office.revision} />
			<button disabled={pending}>retry the website update</button>
		</form>
	{/if}
</section>

<section class="office-card">
	<h2>checks</h2>
	{#if !office.issues.length}
		<p>Nothing to fix.</p>
	{:else}
		<p>{office.errors.length} errors block publishing; {office.issues.length - office.errors.length} warnings don’t.</p>
		{#each byArea(office.issues) as [area, issues] (area)}
			<details open={issues.some((i) => i.severity === 'error')}>
				<summary><b>{area}</b> · {issues.length}</summary>
				<ul>
					{#each issues as issue, i (i)}
						<li class:error={issue.severity === 'error'}>
							{#if issue.record}<b>{issue.record}</b>:
							{/if}{issue.message}
						</li>
					{/each}
				</ul>
			</details>
		{/each}
	{/if}
</section>

<section class="office-card">
	<h2>changed since the last publish</h2>
	{#await data.published}
		<p class="office-help" role="status">Comparing with what students see now…</p>
	{:then published}
		{@const changes = office.document ? changesBetween(published, office.document) : []}
		{#if !changes.length}
			<p>The draft matches what students see.</p>
		{:else}
			{#each byArea(changes) as [area, rows] (area)}
				<details>
					<summary><b>{area}</b> · {rows.length} change{rows.length === 1 ? '' : 's'}</summary>
					<div class="office-table-scroll">
						<table>
							<thead><tr><th>Record</th><th>Field</th><th>Before</th><th>After</th></tr></thead>
							<tbody>
								{#each rows as row, i (i)}
									<tr>
										<td>{row.record}</td>
										<td>{row.field}</td>
										<td title={row.before}>{short(row.before)}</td>
										<td title={row.after}>{short(row.after)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</details>
			{/each}
		{/if}
	{:catch}
		<p class="office-note error">The published catalogue couldn’t be loaded for comparison.</p>
	{/await}
</section>

<style>
	.office-steps .done b::before {
		content: '✓ ';
	}

	li.error {
		color: var(--color-danger);
	}

	details + details {
		margin-top: 0.6rem;
	}
</style>

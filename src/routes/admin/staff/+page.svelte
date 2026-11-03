<script lang="ts">
	// one form per person, so changing someone's role is a single save; the
	// form at the top adds someone new (or updates them, by email)
	import { enhance } from '$app/forms';
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const office = useOffice();

	const ROLES = [
		['admin', 'Administrator · everything, including staff access'],
		['publisher', 'Publisher · approves and publishes to students'],
		['reviewer', 'Reviewer · approves changes'],
		['editor', 'Editor · edits the draft'],
		['contributor', 'Department contributor · sends requests only']
	] as const;
	const departments = $derived((office.document?.curriculum.subjects ?? []).filter((s) => s.id !== 'core'));
</script>

<h1>Staff access</h1>
<p class="office-lead">
	Who can sign in to the academic office, and what they can do. People sign in with the Google account for the email
	listed here.
</p>

{#if form?.message}<p class="office-note" role="status">{form.message}</p>{/if}

{#snippet member(m?: (typeof data.staff)[number])}
	<form method="POST" action="?/save" use:enhance class="office-row">
		<label
			>Email<input name="email" type="email" required value={m?.email ?? ''} readonly={!!m} autocomplete="off" /></label
		>
		<label
			>Role
			<select name="role" value={m?.role ?? 'editor'}>
				{#each ROLES as [value, label] (value)}<option {value}>{label}</option>{/each}
			</select>
		</label>
		<label
			>Department <span class="office-help">contributors</span>
			<select name="department" value={m?.department ?? ''}>
				<option value="">-</option>
				{#each departments as d (d.id)}<option value={d.id}>{d.label}</option>{/each}
			</select>
		</label>
		<label class="office-check"><input type="checkbox" name="active" checked={m?.active ?? true} />Active</label>
		<button class={m ? '' : 'primary'}>{m ? 'Save' : 'Add'}</button>
	</form>
{/snippet}

<section class="office-card">
	<h2>Add someone</h2>
	{@render member()}
</section>

<section class="office-card">
	<h2>{data.staff.length} people</h2>
	{#each data.staff as m (m.email)}
		<div class:inactive={!m.active}>{@render member(m)}</div>
	{:else}
		<p class="office-empty">No one yet.</p>
	{/each}
</section>

<style>
	.inactive {
		opacity: 0.6;
	}
</style>

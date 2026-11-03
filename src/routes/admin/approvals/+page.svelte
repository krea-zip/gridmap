<script lang="ts">
	// two kinds of waiting work: offerings in the draft that need sign-off,
	// and requests departments sent in. contributors only see the second,
	// with a form to send a new one.
	import { enhance } from '$app/forms';
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { APPROVALS } from '$lib/features/office/model';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const office = useOffice();

	const STATUS = { submitted: 'New', clarification: 'Needs clarification', accepted: 'Accepted', declined: 'Declined' };
	const pending = $derived(
		(office.document?.offerings ?? []).filter((o) => o.approval === 'submitted' || o.approval === 'clarification')
	);
	const titleOf = (code: string) => office.document?.curriculum.courses.find((c) => c.code === code)?.title ?? '';
	const departmentName = (id: string) => office.document?.curriculum.subjects.find((s) => s.id === id)?.label ?? id;
	const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
</script>

<h1>Approvals & requests</h1>
<p class="office-lead">
	{office.canEdit
		? 'Offerings waiting for sign-off, and changes departments have asked for.'
		: 'Ask the academic office for a course change, and follow its answer.'}
</p>

{#if form?.message}<p class="office-note" role="status">{form.message}</p>{/if}

{#if office.canReview && pending.length}
	<section class="office-card">
		<h2>Offerings awaiting approval · {pending.length}</h2>
		<p class="office-help">Changes here go into the draft; save it as usual.</p>
		<div class="office-table-scroll">
			<table>
				<thead><tr><th>Course</th><th>Term</th><th>Section</th><th>Faculty</th><th>Approval</th></tr></thead>
				<tbody>
					{#each pending as o (o.id)}
						<tr>
							<td><b>{o.code}</b> {titleOf(o.code)}</td>
							<td>{o.term}</td>
							<td>{o.section || '-'}</td>
							<td>{o.facultyText || o.faculty.join(', ') || '-'}</td>
							<td>
								<select aria-label="Approval for {o.code}" bind:value={o.approval}>
									{#each APPROVALS as a (a.value)}<option value={a.value}>{a.label}</option>{/each}
								</select>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

<section class="office-card">
	<h2>Ask for a change</h2>
	<form method="POST" action="?/request" use:enhance class="office-form">
		<input type="hidden" name="department" value={office.department} />
		<label
			>Course code <input name="course" list="approval-courses" autocomplete="off" placeholder="e.g. MATH201" /></label
		>
		<datalist id="approval-courses">
			{#each office.document?.curriculum.courses ?? [] as c (c.code)}<option value={c.code}>{c.title}</option>{/each}
		</datalist>
		<label
			>Term
			<select name="term">
				<option value="">Not term-specific</option>
				{#each office.document?.terms ?? [] as t (t.id)}<option value={t.id}>{t.label}</option>{/each}
			</select>
		</label>
		<label class="wide"
			>What should change, and why <textarea name="request" rows="4" required maxlength="12000"></textarea></label
		>
		<button class="primary">Send request</button>
	</form>
</section>

<section class="office-card">
	<h2>Requests · {data.submissions.length}</h2>
	{#each data.submissions as s (s.id)}
		<article class="request">
			<p>
				<span class="office-badge">{STATUS[s.status]}</span>
				<b>{s.course || 'General'}</b>{#if s.term}&nbsp;· {s.term}{/if} · {departmentName(s.department)} · {when(
					s.created_at
				)}
			</p>
			<p class="body">{s.request}</p>
			{#if office.canReview}
				<form method="POST" action="?/respond" use:enhance class="office-row">
					<input type="hidden" name="id" value={s.id} />
					<label
						>Response
						<select name="status" value={s.status}>
							{#each Object.entries(STATUS) as [value, label] (value)}<option {value}>{label}</option>{/each}
						</select>
					</label>
					<label class="wide">Reply<textarea name="response" rows="2">{s.response}</textarea></label>
					<button>Save</button>
				</form>
			{:else if s.response}
				<p class="office-help">Office: {s.response}</p>
			{/if}
		</article>
	{:else}
		<p class="office-empty">No requests yet.</p>
	{/each}
</section>

<style>
	.request + .request {
		margin-top: 1.2rem;
		padding-top: 1.2rem;
		border-top: 1px dotted var(--office-line);
	}

	.body {
		white-space: pre-wrap;
	}
</style>

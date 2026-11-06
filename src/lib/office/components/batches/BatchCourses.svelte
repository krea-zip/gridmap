<script lang="ts">
	// exceptions for one batch ("ENVS201 is required for the 2022 batch"): a
	// batch inherits its curriculum, and only the courses that differ for one
	// programme and track are listed here.
	import { useOffice } from '$lib/office/workspace.svelte';
	import { VARIANTS } from '$lib/office/model';
	import { programmeFor, setFor } from '$lib/office/requirements';
	import type { BatchRuleRecord, Variant } from '$lib/curriculum/snapshot';

	let { batch }: { batch: number } = $props();
	const office = useOffice();
	const doc = $derived(office.document!);

	let subject = $state('computer science');
	let variant = $state<Variant>('single_major_4yr');
	let search = $state('');

	const existing = $derived(doc.curriculum.batchRules.filter((r) => r.batch === batch));
	const programme = $derived(programmeFor(doc, batch, subject, variant));
	const required = $derived(new Set([...(programme?.required ?? []), ...(programme?.picks ?? [])]));
	const electives = $derived(new Set(programme?.electives ?? []));
	const rule = $derived(existing.find((r) => r.subject === subject && r.variant === variant));
	const courses = $derived(
		doc.curriculum.courses.filter(
			(c) =>
				!c.retired &&
				c.subject !== 'core' &&
				(c.subjects.includes(subject) || required.has(c.code) || !!rule?.courses[c.code]) &&
				`${c.codes.join(' ')} ${c.title}`.toLowerCase().includes(search.toLowerCase())
		)
	);
	const set = $derived(setFor(doc, batch));
	const inherited = (code: string) => (required.has(code) ? 'required' : electives.has(code) ? 'elective' : 'other');
	const trackOf = (id: Variant) => VARIANTS.find((v) => v.id === id)?.label ?? id;

	/** the batch's rule record, created on its first override and dropped
	 *  once it overrides nothing, so the draft carries no empty records */
	function update(change: (r: BatchRuleRecord) => void) {
		const rules = doc.curriculum.batchRules;
		let r = rules.find((x) => x.batch === batch && x.subject === subject && x.variant === variant);
		if (!r) {
			rules.push({ batch, subject, variant, courses: {} });
			r = rules.at(-1)!;
		}
		change(r);
		if (!Object.keys(r.courses).length && r.requiredCredits === undefined) rules.splice(rules.indexOf(r), 1);
	}

	function setCourse(code: string, value: string) {
		update((r) => {
			if (value === 'required' || value === 'elective') r.courses[code] = value;
			else delete r.courses[code];
		});
	}
</script>

{#if existing.length}
	<section class="office-card">
		<h2>rules already set for this batch</h2>
		<div class="office-tags">
			{#each existing as r (r.subject + r.variant)}
				<button
					onclick={() => {
						subject = r.subject;
						variant = r.variant;
					}}>{r.subject} · {trackOf(r.variant)} · {Object.keys(r.courses).length}</button
				>
			{/each}
		</div>
	</section>
{/if}

<section class="office-card" id="course-rules">
	<h2>set a course rule</h2>
	<p class="office-help">
		Overrides one course for this batch only, without touching the curriculum other batches share. Blank credits keep
		what the curriculum says.
	</p>
	<div class="office-row">
		<label
			>department
			<select bind:value={subject}>
				{#each doc.curriculum.subjects.filter((s) => s.id !== 'core' && s.id !== 'open') as s (s.id)}
					<option value={s.id}>{s.label}</option>
				{/each}
			</select>
		</label>
		<label
			>Track
			<select bind:value={variant}>
				{#each VARIANTS as v (v.id)}<option value={v.id}>{v.label}</option>{/each}
			</select>
		</label>
		<label
			>Required credits
			<input
				type="number"
				min="0"
				max={programme?.credits.total}
				placeholder={String(programme?.credits.required ?? 'inherited')}
				value={rule?.requiredCredits ?? ''}
				onchange={(e) => {
					const v = e.currentTarget.value;
					update((r) => (r.requiredCredits = v === '' ? undefined : Math.max(0, Math.round(Number(v)))));
				}}
			/>
		</label>
	</div>

	{#if !programme}
		<p class="office-note">This programme has no requirements for this batch yet.</p>
	{:else}
		<p class="office-note">
			This batch follows “{set?.name}”{rule ? `, with ${Object.keys(rule.courses).length} course exceptions` : ''}.
			{#if rule?.requiredCredits !== undefined}
				Required credits: {rule.requiredCredits} for this batch (the curriculum says {programme.credits.required ??
					'nothing'}).
			{:else}
				Required credits: {programme.credits.required ?? 'not stated'}, inherited.
			{/if}
			Total: {programme.credits.total} credits.
		</p>
		<label>find a course<input type="search" bind:value={search} /></label>
		<div class="office-table-scroll">
			<table>
				<thead><tr><th>Course</th><th>Inherited</th><th>This batch</th></tr></thead>
				<tbody>
					{#each courses as c (c.code)}
						<tr class:changed={!!rule?.courses[c.code]}>
							<td><b>{c.code}</b> {c.title}</td>
							<td>{inherited(c.code)}</td>
							<td>
								<select
									aria-label="Requirement for {c.code}"
									value={rule?.courses[c.code] ?? ''}
									onchange={(e) => setCourse(c.code, e.currentTarget.value)}
								>
									<option value="">inherit</option>
									<option value="required">required</option>
									<option value="elective">elective</option>
								</select>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.changed td {
		background: var(--color-subtle);
	}
</style>

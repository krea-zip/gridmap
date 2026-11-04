<script lang="ts">
	// one batch's exceptions to its degree requirements ("ENVS201 is required
	// for the 2022 batch"). every batch inherits its requirement set; only the
	// courses that changed for one batch, programme and track are listed here.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { VARIANTS } from '$lib/features/office/model';
	import { batchYears, programmeFor } from '$lib/features/office/requirements';
	import type { BatchRuleRecord, Variant } from '$lib/curriculum/snapshot';

	const office = useOffice();
	const doc = $derived(office.document);

	let batch = $state(new Date().getFullYear());
	let subject = $state('computer science');
	let variant = $state<Variant>('single_major_4yr');
	let search = $state('');

	const programme = $derived(doc && programmeFor(doc, batch, subject, variant));
	const required = $derived(new Set([...(programme?.required ?? []), ...(programme?.picks ?? [])]));
	const electives = $derived(new Set(programme?.electives ?? []));
	const rule = $derived(
		doc?.curriculum.batchRules.find((r) => r.batch === batch && r.subject === subject && r.variant === variant)
	);
	const courses = $derived(
		(doc?.curriculum.courses ?? []).filter(
			(c) =>
				!c.retired &&
				c.subject !== 'core' &&
				(c.subjects.includes(subject) || required.has(c.code) || !!rule?.courses[c.code]) &&
				`${c.codes.join(' ')} ${c.title}`.toLowerCase().includes(search.toLowerCase())
		)
	);
	const inherited = (code: string) => (required.has(code) ? 'required' : electives.has(code) ? 'elective' : 'other');

	/** the batch's rule record, created on its first override and dropped
	 *  once it overrides nothing, so the draft carries no empty records */
	function update(change: (r: BatchRuleRecord) => void) {
		if (!doc) return;
		const rules = doc.curriculum.batchRules;
		let r = rules.find((x) => x.batch === batch && x.subject === subject && x.variant === variant);
		if (!r) rules.push((r = { batch, subject, variant, courses: {} }));
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

<h1>Batch requirements</h1>
<p class="office-lead">
	Every batch inherits its degree requirements. Override only the courses that changed for one batch, programme and
	track; other batches stay as they are.
</p>

{#if doc}
	<div class="office-row">
		<label
			>Batch starting
			<select bind:value={batch}>
				{#each batchYears(doc) as y (y)}<option value={y}>{y}</option>{/each}
			</select>
		</label>
		<label
			>Programme
			<select bind:value={subject}>
				{#each doc.curriculum.subjects.filter((s) => s.id !== 'core') as s (s.id)}<option value={s.id}>{s.label}</option
					>{/each}
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
		<p class="office-note">This programme has no requirements for that batch and track yet.</p>
	{:else}
		<p class="office-help">
			{Object.keys(rule?.courses ?? {}).length} overrides · programme total {programme.credits.total} credits · blank credits
			inherit the default
		</p>
		<label>Find a course<input type="search" bind:value={search} /></label>
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
{/if}

<style>
	.changed td {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
</style>

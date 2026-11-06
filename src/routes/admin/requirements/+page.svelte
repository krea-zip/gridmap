<script lang="ts">
	// what each programme needs to graduate, for one set of requirements (the
	// default, or a run of batches): its credits and its required and elective
	// courses, its choice pools, suggested path and capstone. a rule for one
	// batch only belongs under that batch.
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { useOffice } from '$lib/office/workspace.svelte';
	import { VARIANTS } from '$lib/office/model';
	import CoursePicker from '$lib/office/components/CoursePicker.svelte';
	import OfficeScope from '$lib/office/components/OfficeScope.svelte';
	import ProgrammeChoices from '$lib/office/components/ProgrammeChoices.svelte';
	import ProgrammePathway from '$lib/office/components/ProgrammePathway.svelte';
	import type { Variant } from '$lib/curriculum/snapshot';

	const office = useOffice();
	const doc = $derived(office.document);
	const sets = $derived(doc?.curriculum.requirementSets ?? []);

	let setId = $state('');
	let subject = $state('mathematics');
	let variant = $state<Variant>('single_major_4yr');

	// open on the newest named set, the one most edits are about
	$effect.pre(() => {
		if (!setId && sets.length) setId = (sets.findLast((s) => s.batches) ?? sets[0]).id;
	});

	// search and the batch pages link straight to one programme
	$effect.pre(() => {
		const q = page.url.searchParams;
		const [set, department, track] = [q.get('set'), q.get('subject'), q.get('variant')];
		untrack(() => {
			if (set) setId = set;
			if (department) subject = department;
			if (VARIANTS.some((v) => v.id === track)) variant = track as Variant;
		});
	});

	const set = $derived(sets.find((s) => s.id === setId));
	const programme = $derived(set?.programmes.find((p) => p.subject === subject && p.variant === variant));
	const courses = $derived((doc?.curriculum.courses ?? []).filter((c) => !c.retired));
	const credits = (codes: string[]) =>
		codes.reduce((n, code) => n + (courses.find((c) => c.code === code)?.credits ?? 0), 0);
	const issues = $derived(
		office.issues.filter((i) => i.area === 'Requirements' && i.record === `${set?.name} · ${subject} · ${variant}`)
	);

	// what the validator can't see: course credits against the total, and
	// a course on both lists
	const warnings = $derived.by(() => {
		if (!programme) return [];
		// credits over the total are the validator's (see issues)
		const { total } = programme.credits;
		const out: string[] = [];
		if (total > 0 && credits(programme.required) > total)
			out.push(`The required courses add up to ${credits(programme.required)} credits, over the total of ${total}.`);
		const both = programme.required.filter((c) => programme.electives.includes(c));
		if (both.length) out.push(`${both.join(', ')} ${both.length === 1 ? 'is' : 'are'} on both lists.`);
		return out;
	});

	// a new programme rarely starts from nothing: a major is often the minor
	// grown, or last batch's version with a few courses changed
	const relatives = $derived(
		sets.flatMap((s) =>
			s.programmes
				.filter((p) => p.subject === subject)
				.map((p) => ({ key: `${s.id}|${p.variant}`, label: `${trackOf(p.variant)} · ${s.name}`, programme: p }))
		)
	);
	let template = $state('');
	const trackOf = (id: string) => VARIANTS.find((v) => v.id === id)?.label ?? id;

	function create() {
		const source = relatives.find((r) => r.key === template)?.programme;
		set?.programmes.push(
			source
				? { ...JSON.parse(JSON.stringify(source)), subject, variant }
				: {
						subject,
						variant,
						credits: { total: 0, required: null, elective: null },
						required: [],
						picks: [],
						electives: [],
						choices: [],
						pathway: []
					}
		);
		template = '';
	}

	// the rule in a sentence, a second way to catch a mistake in the fields
	const summary = $derived.by(() => {
		if (!programme) return '';
		const parts = [`${programme.required.length} required ${programme.required.length === 1 ? 'course' : 'courses'}`];
		if (programme.choices.length)
			parts.push(`${programme.choices.length} choice ${programme.choices.length === 1 ? 'pool' : 'pools'}`);
		if (programme.capstone) parts.push(`${programme.capstone.required ? 'a required' : 'an optional'} capstone`);
		const list = `${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' and ' : ''}${parts.at(-1)}`;
		return `Students complete ${list}, then enough electives to reach ${programme.credits.total} credits.`;
	});

	const optional = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v) * 2) / 2));
</script>

<h1>degree requirements</h1>
<p class="office-lead">
	What each programme needs to graduate. Pick the programme, then change its credits and courses.
</p>

{#if doc && set}
	<div class="office-row">
		<label
			>requirements for
			<select bind:value={setId}>
				{#each sets as s (s.id)}
					<option value={s.id}>{s.name}{s.batches ? ` · batches ${s.batches.join(', ')}` : ' · everyone else'}</option>
				{/each}
			</select>
		</label>
		<label
			>department
			<select bind:value={subject}>
				{#each doc.curriculum.subjects.filter((s) => s.id !== 'core') as s (s.id)}<option value={s.id}>{s.label}</option
					>{/each}
			</select>
		</label>
		<label
			>Programme
			<select bind:value={variant}>
				{#each VARIANTS as v (v.id)}<option value={v.id}>{v.label}</option>{/each}
			</select>
		</label>
	</div>
	<OfficeScope
		editing={[doc.curriculum.subjects.find((s) => s.id === subject)?.label ?? subject, trackOf(variant)]}
		applies={set.batches
			? `Applies to the ${set.batches.join(', ')} ${set.batches.length === 1 ? 'batch' : 'batches'}.`
			: 'Applies to every batch no other curriculum names.'}
	/>
	<p class="office-help">For one entering batch only, open it under <a href="/admin/batches">batches</a>.</p>

	{#if !programme}
		<section class="office-card">
			<p>This department has no {trackOf(variant)} programme in these requirements.</p>
			<div class="office-row">
				{#if relatives.length}
					<label
						>Start from
						<select bind:value={template}>
							<option value="">An empty programme</option>
							{#each relatives as r (r.key)}<option value={r.key}>{r.label}</option>{/each}
						</select>
					</label>
				{/if}
				<button class="primary" onclick={create}>create it</button>
			</div>
		</section>
	{:else}
		{#each [...warnings, ...issues.map((i) => i.message)] as w (w)}<p class="office-note error">{w}</p>{/each}
		<p class="office-note">{summary}</p>

		<section class="office-card" id="credits">
			<h2>credits</h2>
			<div class="office-form thirds">
				<label
					>Total <span class="office-help">to complete the programme</span>
					<input type="number" min="0" step="0.5" bind:value={programme.credits.total} /></label
				>
				<label
					>Required <span class="office-help">blank if the department doesn’t say</span>
					<input
						type="number"
						min="0"
						step="0.5"
						value={programme.credits.required ?? ''}
						onchange={(e) => (programme.credits.required = optional(e.currentTarget.value))}
					/></label
				>
				<label
					>Electives <span class="office-help">blank if the department doesn’t say</span>
					<input
						type="number"
						min="0"
						step="0.5"
						value={programme.credits.elective ?? ''}
						onchange={(e) => (programme.credits.elective = optional(e.currentTarget.value))}
					/></label
				>
			</div>
		</section>

		<section class="office-card" id="required">
			<h2>required courses</h2>
			<p class="office-help">
				Every student in the programme takes these · {programme.required.length} courses, {credits(programme.required)} credits
			</p>
			<CoursePicker {courses} bind:values={programme.required} label="Required courses" id="required-courses" />
		</section>

		<section class="office-card" id="electives">
			<h2>electives</h2>
			<p class="office-help">
				Count toward the programme; students choose · {programme.electives.length} courses, {credits(
					programme.electives
				)} credits
			</p>
			<CoursePicker {courses} bind:values={programme.electives} label="Elective courses" id="elective-courses" />
		</section>

		<section class="office-card" id="choices">
			<h2>choice pools</h2>
			<p class="office-help">“Pick N of these.” They count toward the required credits.</p>
			<ProgrammeChoices {programme} {courses} />
		</section>

		<section class="office-card" id="pathway">
			<h2>suggested path</h2>
			<p class="office-help">A recommendation, not a rule: it's the starting plan students see.</p>
			<ProgrammePathway {programme} {courses} />
		</section>

		<section class="office-card" id="capstone">
			<h2>capstone project</h2>
			<label class="office-check"
				><input
					type="checkbox"
					checked={!!programme.capstone}
					onchange={(e) => (programme.capstone = e.currentTarget.checked ? { credits: 8, required: true } : undefined)}
				/> This programme has a capstone</label
			>
			{#if programme.capstone}
				<div class="office-form">
					<label>credits<input type="number" min="0" bind:value={programme.capstone.credits} /></label>
					<label class="office-check"
						><input type="checkbox" bind:checked={programme.capstone.required} /> Required
						<span class="office-help">if not, it stands in for electives</span></label
					>
				</div>
			{/if}
		</section>
	{/if}
{/if}

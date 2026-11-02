<script lang="ts">
	// what each programme needs to graduate, for one set of requirements (the
	// default, or a run of batches): its credits and its required and elective
	// courses. a rule for one batch only belongs under batch requirements.
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { VARIANTS } from '$lib/features/office/model';
	import CoursePicker from '$lib/components/admin/CoursePicker.svelte';
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

	function create() {
		set?.programmes.push({
			subject,
			variant,
			credits: { total: 0, required: null, elective: null },
			required: [],
			picks: [],
			electives: [],
			choices: [],
			pathway: []
		});
	}

	const optional = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v) * 2) / 2));
</script>

<h1>Degree requirements</h1>
<p class="office-lead">
	What each programme needs to graduate. Pick the programme, then change its credits and courses.
</p>

{#if doc && set}
	<div class="office-row">
		<label
			>Requirements for
			<select bind:value={setId}>
				{#each sets as s (s.id)}
					<option value={s.id}>{s.name}{s.batches ? ` · batches ${s.batches.join(', ')}` : ' · everyone else'}</option>
				{/each}
			</select>
		</label>
		<label
			>Department
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
	<p class="office-help">
		{set.batches
			? `These apply to the ${set.batches.join(', ')} batches.`
			: 'These apply to any batch no other set names.'}
		For one batch only, use <a href="/admin/batches">batch requirements</a>.
	</p>

	{#if !programme}
		<section class="office-card">
			<p>This department has no {VARIANTS.find((v) => v.id === variant)?.label} programme in these requirements.</p>
			{#if office.canEdit}<button class="primary" onclick={create}>Create it</button>{/if}
		</section>
	{:else}
		{#each [...warnings, ...issues.map((i) => i.message)] as w (w)}<p class="office-note error">{w}</p>{/each}

		<section class="office-card">
			<h2>Credits</h2>
			<div class="office-form">
				<label
					>Total <span class="office-help">to complete the programme</span>
					<input
						type="number"
						min="0"
						step="0.5"
						bind:value={programme.credits.total}
						disabled={!office.canEdit}
					/></label
				>
				<label
					>Required <span class="office-help">blank if the department doesn’t say</span>
					<input
						type="number"
						min="0"
						step="0.5"
						value={programme.credits.required ?? ''}
						disabled={!office.canEdit}
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
						disabled={!office.canEdit}
						onchange={(e) => (programme.credits.elective = optional(e.currentTarget.value))}
					/></label
				>
			</div>
		</section>

		<section class="office-card">
			<h2>Required courses</h2>
			<p class="office-help">
				Every student in the programme takes these · {programme.required.length} courses, {credits(programme.required)} credits
			</p>
			<CoursePicker {courses} bind:values={programme.required} label="Required courses" id="required-courses" />
		</section>

		<section class="office-card">
			<h2>Electives</h2>
			<p class="office-help">
				Count toward the programme; students choose · {programme.electives.length} courses, {credits(
					programme.electives
				)} credits
			</p>
			<CoursePicker {courses} bind:values={programme.electives} label="Elective courses" id="elective-courses" />
		</section>

		{#if programme.choices.length || programme.pathway.length}
			<section class="office-card">
				<h2>Choice pools and suggested path</h2>
				<p class="office-help">Shown for reference; they come from the department’s published curriculum.</p>
				{#each programme.choices as g (g.rule)}
					<p><b>{g.rule}</b> · pick {g.pick}: {g.courses.map((c) => c.code ?? c.title).join(', ')}</p>
				{/each}
				{#if programme.pathway.length}
					<p>
						<b>Suggested path:</b>
						{programme.pathway.map((p) => `${p.code} (y${p.year} t${p.trim})`).join(', ')}
					</p>
				{/if}
			</section>
		{/if}
	{/if}
{/if}

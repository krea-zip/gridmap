<script lang="ts">
	// ─────────────────────────────────────────────
	// Degree requirements.
	//
	// For one set of rules (the default, or a run of batches), one department
	// and one kind of programme: how many credits it needs, which courses are
	// required, which are electives. A programme that doesn't exist yet can be
	// created. The "choose N from" pools and the suggested year-by-year path
	// are shown but not edited here. Edits save to this browser at once
	// (adminEdits.ts); a rule for just one batch lives under batch overrides.
	// ─────────────────────────────────────────────
	import { ALL_COURSES, COURSES, PROGRAMME_SUBJECTS, REQUIREMENT_SETS, shippedProgramme } from '$lib/data';
	import {
		VARIANTS,
		loadProgrammeEdits,
		programmeKey,
		saveProgrammeEdits,
		type ProgrammeEdit,
		type ProgrammeEdits
	} from '$lib/adminEdits';
	import type { Variant } from '$lib/curriculum/snapshot';

	let edits = $state<ProgrammeEdits>({});
	let loaded = $state(false);
	let dirty = $state(false);

	const defaultSet = REQUIREMENT_SETS.findLast((s) => s.batches) ?? REQUIREMENT_SETS[0];
	let setId = $state(defaultSet.id);
	let subject = $state(PROGRAMME_SUBJECTS[0].id);
	let variant = $state<Variant>('single_major_4yr');

	$effect(() => {
		edits = loadProgrammeEdits();
		loaded = true;
	});

	let key = $derived(programmeKey(setId, subject, variant));
	let base = $derived(shippedProgramme(setId, subject, variant));
	let edit = $derived<ProgrammeEdit | undefined>(edits[key]);
	let exists = $derived(!!base || !!edit);
	let set = $derived(REQUIREMENT_SETS.find((s) => s.id === setId)!);

	// ── the programme as it stands: the edit over what shipped ──
	let total = $derived(edit?.total ?? base?.credits.total ?? 0);
	let requiredCredits = $derived(edit?.required !== undefined ? edit.required : (base?.credits.required ?? null));
	let electiveCredits = $derived(edit?.elective !== undefined ? edit.elective : (base?.credits.elective ?? null));
	let requiredCourses = $derived(edit?.requiredCourses ?? base?.required ?? []);
	let electives = $derived(edit?.electives ?? base?.electives ?? []);

	const byCode = new Map(ALL_COURSES.map((c) => [c.code, c]));
	const titleOf = (code: string) => byCode.get(code)?.title ?? 'not in the catalogue';
	const sum = (codes: string[]) => codes.reduce((n, c) => n + (byCode.get(c)?.credits ?? 0), 0);

	function commit(next: ProgrammeEdit) {
		const all = { ...edits };
		const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as ProgrammeEdit;
		// an edit that says the same as what shipped is no edit
		if (base) {
			if (clean.total === base.credits.total) delete clean.total;
			if (clean.required === base.credits.required) delete clean.required;
			if (clean.elective === base.credits.elective) delete clean.elective;
			if (clean.requiredCourses && same(clean.requiredCourses, base.required)) delete clean.requiredCourses;
			if (clean.electives && same(clean.electives, base.electives)) delete clean.electives;
		}
		if (Object.keys(clean).length) all[key] = clean;
		else delete all[key];
		edits = all;
		saveProgrammeEdits(all);
		dirty = true;
	}
	const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

	const num = (raw: string) => (raw.trim() === '' ? null : Math.max(0, Math.min(400, Math.round(Number(raw) * 2) / 2)));
	function setCredits(field: 'total' | 'required' | 'elective', raw: string) {
		const v = num(raw);
		if (field === 'total') {
			if (v === null || Number.isNaN(v)) return;
			commit({ ...edit, total: v });
		} else commit({ ...edit, [field]: v === null || Number.isNaN(v) ? null : v });
	}

	function create() {
		commit({ created: true, total: 0 });
	}
	function revert() {
		const all = { ...edits };
		delete all[key];
		edits = all;
		saveProgrammeEdits(all);
	}

	// ── the two course lists ──
	type Which = 'requiredCourses' | 'electives';
	const listOf = (which: Which) => (which === 'requiredCourses' ? requiredCourses : electives);
	const setList = (which: Which, list: string[]) => commit({ ...edit, [which]: list });
	let queries = $state<Record<Which, string>>({ requiredCourses: '', electives: '' });
	function hits(which: Which) {
		const q = queries[which].trim().toLowerCase();
		if (!q) return [];
		const have = new Set(listOf(which));
		return COURSES.filter(
			(c) => !have.has(c.code) && `${c.codes.join(' ')} ${c.title}`.toLowerCase().includes(q)
		).slice(0, 8);
	}
	function add(which: Which, code: string) {
		setList(which, [...listOf(which), code]);
		queries[which] = '';
	}

	// the problems worth saying out loud
	let warnings = $derived.by(() => {
		const out: string[] = [];
		if (requiredCredits !== null && requiredCredits > total)
			out.push('Required credits are more than the programme total.');
		if (electiveCredits !== null && electiveCredits > total)
			out.push('Elective credits are more than the programme total.');
		if (sum(requiredCourses) > total && total > 0)
			out.push(`The required courses add up to ${sum(requiredCourses)} credits, over the total of ${total}.`);
		const both = requiredCourses.filter((c) => electives.includes(c));
		if (both.length) out.push(`${both.join(', ')} ${both.length === 1 ? 'is' : 'are'} on both lists.`);
		return out;
	});
	const gone = $derived([...requiredCourses, ...electives].filter((c) => !byCode.has(c)));
</script>

<div class="doc">
	<h1>Degree requirements</h1>
	<p class="lede">
		What each programme needs to graduate. Pick the programme, then change its credits and course lists.
	</p>

	{#if loaded}
		<div class="pick">
			<label>
				rules for
				<select class="input" bind:value={setId}>
					{#each REQUIREMENT_SETS as s (s.id)}
						<option value={s.id}>{s.name}{s.batches ? ` · batches ${s.batches.join(', ')}` : ' · everyone else'}</option
						>
					{/each}
				</select>
			</label>
			<label>
				department
				<select class="input" bind:value={subject}>
					{#each PROGRAMME_SUBJECTS as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
				</select>
			</label>
			<label>
				programme
				<select class="input" bind:value={variant}>
					{#each VARIANTS as v (v.id)}<option value={v.id}>{v.label}</option>{/each}
				</select>
			</label>
		</div>
		<p class="help">
			{set.batches
				? `These rules apply to the ${set.batches.join(', ')} batches.`
				: 'These rules apply to any batch no other set names.'}
			For a rule that applies to one batch only, use
			<a class="link" href="/admin/batches" data-sveltekit-reload>batch overrides</a>.
		</p>

		{#if !exists}
			<div class="none-yet">
				<p>This department has no {VARIANTS.find((v) => v.id === variant)?.label} programme in these rules.</p>
				<button class="btn primary" onclick={create}>create it</button>
			</div>
		{:else}
			{#each warnings as w (w)}<p class="note bad">{w}</p>{/each}
			{#if gone.length}<p class="note bad">
					{gone.join(', ')}
					{gone.length === 1 ? 'is' : 'are'} not in the catalogue, so students won’t see {gone.length === 1
						? 'it'
						: 'them'}.
				</p>{/if}

			<div class="section">
				<h2>credits</h2>
				<div class="set" class:changed={edit?.total !== undefined}>
					<span class="set-label">total<small>to complete the programme</small></span>
					<div>
						<input
							class="input num"
							type="number"
							min="0"
							step="0.5"
							value={total}
							onchange={(e) => setCredits('total', e.currentTarget.value)}
						/>
						{#if edit?.total !== undefined && base}<p class="was">was {base.credits.total}</p>{/if}
					</div>
				</div>
				<div class="set" class:changed={edit?.required !== undefined}>
					<span class="set-label">required<small>blank if the department doesn’t say</small></span>
					<div>
						<input
							class="input num"
							type="number"
							min="0"
							step="0.5"
							value={requiredCredits ?? ''}
							onchange={(e) => setCredits('required', e.currentTarget.value)}
						/>
						{#if edit?.required !== undefined && base}<p class="was">was {base.credits.required ?? 'blank'}</p>{/if}
					</div>
				</div>
				<div class="set" class:changed={edit?.elective !== undefined}>
					<span class="set-label">electives<small>blank if the department doesn’t say</small></span>
					<div>
						<input
							class="input num"
							type="number"
							min="0"
							step="0.5"
							value={electiveCredits ?? ''}
							onchange={(e) => setCredits('elective', e.currentTarget.value)}
						/>
						{#if edit?.elective !== undefined && base}<p class="was">was {base.credits.elective ?? 'blank'}</p>{/if}
					</div>
				</div>
			</div>

			{#each [['requiredCourses', 'required courses', 'every student in this programme takes these'], ['electives', 'elective courses', 'count toward the programme, students choose']] as const as [which, title, hint] (which)}
				<div class="section">
					<h2>{title}</h2>
					<div class="set" class:changed={edit?.[which] !== undefined}>
						<span class="set-label">
							{listOf(which).length} courses
							<small>{hint} · {sum(listOf(which))} credits</small>
						</span>
						<div>
							<div class="chips">
								{#each listOf(which) as code (code)}
									<span class="chip" class:missing={!byCode.has(code)}>
										<span class="c-main static" title={titleOf(code)}>{code}</span>
										<button
											class="c-x"
											aria-label="remove {code}"
											onclick={() =>
												setList(
													which,
													listOf(which).filter((c) => c !== code)
												)}>×</button
										>
									</span>
								{:else}
									<span class="none">none</span>
								{/each}
							</div>
							<div class="adder">
								<input
									class="input"
									type="search"
									placeholder="add a course, type a code or title…"
									bind:value={queries[which]}
									onkeydown={(e) => {
										const first = hits(which)[0];
										if (e.key === 'Enter' && first) add(which, first.code);
									}}
								/>
								{#if queries[which].trim()}
									<div class="add-list">
										{#each hits(which) as c (c.code)}
											<button onclick={() => add(which, c.code)}><b>{c.code}</b><span>{c.title}</span></button>
										{:else}
											<p class="empty">nothing matches</p>
										{/each}
									</div>
								{/if}
							</div>
							{#if edit?.[which] !== undefined && base}
								<p class="was">
									was {(which === 'requiredCourses' ? base.required : base.electives).length} courses
									<button class="link" onclick={() => commit({ ...edit, [which]: undefined })}>reset list</button>
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}

			{#if base && (base.choices.length || base.pathway.length)}
				<div class="section">
					<h2>not edited here</h2>
					{#if base.choices.length}
						<div class="set">
							<span class="set-label">choose from<small>pools students pick from</small></span>
							<ul class="plain">
								{#each base.choices as g (g.rule)}<li>
										{g.rule}, {g.courses.map((c) => c.code ?? c.title).join(', ')}
									</li>{/each}
							</ul>
						</div>
					{/if}
					{#if base.pathway.length}
						<div class="set">
							<span class="set-label">suggested path<small>year-by-year order</small></span>
							<p class="help">
								{base.pathway.length} suggested placements. Courses removed from the required list drop out of the path.
							</p>
						</div>
					{/if}
				</div>
			{/if}

			{#if edit}
				<div class="foot">
					<button class="btn sm" onclick={revert}
						>{base ? 'revert this programme to the catalogue' : 'delete this programme'}</button
					>
				</div>
			{/if}
			{#if dirty}<a class="btn primary see" href="/" data-sveltekit-reload>see it in the planner ↗</a>{/if}
		{/if}
	{/if}
</div>

<style lang="scss">
	.pick {
		display: flex;
		flex-wrap: wrap;
		gap: 1.6rem;

		label {
			display: flex;
			flex-direction: column;
			gap: 0.4rem;
			min-width: 24rem;
			font-size: 1.2rem;
			font-weight: 600;
		}
	}

	.num {
		width: 9rem;
	}

	.none-yet {
		display: flex;
		align-items: center;
		gap: 1.6rem;
		margin-top: 2.4rem;
		padding: 2rem;
		border: 1px dashed var(--adm-line-strong);
		border-radius: 8px;

		p {
			font-size: 1.35rem;
		}
	}

	.note {
		margin-top: 1rem;
	}

	.plain {
		margin: 0;
		padding-left: 1.6rem;
		font-size: 1.2rem;
		line-height: 1.6;
		color: var(--color-text-muted);
	}

	.foot,
	.see {
		margin-top: 2rem;
	}
</style>

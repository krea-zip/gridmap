<script lang="ts">
	// a term and the sections it offers: who teaches, who may enrol, how big,
	// and whether it's signed off. only approved offerings tell students a
	// course runs (see publication() in the office model).
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { APPROVALS, ELIGIBILITY, newOffering, type Term } from '$lib/features/office/model';

	const office = useOffice();
	const doc = $derived(office.document);
	const term = $derived(doc?.terms.find((t) => t.id === office.term));
	const YEARS = ['year 1', 'year 2', 'year 3', 'year 4'];

	let search = $state('');
	let selected = $state('');
	let newCode = $state('');
	let newSection = $state('');
	let newYear = $state(new Date().getFullYear());
	let newTrim = $state<1 | 2 | 3>(1);
	let problem = $state('');

	const offerings = $derived(
		(doc?.offerings ?? [])
			.filter(
				(o) =>
					o.term === office.term &&
					`${o.code} ${o.section} ${o.facultyText}`.toLowerCase().includes(search.toLowerCase())
			)
			.sort((a, b) => a.code.localeCompare(b.code) || a.section.localeCompare(b.section))
	);
	const offering = $derived(doc?.offerings.find((o) => o.id === selected));
	const titleOf = (code: string) =>
		doc?.curriculum.courses.find((c) => c.code === code)?.title ?? 'not in the catalogue';
	const facultyName = (id: string) => doc?.curriculum.lecturers.find((f) => f.id === id)?.name ?? id;

	function addTerm() {
		if (!doc) return;
		const id = `${String(newYear).slice(-2)}_T${newTrim}`;
		if (!doc.terms.some((t) => t.id === id)) {
			const fresh: Term = {
				id,
				label: `${newYear} · Trimester ${newTrim}`,
				year: newYear,
				trimester: newTrim,
				starts: '',
				ends: '',
				status: 'planning'
			};
			doc.terms.unshift(fresh);
		}
		office.term = id;
	}

	function addOffering() {
		if (!doc) return;
		const code = newCode.trim().toUpperCase();
		const course = doc.curriculum.courses.find((c) => c.codes.includes(code));
		if (!course) return void (problem = `${code || 'That'} is not in the catalogue. Add the course first.`);
		const section = newSection.trim();
		if (doc.offerings.some((o) => o.term === office.term && o.code === course.code && o.section === section))
			return void (problem = `${course.code} ${section ? `section ${section} ` : ''}is already offered this term.`);
		const fresh = newOffering(course.code, office.term, section);
		doc.offerings.push(fresh);
		selected = fresh.id;
		newCode = newSection = problem = '';
	}

	function remove(id: string) {
		if (!doc || !confirm('Remove this offering from the draft?')) return;
		doc.offerings.splice(
			doc.offerings.findIndex((o) => o.id === id),
			1
		);
		selected = '';
	}

	const whole = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v))));
</script>

<h1>Terms & offerings</h1>
<p class="office-lead">Set up a term’s sections: teaching, eligibility, capacity and sign-off.</p>

{#if doc}
	<div class="office-row">
		<label
			>Term
			<select bind:value={office.term}>
				{#each doc.terms as t (t.id)}<option value={t.id}
						>{t.label}{t.status === 'archived' ? ' · archived' : ''}</option
					>{/each}
			</select>
		</label>
		{#if office.canEdit}
			<label>New term<input type="number" min="2018" max="2099" bind:value={newYear} /></label>
			<label
				>Trimester
				<select bind:value={newTrim}>
					<option value={1}>1 · Aug–Oct</option>
					<option value={2}>2 · Nov–Jan</option>
					<option value={3}>3 · Feb–Apr</option>
				</select>
			</label>
			<button onclick={addTerm}>Add term</button>
		{/if}
	</div>

	{#if term}
		<section class="office-card">
			<h2>{term.label}</h2>
			<div class="office-form">
				<label>Name<input bind:value={term.label} disabled={!office.canEdit} /></label>
				<label>Starts<input type="date" bind:value={term.starts} disabled={!office.canEdit} /></label>
				<label>Ends<input type="date" bind:value={term.ends} disabled={!office.canEdit} /></label>
				<label
					>Status
					<select bind:value={term.status} disabled={!office.canEdit}>
						<option value="planning">Planning</option>
						<option value="open">Open for registration</option>
						<option value="archived">Archived</option>
					</select>
				</label>
			</div>
		</section>

		<div class="office-split">
			<section>
				{#if office.canEdit}
					<div class="office-row">
						<label>Course<input list="offering-courses" bind:value={newCode} placeholder="Code" /></label>
						<label>Section<input bind:value={newSection} placeholder="optional" /></label>
						<button class="primary" onclick={addOffering}>Add</button>
					</div>
					<datalist id="offering-courses">
						{#each doc.curriculum.courses.filter((c) => !c.retired) as c (c.code)}<option value={c.code}
								>{c.title}</option
							>{/each}
					</datalist>
					{#if problem}<p class="office-note error" role="alert">{problem}</p>{/if}
				{/if}
				<label>Search {offerings.length} offerings<input type="search" bind:value={search} /></label>
				<div class="office-list">
					{#each offerings as o (o.id)}
						<button aria-pressed={selected === o.id} onclick={() => (selected = o.id)}>
							{o.code}{o.section ? ` (${o.section})` : ''}
							<small>{APPROVALS.find((a) => a.value === o.approval)?.label} · {o.facultyText || 'no faculty yet'}</small
							>
						</button>
					{:else}
						<p class="office-empty">No offerings in this term yet.</p>
					{/each}
				</div>
			</section>

			{#if offering}
				<section class="office-card">
					<h2>{offering.code} {titleOf(offering.code)}</h2>
					<fieldset class="office-form" disabled={!office.canEdit}>
						<label>Section<input bind:value={offering.section} /></label>
						<label
							>Approval
							<select bind:value={offering.approval}>
								{#each APPROVALS as a (a.value)}<option value={a.value}>{a.label}</option>{/each}
							</select>
						</label>
						<label class="wide"
							>Faculty
							<span class="office-tags">
								{#each offering.faculty as id (id)}
									<span class="office-tag"
										>{facultyName(id)}<button
											type="button"
											aria-label="Remove {facultyName(id)}"
											onclick={() => (offering.faculty = offering.faculty.filter((f) => f !== id))}>×</button
										></span
									>
								{/each}
							</span>
							<select
								value=""
								onchange={(e) => {
									const id = e.currentTarget.value;
									if (id && !offering.faculty.includes(id)) offering.faculty = [...offering.faculty, id];
									e.currentTarget.value = '';
								}}
							>
								<option value="">Add a faculty member…</option>
								{#each doc.curriculum.lecturers as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
							</select>
						</label>
						<label class="wide">Faculty as the sheet wrote it <input bind:value={offering.facultyText} /></label>
						{#each YEARS as year (year)}
							<label
								>{year[0].toUpperCase() + year.slice(1)}
								<select bind:value={offering.eligibility[year]}>
									{#each ELIGIBILITY as e (e.value)}<option value={e.value}>{e.label}</option>{/each}
								</select>
							</label>
						{/each}
						<label
							>Audit
							<select bind:value={offering.audit}>
								{#each ELIGIBILITY as e (e.value)}<option value={e.value}>{e.label}</option>{/each}
							</select>
						</label>
						<label
							>Capacity<input
								type="number"
								min="0"
								value={offering.capacity ?? ''}
								onchange={(e) => (offering.capacity = whole(e.currentTarget.value))}
							/></label
						>
						<label
							>Minimum enrolment<input
								type="number"
								min="0"
								value={offering.minimum ?? ''}
								onchange={(e) => (offering.minimum = whole(e.currentTarget.value))}
							/></label
						>
						<label>Delivery<input bind:value={offering.delivery} /></label>
						<label>Lab / practical<input bind:value={offering.practical} /></label>
						<label class="wide">Requirements<textarea rows="2" bind:value={offering.requirements}></textarea></label>
						<label class="wide">Note for students <textarea rows="2" bind:value={offering.publicNote}></textarea></label
						>
						<label class="wide"
							>Office note <span class="office-help">never published</span><textarea
								rows="2"
								bind:value={offering.officeNote}
							></textarea></label
						>
						{#each doc.fields as field (field.id)}
							<label
								>{field.label}{field.required ? ' *' : ''}
								{#if field.type === 'select'}
									<select bind:value={offering.extras[field.id]}>
										<option value=""></option>
										{#each field.options as option (option)}<option>{option}</option>{/each}
									</select>
								{:else}
									<input type={field.type} bind:value={offering.extras[field.id]} />
								{/if}
							</label>
						{/each}
					</fieldset>
					{#if office.canEdit}
						<div class="office-actions">
							<button class="danger" onclick={() => remove(offering.id)}>Remove offering</button>
						</div>
					{/if}
				</section>
			{/if}
		</div>
	{:else}
		<p class="office-empty">No terms yet. Add one above.</p>
	{/if}
{/if}

<style>
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
	}
</style>

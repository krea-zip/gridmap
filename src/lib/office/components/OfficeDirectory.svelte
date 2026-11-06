<script lang="ts">
	import { page } from '$app/state';
	import { useOffice } from '$lib/office/workspace.svelte';
	import { emptyFaculty } from '$lib/office/model';
	let { kind }: { kind: 'faculty' | 'departments' } = $props();
	const office = useOffice();
	let search = $state(''),
		selected = $state(''),
		name = $state(''),
		error = $state(''),
		prefix = $state('');
	// search lands here with the record to open
	$effect(() => {
		const id = page.url.searchParams.get('id');
		if (id) selected = id;
	});
	const lecturer = $derived(office.document?.curriculum.lecturers.find((f) => f.id === selected));
	const subject = $derived(office.document?.curriculum.subjects.find((s) => s.id === selected));
	function add() {
		if (!office.document || !name.trim()) return;
		let base = name
			.trim()
			.toLowerCase()
			.replace(/[^a-z ]/g, '')
			.replace(/\s+/g, kind === 'faculty' ? '-' : ' ');
		if (!base) {
			error = 'Enter a name containing letters.';
			return;
		}
		let id = base;
		const records = kind === 'faculty' ? office.document.curriculum.lecturers : office.document.curriculum.subjects;
		let n = 2;
		while (records.some((r) => r.id === id))
			id = base + (kind === 'faculty' ? `-${n++}` : ` ${String.fromCharCode(96 + n++)}`);
		if (kind === 'faculty') office.document.curriculum.lecturers.push(emptyFaculty(id, name.trim()));
		else
			office.document.curriculum.subjects.push({
				id,
				label: name.trim(),
				short: base.replace(/ /g, '').slice(0, 6),
				majorable: false,
				hue: 250
			});
		selected = id;
		name = '';
	}
</script>

<h1>{kind}</h1>
<p class="office-lead">
	{kind === 'faculty'
		? 'Maintain contact details and the faculty directory. Assign teaching by course and section.'
		: 'Maintain department names, programme availability and the code prefixes recognised during spreadsheet imports.'}
</p>
<div class="office-row">
	<label
		>new {kind === 'faculty' ? 'faculty member' : 'department'}<input
			bind:value={name}
			placeholder="Full name"
		/></label
	><button class="primary" onclick={add}>add {kind === 'faculty' ? 'faculty' : 'department'}</button>
</div>
{#if error}<p role="alert" class="office-note error">{error}</p>{/if}
<div class="office-split">
	<section>
		<label>search<input type="search" bind:value={search} /></label>
		<div class="office-list">
			{#if kind === 'faculty'}{#each office.document?.curriculum.lecturers.filter((f) => `${f.name} ${f.email}`
						.toLowerCase()
						.includes(search.toLowerCase())) ?? [] as f}<button
						aria-pressed={selected === f.id}
						onclick={() => (selected = f.id)}>{f.name}<small>{f.email}</small></button
					>{/each}{:else}{#each office.document?.curriculum.subjects.filter((s) => s.label
						.toLowerCase()
						.includes(search.toLowerCase())) ?? [] as s}<button
						aria-pressed={selected === s.id}
						onclick={() => (selected = s.id)}>{s.label}</button
					>{/each}{/if}
		</div>
	</section>
	{#if kind === 'faculty' && lecturer && office.document}<section class="office-card" style="margin-top:0">
			<h2>{lecturer.name}</h2>
			<div class="office-form">
				<label>full name<input bind:value={lecturer.name} /></label><label
					>Email<input type="email" bind:value={lecturer.email} /></label
				><label class="wide">position / designation<input bind:value={lecturer.position} /></label><label class="wide"
					>Office hours<textarea bind:value={lecturer.office_hours}></textarea></label
				><label>profile link<input type="url" bind:value={lecturer.url} placeholder="https://…" /></label><label
					>Photo link<input type="url" bind:value={lecturer.image_url} placeholder="https://…" /></label
				><label>date joined<input bind:value={lecturer.date_of_joining} placeholder="YYYY-MM-DD" /></label>
			</div>
			<h3 style="margin-top:2rem">courses in the directory</h3>
			<ul>
				{#each office.document.curriculum.courses.filter((c) => c.lecturers.includes(lecturer.id)) as c}<li>
						<a href="/admin/courses?course={c.code}">{c.code} · {c.title}</a>
					</li>{/each}
			</ul>
			<h3>term assignments</h3>
			<ul>
				{#each office.document.offerings.filter((o) => o.faculty.includes(lecturer.id)) as o}<li>
						{o.term} · {o.code} · {o.section || 'All sections'}
					</li>{/each}
			</ul>
		</section>
	{:else if kind === 'departments' && subject && office.document}<section class="office-card" style="margin-top:0">
			<h2>{subject.label}</h2>
			<div class="office-form">
				<label>department name<input bind:value={subject.label} /></label><label
					>Short label<input maxlength="12" bind:value={subject.short} /></label
				><label>planner colour hue<input type="range" min="0" max="360" bind:value={subject.hue} /></label><label
					class="office-check"
					><input type="checkbox" bind:checked={subject.majorable} />Usually available as a major
					<span class="office-help">a single batch can differ: see <a href="/admin/batches">batches</a></span></label
				>
			</div>
			<h3 style="margin-top:2rem">course-code prefixes</h3>
			<p class="office-help">These identify the department when a new spreadsheet is imported.</p>
			<div class="office-tags">
				{#each Object.entries(office.document.prefixes).filter(([, s]) => s === subject.id) as [p]}<span
						class="office-tag"
						>{p}<button aria-label="Remove prefix {p}" onclick={() => delete office.document!.prefixes[p]}>×</button
						></span
					>{/each}
			</div>
			<div class="office-row">
				<label>new prefix<input bind:value={prefix} placeholder="ECON" maxlength="5" /></label><button
					onclick={() => {
						const p = prefix.trim().toUpperCase();
						if (!/^[A-Z]{2,5}$/.test(p)) {
							error = 'Use 2–5 letters for the prefix.';
							return;
						}
						if (office.document!.prefixes[p] && office.document!.prefixes[p] !== subject.id) {
							error = 'That prefix belongs to another department.';
							return;
						}
						office.document!.prefixes[p] = subject.id;
						prefix = '';
						error = '';
					}}>add prefix</button
				>
			</div>
			<a href="/admin/requirements">manage this department’s degree requirements →</a>
		</section>
	{:else}<div class="office-empty">Select a record to edit its details.</div>{/if}
</div>

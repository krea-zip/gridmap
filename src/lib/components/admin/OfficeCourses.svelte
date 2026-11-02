<script lang="ts">
	import { page } from '$app/state';
	import { useOffice } from '$lib/features/office/workspace.svelte';
	import { newCourse, admissionFor, applyAdmission, ELIGIBILITY, type OfficeCourse } from '$lib/features/office/model';
	import CoursePicker from './CoursePicker.svelte';
	const office = useOffice();
	let query = $state('');
	let department = $state('');
	let status = $state('active');
	let selected = $state(page.url.searchParams.get('course') ?? '');
	let tab = $state('Details');
	let adding = $state(false),
		code = $state(''),
		title = $state(''),
		subject = $state(''),
		error = $state('');
	const rows = $derived(
		office.document?.curriculum.courses.filter(
			(c) =>
				(!department || c.subjects.includes(department)) &&
				(status === 'all' || status === 'retired' ? status === 'all' || c.retired : !c.retired) &&
				`${c.codes.join(' ')} ${c.title}`.toLowerCase().includes(query.toLowerCase())
		) ?? []
	);
	const current = $derived(office.document?.curriculum.courses.find((c) => c.code === selected));
	let prereqQuery = $state('');
	let crossSubject = $state(''),
		crossCode = $state('');
	function add() {
		if (!office.document) return;
		const clean = code.trim().toUpperCase();
		if (!/^[A-Z]{2,5}\d{3}[A-Z]?$/.test(clean) || !title.trim() || !subject) {
			error = 'Enter a course code, title and department.';
			return;
		}
		if (office.document.curriculum.courses.some((c) => c.codes.includes(clean))) {
			error = 'This course code is already in use.';
			return;
		}
		office.document.curriculum.courses.push(newCourse(clean, title.trim(), subject));
		selected = clean;
		adding = false;
		code = title = '';
		error = '';
	}
	function ensureAdmission(course: OfficeCourse) {
		course.admission ??= admissionFor(course);
		return course.admission;
	}
	function toggleYear(course: OfficeCourse, y: number) {
		course.eligibleYears = course.eligibleYears.includes(y)
			? course.eligibleYears.filter((n) => n !== y)
			: [...course.eligibleYears, y].sort();
	}
	function addPrereq() {
		if (!current || !office.document) return;
		const pre = office.document.curriculum.courses.find((c) => c.code === prereqQuery.toUpperCase().trim());
		if (!pre || pre.code === current.code) {
			error = 'Choose a different catalogue course.';
			return;
		}
		const rule = ensureAdmission(current);
		rule.groups.push({ codes: [pre.code], concurrent: false });
		applyAdmission(current, rule);
		prereqQuery = '';
		error = '';
	}
	function addCross() {
		if (!current || !office.document) return;
		const alias = crossCode.toUpperCase().trim();
		if (!crossSubject || !/^[A-Z]{2,5}\d{3}[A-Z]?$/.test(alias)) {
			error = 'Choose a department and enter its course code.';
			return;
		}
		if (office.document.curriculum.courses.some((c) => c.code !== current.code && c.codes.includes(alias))) {
			error = 'That code belongs to another course.';
			return;
		}
		current.codesBySubject[crossSubject] = alias;
		current.subjects = [...new Set([...current.subjects, crossSubject])];
		current.codes = [...new Set([current.code, ...Object.values(current.codesBySubject)])];
		crossSubject = crossCode = '';
		error = '';
	}
</script>

<h1>Courses</h1>
<p class="office-lead">
	Maintain the course catalogue. Teaching assignments, sections and enrolment limits for a particular term belong under <a
		href="/admin/offerings">Terms &amp; offerings</a
	>.
</p>
<div class="office-actions">
	<button class="primary" onclick={() => (adding = !adding)}>Add course</button><a class="button" href="/admin/import"
		>Upload spreadsheet</a
	>
</div>
{#if adding}<section class="office-card">
		<h2>New course</h2>
		<div class="office-form">
			<label>Course code<input bind:value={code} placeholder="ECON340" /></label><label
				>Department<select bind:value={subject}
					><option value="">Select department</option>{#each office.document?.curriculum.subjects ?? [] as s}<option
							value={s.id}>{s.label}</option
						>{/each}</select
				></label
			><label class="wide">Course title<input bind:value={title} /></label>
		</div>
		<div class="office-actions">
			<button onclick={add}>Create course</button><button onclick={() => (adding = false)}>Cancel</button>
		</div>
	</section>{/if}
{#if error}<p class="office-note error" role="alert">{error}</p>{/if}
<div class="office-split" style="margin-top:2rem">
	<section>
		<label>Find a course<input type="search" bind:value={query} placeholder="Code or title" /></label>
		<div class="office-row">
			<label
				>Department<select bind:value={department}
					><option value="">All departments</option>{#each office.document?.curriculum.subjects ?? [] as s}<option
							value={s.id}>{s.label}</option
						>{/each}</select
				></label
			><label
				>Show<select bind:value={status}
					><option value="active">Active</option><option value="retired">Retired</option><option value="all"
						>All courses</option
					></select
				></label
			>
		</div>
		<p class="office-help">{rows.length} courses</p>
		<div class="office-list">
			{#each rows as c (c.code)}<button
					aria-pressed={selected === c.code}
					onclick={() => {
						selected = c.code;
						error = '';
					}}><b>{c.code}</b><small>{c.title}</small></button
				>{:else}<p>No matching courses.</p>{/each}
		</div>
	</section>
	{#if current && office.document}
		<section class="office-card" style="margin-top:0">
			<h2>{current.code} · {current.title}</h2>
			<div class="office-tabs" aria-label="Course sections">
				{#each ['Details', 'Prerequisites', 'Faculty', 'Cross-listing'] as name}<button
						aria-pressed={tab === name}
						onclick={() => (tab = name)}>{name}</button
					>{/each}
			</div>
			{#if tab === 'Details'}
				<div class="office-form">
					<label class="wide">Course title<input bind:value={current.title} /></label>
					<label
						>Credits<input
							type="number"
							min="0"
							max="30"
							step="0.5"
							bind:value={current.credits}
							onchange={() => (current.pendingCredits = false)}
						/></label
					>
					<label
						>Catalogue status<select
							value={current.retired ? 'retired' : 'active'}
							onchange={(e) => (current.retired = e.currentTarget.value === 'retired')}
							><option value="active">Active</option><option value="retired">Retired</option></select
						></label
					>
					<label class="wide"
						>Course description<textarea
							rows="8"
							value={office.document.descriptions[current.code] ?? ''}
							oninput={(e) => (office.document!.descriptions[current.code] = e.currentTarget.value)}
						></textarea></label
					>
					<fieldset class="wide">
						<legend>Usual eligible years</legend>
						<div class="office-actions">
							{#each [1, 2, 3, 4, 5] as y}<label class="office-check"
									><input
										type="checkbox"
										checked={current.eligibleYears.includes(y)}
										onchange={() => toggleYear(current, y)}
									/>Year {y}</label
								>{/each}
						</div>
						<p class="office-help">
							Term-specific permissions and repeater eligibility can be recorded with the offering.
						</p>
					</fieldset>
					<fieldset class="wide">
						<legend>Usual trimesters</legend>
						<div class="office-actions">
							{#each [1, 2, 3] as t}<label class="office-check"
									><input
										type="checkbox"
										checked={current.offered.includes(t as 1 | 2 | 3)}
										onchange={() =>
											(current.offered = current.offered.includes(t as 1 | 2 | 3)
												? current.offered.filter((n) => n !== t)
												: [...current.offered, t as 1 | 2 | 3])}
									/>Trimester {t}</label
								>{/each}
						</div>
					</fieldset>
					<label
						>Audit policy<select
							value={current.audit ?? 'unknown'}
							onchange={(e) => (current.audit = e.currentTarget.value as typeof current.audit)}
							>{#each ELIGIBILITY.filter((e) => e.value !== 'repeaters') as e}<option value={e.value}
									>{e.value === 'unknown' ? 'Use university policy' : e.label}</option
								>{/each}</select
						></label
					>
					<label class="office-check"
						><input type="checkbox" bind:checked={current.required} />Marked required in the university catalogue</label
					>
					<label class="wide"
						>Student-facing note<textarea
							bind:value={current.notes}
							placeholder="Optional clarification shown with this course"
						></textarea></label
					>
				</div>
				<p class="office-note">
					Whether this course counts as required for a particular major, minor or batch is managed under <a
						href="/admin/requirements">Degree requirements</a
					>.
				</p>
			{:else if tab === 'Prerequisites'}
				{@const rule = admissionFor(current)}
				<p>
					Complete <b>every group</b> below. Within a group, <b>any one</b> of its courses satisfies the requirement.
				</p>
				{#if !current.admission}<div class="office-tags">
						{#each rule.groups as group}<span class="office-tag">{group.codes.join(' or ')}</span>{/each}
					</div>{/if}
				<div class="office-row">
					<label
						>Add required course<input
							list="prereq-courses"
							bind:value={prereqQuery}
							placeholder="Course code"
						/></label
					><button onclick={addPrereq}>Add prerequisite group</button>
				</div>
				<datalist id="prereq-courses"
					>{#each office.document.curriculum.courses as c}<option value={c.code}>{c.title}</option>{/each}</datalist
				>
				<p class="office-help">Open the groups below to edit alternatives and concurrent enrolment.</p>
				{#if !current.admission}<button onclick={() => ensureAdmission(current)}>Edit prerequisite rules</button>{:else}
					{#each current.admission.groups as group, i}
						<div class="office-card">
							<CoursePicker
								courses={office.document.curriculum.courses.filter((c) => c.code !== current.code)}
								bind:values={group.codes}
								label="Group {i + 1}: any one of"
								id="edit-prerequisite-{i}"
							/>
							<div class="office-row">
								<label class="office-check"
									><input type="checkbox" bind:checked={group.concurrent} />May be taken in the same trimester</label
								><button
									class="danger"
									onclick={() => {
										current.admission!.groups.splice(i, 1);
										applyAdmission(current, current.admission!);
									}}>Remove group</button
								>
							</div>
						</div>{/each}
					<CoursePicker
						courses={office.document.curriculum.courses}
						bind:values={current.admission.recommended}
						label="Recommended background (not compulsory)"
						id="recommended"
					/>
					<label class="office-check"
						><input type="checkbox" bind:checked={current.admission.permission} />Instructor permission required</label
					>
					<label>Student-facing prerequisite note<textarea bind:value={current.admission.note}></textarea></label>
					<details>
						<summary>Original prerequisite wording</summary>
						<p class="office-pre">{current.admission.source || 'Entered in the academic office.'}</p>
					</details>
				{/if}
			{:else if tab === 'Faculty'}
				<p>Directory contacts shown with this course. Use term offerings to record who teaches each section.</p>
				{#each office.document.curriculum.lecturers as f}{#if current.lecturers.includes(f.id)}<div class="office-row">
							<span>{f.name} <small>{f.email}</small></span><button
								onclick={() => (current.lecturers = current.lecturers.filter((id) => id !== f.id))}>Remove</button
							>
						</div>{/if}{/each}
				<label
					>Add faculty<select
						value=""
						onchange={(e) => {
							if (e.currentTarget.value && !current.lecturers.includes(e.currentTarget.value))
								current.lecturers = [...current.lecturers, e.currentTarget.value];
							e.currentTarget.value = '';
						}}
						><option value="">Choose a faculty member</option
						>{#each office.document.curriculum.lecturers.filter((f) => !current.lecturers.includes(f.id)) as f}<option
								value={f.id}>{f.name}</option
							>{/each}</select
					></label
				>
				<label>Additional teaching information<input bind:value={current.faculty} /></label>
				<p><a href="/admin/faculty">Add or edit faculty records →</a></p>
			{:else}
				<p>One course can have a different code in each department. These are aliases of the same course.</p>
				<div class="office-table-scroll">
					<table>
						<thead><tr><th>Department</th><th>Code</th><th></th></tr></thead><tbody
							>{#each Object.entries(current.codesBySubject) as [s, c]}<tr
									><td>{s}</td><td>{c}</td><td
										>{#if c !== current.code}<button
												onclick={() => {
													delete current.codesBySubject[s];
													current.subjects = current.subjects.filter((x) => x !== s);
													current.codes = current.codes.filter((x) => x !== c);
												}}>Remove listing</button
											>{/if}</td
									></tr
								>{/each}</tbody
						>
					</table>
				</div>
				<div class="office-row">
					<label
						>Department<select bind:value={crossSubject}
							><option value="">Select</option>{#each office.document.curriculum.subjects as s}<option value={s.id}
									>{s.label}</option
								>{/each}</select
						></label
					><label>Department code<input bind:value={crossCode} /></label><button onclick={addCross}>Add listing</button>
				</div>
				<label
					>Credit sharing<select
						value={current.share ?? ''}
						onchange={(e) => (current.share = (e.currentTarget.value || undefined) as 'one' | 'all' | undefined)}
						><option value="">Use university default</option><option value="one">Count toward one programme</option
						><option value="all">Count toward every matching programme</option></select
					></label
				>
			{/if}
		</section>{:else}<div class="office-empty">Select a course to view and edit its complete record.</div>{/if}
</div>

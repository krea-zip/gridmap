<script lang="ts">
	import type { Plan } from '$lib/plan.svelte';
	import CourseFaculty from './CourseFaculty.svelte';
	import {
		baseCode,
		byCode,
		canAudit,
		facultyOf,
		hasCode,
		isAttemptId,
		isCore,
		RECORDED_TERMS,
		ranIn,
		satisfiedBy,
		termsOffered
	} from '$lib/data';
	import { runText } from '$lib/boardViews';
	import { reducedMotion } from '$lib/transitions';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { TrimNum } from '$lib/types';
	import { academicYear, degreeTrim, slotOrder } from '$lib/calendar';
	import { descriptionOf, loadDescriptions } from '$lib/descriptions.svelte';
	import { GRADE_SCALE, OTHER_MARKS, type GradeMark } from '$lib/grades';

	let { plan }: { plan: Plan } = $props();

	// only jump to codes that exist in the catalogue; others stay plain text
	function jump(code: string) {
		plan.revealCourse(code);
	}

	// descriptions ship in their own chunk. The page asks for it on idle; if a
	// course is selected before that, ask right now, whichever lands first,
	// every course fills in from then on
	$effect(() => {
		if (plan.selected) loadDescriptions();
	});

	const DESC_FOLD = 280;
	let descOpenFor = $state<string | null>(null);
	let descOpen = $derived(descOpenFor !== null && descOpenFor === plan.selected?.code);

	// the board entry the panel is about: the course itself, or one of its
	// failed attempts (COMP201~1) when that is what was clicked
	let sid = $derived(
		plan.selectedId && baseCode(plan.selectedId) === plan.selected?.code
			? plan.selectedId
			: (plan.selected?.code ?? '')
	);
	let isAttempt = $derived(isAttemptId(sid));
	let attemptsHere = $derived(plan.selected ? plan.attemptsOf(plan.selected.code) : []);
	let failed = $derived(plan.gradeOf(sid) === 'U');
	let roles = $derived(plan.selected ? plan.rolesIn(plan.selected.code) : []);
	// worth spelling out only when the departments disagree
	// who teaches it, shown under "about the course" (never for the KCCS core)
	let hasTeachers = $derived(
		!!plan.selected &&
			!isCore(plan.selected.code) &&
			(facultyOf(plan.selected.code).length > 0 || !!plan.selected.faculty)
	);
	let rolesDiffer = $derived(new Set(roles.map((r) => r.role)).size > 1);

	// ── placing it without dragging ──
	// where the course sits now, and the trimester the picker offers: its own
	// slot if it's placed, otherwise the first one it fits cleanly into
	let placedAt = $derived(plan.placed.find((p) => p.code === plan.selected?.code) ?? null);
	let target = $derived.by(() => {
		const code = plan.selected?.code;
		if (!code) return '';
		if (placedAt) return `${placedAt.year}-${placedAt.trim}`;
		for (const y of plan.years)
			for (const t of plan.trims) if (plan.canDrop(code, y, t)) return `${y}-${t}`;
		return '2-1';
	});
	function placeIt() {
		const code = plan.selected?.code;
		if (!code || !target) return;
		const [y, t] = target.split('-').map(Number);
		plan.place(code, y, t as 1 | 2 | 3);
	}

	// ── when it ran: the offered tile opens the course's history, term by
	//    term, against the timetables on record (it stays open between courses) ──
	let ranOpen = $state(false);
	// the academic years the timetables cover: 24 is 24 to 25 (24_T1 … 24_T3)
	const RUN_YEARS = [
		...new Set(([1, 2, 3] as TrimNum[]).flatMap((t) => RECORDED_TERMS[t].map((term) => term.split('_')[0])))
	].sort();
	/** laid out as the grid is: one row per academic year, one cell per
	 *  trimester (t1 t2 t3 across); each ran, didn't run, or has no timetable */
	function runGrid(code: string) {
		const history = new Set(ranIn(code));
		return RUN_YEARS.map((yy) => ({
			yy,
			cells: ([1, 2, 3] as TrimNum[]).map((trim) => {
				const term = `${yy}_T${trim}`;
				const state = !RECORDED_TERMS[trim].includes(term) ? 'none' : history.has(term) ? 'ran' : 'not';
				return { trim, state, label: `${yy} to ${Number(yy) + 1}, T${trim}: ${state === 'ran' ? 'ran' : state === 'not' ? "didn't run" : 'no timetable on record'}` };
			})
		}));
	}
	// the academic year the course sits in on your plan, "26" for 26 to 27
	let placedYY = $derived(placedAt ? String(plan.batchStartYear + placedAt.year - 1).slice(-2) : null);

	function termLabel(year: number, trim: number) {
		return `Year ${year} · Trimester ${trim}`;
	}

	// ── a prerequisite against the plan: placed earlier (fine), placed too
	//    late, or nowhere yet, an interchangeable course counts as placed ──
	// Said in the grid's own trimester numbers (t8 is year 3, T2), short:
	// "✓ t5 · done", "✓ t8", "t11 · too late", "not planned"; the full
	// sentence waits in the tooltip. A missing one also says where it would
	// fit, as a button that puts it there.
	type PrereqStatus = {
		kind: 'done' | 'ok' | 'late' | 'missing';
		text: string;
		title: string;
		fits?: { year: number; trim: TrimNum };
	};
	let hereAt = $derived(slotOrder(plan.here.year, plan.here.trim));
	const spelled = (year: number, trim: number) =>
		`t${degreeTrim(year, trim)}: year ${year}, trimester ${trim} (${academicYear(plan.batchStartYear, year)})`;
	// the first trimester after now, and before this course when it's placed,
	// that the prerequisite runs in and has room in under your target load
	function fitsFor(pre: string): { year: number; trim: TrimNum } | null {
		const code = byCode(pre).code;
		const before = placedAt ? slotOrder(placedAt.year, placedAt.trim) : Infinity;
		for (const year of plan.years)
			for (const trim of plan.trims) {
				const o = slotOrder(year, trim);
				if (o <= hereAt || o >= before || !plan.canDrop(code, year, trim)) continue;
				if (!plan.coreOnly(year, trim) && plan.slotCredits(year, trim) + byCode(code).credits > plan.targetLoad) continue;
				return { year, trim };
			}
		return null;
	}
	function prereqStatus(pre: string): PrereqStatus {
		const options = [byCode(pre).code, ...satisfiedBy(pre)];
		const at = plan.placed
			.filter((p) => options.includes(p.code))
			.sort((a, b) => a.year - b.year || a.trim - b.trim)[0];
		if (!at) {
			const fits = fitsFor(pre) ?? undefined;
			return {
				kind: 'missing',
				text: 'not planned',
				title: fits
					? `not on your plan; it fits in ${spelled(fits.year, fits.trim)}`
					: `not on your plan, and no trimester ${placedAt ? 'before this course' : 'ahead'} has room for it`,
				fits
			};
		}
		const o = slotOrder(at.year, at.trim);
		const n = degreeTrim(at.year, at.trim);
		const via = at.code === byCode(pre).code ? '' : `, as ${plan.courseLabel(at.code)}`;
		if (placedAt && o >= slotOrder(placedAt.year, placedAt.trim))
			return { kind: 'late', text: `t${n} · too late`, title: `planned for ${spelled(at.year, at.trim)}${via}, not before this course: move it earlier` };
		if (o < hereAt) return { kind: 'done', text: `✓ t${n} · done`, title: `taken in ${spelled(at.year, at.trim)}${via}` };
		if (o === hereAt) return { kind: 'ok', text: `✓ t${n} · now`, title: `being taken now, ${spelled(at.year, at.trim)}${via}` };
		return { kind: 'ok', text: `✓ t${n}`, title: `planned for ${spelled(at.year, at.trim)}${via}` };
	}

	// shut on Esc, unless a dialog is open, which Esc closes first
	function onkey(e: KeyboardEvent) {
		if (e.key === 'Escape' && plan.selected && !document.querySelector('.backdrop'))
			plan.selected = null;
	}
</script>

<svelte:window onkeydown={onkey} />

<header class="col-header">
	<h2>course</h2>
	{#if plan.selected}
		<button
			class="close"
			aria-label="close course details"
			title="close (Esc)"
			onclick={() => (plan.selected = null)}>×</button
		>
	{/if}
</header>
{#if plan.selected}
	{@const c = plan.selected}
	{@const ran = termsOffered(c.code)}
	{@const desc = descriptionOf(c.code)}
	<div class="details">
		<div class="d-head">
			{#if plan.showCodes}<span class="d-code">{c.code}</span>{/if}
			<span class="d-title">{c.title}</span>
			{#if plan.showCodes && c.codes.length > 1}
				<span class="d-xlist"
					>cross-listed as {c.codes.filter((x) => x !== c.code).join(' · ')}</span
				>
			{/if}
		</div>

		{#if c.pendingCredits && c.credits === 0}<p class="d-no-audit">
				Offered in T2. Credits and prerequisites were not supplied; confirm these in admin before
				planning this course.
			</p>{/if}
		<div class="d-meta">
			<div class="d-stat">
				<span class="d-stat-label">credits</span>
				<span class="d-stat-value">{c.pendingCredits && c.credits === 0 ? 'TBC' : c.credits}</span>
			</div>
			<!-- opens when it ran, term by term -->
			<button
				class="d-stat d-stat-btn"
				class:open={ranOpen}
				aria-expanded={ranOpen}
				aria-controls="d-runs"
				title={ranOpen ? 'hide when it ran' : 'when it ran, term by term'}
				onclick={() => (ranOpen = !ranOpen)}
			>
				<span class="d-stat-label">offered</span>
				<span class="d-stat-value">{c.offered.map((t) => `t${t}`).join(' ') || '–'}</span>
				<span class="d-stat-sub"
					>{ran.length ? `last ${ran[0]}` : 'no record'} <i class="d-caret" aria-hidden="true">▾</i></span
				>
			</button>
			<div class="d-stat">
				<span class="d-stat-label">type</span>
				<span class="d-stat-value">{plan.courseType(c.code)}</span>
				{#if rolesDiffer}
					{@const elsewhere = roles.filter((r) => r.role !== plan.courseType(c.code))}
					{#if elsewhere.length}<span
							class="d-stat-sub wraps"
							title="each department decides what a cross-listed course is to it"
							>{elsewhere[0].role} in {elsewhere[0].scope}</span
						>{/if}
				{/if}
			</div>
		</div>

		{#if ranOpen}
			<div class="d-runs" id="d-runs" transition:slide={{ duration: reducedMotion() ? 0 : 210, easing: cubicOut }}>
				<table>
					<caption>when it ran</caption>
					<colgroup><col class="years" /><col /><col /><col /></colgroup>
					<thead>
						<tr>
							<th></th>
							{#each [1, 2, 3] as t (t)}
								<th scope="col" class:mine={placedAt?.trim === t}
									>t{t}{#if placedAt?.trim === t}<span class="d-runs-tag">your plan</span>{/if}</th
								>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each runGrid(c.code) as row (row.yy)}
							<tr>
								<th scope="row">{row.yy} to {Number(row.yy) + 1}</th>
								{#each row.cells as cell (cell.trim)}
									<td
										class:mine={placedAt?.trim === cell.trim}
										class:at={placedYY === row.yy && placedAt?.trim === cell.trim}
										><i class="d-run" data-state={cell.state} role="img" aria-label={cell.label} title={cell.label}></i></td
									>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
				{#if placedAt}
					<p class="d-runs-say">in t{placedAt.trim}: {runText(c.code, placedAt.trim)}</p>
				{/if}
				<p class="d-runs-key"><i class="d-run" data-state="ran"></i> ran <i class="d-run" data-state="not"></i> didn't run <i class="d-run" data-state="none"></i> no timetable</p>
				<button class="d-runs-go" onclick={() => (plan.view = 'runs')}>check every course on your plan: will it run? →</button>
			</div>
		{/if}

		<!-- Three sections, each under its own heading: what you do with the
		     course on YOUR plan, how it fits your degree, and what it is. -->
		<section class="d-section" aria-labelledby="d-sec-plan">
		<h3 class="d-section-title" id="d-sec-plan">your plan</h3>

		<!-- where it is on the plan, and a way to put it there without
		     dragging, keyboard, touch, or just quicker -->
		<div class="d-place">
			<div class="d-place-heading">
				<label for="course-trimester">trimester</label>
				<span class="d-place-where"
					>{placedAt ? termLabel(placedAt.year, placedAt.trim) : 'not added'}</span
				>
			</div>
			<div class="d-place-row">
				<select id="course-trimester" bind:value={target} aria-label="trimester to put {c.code} in">
					{#each plan.years as y (y)}
						{#each plan.trims as t (t)}
							<option value="{y}-{t}" disabled={plan.coreOnly(y, t) && !isCore(c.code)}>
								{termLabel(y, t)}{c.offered.length && !c.offered.includes(t)
									? ' (not offered)'
									: ''}
							</option>
						{/each}
					{/each}
				</select>
				<button
					class="d-place-go"
					disabled={!!placedAt && target === `${placedAt.year}-${placedAt.trim}`}
					onclick={placeIt}
					>{placedAt ? 'move' : attemptsHere.length ? 'add another attempt' : 'add to plan'}</button
				>
				{#if placedAt}
					<button class="d-place-remove" onclick={() => plan.remove(c.code)}>remove</button>
				{/if}
			</div>
		</div>

		{#if plan.onBoard(sid)}
			{#key sid}
				<details class="d-disclosure" open={plan.gradeMode || plan.isAudit(sid) || failed}>
					<summary
						><span>{plan.gradeMode ? 'grade, audit & result' : 'audit & result'}</span><span
							class="chev"
							aria-hidden="true"
						></span></summary
					>
					<div class="d-disclosure-body">
						{#if plan.gradeMode}
							<!-- grade dropdown: letters count toward CGPA, Withdrawn / Incomplete
				     don't. Hidden while auditing, since an audit carries no grade. -->
							{#if !plan.isAudit(sid)}
								<label class="d-grade">
									<span>grade</span>
									<select
										value={plan.gradeOf(sid) ?? ''}
										onchange={(e) =>
											plan.setGrade(sid, (e.currentTarget.value || null) as GradeMark | null)}
									>
										<option value="">not graded</option>
										{#each OTHER_MARKS as m (m.mark)}
											<option value={m.mark}>{m.label}</option>
										{/each}
										<optgroup label="grade">
											{#each GRADE_SCALE as g (g.letter)}
												<option value={g.letter}>{g.letter} · {g.points}</option>
											{/each}
										</optgroup>
									</select>
								</label>
							{/if}
							<!-- audit sits under the grade, taking a course off the CGPA -->
							{#if canAudit(c.code) && !isAttempt}
								<label class="d-audit">
									<input
										type="checkbox"
										checked={plan.isAudit(c.code)}
										onchange={() => {
											plan.toggleAudit(c.code);
											if (plan.isAudit(c.code)) plan.setGrade(c.code, null);
										}}
									/>
									<span>Audit this course (no credits or grade)</span>
								</label>
							{/if}
						{:else if canAudit(c.code) && !isAttempt}
							<label class="d-audit">
								<input
									type="checkbox"
									checked={plan.isAudit(c.code)}
									onchange={() => plan.toggleAudit(c.code)}
								/>
								<span>Audit this course (no credits or grade)</span>
							</label>
						{:else if !isAttempt}
							<!-- drop-form rule: audits are 2/4-credit courses, never KCCS/391/490/491 -->
							<p class="d-no-audit">this course can't be taken as an audit</p>
						{/if}

						<!-- failing, grade view or not: this attempt stays on the grid, faded,
			     as a record (a U), and the course is free to place again, the copy -->
						<fieldset class="d-fail" disabled={plan.isAudit(sid)}>
							<legend>result</legend>
							<label>
								<input
									type="radio"
									name="result-{sid}"
									checked={!failed}
									onchange={() => failed && plan.setGrade(sid, null)}
								/>
								<span>not failed</span>
							</label>
							<label>
								<input
									type="radio"
									name="result-{sid}"
									checked={failed}
									onchange={() => !failed && plan.setGrade(sid, 'U')}
								/>
								<span>failed</span>
							</label>
						</fieldset>
						{#if isAttempt}
							<p class="d-fail-note">
								This attempt stays on the grid, faded, as a U. {plan.onBoard(c.code)
									? 'The copy is on your plan.'
									: 'Place a copy: pick a trimester above, or drag the course from the catalogue.'}
							</p>
						{/if}
					</div>
				</details>
			{/key}
		{/if}

		<!-- earlier attempts at this course, each opens its own record -->
		{#if attemptsHere.length}
			<div class="label">earlier attempts</div>
			<div class="d-chips">
				{#each attemptsHere as a (a.id)}
					<button class="d-chip" onclick={() => plan.select(a.id)}>
						{termLabel(a.year, a.trim)}<span class="d-chip-status">failed</span>
					</button>
				{/each}
			</div>
		{/if}

		</section>

		<!-- how it counts is the type tile's job (a cross-listed course's other
		     role sits under it); this is only what comes before and after -->
		{#if c.prereqs.length || c.unlocks.some(hasCode)}
		<section class="d-section" aria-labelledby="d-sec-degree">
		<h3 class="d-section-title" id="d-sec-degree">in your degree</h3>

		<!-- Keep prerequisites visible; related courses can be explored on demand. -->
		{#if c.prereqs.length}
			<div class="label">needs first</div>
			<div class="d-chips d-related">
				{#each c.prereqs as p (p)}
					{#if hasCode(p)}
						{@const status = prereqStatus(p)}
						<span class="d-prereq">
							<button class="d-chip" data-status={status.kind} title={status.title} onclick={() => jump(p)}>
								<span>{plan.courseLabel(p)}</span>
								<span class="d-chip-status">{status.text}</span>
							</button>
							<!-- missing: where it would fit, one click to put it there -->
							{#if status.fits}
								{@const fits = status.fits}
								<button
									class="d-add"
									title="add {plan.courseLabel(p)} to {spelled(fits.year, fits.trim)}"
									onclick={() => plan.place(byCode(p).code, fits.year, fits.trim)}>+ t{degreeTrim(fits.year, fits.trim)}</button
								>
							{/if}
						</span>
					{:else}
						<span class="d-chip" data-status="missing"
							>{p}<span class="d-chip-status">not in the catalogue</span></span
						>
					{/if}
				{/each}
			</div>
		{/if}

		{#if c.unlocks.some(hasCode)}
			{#key c.code}
				<details class="d-disclosure">
					<summary title="Courses that require this one; other prerequisites may also apply"
						><span>leads to</span><span class="d-count">{c.unlocks.filter(hasCode).length}</span
						><span class="chev" aria-hidden="true"></span></summary
					>
					<div class="d-disclosure-body">
						<div class="d-chips d-related">
							{#each c.unlocks.filter(hasCode) as u (u)}
								<button class="d-chip" onclick={() => jump(u)}>{plan.courseLabel(u)}</button>
							{/each}
						</div>
					</div>
				</details>
			{/key}
		{/if}

		</section>
		{/if}

		{#if desc || hasTeachers}
		<section class="d-section" aria-labelledby="d-sec-about">
		<h3 class="d-section-title" id="d-sec-about">about the course</h3>
		{#if desc}
			{@const long = desc.length > DESC_FOLD}
			<div class="d-desc">
				<p class:folded={long && !descOpen}>{desc}</p>
				{#if long}
					<button
						class="d-more"
						aria-expanded={descOpen}
						onclick={() => (descOpenFor = descOpen ? null : c.code)}
					>
						{descOpen ? 'read less' : 'read more'}
					</button>
				{/if}
			</div>
		{/if}

		<CourseFaculty {plan} course={c} />
		</section>
		{/if}
	</div>
{:else}
	<!-- the column a first-timer sees empty: how the planner works, and what
	     the little marks on the courses mean -->
	<div class="d-empty">
		<p>pick a course on the grid or in the catalogue to see it here.</p>

		<div class="label">how it works</div>
		<ul class="guide">
			<li>
				<b>drag</b> a course from the catalogue onto a trimester, or between trimesters
			</li>
			<li><b>click a trimester</b> on the grid to zoom in on it</li>
			<li>
				<b>hints</b> on the left flag anything that breaks a rule, click one to find its course
			</li>
			<li>
				<b>view</b>, above the grid, switches what the board shows: <b>grades</b> turns the plan into your transcript
			</li>
		</ul>

		<div class="label">reading the marks</div>
		<ul class="marks">
			<li>
				<span class="m-dot" aria-hidden="true"></span>required by your programme
			</li>
			<li>
				<span class="m-mark" data-kind="warn" aria-hidden="true"></span>breaks a rule, a
				prerequisite out of order, say
			</li>
			<li>
				<span class="m-mark" data-kind="caution" aria-hidden="true"></span>worth a look, under the
				credit minimum, say
			</li>
			<li>
				<span class="m-mark" data-kind="info" aria-hidden="true"></span>a note, counts on the
				transcript only, say
			</li>
		</ul>
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.col-header {
		@include card-header;
		justify-content: space-between;
		border-bottom: 1px solid var(--color-border);

		h2 {
			font-size: 1.8rem;
			font-weight: 600;
			color: var(--color-text);
		}
	}

	.d-empty {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 1.6rem;
		font-size: var(--text-body);
		line-height: 1.5;
		color: var(--color-text-muted);

		.label {
			@include section-label;
			margin-top: 0.8rem;
			padding-top: 1rem;
			border-top: 1px dotted var(--color-border-light);
		}

		ul {
			display: flex;
			flex-direction: column;
			gap: 0.6rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		b {
			color: var(--color-text);
		}

		.marks li {
			display: flex;
			align-items: baseline;
			gap: 0.8rem;
		}
	}

	.m-dot {
		@include required-dot;
		align-self: center;
	}

	.m-mark {
		@include severity-mark;
		align-self: center;
	}

	.close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.8rem;
		height: 2.8rem;
		font-size: 2.2rem;
		line-height: 1;
		color: var(--color-text-muted);
		background: none;
		border: none;
		border-radius: 4px;
		cursor: pointer;

		&:hover {
			color: var(--color-text);
			background: var(--color-hover-medium);
		}
	}

	.d-disclosure {
		border-top: 1px solid var(--color-border-divider);

		summary {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.9rem 0;
			font-size: 1.2rem;
			font-weight: 600;
			color: var(--color-text-muted);
			list-style: none;
			cursor: pointer;

			&::-webkit-details-marker {
				display: none;
			}
			&:hover {
				color: var(--color-text);
			}
		}

		.chev {
			flex: none;
			width: 0.7rem;
			height: 0.7rem;
			border-right: 1.5px solid var(--color-text-muted);
			border-bottom: 1.5px solid var(--color-text-muted);
			transform: rotate(-45deg);
			transition: transform 0.3s var(--spring);
			margin-left: auto;
			margin-right: 0.4rem;
		}

		&[open] .chev {
			transform: rotate(45deg);
		}
	}

	.d-count {
		padding: 0.1rem 0.5rem;
		border: 1px solid var(--color-border-card);
		border-radius: 10px;
		font-size: 1rem;
		line-height: 1.2;
	}

	.d-disclosure-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0.2rem 0 1rem;
	}

	.d-place-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.4rem 0.8rem;

		label {
			@include section-label;
		}
	}

	.d-related .d-chip {
		max-width: 100%;
		line-height: 1.35;
	}

	.d-place {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem 1.2rem;
		background: var(--color-bg-light);
		border: 1px solid var(--color-border-divider);
		border-radius: 6px;
	}

	.d-place-where {
		font-size: 1.1rem;
		color: var(--color-text-muted);

	}

	.d-place-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;

		select {
			flex: 1 0 100%;
			width: 100%;
			min-width: 0;
			padding: 0.5rem 0.6rem;
			font: inherit;
			font-size: 1.3rem;
			color: var(--color-text);
			background-color: var(--color-bg-light);
			border: 1px solid var(--color-border-card);
			border-radius: 4px;
			box-shadow: var(--shadow-well);
		}
	}

	.d-place-go {
		flex: 1;
		padding: 0.5rem 1.2rem;
		font: inherit;
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--color-on-accent);
		background-color: var(--color-accent);
		border: 1px solid var(--color-control-deep);
		border-radius: 4px;
		cursor: pointer;
		@include glossy-accent;

		&:disabled {
			opacity: 0.6;
			cursor: default;
		}
	}

	.d-place-remove {
		padding: 0.5rem 1rem;
		font: inherit;
		font-size: 1.3rem;
		@include store-button;
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 1.4rem;

		.label {
			@include section-label;
			margin-top: 0.6rem;
		}
	}

	// the panel's three parts (your plan / in your degree / about the course),
	// each under a heading a step above the small uppercase labels inside it
	.d-section {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		margin-top: 0.8rem;
	}

	.d-section-title {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text);

		// a dotted rule runs on from the heading to the panel's edge
		&::after {
			content: '';
			flex: 1;
			border-top: 1px dotted var(--color-border-light);
		}
	}

	.d-head {
		display: flex;
		flex-direction: column;
		justify-content: center;
		// reserve room for a two-line title so a one-line course doesn't shrink
		// the box and shove everything below it up and down between selections
		min-height: 9rem;
		@include card;

		.d-code {
			font-size: 1.8rem;
			font-weight: 700;
		}

		.d-title {
			font-size: 1.4rem;
			line-height: 1.35;
		}

		.d-xlist {
			margin-top: 0.4rem;
			font-size: 1.2rem;
			font-weight: 600;
			color: var(--color-text-muted);
		}
	}

	.d-meta {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.8rem;
	}

	.d-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		// a fixed height so credits / offered / type stay the same size box no
		// matter how long their value is, the panel doesn't jump between courses
		min-height: 5.6rem;
		padding: 0.6rem 0.4rem;
		background: var(--color-bg-light);
		border: 1px solid var(--color-border-card);
		border-radius: 4px;
		@include card-shine;

		.d-stat-label {
			font-size: 1.1rem;
			color: var(--color-text-muted);
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		.d-stat-value {
			font-size: 1.5rem;
			font-weight: 700;
			white-space: nowrap; // "t1 t2 t3" / "elective" never wrap to a 2nd line
		}

		// when it last ran, under the trimesters it runs in
		.d-stat-sub {
			font-size: 1.05rem;
			color: var(--color-text-muted);
			white-space: nowrap;

			// "elective in computer science major" is longer than the tile
			&.wraps {
				white-space: normal;
				text-align: center;
				line-height: 1.3;
			}
		}
	}

	// the offered tile is a button: it opens when the course ran
	.d-stat-btn {
		font: inherit;
		color: inherit;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			transform 0.15s var(--spring);

		&:hover {
			border-color: var(--color-accent);
			transform: translateY(-1px);
		}

		.d-caret {
			display: inline-block;
			font-style: normal;
			transition: transform 0.26s var(--spring);
		}

		&.open {
			border-color: var(--color-accent);

			.d-caret {
				transform: rotate(180deg);
			}
		}
	}

	// when it ran: trimesters down, academic years across
	.d-runs {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 1rem 1.2rem;
		background: var(--color-bg-light);
		border: 1px solid var(--color-border-divider);
		border-radius: 6px;

		table {
			width: 100%;
			border-collapse: collapse;
			table-layout: fixed; // t1 t2 t3 get equal columns, tag or no tag
			font-size: 1.2rem;
		}

		col.years {
			width: 7.2rem;
		}

		caption {
			@include section-label;
			margin-bottom: 0.6rem;
			text-align: left;
		}

		th {
			font-weight: 600;
			color: var(--color-text-muted);
		}

		thead th {
			padding-bottom: 0.4rem;
			vertical-align: bottom;
			white-space: nowrap;
		}

		tbody th {
			padding: 0.4rem 0;
			font-size: 1.1rem;
			font-weight: 500;
			text-align: left;
			white-space: nowrap;
		}

		td {
			padding: 0.3rem 0;
			text-align: center;
		}

		// the trimester the course sits in on your plan, down its column
		thead th.mine {
			color: var(--color-accent);
		}

		td.mine {
			background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		}

		// and the very term, when it's one on record
		td.at .d-run {
			box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 45%, transparent);
		}
	}

	.d-runs-tag {
		display: block;
		width: fit-content;
		margin: 0.2rem auto 0;
		padding: 0 0.5rem;
		font-size: 0.95rem;
		font-weight: 650;
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		border-radius: 999px;
	}

	// one term: filled when it ran, an empty ring when it didn't, dotted when
	// there's no timetable for that term
	.d-run {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		vertical-align: middle;
		border-radius: 50%;
		border: 1.5px solid var(--color-text-muted);

		&[data-state='ran'] {
			background: var(--color-text);
			border-color: var(--color-text);
		}

		&[data-state='none'] {
			border-style: dotted;
			opacity: 0.6;
		}
	}

	.d-runs-say {
		margin: 0;
		font-size: 1.2rem;
		color: var(--color-text);
	}

	.d-runs-key {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.6rem;
		margin: 0;
		font-size: 1.1rem;
		color: var(--color-text-muted);
	}

	.d-runs-go {
		align-self: flex-start;
		padding: 0;
		font: inherit;
		font-size: 1.2rem;
		color: var(--color-accent);
		background: none;
		border: 0;
		cursor: pointer;

		&:hover {
			text-decoration: underline;
			text-underline-offset: 0.2em;
		}
	}

	// SMS-bar: two flush segments in one tray, with a little retro depth, a
	// beveled tray, a lit groove between, and a recessed field
	.d-grade {
		display: flex;
		align-items: stretch;
		overflow: hidden;
		min-height: 3.6rem;
		background: linear-gradient(
			to bottom,
			var(--color-bg-card-start) 0%,
			var(--color-bg-card-end) 100%
		);
		border: 1px solid var(--color-border-card);
		border-radius: 9px;
		box-shadow: var(--shadow-inset);

		// the label segment, flush to the left edge
		span {
			flex-shrink: 0;
			display: flex;
			align-items: center;
			padding: 0 1.1rem;
			font-size: 1.05rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			color: var(--color-text-muted);
			// beveled groove: a shade then a lit edge
			border-right: 1px solid var(--color-border-card);
			box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.55);
		}

		// the recessed field, filling the rest
		select {
			flex: 1;
			min-width: 0;
			padding: 0 0.9rem;
			font-size: 1.35rem;
			font-weight: 600;
			color: var(--color-text);
			background: var(--color-bg-light);
			border: none;
			box-shadow: var(--shadow-well);
			cursor: pointer;
		}
	}

	.d-audit {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 1.3rem;
		color: var(--color-text);
		cursor: pointer;

		input {
			@include tick(1.5rem);
		}
	}

	.d-no-audit {
		@include empty-text;
	}

	// "failed or not", a pair of radios under the audit tick
	.d-fail {
		display: flex;
		align-items: center;
		gap: 1.6rem;
		margin: 0;
		padding: 0;
		border: none;
		font-size: 1.3rem;

		legend {
			float: left;
			padding: 0;
			margin-right: 1.2rem;
			color: var(--color-text-muted);
		}

		label {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			cursor: pointer;
		}

		&:disabled {
			opacity: 0.5;
		}
	}

	.d-fail-note {
		margin: 0;
		font-size: 1.2rem;
		line-height: 1.45;
		color: var(--color-text-muted);
	}

	.d-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.d-chip {
		display: inline-flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.5rem 1rem;
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--color-text);
		background-color: var(--color-bg-light);
		border: 1px solid var(--color-border-card);
		border-radius: 5px;
		text-align: left;
		cursor: pointer;
		@include glossy;
		// keep the lit face, drop only the outer shadow
		box-shadow: var(--shadow-inset);
		&:hover {
			box-shadow: var(--shadow-inset-hover);
		}

		// where the prerequisite stands, in words, with colour as a second cue
		.d-chip-status {
			font-size: 1.1rem;
			font-weight: 500;
			color: var(--color-text-muted);
		}

		&[data-status='ok'] .d-chip-status,
		&[data-status='done'] .d-chip-status {
			color: var(--color-hint-good-deep);
		}

		// taken already: settled, so it steps back a little
		&[data-status='done'] {
			opacity: 0.8;
		}

		&[data-status='late'] {
			border-color: var(--color-danger);

			.d-chip-status {
				color: var(--color-danger);
				font-weight: 600;
			}
		}

		&[data-status='missing'] .d-chip-status {
			color: color-mix(in srgb, var(--color-hint-caution-deep) 65%, var(--color-text));
		}
	}

	// a prerequisite chip, and beside a missing one, where it would fit
	.d-prereq {
		display: inline-flex;
		align-items: stretch;
		gap: 0.4rem;
		max-width: 100%;
	}

	// dashed like the board's suggested courses: something you could add
	.d-add {
		flex: none;
		padding: 0 0.9rem;
		font: inherit;
		font-size: 1.2rem;
		font-weight: 700;
		white-space: nowrap;
		color: var(--color-accent);
		background: none;
		border: 1px dashed color-mix(in srgb, var(--color-accent) 60%, transparent);
		border-radius: 5px;
		cursor: pointer;
		font-variant-numeric: tabular-nums;

		&:hover {
			border-style: solid;
			background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		}
	}

	.d-desc {
		font-size: 1.3rem;
		line-height: 1.55;
		padding: 1rem 1.2rem;
		background: var(--color-bg-light);
		border: 1px solid var(--color-border-divider);
		border-radius: 4px;

		.folded {
			display: -webkit-box;
			-webkit-line-clamp: 5;
			line-clamp: 5;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
	}

	.d-more {
		margin-top: 0.4rem;
		padding: 0;
		font: inherit;
		color: var(--color-accent);
		background: none;
		border: 0;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.2em;

		&:hover {
			color: var(--color-text);
		}
	}
	// by finger (a tablet's slid-in details too): the close and placing
	// controls a fingertip tall
	@include touch {
		.close {
			width: 4.4rem;
			height: 4.4rem;
			font-size: 2.6rem;
		}
		.d-disclosure summary,
		.d-place-go,
		.d-place-remove,
		.d-place-row select {
			min-height: 4.4rem;
		}
		.d-more {
			padding-top: 1rem;
			padding-bottom: 1rem;
		}
	}
	@include mobile {
		.col-header {
			position: sticky;
			top: 0;
			z-index: 2;
			flex-shrink: 0;
			background: var(--color-bg-sidebar);
			padding: 0.8rem 1.8rem;
		}
		.close {
			width: 4.4rem;
			height: 4.4rem;
			font-size: 2.6rem;
		}
		.details {
			padding: 1.8rem;
			gap: 1.6rem;
		}
		.d-head .d-title {
			font-size: 2.4rem;
			line-height: 1.3;
		}
		.d-desc,
		.d-place-where,
		.d-audit {
			font-size: 1.5rem;
		}
		.d-place-row {
			flex-wrap: wrap;
		}
		.d-place-row select {
			flex: 1 0 100%;
			width: 100%;
		}
		.d-place-go {
			flex: 1;
		}
		.d-place-remove {
			padding: 0.8rem 1.6rem;
		}
		.d-more {
			padding-top: 1rem;
			padding-bottom: 1rem;
		}
	}
</style>

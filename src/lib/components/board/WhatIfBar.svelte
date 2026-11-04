<script lang="ts">
	import { usePlan } from '$lib/planner/context';
	import { fade } from 'svelte/transition';
	// The what-if view's bar: try a change to the degree from where you are,
	// and see what it means before anything on the plan moves. Built for the
	// student rescheduling mid-degree (a third-year double major swapping
	// environmental studies for chemistry, someone back from a break joining
	// a later batch): what they've taken that still counts, what they've
	// planned that wouldn't, what the new degree still needs and where it
	// could go, and whether it all still fits in time.
	import { programmesFor } from '$lib/planner/plan.svelte';
	import {
		keepPicksDistinct,
		optionLabel,
		pickOptions,
		ROLE_LABEL,
		ROLES_OF,
		type PickRole as Role
	} from '$lib/planner/picks';
	import type { StructureKind } from '$lib/types';
	import { STUDENT_BATCHES, byCode, creditCeilingFor, subjectById } from '$lib/curriculum/data';
	import type { Verdict } from '$lib/planner/boardViews';

	let { verdict }: { verdict: Verdict | null } = $props();
	const plan = usePlan();

	let tried = $derived(plan.whatIf!);

	// ── the degree as roles: change one, drop one, add one ──
	// which degree a set of roles is; null for one Krea doesn't offer
	// (a double major with a minor)
	function structureOf(roles: Set<Role>): StructureKind | null {
		if (roles.has('major2')) return roles.has('minor') || roles.has('conc') ? null : 'double-major';
		if (roles.has('minor') && roles.has('conc')) return 'major-minor-conc';
		if (roles.has('minor')) return 'major-minor';
		if (roles.has('conc')) return 'major-conc';
		return 'single-major';
	}
	let roles = $derived(ROLES_OF[tried.structure]);
	let mine = $derived(ROLES_OF[plan.structure]);
	let dropped = $derived(mine.filter((r) => !roles.includes(r)));
	const canAdd = (r: Role) => !roles.includes(r) && structureOf(new Set([...roles, r])) !== null;
	function drop(r: Role) {
		const next = new Set(roles);
		next.delete(r);
		tried.structure = structureOf(next)!;
		keepDistinct();
	}
	function add(r: Role) {
		const next = structureOf(new Set([...roles, r]));
		if (!next) return;
		tried.structure = next;
		// a role coming back starts on what the plan has for it, if anything
		if (mine.includes(r)) tried.picks[r] = plan.picks[r];
		keepDistinct();
	}

	// the sidebar's rules (planner/picks.ts): an earlier role's subject shows
	// disabled in a later role's list, and a change that makes two collide
	// moves the later one along
	const keepDistinct = () => keepPicksDistinct(tried.structure, tried.picks, tried.batch);
	const changedRole = (r: Role) => !mine.includes(r) || plan.picks[r] !== tried.picks[r];

	let changed = $derived(
		tried.structure !== plan.structure ||
			tried.fourYear !== plan.fourYear ||
			tried.batch !== plan.batchStartYear ||
			JSON.stringify(programmesFor(tried.structure, tried.picks)) !== JSON.stringify(plan.programmes)
	);

	// ── you are here ──
	let guessed = $derived(plan.now === null);
	function setHere(year: number, trim: number) {
		plan.now = { year, trim: trim as 1 | 2 | 3 };
	}

	// ── the verdict, in words ──
	const label = (code: string) => plan.courseLabel(code);
	const cr = (codes: string[]) => codes.reduce((sum, c) => sum + byCode(c).credits, 0);
	let years = $derived(tried.fourYear ? 4 : 3);
	let ceiling = $derived(creditCeilingFor(tried.fourYear, tried.structure === 'double-major'));
	let unplaced = $derived(verdict ? verdict.needed.filter((n) => !n.at) : []);
	let addable = $derived(
		verdict ? verdict.needed.flatMap((n) => (n.at ? [{ code: n.code, year: n.at.year, trim: n.at.trim }] : [])) : []
	);
	let showAll = $state(false);
	const FEW = 6;

	// lights the courses a line is about on the grid while it's pointed at
	const light = (codes: string[]) => (plan.highlight = codes);
	const unlight = () => (plan.highlight = []);
</script>

<p class="vs-lead">
	<b>what-if</b> try a change to your degree from where you are. The grid reads as if it were yours; nothing on your
	plan changes unless you press <b>use this</b>.
</p>

<div class="wi-rows">
	<div class="wi-here">
		<span class="wi-k">you are here</span>
		<select
			aria-label="year you're in"
			value={plan.here.year}
			onchange={(e) => setHere(Number(e.currentTarget.value), plan.here.trim)}
		>
			{#each plan.years as y (y)}<option value={y}>year {y}</option>{/each}
		</select>
		<select
			aria-label="trimester you're in"
			value={plan.here.trim}
			onchange={(e) => setHere(plan.here.year, Number(e.currentTarget.value))}
		>
			{#each [1, 2, 3] as t (t)}<option value={t}>T{t}</option>{/each}
		</select>
		{#if plan.trimNaming === 'degree'}<b class="wi-term" transition:fade={{ duration: 180 }}
				>{plan.trimName(plan.here.year, plan.here.trim)}</b
			>{/if}
		{#if guessed}
			<span class="wi-note">guessed from your batch and today's date; change it if it's wrong</span>
		{:else}
			<button class="wi-link" onclick={() => (plan.now = null)}>use the guess</button>
		{/if}
	</div>

	<div class="wi-degree">
		<span class="wi-k">your degree</span>
		<ul>
			{#each roles as r (r)}
				<li class:changed={changedRole(r)}>
					<span class="wi-role">{ROLE_LABEL[r]}</span>
					<select aria-label={ROLE_LABEL[r]} bind:value={tried.picks[r]} onchange={keepDistinct}>
						{#each pickOptions(tried.structure, tried.picks, r, tried.batch) as o (o.subject.id)}<option
								value={o.subject.id}
								disabled={!!o.heldAs}>{optionLabel(o)}</option
							>{/each}
					</select>
					{#if mine.includes(r) && plan.picks[r] !== tried.picks[r]}
						<span class="wi-was">was {subjectById(plan.picks[r]).label}</span>
					{:else if !mine.includes(r)}
						<span class="wi-was">new</span>
					{/if}
					{#if r !== 'major1'}
						<button
							class="wi-x"
							aria-label="drop the {ROLE_LABEL[r]}"
							title="drop the {ROLE_LABEL[r]}"
							onclick={() => drop(r)}>×</button
						>
					{/if}
				</li>
			{/each}
			{#each dropped as r (r)}
				<li class="gone">
					<span class="wi-role">{ROLE_LABEL[r]}</span>
					<s>{subjectById(plan.picks[r]).label}</s>
					<button class="wi-link" onclick={() => add(r)}>keep it</button>
				</li>
			{/each}
		</ul>
		<div class="wi-adds">
			{#each ['major2', 'minor', 'conc'] as Role[] as r (r)}
				{#if canAdd(r) && !dropped.includes(r)}
					<button class="wi-link" onclick={() => add(r)}>+ {ROLE_LABEL[r]}</button>
				{/if}
			{/each}
			<label class="wi-inline"
				>track
				<select bind:value={tried.fourYear}>
					<option value={true}>4-year</option>
					<option value={false}>3-year</option>
				</select>
			</label>
			<label class="wi-inline" title="rejoining after a break can mean finishing with a later batch">
				batch
				<select bind:value={tried.batch}>
					{#each STUDENT_BATCHES as b (b)}
						<option value={b}>{b}-{String(b + (tried.fourYear ? 4 : 3)).slice(-2)}</option>
					{/each}
				</select>
			</label>
		</div>
	</div>
</div>

{#if changed && verdict}
	{@const v = verdict}
	<div class="wi-verdict">
		<p class="wi-big" class:ok={v.onTime} class:late={!v.onTime}>
			{#if v.onTime}
				✓ fits by the end of year {years}
			{:else if !unplaced.length && v.finish}
				needs until year {v.finish.year} T{v.finish.trim}{#if v.finish.year <= v.limitYears}: allowed, a {years}-year
					degree has up to {v.limitYears} years{/if}
			{:else}
				doesn't fit on the grid: {unplaced.length} course{unplaced.length === 1 ? ' has' : 's have'} no trimester left
			{/if}
		</p>
		{#if v.ifDropped?.onTime}
			<p class="wi-tip" onmouseenter={() => light(v.ahead.stops)} onmouseleave={unlight}>
				it fits by year {years} if you drop the {v.ahead.stops.length} planned course{v.ahead.stops.length === 1
					? ''
					: 's'} that would stop counting
			</p>
		{/if}

		<div class="wi-cols">
			<section>
				<h4>already taken <span>to year {v.here.year} T{v.here.trim}</span></h4>
				<p onmouseenter={() => light(v.taken.counts)} onmouseleave={unlight}>
					<b>{v.taken.counts.length}</b> still count ({cr(v.taken.counts)} cr)
				</p>
				<p onmouseenter={() => light(v.taken.stops)} onmouseleave={unlight} class:bad={v.taken.stops.length}>
					<b>{v.taken.stops.length}</b> no longer count ({cr(v.taken.stops)} cr){#if v.taken.stops.length}, they still
						count toward your total{/if}
				</p>
			</section>
			<section>
				<h4>planned ahead</h4>
				<p onmouseenter={() => light(v.ahead.stops)} onmouseleave={unlight} class:bad={v.ahead.stops.length}>
					<b>{v.ahead.stops.length}</b> would stop counting ({cr(v.ahead.stops)} cr)
				</p>
				<p onmouseenter={() => light(v.ahead.starts)} onmouseleave={unlight}>
					<b>{v.ahead.starts.length}</b> would start counting ({cr(v.ahead.starts)} cr)
				</p>
			</section>
			<section class="wi-need">
				<h4>still needed <span>{v.needed.length}</span></h4>
				{#if v.needed.length}
					<ul>
						{#each showAll ? v.needed : v.needed.slice(0, FEW) as n (n.code)}
							<li>
								<button class="wi-course" onclick={() => plan.select(n.code)}>{label(n.code)}</button>
								{#if n.why === 'prerequisite' && n.for}<span class="wi-why">first, for {label(n.for)}</span>{/if}
								<span class="wi-at" class:bad={!n.at}>{n.at ? `year ${n.at.year} T${n.at.trim}` : 'no room'}</span>
							</li>
						{/each}
					</ul>
					{#if v.needed.length > FEW}
						<button class="wi-link" onclick={() => (showAll = !showAll)}
							>{showAll ? 'show fewer' : `and ${v.needed.length - FEW} more`}</button
						>
					{/if}
				{:else}
					<p>nothing: every course it requires is on your plan</p>
				{/if}
			</section>
		</div>

		<p class="wi-total">
			needs {plan.whatIfTotal} cr in all (yours: {plan.degreeTotal}) · with what it still needs, your plan comes to
			{v.total} cr{#if v.total > ceiling}<span class="bad">, over the {ceiling}-credit limit</span>{/if}
		</p>
	</div>
{:else}
	<p class="vs-now muted">change something above to see what it would mean</p>
{/if}

<div class="wi-acts">
	<button class="vs-use" disabled={!changed} onclick={() => plan.applyWhatIf()}>use this</button>
	{#if changed && addable.length}
		<button class="vs-use" onclick={() => plan.applyWhatIf(addable)}
			>use this and add the {addable.length} course{addable.length === 1 ? '' : 's'}</button
		>
	{/if}
	<button disabled={!changed} onclick={() => plan.startWhatIf()}>back to mine</button>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	p {
		margin: 0;
	}

	.vs-lead {
		color: var(--color-text-muted);

		> b:first-child {
			margin-right: 0.4rem;
			color: var(--color-text);
		}
	}

	.vs-now.muted {
		color: var(--color-text-muted);
	}

	.bad {
		color: var(--color-danger);
	}

	.wi-rows {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	// a row's small uppercase key, as the course panel's labels
	.wi-k {
		@include section-label;
		font-size: 1.05rem;
		min-width: 9.6rem;
	}

	.wi-here,
	.wi-degree {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.6rem 1rem;
	}

	.wi-note {
		font-size: 1.15rem;
		color: var(--color-text-muted);
	}

	.wi-term {
		font-size: 1.3rem;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
	}

	.wi-degree ul {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.wi-degree li {
		display: flex;
		align-items: center;
		gap: 0.8rem;

		&.changed select {
			border-color: var(--color-accent);
			box-shadow: 0 0 0 1px var(--color-accent);
		}

		&.gone {
			color: var(--color-text-muted);
		}
	}

	.wi-role {
		min-width: 9.6rem;
		font-size: 1.2rem;
		color: var(--color-text-muted);
	}

	.wi-was {
		font-size: 1.15rem;
		color: var(--color-accent);
	}

	.wi-adds {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 1.4rem;
		flex-basis: 100%;
		padding-left: 10.6rem;
	}

	.wi-inline {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.2rem;
		color: var(--color-text-muted);
	}

	select {
		padding: 0.45rem 0.8rem;
		font: inherit;
		font-size: 1.3rem;
		color: var(--color-text);
		background: var(--color-bg-light);
		border: 1px solid var(--color-border-card);
		border-radius: 4px;
	}

	.wi-x {
		padding: 0 0.5rem;
		font: inherit;
		font-size: 1.5rem;
		line-height: 1;
		color: var(--color-text-muted);
		background: none;
		border: 0;
		cursor: pointer;

		&:hover {
			color: var(--color-danger);
		}
	}

	.wi-link {
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

	// ── the verdict ──
	.wi-verdict {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding-top: 1rem;
		border-top: 1px dotted var(--color-border-light);
	}

	.wi-big {
		font-size: 1.5rem;
		font-weight: 700;

		&.ok {
			color: var(--color-accent);
		}

		&.late {
			color: var(--color-danger);
		}
	}

	.wi-tip {
		font-size: 1.25rem;
		color: var(--color-text);
	}

	.wi-cols {
		display: grid;
		grid-template-columns: 1fr 1fr 1.6fr;
		gap: 1.2rem 2rem;

		section {
			display: flex;
			flex-direction: column;
			gap: 0.3rem;
			min-width: 0;
		}

		h4 {
			margin: 0 0 0.2rem;
			@include section-label;
			font-size: 1.05rem;

			span {
				margin-left: 0.4rem;
				text-transform: none;
				letter-spacing: 0;
				font-weight: 400;
			}
		}

		p {
			font-size: 1.25rem;
			color: var(--color-text);
		}
	}

	.wi-need ul {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.wi-need li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.2rem 0.8rem;
		font-size: 1.25rem;
	}

	.wi-course {
		padding: 0;
		font: inherit;
		font-weight: 650;
		color: var(--color-text);
		background: none;
		border: 0;
		cursor: pointer;

		&:hover {
			color: var(--color-accent);
		}
	}

	.wi-why {
		font-size: 1.15rem;
		color: var(--color-text-muted);
	}

	.wi-at {
		margin-left: auto;
		font-size: 1.15rem;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.wi-total {
		font-size: 1.2rem;
		color: var(--color-text-muted);
	}

	.wi-acts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;

		button {
			padding: 0.5rem 1rem;
			font: inherit;
			font-size: 1.3rem;
			color: var(--color-text);
			background: var(--color-bg-light);
			border: 1px solid var(--color-border-card);
			border-radius: 4px;
			cursor: pointer;

			&:disabled {
				opacity: 0.5;
				cursor: default;
			}
		}

		.vs-use:not(:disabled) {
			font-weight: 600;
			color: var(--color-on-accent);
			background: var(--color-accent);
			border-color: var(--color-accent);
		}
	}
</style>

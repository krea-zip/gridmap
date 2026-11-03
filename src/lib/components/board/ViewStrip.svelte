<script lang="ts">
	import { usePlan } from '$lib/planner/context';
	// The bar under the board's toolbar for whichever view is on: one line on
	// what the view shows, its key, and what it lets you do (try a programme,
	// pick a lecturer). Plan and grades have none; grades keeps its own
	// first-visit note.
	import { RECORDED_TERMS } from '$lib/curriculum/data';
	import { runRecord, type Chain, type Verdict } from '$lib/planner/boardViews';
	import WhatIfBar from './WhatIfBar.svelte';

	let { chain, verdict }: { chain: Chain | null; verdict: Verdict | null } = $props();
	const plan = usePlan();

	const years = (terms: string[]) => terms.map((t) => `20${t.split('_')[0]}`).join(', ') || 'none';

	// ── will it run? ──
	let neverRan = $derived(
		plan.view === 'runs' ? plan.placed.filter((p) => runRecord(p.code, p.trim).kind === 'never').map((p) => p.code) : []
	);

	// "lights" the courses a line is about, as a hint does, while pointed at
	const light = (codes: string[]) => (plan.highlight = codes);
	const unlight = () => (plan.highlight = []);
</script>

{#if plan.view === 'runs'}
	<section class="view-strip" aria-label="will it run? view">
		<p class="vs-lead">
			<b>will it run?</b> each course is marked by how often it actually ran in its trimester, from the timetables on
			record: T1 {years(RECORDED_TERMS[1])} · T2 {years(RECORDED_TERMS[2])} · T3 {years(RECORDED_TERMS[3])}. Hover a
			mark for the terms.
		</p>
		<ul class="vs-key">
			<li><i class="run-mark" data-kind="always"></i>ran every time</li>
			<li><i class="run-mark" data-kind="sometimes"></i>ran some years</li>
			<li><i class="run-mark" data-kind="never"></i>never ran in that trimester</li>
			<li><i class="run-mark" data-kind="unknown"></i>no record yet</li>
		</ul>
		{#if neverRan.length}
			<p class="vs-warn" onmouseenter={() => light(neverRan)} onmouseleave={unlight}>
				{neverRan.length} course{neverRan.length === 1 ? '' : 's'} on your plan never ran in {neverRan.length === 1
					? 'its'
					: 'their'}
				trimester: {neverRan.map((c) => plan.courseLabel(c)).join(', ')}
			</p>
		{/if}
	</section>
{:else if plan.view === 'prereqs'}
	<section class="view-strip" aria-label="prerequisites view">
		<p class="vs-lead">
			<b>prerequisites</b> click a course on the grid: arrows run from what you take first to what needs it, all the way back
			and all the way on. Click anywhere else to clear.
		</p>
		<ul class="vs-key">
			<li><i class="line-mark"></i>in order</li>
			<li><i class="line-mark late"></i>too late: same trimester or after</li>
		</ul>
		{#if chain}
			{@const late = chain.edges.filter((e) => e.late).length}
			<p class="vs-now">
				<b>{plan.courseLabel(chain.root)}</b>: needs {chain.before.length} on your plan · leads to {chain.after
					.length}{#if late}{' · '}<span class="vs-bad">{late} in the wrong order</span>{/if}
			</p>
			{#if chain.missing.length}
				<p class="vs-warn">
					not on your plan: {chain.missing
						.map((m) => `${plan.courseLabel(m.code)} (for ${plan.courseLabel(m.neededBy)})`)
						.join(', ')}
				</p>
			{/if}
		{:else}
			<p class="vs-now muted">no course picked</p>
		{/if}
	</section>
{:else if plan.view === 'whatif' && plan.whatIf}
	<section class="view-strip" aria-label="what-if view">
		<WhatIfBar {verdict} />
	</section>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.view-strip {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		margin: 1.6rem var(--board-gutter, 3.2rem) 0;
		padding: 1.2rem 1.6rem;
		font-size: 1.3rem;
		line-height: 1.5;
		background: color-mix(in srgb, var(--color-accent) 7%, var(--color-bg-light));
		border: 1px solid var(--color-border-card);
		border-radius: 6px;

		p {
			margin: 0;
		}

		b {
			color: var(--color-text);
		}
	}

	.vs-lead {
		color: var(--color-text-muted);

		> b:first-child {
			margin-right: 0.4rem;
		}
	}

	.vs-now {
		color: var(--color-text);

		&.muted {
			color: var(--color-text-muted);
		}
	}

	.vs-bad {
		color: var(--color-danger);
	}

	.vs-warn {
		color: var(--color-danger);
	}

	.vs-key {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1.8rem;
		margin: 0;
		padding: 0;
		list-style: none;

		li {
			display: flex;
			align-items: center;
			gap: 0.6rem;
		}
	}

	// the key's marks are the chips' marks (OverviewGrid draws the same ones)
	.run-mark {
		@include run-mark;
	}

	.line-mark {
		display: inline-block;
		width: 2.4rem;
		border-top: 2px solid var(--color-accent);

		&.late {
			border-top: 2px dashed var(--color-danger);
		}
	}
</style>

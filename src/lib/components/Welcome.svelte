<script lang="ts">
	// the first thing a new visitor sees: their batch and degree. the grid
	// behind starts empty and fills in as they answer, the foundation core
	// with the batch, then each programme's courses as it's picked, so it
	// builds up instead of showing someone else's example and reshuffling.
	// every answer is also in the sidebar; nothing here is final.
	import { onMount } from 'svelte';
	import { usePlan } from '$lib/planner/context';
	import { viewport } from '$lib/planner/viewport.svelte';
	import { optionLabel, type PickRole } from '$lib/planner/picks';
	import type { ProgrammeRole } from '$lib/types';
	import Modal from './Modal.svelte';

	let { ondone }: { ondone: () => void } = $props();
	const plan = usePlan();
	const BATCHES = [2022, 2023, 2024, 2025, 2026];

	// which questions have been answered; the plan holds defaults for the
	// rest, which mustn't show as if the student had chosen them
	const answered = $state({ batch: false, degree: false, major1: false, major2: false, minor: false, conc: false });

	onMount(() => {
		plan.placements = {};
		plan.welcoming = true;
		return () => (plan.welcoming = false);
	});

	const has = (structure: string, part: string) => answered.degree && structure.includes(part);
	const asked = $derived({
		major2: has(plan.structure, 'double'),
		minor: has(plan.structure, 'minor'),
		conc: has(plan.structure, 'conc')
	});
	const ready = $derived(
		answered.batch &&
			answered.degree &&
			answered.major1 &&
			(!asked.major2 || answered.major2) &&
			(!asked.minor || answered.minor) &&
			(!asked.conc || answered.conc)
	);

	// the programmes answered so far, in the order the plan lists them
	function chosen() {
		let majors = 0;
		const ok: Record<ProgrammeRole, () => boolean> = {
			major: () => (majors++ === 0 ? answered.major1 : asked.major2 && answered.major2),
			minor: () => asked.minor && answered.minor,
			concentration: () => asked.conc && answered.conc
		};
		return plan.programmes.filter((p) => ok[p.role]());
	}

	function answer(key: keyof typeof answered) {
		answered[key] = true;
		plan.ensureDistinctPicks();
		if (plan.yearCount < plan.minYears) plan.yearCount = plan.minYears;
		if (answered.batch) plan.growRecommended(chosen());
	}
</script>

<!-- an answered role holds its subject; one still unanswered holds nothing yet -->
{#snippet pick(role: PickRole, label: string)}
	<label class="field">
		<span>{label}</span>
		<select
			value={answered[role] ? plan.picks[role] : ''}
			onchange={(e) => ((plan.picks[role] = e.currentTarget.value), answer(role))}
		>
			{#if !answered[role]}<option value="" disabled>choose…</option>{/if}
			{#each plan.pickOptions(role, (r) => answered[r]) as o (o.subject.id)}
				<option value={o.subject.id} disabled={!!o.heldAs}>{optionLabel(o)}</option>
			{/each}
		</select>
	</label>
{/snippet}

<Modal title="welcome to kcal" width="54rem" onclose={ondone}>
	<p class="lede">
		plan your whole Krea degree, trimester by trimester, what's required, what's left, and where each course fits.
	</p>

	<ol class="steps">
		<li>
			<span class="n" aria-hidden="true">1</span>
			<div class="q">
				<span class="ask">when did you start?</span>
				<div class="fields">
					<label class="field">
						<span>batch</span>
						<select
							value={answered.batch ? plan.batchStartYear : ''}
							onchange={(e) => ((plan.batchStartYear = Number(e.currentTarget.value)), answer('batch'))}
						>
							{#if !answered.batch}<option value="" disabled>choose…</option>{/if}
							{#each BATCHES as year (year)}
								<option value={year}>{year}-{String(year + (plan.fourYear ? 4 : 3)).slice(-2)}</option>
							{/each}
						</select>
					</label>
					<label class="check">
						<input
							type="checkbox"
							class="tick"
							bind:checked={plan.fourYear}
							onchange={() => answered.batch && answer('batch')}
						/>
						4-year degree
					</label>
				</div>
			</div>
		</li>

		<li>
			<span class="n" aria-hidden="true">2</span>
			<div class="q">
				<span class="ask">what are you studying?</span>
				<div class="fields">
					<label class="field">
						<span>degree</span>
						<select
							value={answered.degree ? plan.structure : ''}
							onchange={(e) => ((plan.structure = e.currentTarget.value as typeof plan.structure), answer('degree'))}
						>
							{#if !answered.degree}<option value="" disabled>choose…</option>{/if}
							<option value="single-major">single major</option>
							<option value="double-major">double major</option>
							<option value="major-minor">major + minor</option>
							<option value="major-conc">major + concentration</option>
							<option value="major-minor-conc">major + minor + concentration</option>
						</select>
					</label>
					{@render pick('major1', 'major')}
					{#if asked.major2}{@render pick('major2', 'second major')}{/if}
					{#if asked.minor}{@render pick('minor', 'minor')}{/if}
					{#if asked.conc}{@render pick('conc', 'concentration')}{/if}
				</div>
			</div>
		</li>
	</ol>

	<p class="note">
		your department's suggested path fills in behind this as you answer, move, add or drop anything. your plan saves in
		this browser, and you can change all of this later in {viewport.desktop ? 'the sidebar' : 'your degree'}.
	</p>

	<div class="actions">
		<button class="go" disabled={!ready} onclick={ondone}>build my plan <span aria-hidden="true">→</span></button>
	</div>
</Modal>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.lede {
		font-size: 1.5rem;
		line-height: 1.5;
		color: var(--color-text);
	}

	// each question on its own dotted rule, numbered on a small lit key
	.steps {
		margin: 1.6rem 0 0;
		padding: 0;
		list-style: none;

		li {
			display: flex;
			gap: 1.2rem;
			padding: 1.4rem 0;
			border-top: 1px dotted var(--color-border-light);
		}
	}

	.n {
		flex: none;
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-on-accent);
		background-color: var(--color-accent);
		border: 1px solid var(--color-control-deep);
		border-radius: 50%;
		@include glossy-accent;
	}

	.q {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		min-width: 0;
		flex: 1;
	}

	.ask {
		font-size: var(--text-body);
		font-weight: 700;
		line-height: 2.4rem; // centred on its number
	}

	.fields {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 1rem 1.6rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 16rem;

		span {
			font-size: 1.15rem;
			color: var(--color-text-muted);
		}
	}

	// flat dropdowns, the sidebar's own
	select {
		width: 100%;
		font-size: var(--text-body);
		color: var(--color-text);
		padding: 0.5rem 0.6rem;
		background-color: var(--color-bg-light);
		border: 1px solid var(--color-border-card);
		border-radius: 4px;
		box-shadow: var(--shadow-well);
		cursor: pointer;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding-bottom: 0.6rem;
		font-size: var(--text-body);
		cursor: pointer;
	}

	.tick {
		@include tick(1.6rem);
	}

	.note {
		padding-top: 1.4rem;
		font-size: var(--text-body);
		line-height: 1.5;
		color: var(--color-text-muted);
		border-top: 1px dotted var(--color-border-light);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 1.6rem;
	}

	.go {
		padding: 0.7rem 1.8rem;
		font: inherit;
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--color-on-accent);
		background-color: var(--color-accent);
		border: 1px solid var(--color-control-deep);
		border-radius: 6px;
		cursor: pointer;
		@include glossy-accent;

		&:hover {
			filter: brightness(1.07);
		}

		// until every question asked has an answer
		&:disabled {
			opacity: 0.45;
			cursor: default;
			filter: none;
		}
	}
</style>

<script lang="ts">
	// where the degree stands: one plain total, whether the plan has issues,
	// and a bar per programme that opens onto what's still owed
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { CORE_CREDITS, byCode, isCore } from '$lib/curriculum/data';
	import { usePlan } from '$lib/planner/context';
	import { reducedMotion } from '$lib/ui/transitions';
	import Progress from './Progress.svelte';

	const plan = usePlan();
	let creditsLeft = $derived(Math.max(0, plan.creditMinimum - plan.totalPlacedCredits));
	let coreDone = $derived(
		plan.placed.filter((p) => isCore(p.code)).reduce((sum, p) => sum + byCode(p.code).credits, 0)
	);
	let programmeCreditsMet = $derived(plan.stats.every((s) => s.creditsLeft === 0));

	// one programme's breakdown open at a time
	let openProg = $state<string | null>(null);
	// the same count as the hints' ▲ and ■ badges, so the two always agree
	let problems = $derived(plan.hints.filter((h) => h.kind === 'warn' || h.kind === 'caution').length);

	const tally = (done: number, needed: number) => `${done >= needed ? '✓ ' : ''}${done}/${needed} cr`;
	const toHints = () =>
		document
			.querySelector('[data-tour="hints"]')
			?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
</script>

<div class="section">
	<h3>information</h3>

	<div class="stats">
		<div class="total">
			<span>planned credits</span>
			<b>{plan.totalPlacedCredits}<em>/</em>{plan.creditTarget} cr</b>
		</div>

		<div class="degree-status" class:short={creditsLeft > 0} aria-live="polite">
			{#if creditsLeft > 0}
				<strong>{creditsLeft} more credits to reach {plan.creditMinimum}</strong>
				{#if creditsLeft % 4 === 0}
					<span>That’s {creditsLeft / 4} more 4-credit {creditsLeft === 4 ? 'course' : 'courses'}.</span>
				{/if}
				<p>
					{#if programmeCreditsMet && coreDone >= CORE_CREDITS}
						Your programme and KCCS credit totals are met, but the degree minimum is not.
						{#if plan.structure === 'single-major'}
							Choose additional courses outside your major; a minor or concentration is optional.
						{:else}
							Add eligible electives to make up the total.
						{/if}
					{:else}
						Complete your KCCS and programme requirements, then use additional courses to reach the degree minimum.
					{/if}
				</p>
			{:else}
				<strong>Degree credit minimum reached</strong>
				<span>Check the requirements below and any planning issues. Planned credits still need to be earned.</span>
			{/if}
		</div>
		<div class="row foundation"><span>KCCS credits planned</span><b>{tally(coreDone, CORE_CREDITS)}</b></div>

		<details class="credit-breakdown">
			<summary>How the {plan.creditTarget} credits add up</summary>
			<div class="row"><span>KCCS</span><b>{CORE_CREDITS} cr</b></div>
			{#each plan.stats as s (s.role + s.subject)}
				<div class="row"><span>{s.label} {s.subject === 'open' ? '' : s.role}</span><b>{s.totalCredits} cr</b></div>
			{/each}
			{#if plan.creditTarget > plan.degreeTotal}
				<div class="row"><span>Additional courses</span><b>{plan.creditTarget - plan.degreeTotal} cr</b></div>
				<p>
					These are in addition to your programme electives.
					{#if plan.structure === 'single-major'}
						A minor or concentration is optional. Without one, take extra courses outside your major.
					{/if}
				</p>
			{/if}
			<p>
				Cross-listed credits count once toward the degree total. Sharing them between programmes can mean you need more
				courses to reach {plan.creditTarget}.
			</p>
			<p>
				{Math.max(0, plan.creditTarget - plan.totalPlacedCredits)} credits still to plan · ceiling {plan.creditCeiling} cr
			</p>
		</details>
		<!-- planned, not earned: what stands between this plan and graduating -->
		<button class="readiness" class:clear={!problems} onclick={toHints}>
			{problems ? `${problems} planning issue${problems === 1 ? '' : 's'} to sort out ↓` : '✓ no planning issues'}
		</button>

		{#each plan.stats as s (s.role + s.subject)}
			{@const key = s.role + s.subject}
			{@const open = openProg === key}
			{@const electives = s.subject === 'open' ? 'free courses' : 'electives'}
			<div class="prog" class:open>
				<button class="toggle" aria-expanded={open} onclick={() => (openProg = open ? null : key)}>
					<span class="name"
						><span>{s.label}</span><span class="muted">{s.role}<span class="chev" aria-hidden="true"></span></span
						></span
					>
					<!-- required and elective credits on one bar, split where one hands over -->
					<Progress
						required={{ done: s.requiredDone, needed: s.requiredNeeded }}
						elective={{ done: s.electiveDone, needed: s.electiveNeeded }}
						electiveLabel={electives}
						hue={plan.hueFor(s.subject)}
					/>
				</button>
				{#if open}
					<div class="detail" transition:slide={{ duration: reducedMotion() ? 0 : 210, easing: cubicOut }}>
						{#if s.requiredNeeded > 0}
							<div class="row"><span>required</span><b>{tally(s.requiredDone, s.requiredNeeded)}</b></div>
						{/if}
						{#if s.electiveNeeded > 0}
							<div class="row"><span>{electives}</span><b>{tally(s.electiveDone, s.electiveNeeded)}</b></div>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.section {
		@include rail-section;
	}

	.stats {
		padding: 0.6rem 1.6rem 1.4rem;
		font-size: var(--text-body);
		line-height: 1.5;
	}

	.total {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		font-weight: 700;

		b {
			font-variant-numeric: tabular-nums;
		}

		em {
			font-style: normal;
			font-weight: 400;
			color: var(--color-text-muted);
		}
	}

	.degree-status {
		margin-top: 0.8rem;
		padding: 0.8rem 1rem;
		border-left: 3px solid var(--color-border-light);
		background: var(--color-bg-light);
		font-size: 1.25rem;
		strong,
		span {
			display: block;
		}
		strong {
			color: var(--color-text);
		}
		span,
		p {
			color: var(--color-text-muted);
		}
		p {
			margin: 0.5rem 0 0;
		}
		&.short {
			border-left-color: var(--color-hint-warn-deep);
		}
	}
	.foundation {
		margin-top: 0.8rem;
		gap: 0.6rem;
		font-size: 1.25rem;
	}

	.credit-breakdown {
		margin-top: 0.5rem;
		font-size: 1.25rem;
		summary {
			cursor: pointer;
		}
		.row {
			gap: 0.8rem;
			margin-top: 0.4rem;
		}
		b {
			white-space: nowrap;
		}
		p {
			margin: 0.5rem 0;
			color: var(--color-text-muted);
		}
	}

	.readiness {
		display: block;
		margin-top: 0.2rem;
		padding: 0;
		font: inherit;
		font-size: 1.25rem;
		text-align: left;
		color: color-mix(in srgb, var(--color-hint-warn-deep) 70%, var(--color-text));
		background: none;
		border: 0;
		cursor: pointer;

		&:hover {
			text-decoration: underline;
			text-underline-offset: 0.2em;
		}

		&.clear {
			color: var(--color-hint-good-deep);
			cursor: default;
			text-decoration: none;
		}
	}

	.prog {
		margin-top: 1rem;
		padding-top: 0.8rem;
		border-top: 1px dotted var(--color-border-light);
	}

	.toggle {
		display: block;
		width: 100%;
		padding: 0;
		font: inherit;
		text-align: left;
		color: inherit;
		background: none;
		border: 0;
		cursor: pointer;
	}

	// subject on the left, its role pushed to the right edge
	.name {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.8rem;
		font-weight: 700;

		.muted {
			display: inline-flex;
			align-items: center;
			gap: 0.6rem;
		}

		.toggle:hover & > span:first-child {
			text-decoration: underline;
			text-underline-offset: 0.2em;
		}
	}

	.muted {
		font-weight: 400;
		color: var(--color-text-muted);
	}

	.chev {
		@include fold-chevron;
		margin: -0.2rem 0 0;
	}

	// under the bar: one line per part, done of needed. the courses still to
	// place are named in the hints, not twice here
	.detail {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding-top: 0.8rem;
		font-size: 1.25rem;
	}

	.row {
		display: flex;
		justify-content: space-between;
		color: var(--color-text-muted);

		b {
			font-weight: 600;
			color: var(--color-text);
			font-variant-numeric: tabular-nums;
		}
	}
</style>

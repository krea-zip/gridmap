<script lang="ts">
	// where the degree stands: one plain total, whether the plan has issues,
	// and a bar per programme that opens onto what's still owed
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { subjectById } from '$lib/data';
	import { usePlan } from '$lib/planner/context';
	import { reducedMotion } from '$lib/transitions';
	import Progress from './Progress.svelte';

	const plan = usePlan();

	// one programme's breakdown open at a time
	let openProg = $state<string | null>(null);
	// the same count as the hints' ▲ and ■ badges, so the two always agree
	let problems = $derived(plan.hints.filter((h) => h.kind === 'warn' || h.kind === 'caution').length);

	const left = (done: number, needed: number) => (done >= needed ? '✓ done' : `${needed - done} cr left`);
	const toHints = () =>
		document
			.querySelector('[data-tour="hints"]')
			?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
</script>

<div class="section">
	<h3>information</h3>

	<div class="stats">
		<div class="total">
			<span>total</span>
			<b>{plan.totalPlacedCredits}<em>/</em>{plan.creditTarget} cr</b>
		</div>
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
						hue={subjectById(s.subject).hue}
					/>
				</button>
				{#if open}
					<div class="detail" transition:slide={{ duration: reducedMotion() ? 0 : 210, easing: cubicOut }}>
						{#if s.requiredNeeded > 0}
							<div class="row"><span>required</span><b>{left(s.requiredDone, s.requiredNeeded)}</b></div>
							{#if s.requiredLeft.length}
								<div class="tags">
									{#each s.requiredLeft as code (code)}
										<button
											class="tag"
											data-type={plan.courseType(code)}
											style:--hue={plan.hueOf(code)}
											title="show {plan.courseLabel(code)}"
											onclick={() => plan.revealCourse(code)}>{plan.shownCode(code)}</button
										>
									{/each}
								</div>
							{/if}
						{/if}
						{#if s.electiveNeeded > 0}
							<div class="row"><span>{electives}</span><b>{left(s.electiveDone, s.electiveNeeded)}</b></div>
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

	// what's left, under the bar: one line per part, required courses by name
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

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.2rem;
	}

	.tag {
		@include course-tag;
		font-family: inherit;
		cursor: pointer;
	}

	// buttons here, so no edge: the fill alone says what kind of course
	.tags .tag {
		border: 0;
	}
</style>

<script lang="ts">
	import { usePlan } from '$lib/planner/context';
	// ─────────────────────────────────────────────
	// The recommended path, whole.
	//
	// It used to be a second plan you switched the board to, which meant modes:
	// two grids that looked identical, and no way to tell which one you were
	// editing. It isn't a plan, it is a DOCUMENT, the department's suggested
	// order, so it lives where the app's other documents live, in a panel you
	// open and close (see CreditRules). Nothing to switch back from, nothing
	// that can overwrite your work, and it shows your plan against it: what
	// you already have is quiet grey, ticked; what's missing is the only thing
	// in colour, so the eye goes straight to it.
	// ─────────────────────────────────────────────
	import { byCode, subjectById } from '$lib/curriculum/data';
	import type { TrimNum } from '$lib/types';
	import { termMonthsShort } from '$lib/planner/calendar';
	import Modal from '../Modal.svelte';

	let { onclose }: { onclose: () => void } = $props();
	const plan = usePlan();

	const at = (year: number, trim: TrimNum) => plan.recommended[`${year}-${trim}`] ?? [];
	let degree = $derived(
		plan.programmes.map((p) => `${subjectById(p.subject).label} ${p.role}`).join(' + ') +
			` · ${plan.fourYear ? 'four' : 'three'}-year`
	);
	let total = $derived(Object.values(plan.recommended).flat().length);

	// replacing the board throws away real work, so it asks twice, the same
	// guard "start over" uses, and it forgets it was asking if you walk away
	let confirming = $state(false);
	let timer: ReturnType<typeof setTimeout>;
	function useInstead() {
		if (!confirming) {
			confirming = true;
			timer = setTimeout(() => (confirming = false), 4000);
			return;
		}
		clearTimeout(timer);
		confirming = false;
		plan.useRecommended();
		onclose();
	}
</script>

<Modal title="suggested path" width="62rem" {onclose}>
	<p class="lead">
		{degree}, {total} courses in the order the department suggests. The ones in colour aren't on your plan yet; click one
		to add it.{#if plan.recommendedElectiveCredits}{' '}The dashed lines are the
			<b>{plan.recommendedElectiveCredits} elective credits</b> the degree leaves you to choose for yourself.{/if}
	</p>

	<div class="path" style="--cols: {plan.trims.length}">
		<div class="corner"></div>
		{#each plan.trims as t (t)}
			<div class="head">{plan.trimNaming === 'year' ? `t${t}` : termMonthsShort(t)}</div>
		{/each}

		{#each plan.years as y (y)}
			<div class="yhead">y{y}</div>
			{#each plan.trims as t (t)}
				{@const codes = at(y, t)}
				<div class="cell">
					{#each codes as code (code)}
						{@const have = plan.placedCodes.has(code)}
						<button
							class="rc"
							class:have
							data-type={plan.courseType(code)}
							style:--hue={plan.hueOf(code)}
							title={have
								? `${plan.shownCode(code)} ${byCode(code).title} is on your plan`
								: `add ${plan.shownCode(code)} ${byCode(code).title} to your plan`}
							onclick={() => (have ? (plan.selected = byCode(code)) : plan.acceptSuggestion(code))}
						>
							<span class="rc-mark" aria-hidden="true">{have ? '✓' : '+'}</span>
							<span class="rc-label"
								><b>{plan.shownCode(code)}</b>
								{byCode(code).title}</span
							>
						</button>
					{/each}

					<!-- the room the degree leaves you: credits the path doesn't
					     spend on required courses, which you fill with electives
					     of your own choosing -->
					{#if plan.electivesFor(y, t)}
						{@const n = plan.electivesFor(y, t)}
						<span class="elective">{n} elective{n === 1 ? '' : 's'}</span>
					{/if}

					{#if !codes.length && !plan.electivesFor(y, t)}
						<span class="none">–</span>
					{/if}
				</div>
			{/each}
		{/each}
	</div>

	<div class="foot">
		{#if plan.suggestionCount}
			<button
				class="take"
				onclick={() => {
					plan.acceptAllSuggestions();
					onclose();
				}}
			>
				add the {plan.suggestionCount} missing to my plan
			</button>
			<p class="note">your own courses stay exactly where they are.</p>
		{:else}
			<p class="note done">✓ every course on this path is already on your plan.</p>
		{/if}

		<!-- the other way to take it: throw your plan away and start from this
		     one. The only destructive action in the app that isn't "start over",
		     so it asks twice and says plainly what goes. -->
		<button class="replace" class:confirming onclick={useInstead}>
			{confirming ? 'yes, delete my plan and use this' : 'use this instead of my plan'}
		</button>
		{#if confirming}
			<p class="note danger">
				this deletes the {plan.placedCodes.size} courses on your board and replaces them with the path above.
			</p>
		{/if}
	</div>
</Modal>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.lead {
		margin-bottom: 1.4rem;
		font-size: 1.3rem;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	.path {
		display: grid;
		// minmax(0, …): a long title shortens with an ellipsis instead of
		// stretching its column off the panel
		grid-template-columns: 2.6rem repeat(var(--cols), minmax(0, 1fr));
		gap: 0.5rem;
	}

	.head {
		font-size: 1.2rem;
		text-align: center;
		color: var(--color-text-muted);
	}

	.yhead {
		align-self: center;
		font-size: 1.3rem;
		text-align: center;
		color: var(--color-text-muted);
	}

	.cell {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-height: 4rem;
		padding: 0.4rem;
		background: var(--color-grid-cell);
		border-radius: 6px;
	}

	// one line per course. on your plan already: grey text and a tick, no
	// fill, it needs nothing from you
	.rc {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
		padding: 0.3rem 0.5rem;
		font: inherit;
		font-size: 1.15rem;
		text-align: left;
		color: var(--color-text-muted);
		background: none;
		border: 1px solid transparent;
		border-radius: 4px;
		cursor: pointer;
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;

		.rc-mark {
			flex: none;
			font-weight: 700;
		}

		&.have .rc-mark {
			color: var(--color-hint-good-deep);
		}

		.rc-label {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;

			b {
				font-weight: 650;
			}
		}

		&.have:hover .rc-label {
			color: var(--color-text);
			text-decoration: underline;
			text-underline-offset: 0.2em;
		}

		// not on your plan: the one thing in colour, the board's own chip
		&:not(.have) {
			color: var(--color-text);
			@include course-type-fill(false);
			@include card-shine;

			&:hover {
				transform: translateY(-1px);
				@include card-shine-hover;
			}
		}
	}

	// not a course, the room the degree leaves open: one quiet dashed line a
	// trimester, with no action, there's nothing to add until you pick one
	.elective {
		padding: 0.25rem 0.5rem;
		font-size: 1.1rem;
		font-style: italic;
		text-align: center;
		color: var(--color-text-muted);
		border: 1px dashed color-mix(in srgb, var(--color-text-muted) 45%, transparent);
		border-radius: 4px;
	}

	.none {
		font-size: 1.1rem;
		color: var(--color-text-muted);
		opacity: 0.5;
	}

	.foot {
		margin-top: 1.6rem;
		padding-top: 1.4rem;
		text-align: center;
		border-top: 1px solid var(--color-border-divider);
	}

	.take {
		padding: 0.8rem 2rem;
		font: inherit;
		font-size: 1.35rem;
		font-weight: 600;
		color: var(--color-on-accent);
		background-color: var(--color-accent);
		border: 1px solid var(--color-control-deep);
		border-radius: 6px;
		cursor: pointer;
		@include glossy-accent;

		&:hover {
			filter: brightness(1.07);
		}
	}

	.note {
		margin-top: 0.6rem;
		font-size: 1.2rem;
		color: var(--color-text-muted);

		&.done {
			margin-top: 0;
		}

		&.danger {
			font-weight: 600;
			color: var(--color-danger);
		}
	}

	// deliberately quieter than the additive action above it, the safe one is
	// the one that should be easy to hit
	.replace {
		margin-top: 1.2rem;
		padding: 0.6rem 1.4rem;
		font: inherit;
		font-size: 1.25rem;
		@include store-button($armable: true);
	}
</style>

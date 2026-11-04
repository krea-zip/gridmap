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
	import { subjectById } from '$lib/curriculum/data';
	import Modal from '../Modal.svelte';
	import PathGrid from './PathGrid.svelte';

	let { onclose }: { onclose: () => void } = $props();
	const plan = usePlan();

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

	<PathGrid />

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

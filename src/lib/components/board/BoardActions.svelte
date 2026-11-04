<script lang="ts">
	// bulk grid actions. changing the degree never moves a course by itself,
	// the new recommendation shows as ghosts, and these bring the grid in line
	// with it all at once. each shows only while it has work and says what it
	// will move in plain words: greyed-out buttons reading "0" confused people.
	// filling in first, taking away after, then the suggested path to compare
	// against; emptying lives inside the plan menu.
	import { fade } from 'svelte/transition';
	import { usePlan } from '$lib/planner/context';
	import { reducedMotion } from '$lib/ui/transitions';
	import { armed } from './grid/armed.svelte';
	import ReferencePath from './ReferencePath.svelte';

	const plan = usePlan();
	const empty = armed(() => {
		plan.clearPlan();
		menuOpen = false;
		menuTrigger?.focus();
	});

	const appear = () => ({ duration: reducedMotion() ? 0 : 260 });
	let others = $derived(plan.otherPlacedCodes.length);
	let showPath = $state(false);
	let menuOpen = $state(false);
	let menuRoot = $state<HTMLDivElement>();
	let menuTrigger = $state<HTMLButtonElement>();
</script>

<svelte:window
	onpointerdown={(e) => {
		if (menuOpen && !menuRoot?.contains(e.target as Node)) menuOpen = false;
	}}
/>

{#if plan.view === 'plan' && !plan.welcoming}
	<div class="acts-row" data-tour="board-actions">
		{#if plan.fillCount}
			<button
				class="fill"
				title="add every dashed suggestion where it sits, and fit in any required course the suggestions leave out"
				onclick={() => plan.fillIn()}
				transition:fade={appear()}>+ add {plan.fillCount} missing</button
			>
		{/if}

		{#if others}
			<button
				class="strip"
				title="take off every course that counts toward none of your major, minor or concentration"
				onclick={() => plan.removeOtherCourses()}
				transition:fade={appear()}>− drop {others} {others === 1 ? 'extra' : 'extras'}</button
			>
		{/if}

		<button
			class="strip"
			data-tour="suggested-path"
			title="the department's suggested order for your degree"
			onclick={() => (showPath = true)}
		>
			suggested path <span aria-hidden="true">→</span>
		</button>

		{#if plan.placed.length}
			<!-- A disclosure contains the destructive action; Tab follows normal button order. -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="plan-menu"
				bind:this={menuRoot}
				role="group"
				aria-label="plan actions"
				onkeydown={(e) => {
					if (e.key !== 'Escape' || !menuOpen) return;
					e.preventDefault();
					e.stopPropagation();
					menuOpen = false;
					menuTrigger?.focus();
				}}
			>
				<button
					class="strip"
					bind:this={menuTrigger}
					aria-expanded={menuOpen}
					aria-controls="plan-actions-menu"
					onclick={() => (menuOpen = !menuOpen)}>plan <span aria-hidden="true">▾</span></button
				>
				{#if menuOpen}
					<div class="menu-pop" id="plan-actions-menu">
						<p>remove all courses from this plan</p>
						<button class="strip empty" class:confirming={empty.armed} onclick={empty.press}>
							{empty.armed ? 'sure? click again' : 'empty the grid'}
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

{#if showPath}
	<ReferencePath onclose={() => (showPath = false)} />
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	// one quiet row with room above and below; only the fill colour marks the
	// one that matters most
	.acts-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.8rem;
		margin: 0 0 2.4rem;
		padding: 0 var(--board-gutter, 3.2rem) 0 calc(var(--board-gutter, 3.2rem) + 5.8rem);
	}

	.fill,
	.strip {
		min-height: 3.6rem;
		padding: 0.7rem 1.6rem;
		font: inherit;
		font-size: 1.3rem;
		border: 1px solid var(--color-border-card);
		border-radius: 6px;
		cursor: pointer;
	}

	// the primary, in the accent without being any bigger
	.fill {
		font-weight: 600;
		color: var(--color-on-accent);
		background-color: var(--color-accent);
		border-color: var(--color-control-deep);
		@include glossy-accent;
		transition:
			background-color 140ms ease,
			box-shadow 140ms ease,
			transform 140ms var(--spring);

		&:hover {
			filter: brightness(1.07);
		}

		&:active:not(:disabled) {
			transform: translateY(1px) scale(0.98);
			transition-duration: 70ms;
		}
	}

	// the tidy-ups: app store price-tag buttons, so they never compete with
	// the plum one beside them
	.strip {
		@include store-button($armable: true);
	}

	.plan-menu {
		position: relative;
		margin-left: auto;
	}

	.menu-pop {
		position: absolute;
		bottom: calc(100% + 0.8rem);
		right: 0;
		z-index: 4;
		width: 25rem;
		max-width: calc(100vw - 3.2rem);
		padding: 1.2rem;
		background: var(--color-bg-card-start);
		border: 1px solid var(--color-border-card);
		border-radius: 6px;
		box-shadow: 0 6px 18px rgba(20, 30, 50, 0.15);

		p {
			margin-bottom: 0.8rem;
			font-size: 1.2rem;
			color: var(--color-text-muted);
		}

		.empty {
			width: 100%;
			color: var(--color-danger-deep);
		}
	}

	@include touch {
		.fill,
		.strip {
			min-height: 4.4rem;
		}
	}

	@include mobile {
		.acts-row {
			padding: 1.6rem;
		}
	}
</style>

<script lang="ts">
	// a first visit's four short windows: when they started, what they study,
	// the plan that suggests, and a go at the board in Demo. the grid behind
	// starts empty and fills in as they answer, the foundation core with the
	// batch, then each programme as it's picked, so it builds up instead of
	// showing someone else's example and reshuffling. every answer is also in
	// the sidebar; nothing here is final.
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { usePlan } from '$lib/planner/context';
	import { viewport } from '$lib/planner/viewport.svelte';
	import { reducedMotion } from '$lib/ui/transitions';
	import Modal from '../Modal.svelte';
	import PathGrid from '../board/PathGrid.svelte';
	import { DegreeAnswers } from './answers.svelte';
	import DegreePicker from './DegreePicker.svelte';
	import Demo from './Demo.svelte';

	let { ondone }: { ondone: (finished: boolean) => void } = $props();
	const plan = usePlan();
	const answers = new DegreeAnswers(plan);
	const BATCHES = [2022, 2023, 2024, 2025, 2026];
	const LENGTHS = [
		{ four: false, label: '3 years' },
		{ four: true, label: '4 years' }
	];
	const WINDOWS = {
		start: { title: 'set up your plan', next: 'next' },
		degree: { title: 'what are you studying?', next: 'see my suggested plan' },
		route: { title: 'your suggested plan', next: 'try it out' },
		demo: { title: 'try it out', next: 'start planning' }
	};
	type Window = keyof typeof WINDOWS;

	// a phone doesn't drag, so it stops at the suggested plan
	let windows = $derived<Window[]>(
		viewport.desktop ? ['start', 'degree', 'route', 'demo'] : ['start', 'degree', 'route']
	);
	let at = $state(0);
	let direction = $state(1);
	let current = $derived(windows[at]);
	let last = $derived(at === windows.length - 1);
	let wide = $derived(current === 'route' || current === 'demo');
	let waiting = $derived((current === 'start' && !answers.answered.batch) || (current === 'degree' && !answers.ready));

	function go(by: 1 | -1) {
		direction = by;
		at += by;
	}

	// skipped before answering: the board can't stay empty, so it gets the path
	// for the defaults, the same as a visit that never saw the welcome
	function skip() {
		if (!answers.ready) plan.seedRecommended();
		ondone(false);
	}

	onMount(() => {
		plan.placements = {};
		plan.welcoming = true;
		return () => (plan.welcoming = false);
	});
</script>

<Modal title="welcome to kcal" width={wide ? '68rem' : '56rem'} dismiss="skip" onclose={skip}>
	{#key current}
		<div in:fly={{ x: direction * 24, duration: reducedMotion() ? 0 : 240, easing: cubicOut }}>
			<h3>{WINDOWS[current].title}</h3>

			{#if current === 'start'}
				<p class="lede">pick your batch and degree. you can change both later.</p>

				<p class="ask">when did you start?</p>
				<div class="keys" role="group" aria-label="batch">
					{#each BATCHES as year (year)}
						{@const on = answers.answered.batch && plan.batchStartYear === year}
						<button class:on aria-pressed={on} onclick={() => answers.setBatch(year)}>{year}</button>
					{/each}
				</div>

				<p class="ask">how long is your degree?</p>
				<div class="keys" role="group" aria-label="degree length">
					{#each LENGTHS as { four, label } (label)}
						{@const on = plan.fourYear === four}
						<button class:on aria-pressed={on} onclick={() => answers.setFourYear(four)}>{label}</button>
					{/each}
				</div>
			{:else if current === 'degree'}
				<DegreePicker {answers} />
			{:else if current === 'route'}
				<p class="lede">
					the order your department suggests, already on your plan, so you can move, add or drop anything.{#if plan.recommendedElectiveCredits}{' '}the
						dashed lines are the <b>{plan.recommendedElectiveCredits} elective credits</b> you choose for yourself.{/if}
				</p>
				<PathGrid plain />
			{:else}
				<Demo />
			{/if}
		</div>
	{/key}

	<div class="nav">
		{#if at > 0}<button class="back" onclick={() => go(-1)}>back</button>{/if}
		<span class="pips" role="img" aria-label="window {at + 1} of {windows.length}">
			{#each windows as w, i (w)}<i class:on={i <= at}></i>{/each}
		</span>
		<button class="go" disabled={waiting} onclick={() => (last ? ondone(true) : go(1))}>
			{last ? 'start planning' : WINDOWS[current].next}
		</button>
	</div>
</Modal>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	h3 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text);
	}

	h3 {
		margin-bottom: 1rem;
	}

	.lede {
		margin-bottom: 1.2rem;
		font-size: 1.35rem;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	.ask {
		margin: 1.8rem 0 0.7rem;
		font-size: 1.25rem;
		color: var(--color-text-muted);
	}

	// plain flat keys, the whole row one question
	.keys {
		display: flex;
		gap: 0.7rem;

		button {
			flex: 1;
			min-height: 4.4rem;
			padding: 0 0.6rem;
			font: inherit;
			font-size: 1.35rem;
			color: var(--color-text);
			background: var(--color-bg-light);
			border: 1px solid var(--color-border-card);
			border-radius: 6px;
			cursor: pointer;
			transition:
				background-color 0.15s ease,
				border-color 0.15s ease;

			&:hover {
				border-color: var(--color-accent);
			}

			&.on {
				font-weight: 700;
				background: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg-light));
				border-color: var(--color-accent);
			}
		}
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 1.2rem;
		margin-top: 2rem;
	}

	// the same faded pips as a choice pool, filling as the windows go by
	.pips {
		display: flex;
		gap: 0.4rem;
		margin-left: auto;

		i {
			width: 0.75rem;
			height: 0.75rem;
			background-color: color-mix(in srgb, var(--color-text-muted) 30%, transparent);
			border-radius: 50%;
			transition: background-color 0.2s ease;

			&.on {
				background-color: var(--color-accent);
			}
		}
	}

	.back {
		padding: 0;
		font: inherit;
		font-size: 1.3rem;
		color: var(--color-text-muted);
		background: none;
		border: 0;
		cursor: pointer;

		&:hover {
			color: var(--color-text);
		}
	}

	.go {
		padding: 0.7rem 2.2rem;
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

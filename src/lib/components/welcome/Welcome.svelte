<script lang="ts">
	// Set up the real suggested plan, then teach one small interaction at a
	// time on disposable practice copies of the student's selected degree.
	import { onMount } from 'svelte';
	import { STUDENT_BATCHES } from '$lib/curriculum/data';
	import { usePlan } from '$lib/planner/context';
	import Modal from '../Modal.svelte';
	import SuggestedPlan from './SuggestedPlan.svelte';
	import { DegreeAnswers } from './answers.svelte';
	import DegreePicker from './DegreePicker.svelte';
	import Practice from './Practice.svelte';
	import MoreTools from './MoreTools.svelte';
	import { LESSONS, type Lesson } from './lessons';

	let { ondone }: { ondone: (finished: boolean) => void } = $props();
	const plan = usePlan();
	const answers = new DegreeAnswers(plan);
	const LENGTHS = [
		{ four: false, label: '3 years' },
		{ four: true, label: '4 years' }
	];
	const SETUP = [
		{ id: 'start' as const, title: 'set up your plan', label: 'your batch', group: 'setup' },
		{ id: 'degree' as const, title: 'what are you studying?', label: 'your degree', group: 'setup' },
		{ id: 'route' as const, title: 'your suggested plan', label: 'suggested plan', group: 'setup' }
	];
	let windows = $derived([
		...SETUP,
		...LESSONS,
		{ id: 'tools' as const, title: 'a few useful shortcuts', label: 'saving & navigation' }
	]);
	let at = $state(0);
	let current = $derived(windows[at]);
	let last = $derived(at === windows.length - 1);
	let waiting = $derived(
		(current.id === 'start' && !answers.answered.batch) || (current.id === 'degree' && !answers.ready)
	);
	function jump(id: string) {
		const next = windows.findIndex((w) => w.id === id);
		if (next < 0) return;
		at = next;
	}

	function go(by: 1 | -1) {
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

<Modal
	title="welcome to kcal"
	width={current.id === 'route' ? '84rem' : at >= 3 ? '64rem' : '56rem'}
	dismiss="skip"
	onclose={skip}
>
	{#if at >= 3}
		<div class="component-position">
			<span>walkthrough · {at - 2}/{windows.length - 3}</span><select
				aria-label="demo component"
				value={current.id}
				onchange={(e) => jump(e.currentTarget.value)}
				>{#each windows.slice(3) as w (w.id)}<option value={w.id}>{w.label}</option>{/each}</select
			>
		</div>
	{/if}
	<h3>{current.title}</h3>
	{#if current.id === 'start'}
		<p class="lede">plan your courses and check your degree requirements. start with your batch and degree length.</p>
		<p class="ask">when did you start?</p>
		<div class="keys" role="group" aria-label="batch">
			{#each STUDENT_BATCHES as year (year)}
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
	{:else if current.id === 'degree'}
		<p class="lede">pick your major, then add any other programmes you’re taking.</p>
		<DegreePicker {answers} />
	{:else if current.id === 'route'}
		<p class="lede">
			your department’s suggested order. you can change it later. then take a quick look at the controls below — changes
			in these examples stay in the demo.
		</p>
		<SuggestedPlan />
	{:else if current.id === 'tools'}
		<MoreTools />
	{:else}
		<div class="lesson-context">
			{#each current.context as line (line)}<p>{line}</p>{/each}
		</div>
		{#key current.id}<Practice lesson={current.id as Lesson} />{/key}
	{/if}
	<div class="nav">
		{#if at > 0}<button class="back" onclick={() => go(-1)}>back</button>{/if}
		<span class="step-count">{at + 1} / {windows.length}</span>
		<button data-next class="go" disabled={waiting} onclick={() => (last ? ondone(true) : go(1))}
			>{last
				? 'start planning'
				: current.id === 'degree'
					? 'see my suggested plan'
					: current.id === 'start'
						? 'next'
						: current.id === 'route'
							? 'try the planner →'
							: `next · ${windows[at + 1].label}`}</button
		>
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

	.lesson-context {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 1.6rem;
		font-size: 1.3rem;
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

	.step-count {
		margin-left: auto;
		color: var(--color-text-muted);
		font-size: 1.1rem;
		white-space: nowrap;
	}
	.component-position {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		margin-bottom: 0.8rem;
		font-size: 1.05rem;
		color: var(--color-text-muted);
	}
	.component-position select {
		max-width: 48%;
		padding: 0.3rem 0.5rem;
		font: inherit;
		color: var(--color-text);
		background: var(--color-bg-light);
		border: 1px solid var(--color-border-card);
		border-radius: 4px;
	}
	@media (max-width: 600px) {
		.go {
			padding: 0.7rem 1rem;
			font-size: 1.2rem;
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

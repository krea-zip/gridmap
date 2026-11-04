<script lang="ts">
	import { usePlan } from '$lib/planner/context';
	import PixelIcon from '../PixelIcon.svelte';
	import { STUDENT_BATCHES } from '$lib/curriculum/data';
	import { viewport } from '$lib/planner/viewport.svelte';
	import { optionLabel, type PickRole } from '$lib/planner/picks';
	import Settings from '$lib/components/Settings.svelte';
	import FourYearToggle from '$lib/components/FourYearToggle.svelte';

	const plan = usePlan();

	let showSettings = $state(false);

	// changing the programme re-lays-out a plan the student has never edited,
	// and leaves an edited one alone, see Plan.programmeChanged. a subject an
	// earlier role holds shows disabled in the later roles' lists; moving an
	// earlier role onto a later one's subject bumps the later pick instead
	const distinct = () => {
		plan.programmeChanged();
	};
</script>

{#snippet picker(role: PickRole, label: string, title?: string)}
	<label class="row">
		<span class="row-label" {title}>{label}</span>
		<select class="later" bind:value={plan.picks[role]} onchange={distinct}>
			{#each plan.pickOptions(role) as o (o.subject.id)}
				<option value={o.subject.id} disabled={!!o.heldAs}>{optionLabel(o)}</option>
			{/each}
		</select>
	</label>
{/snippet}

<header class="col-header">
	<h2>kcal</h2>
	{#if viewport.desktop}
		<button class="gear help" title="what's what" aria-label="what's what" onclick={() => (plan.guiding = true)}
			>?</button
		>
	{/if}
	<button
		class="gear"
		data-tour="settings"
		aria-label="settings"
		title="settings"
		onclick={() => (showSettings = true)}
	>
		<PixelIcon name="gear" size="1.6rem" snap />
	</button>
</header>

{#if showSettings}
	<Settings onclose={() => (showSettings = false)} />
{/if}

<div class="pickers" data-tour="programme">
	<!-- the 4-year switch rides on the batch line -->
	<div class="row">
		<label class="row-label" for="batch">batch</label>
		<div class="batch-line">
			<select id="batch" bind:value={plan.batchStartYear} onchange={distinct}>
				{#each STUDENT_BATCHES as year (year)}
					<option value={year}>{year}-{String(year + (plan.fourYear ? 4 : 3)).slice(-2)}</option>
				{/each}
			</select>
			<FourYearToggle onchange={distinct} />
		</div>
	</div>

	<label class="row">
		<span class="row-label">degree</span>
		<select bind:value={plan.structure} onchange={distinct}>
			<option value="single-major">single major</option>
			<option value="double-major">double major</option>
			<option value="major-minor">major + minor</option>
			<option value="major-conc">major + conc.</option>
			<option value="major-minor-conc">major + minor + conc.</option>
		</select>
	</label>

	<label class="row">
		<span class="row-label">major</span>
		<select bind:value={plan.picks.major1} onchange={distinct}>
			{#each plan.pickOptions('major1') as o (o.subject.id)}
				<option value={o.subject.id}>{optionLabel(o)}</option>
			{/each}
		</select>
	</label>

	{#if plan.structure === 'double-major'}{@render picker('major2', 'major')}{/if}
	{#if plan.structure.includes('minor')}{@render picker('minor', 'minor')}{/if}
	{#if plan.structure.includes('conc')}{@render picker('conc', 'conc.', 'concentration')}{/if}
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.col-header {
		@include card-header;
		justify-content: flex-end;
		gap: 0.2rem;
		border-bottom: 1px solid var(--color-border);

		h2 {
			margin-right: auto;
			font-size: 1.8rem;
			font-weight: 600;
			color: var(--color-text);
		}
	}

	// the app's one settings entry point, in the corner it's always in
	.gear {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 2.8rem;
		height: 2.8rem;
		padding: 0;
		color: var(--color-text-muted);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.15s ease;

		&:hover {
			color: var(--color-text);
		}

		&.help {
			font: inherit;
			font-size: 1.6rem;
			font-weight: 700;
		}
	}

	// the planner sizes the sidebar to fit these (see its layout)
	.pickers {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.6rem 1.6rem;
		border-bottom: 1px solid var(--color-border-light);
	}

	.row {
		display: grid;
		grid-template-columns: 5.4rem 1fr;
		align-items: center;
		gap: 1rem;
		font-size: var(--text-body);
		cursor: pointer;
	}

	.row-label {
		color: var(--color-text);
	}

	// the later roles' lists name a taken subject ("… (major)"), which
	// mustn't widen the sidebar: no width of their own, they fill whatever
	// the rest set (a select ignores `contain`, so it's this old trick)
	.later {
		width: 0;
		min-width: 100%;
	}

	select {
		@include flat-select;
	}

	.batch-line {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}

	// by finger: the programme pickers a fingertip tall
	@include touch {
		select {
			min-height: 4rem;
		}
	}
</style>

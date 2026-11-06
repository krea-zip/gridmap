<script lang="ts">
	// a column's heading: its trimester over its months. through the degree it
	// counts from where the student is (t10 t11 t12 in year 4), since that's
	// the row they're thinking about. a click on the name flips the naming
	// everywhere; a click on the months hides every heading's dates.
	import { degreeTrim, termMonths } from '$lib/planner/calendar';
	import { usePlan } from '$lib/planner/context';
	import type { TrimNum } from '$lib/types';
	import Rolling from '$lib/ui/Rolling.svelte';
	import HeadLine from './HeadLine.svelte';

	let { trim }: { trim: TrimNum } = $props();
	const plan = usePlan();

	let byYear = $derived(plan.trimNaming === 'year');
	let name = $derived(byYear ? `t${trim}` : `t${degreeTrim(plan.here.year, trim)}`);
</script>

<div class="trim-head" data-tour={trim === 1 ? 'trim-head' : undefined}>
	<button
		class="name"
		title="{byYear
			? `trimester ${trim} of each year`
			: `${name}: year ${plan.here.year}, trimester ${trim}, the year you're in`} · click to {byYear
			? 'number trimesters through the degree'
			: 'name trimesters by year'}"
		onclick={() => (plan.trimNaming = byYear ? 'degree' : 'year')}
	>
		<Rolling value={name} />
	</button>
	<HeadLine text={termMonths(trim)} />
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.trim-head {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0 0 0.4rem;
	}

	// looks like a heading until pointed at
	.name {
		padding: 0;
		font: inherit;
		background: none;
		border: 0;
		border-radius: 6px;
		cursor: pointer;
		font-size: 2.2rem;
		color: var(--color-text);
		transition: color 0.15s ease;

		&:hover,
		&:focus-visible {
			color: var(--color-accent);
		}
	}

	// on a phone each trimester's own button names it
	@include mobile {
		.trim-head {
			display: none;
		}
	}
</style>

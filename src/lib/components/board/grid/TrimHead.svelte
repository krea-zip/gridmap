<script lang="ts">
	// a column's heading: its trimester over its months. through the degree it
	// counts from where the student is (t10 t11 t12 in year 4), since that's
	// the row they're thinking about. a click flips the naming everywhere.
	import { degreeTrim, termMonths } from '$lib/calendar';
	import { usePlan } from '$lib/planner/context';
	import type { TrimNum } from '$lib/types';
	import Rolling from '$lib/components/Rolling.svelte';

	let { trim }: { trim: TrimNum } = $props();
	const plan = usePlan();

	let byYear = $derived(plan.trimNaming === 'year');
	let name = $derived(byYear ? `t${trim}` : `t${degreeTrim(plan.here.year, trim)}`);
</script>

<button
	class="trim-head"
	title="{byYear
		? `trimester ${trim} of each year`
		: `${name}: year ${plan.here.year}, trimester ${trim}, the year you're in`}, {termMonths(trim)} · click to {byYear
		? 'number trimesters through the degree'
		: 'name trimesters by year'}"
	onclick={() => (plan.trimNaming = byYear ? 'degree' : 'year')}
>
	<Rolling value={name} />
	<span class="months">{termMonths(trim)}</span>
</button>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	// looks like a heading until pointed at
	.trim-head {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0 0 0.4rem;
		font: inherit;
		font-size: 2.2rem;
		text-align: center;
		color: var(--color-text);
		background: none;
		border: 0;
		border-radius: 6px;
		cursor: pointer;
		transition: color 0.15s ease;

		&:hover,
		&:focus-visible {
			color: var(--color-accent);
		}
	}

	.months {
		font-size: 1.05rem;
		font-weight: 600;
		white-space: nowrap;
		color: var(--color-text-muted);

		.trim-head:hover &,
		.trim-head:focus-visible & {
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

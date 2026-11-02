<script lang="ts">
	// milestones view: under each year, what the plan has earned by then, and
	// whether that's enough to leave with an exit award or to graduate
	import { usePlan } from '$lib/planner/context';
	import { useBoard } from '../boardState.svelte';

	let { year }: { year: number } = $props();
	const plan = usePlan();
	const board = useBoard();

	let m = $derived(board.stones.find((s) => s.year === year));
	let graduating = $derived(year === board.gradYear);
	let enough = $derived(!!m && m.credits >= plan.creditMinimum);
</script>

{#if m}
	<div class="milestone" class:met={m.met} class:short={!!m.exit && !m.met} role="note">
		<span class="when">end of year {year}</span>
		<span><b>{m.credits}</b> cr placed · {m.inYear} this year</span>
		{#each m.off as o (o.trim)}
			<span>T{o.trim} {o.kind === 'away' ? 'away' : o.kind === 'suspension' ? 'suspended' : 'on a break'}</span>
		{/each}
		{#if m.exit && !graduating}
			<span class="exit">
				{m.met
					? `✓ enough to leave with a ${m.exit.award}`
					: `${m.short} cr short of a ${m.exit.award} (${m.exit.credits} cr)`}
			</span>
		{/if}
		{#if graduating}
			<span class="grad" class:ok={enough}>
				{enough
					? `✓ enough to graduate (${plan.creditMinimum} cr)`
					: `${plan.creditMinimum - m.credits} cr short of graduating (${plan.creditMinimum} cr)`}
			</span>
		{/if}
	</div>
{/if}

<style lang="scss">
	.milestone {
		grid-column: 1 / -1;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem 1.6rem;
		margin: -0.2rem 0 0.6rem;
		padding: 0.7rem 1.2rem;
		font-size: 1.25rem;
		color: var(--color-text-muted);
		border-top: 1px dotted var(--color-border-light);
		border-bottom: 1px dotted var(--color-border-light);

		b {
			color: var(--color-text);
		}
	}

	.when {
		font-weight: 650;
		color: var(--color-text);
	}

	.met .exit,
	.grad.ok {
		color: var(--color-accent);
	}

	.short .exit,
	.grad:not(.ok) {
		color: var(--color-danger);
	}
</style>

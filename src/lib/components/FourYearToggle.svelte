<script lang="ts">
	// the 4-year switch that rides on a batch line: an empty dashed outline
	// while off, the app's lit plum key while on, so which it is reads at a
	// glance. the sidebar and the welcome share it
	import { usePlan } from '$lib/planner/context';

	let { onchange }: { onchange?: () => void } = $props();
	const plan = usePlan();
</script>

<button
	class="four-year"
	aria-pressed={plan.fourYear}
	title={plan.fourYear ? '4-year degree, click for the 3-year track' : '3-year degree, click for the 4-year track'}
	onclick={() => {
		plan.fourYear = !plan.fourYear;
		onchange?.();
	}}>4yup</button
>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.four-year {
		flex: none;
		padding: 0.3rem 0.7rem;
		font-size: 1.1rem;
		font-weight: 650;
		color: var(--color-text-muted);
		background: transparent;
		border: 1px dashed var(--color-border-card);
		border-radius: 999px;
		cursor: pointer;
		transition:
			color 0.2s ease,
			background-color 0.2s ease,
			border-color 0.2s ease;

		&:hover {
			color: var(--color-text);
			border-color: var(--color-accent);
		}

		&[aria-pressed='true'] {
			color: var(--color-on-accent);
			background-color: var(--color-accent);
			border: 1px solid var(--color-control-deep);
			@include glossy-accent;
		}
	}
</style>

<script lang="ts">
	// the 4-year switch that rides on a batch line: an empty dashed outline
	// while off, the app's lit plum key while on, so which it is reads at a
	// glance. the sidebar and the welcome share it
	import { usePlan } from '$lib/planner/context';
	import { softUpdate } from '$lib/ui/transitions';

	let { onchange }: { onchange?: () => void } = $props();
	const plan = usePlan();
</script>

<button
	class="four-year"
	data-tour="four-year"
	aria-pressed={plan.fourYear}
	title={plan.fourYear ? '4-year degree, click for the 3-year track' : '3-year degree, click for the 4-year track'}
	onclick={() =>
		softUpdate(() => {
			plan.fourYear = !plan.fourYear;
			onchange?.();
		})}>4yup</button
>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.four-year {
		@include toggle-pill;
	}
</style>

<script lang="ts">
	import { usePlan } from '$lib/planner/context';
	import ColourKey from '$lib/planner/board/bar/ColourKey.svelte';
	const plan = usePlan();
	let samples = $derived([
		{ type: 'core', code: 'KCCS190' },
		...plan.placed.filter((p) => p.code !== 'KCCS190').map((p) => ({ type: plan.courseType(p.code), code: p.code }))
	]);
</script>

<div class="display-demo">
	<ColourKey />
	<div class="blocks" role="img" aria-label="course colours: dot for required, coloured left edge for elective">
		{#each samples as sample (sample.code)}
			<span
				class="block"
				class:lit={plan.highlight.includes(sample.code)}
				data-type={sample.type}
				style:--hue={plan.hueOf(sample.code)}
			>
				{#if sample.type === 'required'}<i class="dot"></i>{/if}
			</span>
		{/each}
	</div>
	<div class="key"><span><i class="dot"></i> required</span><span><i class="edge"></i> elective</span></div>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;
	.display-demo {
		max-width: 32rem;
		margin-inline: auto;
	}
	.blocks {
		display: flex;
		gap: 0.8rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 1.6rem;
	}
	.block {
		@include course-type-fill(false);
		display: flex;
		align-items: center;
		width: 5rem;
		height: 2.8rem;
		padding: 0.7rem;
		border-radius: 6px;
	}
	.block.lit {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}
	.dot {
		@include required-dot;
	}
	.edge {
		display: inline-block;
		height: 1.1rem;
		border-left: 4px solid var(--color-accent);
		border-radius: 2px;
	}
	.key {
		display: flex;
		justify-content: center;
		gap: 1.8rem;
		margin-top: 1rem;
		font-size: 1.15rem;
		color: var(--color-text-muted);
	}
	.key > span {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.display-demo :global(.colour-key) {
		position: relative;
	}
	.display-demo :global(.pop) {
		position: relative;
		top: auto;
		left: auto;
		right: auto;
		width: 100%;
		max-width: 100%;
		max-height: none;
		box-shadow: none;
		margin-top: 0.8rem;
		border-radius: 10px;
	}
	@media (max-width: 600px) {
		.display-demo :global(.pop) {
			max-height: 30rem;
		}
	}
</style>

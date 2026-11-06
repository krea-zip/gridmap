<script lang="ts">
	// The transient one-liner (a refused drop, a rule the board just applied),
	// and a storage failure, which stays until it's fixed.
	import { fly } from 'svelte/transition';
	import { usePlan } from '$lib/planner/context';

	const plan = usePlan();
</script>

{#if plan.flash}
	<div class="flash" role="status" transition:fly={{ y: 12, duration: 220 }}>{plan.flash}</div>
{/if}

{#if plan.storageError}<p class="flash" role="alert">{plan.storageError}</p>{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	// a plain white card, nothing more
	.flash {
		position: fixed;
		bottom: 2.4rem;
		right: 2.4rem;
		z-index: 40;
		padding: 1rem 1.6rem;
		font-size: 1.35rem;
		color: var(--color-text);
		background: var(--color-bg-card-start);
		border: 1px solid var(--color-border-card);
		border-radius: 8px;
	}

	@include mobile {
		.flash {
			left: 1.6rem;
			right: 1.6rem;
			bottom: calc(8rem + env(safe-area-inset-bottom));
			font-size: 1.5rem;
		}
	}
</style>

<script lang="ts">
	// A plan someone shared (#plan=…), waiting for the student's say-so: it is
	// opened as a copy, never a silent overwrite of their own board.
	import Modal from '$lib/components/Modal.svelte';
	import { hasCode } from '$lib/curriculum/data';
	import { usePlan } from '$lib/planner/context';
	import { readSharedPlan } from './share';
	import { savedPlans } from './local-plans.svelte';

	let { encoded }: { encoded: string | null } = $props();
	const plan = usePlan();

	let shared = $state<Record<string, unknown> | null>(null);
	let error = $state('');

	$effect(() => {
		if (!encoded) return;
		readSharedPlan(encoded)
			.then((doc) => (shared = doc as Record<string, unknown>))
			.catch((e) => (error = e instanceof Error ? e.message : 'This share link could not be read.'));
	});

	let summary = $derived.by(() => {
		if (!shared) return '';
		const placements = shared.placements as Record<string, string[]>;
		const courses = Object.values(placements).flat().filter(hasCode).length;
		const years = shared.fourYear === false ? '3-year' : '4-year';
		const batch = typeof shared.batchStartYear === 'number' ? `, batch ${shared.batchStartYear}` : '';
		return `${courses} course${courses === 1 ? '' : 's'} on a ${years} plan${batch}.`;
	});

	function open() {
		if (!shared) return;
		// your own board is kept, as a saved copy you can load back
		if (!savedPlans.full)
			savedPlans.save(
				`my plan, before a shared one (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`,
				plan.snapshot()
			);
		plan.restore({ ...plan.snapshot(), grades: {}, ...shared, touched: true });
		shared = null;
	}

	const close = () => ((shared = null), (error = ''));
</script>

{#if shared || error}
	<Modal title="a shared plan" onclose={close}>
		<div class="note">
			{#if error}
				<p>{error}</p>
				<button onclick={() => (error = '')}>ok</button>
			{:else}
				<p>Someone shared their plan with you: {summary}</p>
				<p class="aside">
					{savedPlans.full
						? 'Opening it replaces your board, your saved-plans list is full, so delete one in settings first to keep a copy.'
						: 'Opening it keeps your current plan as a saved copy (settings → saved plans).'}
				</p>
				<div class="actions">
					<button onclick={open}>open the shared plan</button>
					<button class="secondary" onclick={() => (shared = null)}>keep my plan</button>
				</div>
			{/if}
		</div>
	</Modal>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.note {
		display: grid;
		gap: 2rem;
		font-size: 1.6rem;
		line-height: 1.6;
	}

	.aside {
		font-size: 1.35rem;
		color: var(--color-text-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	button {
		@include modal-button;
	}

	.secondary {
		color: var(--color-text);
		background: var(--color-bg-light);
		background-image: none;
		border-color: var(--color-border-card);
	}
</style>

<script lang="ts">
	// what the board shows: the plan, or one view laid over it. one at a time,
	// so the menu shuts on a pick, a click anywhere else, or escape.
	import { BOARD_VIEWS, type BoardView } from '$lib/planner/plan.svelte';
	import { usePlan } from '$lib/planner/context';
	import PixelIcon from '$lib/components/PixelIcon.svelte';
	import { useBoard } from '../boardState.svelte';
	import Keys from './Keys.svelte';
	import ViewMenu from './ViewMenu.svelte';

	const plan = usePlan();
	const board = useBoard();

	let root: HTMLDivElement;
	let button = $state<HTMLButtonElement>();
	let open = $state(false);
	let current = $derived(BOARD_VIEWS.find((v) => v.id === plan.view) ?? BOARD_VIEWS[0]);

	function pick(view: BoardView) {
		open = false;
		button?.focus(); // back where the menu was opened from
		board.setView(view);
	}
</script>

<svelte:window
	onpointerdown={(e) => {
		if (open && !root.contains(e.target as Node)) open = false;
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) {
			open = false;
			button?.focus();
		}
	}}
/>

<div class="view-pick" bind:this={root}>
	<Keys>
		<button
			bind:this={button}
			class:active={plan.view !== 'plan'}
			class:open
			aria-expanded={open}
			aria-controls="view-list"
			title="what the board shows"
			onclick={() => (open = !open)}
		>
			{#if plan.view === 'grades'}<PixelIcon name="grade" />{/if}
			view: {current.label} <span class="caret" aria-hidden="true">▾</span>
		</button>
	</Keys>
	{#if open}
		<ViewMenu onpick={pick} />
	{/if}
</div>

<style lang="scss">
	// the menu (ViewMenu) hangs below; the caret turns over while it's open
	.view-pick {
		position: relative;
	}

	.caret {
		font-size: 1rem;
		transition: transform 260ms var(--spring);
	}

	.open .caret {
		transform: rotate(180deg);
	}
</style>

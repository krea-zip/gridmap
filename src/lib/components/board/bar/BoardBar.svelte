<script lang="ts">
	// the bar over the board, sticky so it stays in reach while a long plan
	// scrolls: history, what the board shows, how chips are labelled, what
	// their colours mean, and where the plan stands at the far end
	import { usePlan } from '$lib/planner/context';
	import { viewport } from '$lib/planner/viewport.svelte';
	import PixelIcon from '$lib/components/PixelIcon.svelte';
	import Keys from './Keys.svelte';
	import ViewPicker from './ViewPicker.svelte';
	import ColourKey from './ColourKey.svelte';
	import CreditTotal from './CreditTotal.svelte';

	const plan = usePlan();
</script>

<div class="board-bar" data-tour="board-toggles">
	<Keys label="history" glyphs>
		<button disabled={!plan.canUndo} title="undo (Ctrl+Z)" aria-label="undo" onclick={() => plan.undo()}>↶</button>
		<button disabled={!plan.canRedo} title="redo (Ctrl+Shift+Z)" aria-label="redo" onclick={() => plan.redo()}>↷</button
		>
	</Keys>

	<!-- the other views and the label switches are laptop-only: a phone's
	     board stays on the plan, and its rows show code and title both -->
	{#if viewport.desktop}
		<span class="rule" aria-hidden="true"></span>
		<ViewPicker />
		<span class="rule" aria-hidden="true"></span>

		<Keys label="course labels">
			<button class:active={plan.showCodes} aria-pressed={plan.showCodes} onclick={() => plan.toggleLabel('code')}
				><PixelIcon name="code" />codes</button
			>
			<button class:active={plan.showTitles} aria-pressed={plan.showTitles} onclick={() => plan.toggleLabel('title')}
				><PixelIcon name="title" />titles</button
			>
			{#if plan.gradeMode}
				<button
					class:active={plan.showGradeLabels}
					aria-pressed={plan.showGradeLabels}
					onclick={() => (plan.showGradeLabels = !plan.showGradeLabels)}><PixelIcon name="grade" />grades</button
				>
			{/if}
		</Keys>
	{/if}

	<span class="rule" aria-hidden="true"></span>
	<ColourKey />

	<div class="end"><CreditTotal /></div>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.board-bar {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 1.6rem;
		flex-wrap: wrap;
		min-height: 5.6rem;
		padding: 0.8rem var(--board-gutter, 3.2rem);
		background: linear-gradient(to bottom, var(--bar-top), var(--bar-bottom));
		box-shadow: inset 0 1px 0 var(--bar-hi);
		border-bottom: 1px solid var(--bar-edge);

		// everything inside takes the bar's own steel palette (--bar-* in
		// _variables); only the toggles go pink
		--color-text: var(--bar-text);
		--color-text-muted: var(--bar-text-muted);
		--color-accent: var(--bar-key-on);
		--color-on-accent: var(--bar-key-on-text);
		--color-bg-light: var(--bar-top);
		--color-border-card: var(--bar-edge);
		--gloss-face: linear-gradient(
			to bottom,
			var(--bar-hi) 0%,
			transparent 50%,
			rgba(40, 56, 84, 0.05) 51%,
			rgba(40, 56, 84, 0.12) 100%
		);
		--shadow-inset: inset 0 1px 0 var(--bar-hi);
		--shadow-card: 0 0 0 transparent;
		--key-pressed: inset 0 2px 3px rgba(20, 30, 50, 0.32), inset 0 1px 1px rgba(20, 30, 50, 0.2);
	}

	// the dotted rule between the bar's groups
	.rule {
		align-self: stretch;
		margin: 0.6rem 0;
		border-left: 1px dotted color-mix(in srgb, var(--bar-text-muted) 55%, transparent);
	}

	.end {
		margin-left: auto;
	}

	// phones: one row that scrolls sideways rather than wrapping onto two.
	// the bar isn't positioned here, so the dropdowns hang off the board
	// instead and aren't clipped by the scrolling row (see ColourKey, ViewPicker)
	@include mobile {
		.board-bar {
			position: static;
			flex-wrap: nowrap;
			gap: 0.6rem;
			min-height: 0;
			padding: 0.6rem 1.6rem;
			overflow-x: auto;
			scrollbar-width: none;

			> :global(*) {
				flex: none;
			}
		}

		.rule {
			display: none;
		}

		.end {
			margin-left: 0;
		}
	}
</style>

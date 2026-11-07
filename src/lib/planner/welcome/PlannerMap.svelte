<script lang="ts">
	// a thumbnail of the real planner with one part lit: the miniature beside it
	// shows a part up close, this says where that part lives once it's yours
	import type { MapPart } from './lessons';

	let { part }: { part: MapPart } = $props();

	const NAMES: Record<MapPart, string> = {
		grid: 'the grid, in the middle of the board',
		bar: 'the bar along the top of the board',
		catalogue: 'the catalogue, the second column',
		info: 'the sidebar, at the top',
		hints: 'the sidebar, near the bottom',
		details: 'a panel that slides in over the board',
		all: 'everywhere'
	};
</script>

<div class="map" role="img" aria-label="in your planner: {NAMES[part]}">
	<div class="column">
		<i class:on={part === 'info'}>info</i>
		<i class:on={part === 'hints'}>hints</i>
	</div>
	<div class="column"><i class:on={part === 'catalogue'}>catalogue</i></div>
	<div class="column board">
		<i class="bar" class:on={part === 'bar'}>bar</i>
		<i class:on={part === 'grid'}>grid</i>
		<i class="details" class:on={part === 'details'}>course</i>
	</div>
</div>

<style lang="scss">
	.map {
		display: grid;
		grid-template-columns: 1fr 1.15fr 2fr;
		gap: 3px;
		height: 7.4rem;
		padding: 3px;
		background: var(--color-bg);
		border: 1px solid var(--color-border-card);
		border-radius: 5px;
	}

	.column {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	i {
		flex: 1;
		display: grid;
		place-items: center;
		min-height: 0;
		font-size: 1rem;
		font-style: normal;
		color: var(--color-text-muted);
		background: var(--color-bg-light);
		border-radius: 2px;
		transition:
			background-color 0.25s ease,
			color 0.25s ease;

		&.on {
			font-weight: 650;
			color: var(--color-on-accent);
			background: var(--color-accent);
		}
	}

	.bar {
		flex: 0 0 1.7rem;
	}

	.board i:not(.details) {
		justify-items: start;
		padding-left: 0.8rem;
	}

	// over the board's right side, only there while a course is open
	.details {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 46%;
		visibility: hidden;

		&.on {
			visibility: visible;
		}
	}
</style>

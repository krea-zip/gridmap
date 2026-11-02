<script lang="ts">
	// the board bar's keys, an old-iphone segmented control: joined glossy
	// segments with a hard crease across the middle, light pink when off, dark
	// pink and sunk in when on. a single key is just a one-segment control.
	// `plain` is for a key that opens a menu rather than switching anything,
	// so it doesn't wear the toggles' pink.
	import type { Snippet } from 'svelte';

	let {
		label,
		plain = false,
		glyphs = false,
		children
	}: { label?: string; plain?: boolean; glyphs?: boolean; children: Snippet } = $props();
</script>

<div class="keys" class:plain class:glyphs role={label ? 'group' : undefined} aria-label={label}>
	{@render children()}
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.keys {
		display: flex;
		overflow: hidden; // clips the end segments to the rounded corners
		border: 1px solid var(--bar-key-edge);
		border-radius: 6px;
		box-shadow: 0 1px 0 var(--bar-hi);
	}

	.keys :global(button) {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.8rem;
		padding: 0.3rem 1.2rem;
		font: inherit;
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--bar-key-text);
		text-shadow: 0 1px 0 var(--bar-hi); // embossed, faint on the dark theme
		background-color: var(--bar-key);
		// lit top half, hard crease, deeper bottom half that lifts again
		background-image: linear-gradient(
			rgba(255, 255, 255, 0.6),
			rgba(255, 255, 255, 0.22) 50%,
			rgba(120, 40, 80, 0.06) 50%,
			rgba(255, 255, 255, 0.08)
		);
		border: 0;
		border-radius: 0;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition:
			background-color 160ms ease,
			color 160ms ease,
			box-shadow 120ms ease;

		&:hover {
			background-color: color-mix(in srgb, var(--bar-key) 88%, var(--bar-key-on));
		}

		&:global(.active) {
			color: var(--bar-key-on-text);
			text-shadow: 0 -1px 0 rgba(60, 10, 35, 0.45);
			background-color: var(--bar-key-on);
			background-image: linear-gradient(
				rgba(255, 255, 255, 0.24),
				rgba(255, 255, 255, 0.07) 50%,
				rgba(60, 10, 35, 0.1) 50%,
				rgba(60, 10, 35, 0)
			);
			box-shadow:
				inset 0 1px 3px rgba(60, 10, 35, 0.5),
				inset 0 0 0 1px rgba(60, 10, 35, 0.12);
		}
	}

	// a hairline groove between segments, lit on its right side
	.keys :global(button + button) {
		border-left: 1px solid var(--bar-key-edge);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.7),
			inset 1px 0 0 rgba(255, 255, 255, 0.45);
	}

	.keys :global(button + button.active),
	.keys :global(button.active + button) {
		border-left-color: var(--bar-key-on-edge);
	}

	// undo / redo: glyphs, a touch larger than the labels
	.glyphs :global(button) {
		min-width: 3.2rem;
		justify-content: center;
		font-size: 1.6rem;
		line-height: 1;

		&:disabled {
			opacity: 0.4;
			cursor: default;
		}
	}

	// white with a steel edge; open, it stays white and sits pressed in
	.plain {
		border-color: var(--bar-edge);
	}

	.plain :global(button),
	.plain :global(button.active) {
		color: var(--bar-text);
		text-shadow: none;
		background: var(--color-bg-card-start);
		box-shadow: none;
	}

	.plain :global(button:hover) {
		background: color-mix(in srgb, var(--color-bg-card-start) 90%, var(--bar-edge));
	}

	.plain :global(button.active) {
		box-shadow: inset 0 1px 3px rgba(20, 30, 50, 0.22);
	}

	// a fingertip tall on a touch screen
	@include touch {
		.keys :global(button) {
			min-height: 4rem;
		}
	}
</style>

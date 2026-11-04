<script lang="ts">
	// the hand-drawn arrow from the tutorial sketches: it draws itself on, shaft
	// then head, as if someone just scribbled it onto the screen. it points down
	// and to the left, with its tip at 30% 91% of the box.
	let { size = '6rem' }: { size?: string } = $props();
</script>

<svg viewBox="0 0 60 66" style:width={size} aria-hidden="true">
	<path class="shaft" pathLength="1" d="M50 4C43 18 31 36 18 60" />
	<path class="head" pathLength="1" d="M9 34C11 44 14 53 18 60C27 56 37 51 46 44" />
</svg>

<style lang="scss">
	svg {
		display: block;
		overflow: visible;
		// a pale edge, so the plum still reads over a dimmed board
		filter: drop-shadow(0 0 1px var(--color-bg-card-start)) drop-shadow(0 0 2px var(--color-bg-card-start));
	}

	path {
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 5;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 1;
		animation: draw 0.3s ease-out both;
	}

	.head {
		animation-delay: 0.26s;
	}

	@keyframes draw {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		path {
			animation: none;
		}
	}
</style>

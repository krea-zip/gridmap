<script lang="ts">
	// The prerequisites view's arrows: one per "needs", drawn over the grid
	// from the course taken first to the one that needs it. Solid when the
	// order works, dashed red when the prerequisite sits in the same
	// trimester or later. Measured off the chips themselves, and measured
	// again whenever the grid moves or a chip settles after moving.
	import { tick } from 'svelte';
	import type { Chain } from '$lib/boardViews';

	let { grid, edges, version }: { grid: HTMLElement; edges: Chain['edges']; version: string } = $props();

	type Line = { key: string; d: string; late: boolean };
	let lines = $state<Line[]>([]);
	let size = $state({ w: 0, h: 0 });

	function measure() {
		if (!grid) return;
		const g = grid.getBoundingClientRect();
		const box = (code: string) => {
			const r = grid.querySelector(`.chip[data-code="${CSS.escape(code)}"]`)?.getBoundingClientRect();
			return r && { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height };
		};
		size = { w: grid.scrollWidth, h: grid.scrollHeight };
		lines = edges.flatMap(({ from, to, late }) => {
			const a = box(from);
			const b = box(to);
			if (!a || !b) return [];
			const key = `${from}>${to}`;
			// a later year row: leave from the bottom, arrive at the top
			if (b.y >= a.y + a.h) {
				const [x1, y1, x2, y2] = [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y];
				const bend = Math.max(18, (y2 - y1) / 2);
				return [{ key, late, d: `M${x1},${y1} C${x1},${y1 + bend} ${x2},${y2 - bend} ${x2},${y2}` }];
			}
			// an earlier year row (a broken order): leave from the top
			if (b.y + b.h <= a.y) {
				const [x1, y1, x2, y2] = [a.x + a.w / 2, a.y, b.x + b.w / 2, b.y + b.h];
				const bend = Math.max(18, (y1 - y2) / 2);
				return [{ key, late, d: `M${x1},${y1} C${x1},${y1 - bend} ${x2},${y2 + bend} ${x2},${y2}` }];
			}
			// the same row: side to side
			const right = b.x >= a.x;
			const [x1, y1, x2, y2] = right
				? [a.x + a.w, a.y + a.h / 2, b.x, b.y + b.h / 2]
				: [a.x, a.y + a.h / 2, b.x + b.w, b.y + b.h / 2];
			const bend = (x2 - x1) / 2;
			return [{ key, late, d: `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}` }];
		});
	}

	// redraw when the chain or the board changes; once more after chips
	// finish sliding into place
	$effect(() => {
		void edges;
		void version;
		void tick().then(measure);
		const settle = setTimeout(measure, 450);
		return () => clearTimeout(settle);
	});

	$effect(() => {
		const observer = new ResizeObserver(() => measure());
		observer.observe(grid);
		return () => observer.disconnect();
	});
</script>

<svelte:window onresize={measure} />

<svg class="prereq-lines" width={size.w} height={size.h} aria-hidden="true">
	<defs>
		<marker id="pl-ok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
			<path d="M0,0 L8,4 L0,8 z" class="head ok" />
		</marker>
		<marker
			id="pl-late"
			viewBox="0 0 8 8"
			refX="7"
			refY="4"
			markerWidth="7"
			markerHeight="7"
			orient="auto-start-reverse"
		>
			<path d="M0,0 L8,4 L0,8 z" class="head late" />
		</marker>
	</defs>
	{#each lines as line (line.key)}
		<path d={line.d} class="line" class:late={line.late} marker-end="url(#{line.late ? 'pl-late' : 'pl-ok'})" />
	{/each}
</svg>

<style lang="scss">
	.prereq-lines {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
		overflow: visible;
		pointer-events: none;
	}

	.line {
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 2;
		opacity: 0.85;

		&.late {
			stroke: var(--color-danger);
			stroke-dasharray: 5 4;
		}
	}

	.head {
		&.ok {
			fill: var(--color-accent);
		}
		&.late {
			fill: var(--color-danger);
		}
	}
</style>

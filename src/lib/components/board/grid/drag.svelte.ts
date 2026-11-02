// dragging a course over the grid. drops resolve against the whole grid, not
// the cell under the pointer, so letting go in the gap between cells still
// lands the course in the nearest slot instead of snapping it back.
import { tick } from 'svelte';
import { isCore } from '$lib/curriculum/data';
import { reducedMotion } from '$lib/ui/transitions';
import type { Plan } from '$lib/planner/plan.svelte';
import type { TrimNum } from '$lib/types';

type Slot = { year: number; trim: TrimNum };
/** where in a cell the course would go; a drop back onto its own spot is a no-op */
export type Aim = { index: number; noop: boolean };

const slotKey = (s: Slot) => `${s.year}-${s.trim}`;

export class GridDrag {
	/** the cell being aimed at, "year-trim" */
	target = $state<string | null>(null);
	aim = $state<Aim | null>(null);
	grid: HTMLElement | undefined;
	#plan: Plan;

	constructor(plan: Plan) {
		this.#plan = plan;
	}

	/** the landing slot to draw in a cell, if the course in hand would land there */
	landingIn(key: string): Aim | null {
		return this.#plan.dragging && this.target === key && this.aim && !this.aim.noop ? this.aim : null;
	}

	#cell(key: string) {
		const [year, trim] = key.split('-');
		return this.grid?.querySelector<HTMLElement>(`.cell[data-year="${year}"][data-trim="${trim}"]`) ?? null;
	}

	// year 1's core-only cells only pull in a foundation course
	#nearest(x: number, y: number, code: string): Slot | null {
		if (!this.grid) return null;
		const core = isCore(code);
		let best: HTMLElement | null = null;
		let bestDist = Infinity;
		for (const el of this.grid.querySelectorAll<HTMLElement>('.cell')) {
			if (!core && el.dataset.coreOnly) continue;
			const r = el.getBoundingClientRect();
			const dx = Math.max(r.left - x, 0, x - r.right);
			const dy = Math.max(r.top - y, 0, y - r.bottom);
			if (dx * dx + dy * dy < bestDist) {
				bestDist = dx * dx + dy * dy;
				best = el;
			}
		}
		return best && { year: Number(best.dataset.year), trim: Number(best.dataset.trim) as TrimNum };
	}

	// before a chip if the pointer is above its row, or in its row short of its
	// middle (its vertical middle when titles stack chips one per row).
	// offsetTop/Left are the resting layout, so a chip mid-glide can't make
	// the aim flicker
	#aimAt(slot: Slot, x: number, y: number, code: string): Aim | null {
		const cell = this.#cell(slotKey(slot));
		if (!cell) return null;
		const c = cell.getBoundingClientRect();
		const cx = x - c.left;
		const cy = y - c.top;
		const chips = [...cell.querySelectorAll<HTMLElement>(':scope > .chip')].filter((el) => el.dataset.code !== code);
		let index = 0;
		for (; index < chips.length; index++) {
			const { offsetLeft: left, offsetTop: top, offsetWidth: w, offsetHeight: h } = chips[index];
			if (cy < top) break;
			if (cy <= top + h && (this.#plan.showTitles ? cy < top + h / 2 : cx < left + w / 2)) break;
		}
		return { index, noop: this.#plan.slotCourses(slot.year, slot.trim).indexOf(code) === index };
	}

	// when the landing slot opens, moves or closes, the chips around it glide
	// to their new places (FLIP on `translate`, so a chip's own hover
	// transform is left alone)
	async #aimTo(key: string | null, next: Aim | null) {
		if (key === this.target && next?.index === this.aim?.index && next?.noop === this.aim?.noop) return;
		const keys = [...new Set([this.target, key].filter((k): k is string => k !== null))];
		const els = keys.flatMap((k) => [
			...(this.#cell(k)?.querySelectorAll<HTMLElement>(':scope > .chip, :scope > .ghost') ?? [])
		]);
		const before = els.map((el) => [el, el.getBoundingClientRect()] as const);
		this.target = key;
		this.aim = next;
		await tick();
		if (reducedMotion()) return;
		for (const [el, r] of before) {
			if (!el.isConnected) continue;
			const now = el.getBoundingClientRect();
			const dx = r.left - now.left;
			const dy = r.top - now.top;
			if (dx || dy)
				el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], {
					duration: 200,
					easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
				});
		}
	}

	/** a chip's CSS `order`, so the DOM never reshuffles mid-drag: spaced by
	 *  four so the landing slot (index × 4) fits between two chips, and the
	 *  dragged course's empty outline keeps its spot */
	order(key: string, codes: string[], code: string, i: number): number {
		const dragging = this.#plan.dragging;
		if (!dragging || this.target !== key || !this.aim || this.aim.noop) return i * 4 + 2;
		if (code === dragging) return i * 4 + 1;
		const from = codes.indexOf(dragging);
		return (from !== -1 && from < i ? i - 1 : i) * 4 + 2;
	}

	start(e: DragEvent, code: string) {
		e.dataTransfer?.setData('text/plain', code);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
		this.#plan.dragging = code;
	}

	over(e: DragEvent) {
		e.preventDefault();
		const code = this.#plan.dragging;
		const slot = code ? this.#nearest(e.clientX, e.clientY, code) : null;
		void this.#aimTo(slot && slotKey(slot), slot && code ? this.#aimAt(slot, e.clientX, e.clientY, code) : null);
	}

	leave(e: DragEvent) {
		if (!this.grid?.contains(e.relatedTarget as Node)) void this.#aimTo(null, null);
	}

	drop(e: DragEvent) {
		e.preventDefault();
		// land where the slot is showing: re-measuring now would read chips
		// that already stepped aside for it. plan.dragging is cleared by now,
		// so the code comes off the drag itself
		const shown = this.aim;
		const shownIn = this.target;
		this.target = null;
		this.aim = null;
		this.#plan.dragging = null;
		const code = e.dataTransfer?.getData('text/plain');
		const slot = code ? this.#nearest(e.clientX, e.clientY, code) : null;
		if (!code || !slot) return;
		const at = shown && shownIn === slotKey(slot) ? shown.index : this.#aimAt(slot, e.clientX, e.clientY, code)?.index;
		this.#plan.place(code, slot.year, slot.trim, at);
	}
}

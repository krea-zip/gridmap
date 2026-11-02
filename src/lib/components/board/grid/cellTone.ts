import type { Plan } from '$lib/plan.svelte';

// a cell takes the colours of its courses, weighted by count (4 psychology +
// 2 environmental studies → ⅔ psych, ⅓ env), so a trimester's subject mix
// reads at a glance. kccs brings its blush; other-department courses the
// plain cell grey.
export function cellTone(plan: Plan, codes: string[]): string | undefined {
	const counts = new Map<string, number>();
	for (const code of codes) {
		const type = plan.courseType(code);
		const hue = type === 'other' ? undefined : plan.hueOf(code);
		const tone =
			type === 'core'
				? 'color-mix(in oklab, var(--color-course-core) 45%, var(--color-grid-cell))'
				: hue !== undefined
					? `oklch(var(--tone-cell-l) var(--tone-cell-c) ${hue})`
					: 'var(--color-grid-cell)';
		counts.set(tone, (counts.get(tone) ?? 0) + 1);
	}
	const entries = [...counts];
	if (!entries.length) return undefined;
	// color-mix takes two colours at a time, so fold from the back, each step
	// mixing one tone in at its share of what's left
	let [mix, rest] = entries[entries.length - 1];
	for (let i = entries.length - 2; i >= 0; i--) {
		const [tone, n] = entries[i];
		rest += n;
		mix = `color-mix(in oklab, ${tone} ${((n / rest) * 100).toFixed(1)}%, ${mix})`;
	}
	return mix;
}

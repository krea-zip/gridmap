// two programmes on one plan never share a colour, and a subject only ever
// leaves its own hue when it has to
import { expect, test } from 'vitest';
import { distinctHues, MIN_GAP } from '$lib/planner/hues';

const HUES: Record<string, number> = { chemistry: 310, 'computer science': 325, mathematics: 250, literature: 340 };
const hueOf = (s: string) => HUES[s];
const gap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

test('subjects far apart keep their own hues', () => {
	const hues = distinctHues(['chemistry', 'mathematics'], hueOf);
	expect([...hues.values()]).toEqual([310, 250]);
});

test('the first programme keeps its hue; a close second moves clear of it, inside the palette arc', () => {
	const hues = distinctHues(['chemistry', 'computer science'], hueOf);
	expect(hues.get('chemistry')).toBe(310);
	const moved = hues.get('computer science')!;
	expect(gap(moved, 310)).toBeGreaterThanOrEqual(MIN_GAP);
	expect(moved).toBeGreaterThanOrEqual(112);
	expect(moved).toBeLessThanOrEqual(345);
});

test('three programmes are all kept apart', () => {
	const hues = [...distinctHues(['chemistry', 'computer science', 'literature'], hueOf).values()];
	for (const [i, a] of hues.entries())
		for (const b of hues.slice(i + 1)) expect(gap(a, b)).toBeGreaterThanOrEqual(MIN_GAP);
});

test('subjects without a hue (the open minor) are skipped', () => {
	expect(distinctHues(['open', 'chemistry'], hueOf).has('open')).toBe(false);
});

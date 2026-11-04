// the running credit balance a trimester's foot shows, the deficit/surplus
// column students kept by hand in the ministry of learning's spreadsheet.
// built on a plan whose even pace is exactly 16 a trimester, so each case
// reads as plain arithmetic.
import { beforeEach, expect, test } from 'vitest';
import { Plan } from '$lib/planner/plan.svelte';
import { COURSES, isCore } from '$lib/curriculum/data';
import { slotKey, TRIMS } from '$lib/types';

const FOURS = COURSES.filter((c) => c.credits === 4 && !isCore(c.code)).map((c) => c.code);
let plan: Plan;

// four 4-credit courses in every trimester from year 2 on, and 16 credits in
// year 1, so 144 more over nine trimesters reaches 160 at 16 apiece
beforeEach(() => {
	plan = new Plan();
	plan.fourYear = true;
	plan.yearCount = 4;
	plan.creditTargetMode = 'minimum';
	let next = 0;
	const four = () => FOURS.slice(next, (next += 4));
	plan.placements = { [slotKey(1, 3)]: four() };
	for (const year of [2, 3, 4]) for (const trim of TRIMS) plan.placements[slotKey(year, trim)] = four();
	plan.now = { year: 4, trim: 3 };
});

test('a plan on an even pace marks nothing', () => {
	expect(plan.creditTarget).toBe(160);
	for (const year of [1, 2, 3, 4]) for (const trim of TRIMS) expect(plan.slotPace(year, trim)).toBeNull();
});

test('a light trimester shows the deficit there and in every trimester after it', () => {
	plan.placements[slotKey(2, 2)] = plan.placements[slotKey(2, 2)].slice(1);
	expect(plan.slotPace(2, 1)).toBeNull();
	expect(plan.slotPace(2, 2)).toBe(-4);
	expect(plan.slotPace(4, 3)).toBe(-4);
});

test('a heavy trimester banks a surplus that a lighter one later spends', () => {
	plan.placements[slotKey(3, 1)] = [...plan.placements[slotKey(3, 1)], FOURS[200]];
	plan.placements[slotKey(3, 3)] = plan.placements[slotKey(3, 3)].slice(1);
	expect(plan.slotPace(3, 1)).toBe(4);
	expect(plan.slotPace(3, 2)).toBe(4);
	expect(plan.slotPace(3, 3)).toBeNull();
});

test('trimesters after "now" show nothing, their electives may not be picked yet', () => {
	plan.placements[slotKey(2, 2)] = [];
	plan.now = { year: 3, trim: 1 };
	expect(plan.slotPace(3, 1)).toBe(-16);
	expect(plan.slotPace(3, 2)).toBeNull();
});

test('a term off expects nothing; the other trimesters carry its share', () => {
	plan.placements[slotKey(2, 3)] = [];
	plan.breaks = { [slotKey(2, 3)]: { kind: 'break' } };
	// 144 over the eight trimesters left is 18 each, so 16 falls 2 behind a term
	expect(plan.slotPace(2, 1)).toBeNull();
	expect(plan.slotPace(2, 2)).toBe(-4);
	expect(plan.slotPace(2, 3)).toBeNull();
});

test('an away term counts the credits it brings back', () => {
	plan.placements[slotKey(2, 3)] = [];
	plan.breaks = { [slotKey(2, 3)]: { kind: 'away', credits: 16 } };
	expect(plan.slotPace(4, 3)).toBeNull();
});

// a three-year tenure tops out at 128 credits, but a double major in three
// years may stretch it to 132. four years stays at 176 either way.
import { expect, test } from 'vitest';
import { Plan } from '$lib/planner/plan.svelte';
import { COURSES, isCore } from '$lib/curriculum/data';
import { slotKey, TRIMS, type StructureKind } from '$lib/types';

function planFor(structure: StructureKind, fourYear: boolean) {
	const plan = new Plan();
	plan.fourYear = fourYear;
	plan.structure = structure;
	plan.picks = { major1: 'economics', major2: 'history', minor: 'history', conc: 'history' };
	plan.yearCount = plan.minYears;
	plan.placements = {};
	return plan;
}

/** a plan holding exactly `credits`, in 4-credit courses */
function withCredits(plan: Plan, credits: number) {
	const fours = COURSES.filter((c) => c.credits === 4 && !isCore(c.code)).map((c) => c.code);
	const slots = plan.years.flatMap((y) => TRIMS.map((t) => slotKey(y, t)));
	plan.placements = {};
	for (let i = 0; i < credits / 4; i++) {
		const key = slots[i % slots.length];
		plan.placements[key] = [...(plan.placements[key] ?? []), fours[i]];
	}
}

const overCeiling = (plan: Plan) => plan.hints.some((h) => h.id === 'credit-ceiling');

test.each([
	['double-major', false, 132],
	['major-minor', false, 128],
	['single-major', false, 128],
	['double-major', true, 176],
	['major-minor', true, 176]
] as const)('%s, four years %s: the ceiling is %i', (structure, fourYear, ceiling) => {
	expect(planFor(structure, fourYear).creditCeiling).toBe(ceiling);
});

test('a three-year double major may hold 132 credits, not a credit more', () => {
	const plan = planFor('double-major', false);
	withCredits(plan, 132);
	expect(overCeiling(plan)).toBe(false);
	withCredits(plan, 136);
	expect(overCeiling(plan)).toBe(true);
});

test('a three-year major and minor is still held to 128', () => {
	const plan = planFor('major-minor', false);
	withCredits(plan, 132);
	expect(overCeiling(plan)).toBe(true);
});

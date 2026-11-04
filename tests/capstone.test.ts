// a capstone the department documents promise but the catalogue has no code
// for: the planner places a stand-in. optional ones count as electives,
// chemistry's required one is seeded and owed like any required course.
import { expect, test } from 'vitest';
import { Plan } from '$lib/planner/plan.svelte';
import { CAPSTONES, capstoneFor, isCapstone } from '$lib/curriculum/data';
import { courseCodes } from '$lib/server/site';
import { slotKey, type StructureKind } from '$lib/types';

function planFor(major1: string, fourYear = true, structure: StructureKind = 'single-major') {
	const plan = new Plan();
	plan.fourYear = fourYear;
	plan.structure = structure;
	plan.picks = { major1, major2: 'history', minor: 'physics', conc: 'physics' };
	plan.yearCount = plan.minYears;
	plan.placements = {};
	return plan;
}

const capstoneOf = (subject: string) => CAPSTONES.find((c) => c.subject === subject)!.code;

test('departments whose documents state a capstone get exactly one stand-in each', () => {
	expect(CAPSTONES.map((c) => c.code).sort()).toEqual(['BIOS-CAP', 'CHEM-CAP', 'LITT-CAP', 'POLT-CAP']);
	for (const c of CAPSTONES) {
		expect(c.credits).toBe(12);
		expect(c.eligibleYears).toEqual([4]);
		expect(isCapstone(c.code)).toBe(true);
	}
});

test('the stand-in is the planner’s alone: the public site’s course list never sees it', () => {
	for (const c of CAPSTONES) expect(courseCodes()).not.toContain(c.code);
});

test('a 4-year literature major lists its optional capstone as an elective', () => {
	const plan = planFor('literature');
	const code = capstoneOf('literature');
	expect(plan.courseType(code)).toBe('elective');
	expect(plan.catalogue.map((c) => c.code)).toContain(code);
});

test('placed in year 4, it fills 12 of the elective credits it stands in for', () => {
	const plan = planFor('literature');
	const before = plan.stats[0].electiveDone;
	plan.placements = { [slotKey(4, 1)]: [capstoneOf('literature')] };
	expect(plan.stats[0].electiveDone - before).toBe(12);
});

test('a programme without one never lists it', () => {
	const plan = planFor('literature', false); // the 3-year major has no capstone
	const code = capstoneOf('literature');
	expect(capstoneFor('literature', 'major', false, false, plan.batchStartYear)).toBeUndefined();
	expect(plan.courseType(code)).toBe('other');
	expect(plan.catalogue.map((c) => c.code)).not.toContain(code);
	expect(planFor('economics').catalogue.some((c) => isCapstone(c.code))).toBe(false);
});

test('it only fits a final year', () => {
	const plan = planFor('literature');
	const code = capstoneOf('literature');
	expect(plan.canDrop(code, 3, 1)).toBe(false);
	expect(plan.canDrop(code, 4, 1)).toBe(true);
});

test('chemistry’s required capstone is seeded by the suggested path, in year 4', () => {
	const plan = planFor('chemistry');
	const code = capstoneOf('chemistry');
	expect(plan.courseType(code)).toBe('required');
	const at = Object.entries(plan.recommended).find(([, codes]) => codes.includes(code));
	expect(at?.[0]).toMatch(/^4-/);
});

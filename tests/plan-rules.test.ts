// the planner's rules: where a course may be dropped, and the hints a plan
// raises. these are the university's regulations as kcal reads them, so a
// change here should be a deliberate one. placements are set directly,
// because some broken plans (a prerequisite after its course) can't be made
// by dragging, yet still arrive from old saves and shared links.
import { beforeEach, describe, expect, test } from 'vitest';
import { Plan } from '$lib/planner/plan.svelte';
import {
	byCode,
	COURSES,
	HEAVY_TRIMS_ALLOWED,
	isCore,
	MAX_TOTAL_4YR,
	TRIM_HARD_MAX,
	TRIM_MIN,
	TRIM_STANDARD_MAX,
	Y1_CORE_MAX,
	CORE_COURSES
} from '$lib/curriculum/data';
import type { TrimNum } from '$lib/types';

// 4-credit courses open to years 2 to 4 with no prerequisites, so a
// trimester can be filled to a known credit count. (they may not run in
// every trimester; the tests that use them only look at load hints)
const FILLER = COURSES.filter(
	(c) =>
		!isCore(c.code) &&
		c.credits === 4 &&
		!c.prereqs.length &&
		(!c.eligibleYears.length || [2, 3, 4].every((y) => c.eligibleYears.includes(y)))
).map((c) => c.code);

// an ordinary course a first-year can take in t3
const FIRST_YEAR = COURSES.find(
	(c) =>
		!isCore(c.code) &&
		!c.prereqs.length &&
		(!c.eligibleYears.length || c.eligibleYears.includes(1)) &&
		(!c.offered.length || c.offered.includes(3))
)!.code;

/** fill trimesters with that many filler courses each: { '2-1': 3 } */
function fill(plan: Plan, counts: Record<string, number>) {
	const pool = [...FILLER];
	plan.placements = Object.fromEntries(Object.entries(counts).map(([slot, n]) => [slot, pool.splice(0, n)]));
}

const hint = (plan: Plan, id: string) => plan.hints.find((h) => h.id === id);
const texts = (plan: Plan) => plan.hints.map((h) => h.text);

let plan: Plan;
beforeEach(() => {
	plan = new Plan();
	plan.placements = {};
});

test('the curriculum facts these tests lean on still hold', () => {
	expect(byCode('MATH341').prereqs).toContain('MATH304');
	expect(byCode('MATH341').offered).toEqual([2]);
	expect(byCode('MATH304').eligibleYears).toEqual([3, 4]);
	expect(isCore('KCCS101')).toBe(true);
	expect(FILLER.length).toBeGreaterThanOrEqual(45);
	expect([TRIM_MIN, TRIM_STANDARD_MAX, TRIM_HARD_MAX, HEAVY_TRIMS_ALLOWED]).toEqual([12, 18, 20, 2]);
});

describe('where a course may be dropped', () => {
	test('year 1 t1 and t2 take only foundation courses', () => {
		expect(plan.canDrop('KCCS101', 1, 1)).toBe(true);
		expect(plan.canDrop(FIRST_YEAR, 1, 1)).toBe(false);
		expect(plan.canDrop(FIRST_YEAR, 1, 3)).toBe(true);
	});

	test('a course goes only in a trimester it runs in', () => {
		expect(plan.canDrop('MATH341', 3, 2)).toBe(true);
		expect(plan.canDrop('MATH341', 3, 1)).toBe(false);
	});

	test('a course goes only in a year it is open to, a fifth year counting as the fourth', () => {
		expect(plan.canDrop('MATH304', 2, 1)).toBe(false);
		expect(plan.canDrop('MATH304', 3, 1)).toBe(true);
		expect(plan.canDrop('MATH304', 5, 1)).toBe(true);
	});

	test('a placed prerequisite must sit strictly earlier', () => {
		plan.placements = { '4-1': ['MATH304'] };
		expect(plan.canDrop('MATH341', 3, 2)).toBe(false);
		expect(plan.canDrop('MATH341', 4, 2)).toBe(true);
	});

	test('nothing goes into a trimester off', () => {
		plan.setBreak(3, 2, { kind: 'break' });
		expect(plan.canDrop('MATH341', 3, 2)).toBe(false);
	});
});

describe('prerequisites', () => {
	test('missing, in the same trimester, and after: each raises the same waivable rule', () => {
		const id = 'prereq:MATH341:MATH304';

		// each says where the prerequisite is, which is the fix
		plan.placements = { '3-2': ['MATH341'] };
		expect(hint(plan, id)?.text).toBe('MATH341 needs MATH304 first, not on your plan yet');

		plan.placements = { '3-2': ['MATH341', 'MATH304'] };
		expect(hint(plan, id)?.text).toBe('MATH341 needs MATH304 first, both are in y3 t2');

		plan.placements = { '3-2': ['MATH341'], '4-1': ['MATH304'] };
		expect(hint(plan, id)?.text).toBe("MATH341 needs MATH304 first, but it's in y4 t1");
		expect(hint(plan, id)?.kind).toBe('warn');
	});

	test('in order raises nothing', () => {
		plan.placements = { '3-1': ['MATH304'], '3-2': ['MATH341'] };
		expect(hint(plan, 'prereq:MATH341:MATH304')).toBeUndefined();
	});

	test('a crossed-off rule leaves the hints and is listed as crossed off', () => {
		plan.placements = { '3-2': ['MATH341'], '4-1': ['MATH304'] };
		plan.waiveHint('prereq:MATH341:MATH304');
		expect(hint(plan, 'prereq:MATH341:MATH304')).toBeUndefined();
		expect(plan.waivedHints.map((h) => h.id)).toContain('prereq:MATH341:MATH304');
	});
});

describe('year 1', () => {
	test('a non-foundation course in t1 or t2 is flagged', () => {
		plan.placements = { '1-1': ['KCCS101', FIRST_YEAR] };
		expect(hint(plan, 'core-only:1-1')?.codes).toEqual([FIRST_YEAR]);
	});

	test(`more than ${Y1_CORE_MAX} foundation courses in one trimester is flagged`, () => {
		plan.placements = { '1-1': CORE_COURSES.slice(0, Y1_CORE_MAX + 1).map((c) => c.code) };
		expect(hint(plan, 'core-max:1-1')).toBeDefined();
	});

	test('year 1 has no credit minimum or cap', () => {
		plan.placements = { '1-3': FILLER.slice(0, 6) };
		const loads = texts(plan).filter((t) => /credit/.test(t) && /y1 t3/.test(t));
		expect(loads).toEqual([]);
	});
});

describe('trimester loads', () => {
	const allNine = (n: number) => Object.fromEntries([2, 3, 4].flatMap((y) => [1, 2, 3].map((t) => [`${y}-${t}`, n])));

	test(`a trimester under ${TRIM_MIN} credits is named`, () => {
		fill(plan, { ...allNine(3), '2-1': 2 });
		expect(texts(plan)).toContain(`y2 t1 has 8 of the ${TRIM_MIN} credits it needs`);
	});

	test('many thin trimesters fold into one hint', () => {
		fill(plan, allNine(1));
		const thin = plan.hints.filter((h) => /^(under \d+ credits|.* credits it needs)/.test(h.text));
		expect(thin).toHaveLength(1);
		expect(thin[0].text).toMatch(/^under \d+ credits: (y\d t\d \d+( · |$)){9}/);
	});

	test(`over ${TRIM_HARD_MAX} credits is over the cap`, () => {
		fill(plan, { ...allNine(3), '2-2': 6 });
		expect(texts(plan)).toContain(`y2 t2 is over the ${TRIM_HARD_MAX}-credit cap (24/${TRIM_HARD_MAX})`);
	});

	test(`up to ${HEAVY_TRIMS_ALLOWED} heavy trimesters are a note, more is a caution`, () => {
		fill(plan, { ...allNine(3), '2-1': 5, '2-2': 5 });
		expect(plan.hints.filter((h) => h.text.includes('is a heavy trimester'))).toHaveLength(2);

		fill(plan, { ...allNine(3), '2-1': 5, '2-2': 5, '2-3': 5 });
		expect(texts(plan)).toContain(
			`only ${HEAVY_TRIMS_ALLOWED} trimesters in your whole tenure may go over ${TRIM_STANDARD_MAX} credits; you have 3`
		);
	});

	test(`the four-year total may not pass ${MAX_TOTAL_4YR}`, () => {
		fill(plan, allNine(5));
		expect(hint(plan, 'credit-ceiling')?.text).toMatch(`(180/${MAX_TOTAL_4YR})`);
	});
});

describe('trimester naming', () => {
	test('hints name a trimester the way the student counts them', () => {
		plan.placements = { '3-2': ['MATH341', 'MATH304'] };
		expect(hint(plan, 'prereq:MATH341:MATH304')?.text).toMatch(/y3 t2$/);
		plan.trimNaming = 'degree';
		expect(hint(plan, 'prereq:MATH341:MATH304')?.text).toMatch(/t8$/);
	});

	test('through the degree, a course that only runs in t2 is described by its months', () => {
		plan.placements = { '3-1': ['MATH341'] };
		plan.trimNaming = 'degree';
		const t: TrimNum = 1;
		expect(hint(plan, `offered:MATH341:t${t}`)?.text).toBe("MATH341 doesn't run in t7, it runs in nov to jan");
	});
});

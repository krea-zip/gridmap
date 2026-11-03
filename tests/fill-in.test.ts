// "fill in" replaced two buttons (add the required courses, accept the
// suggestions) that each missed what the other caught. these are the
// degrees where the two used to disagree, from an empty grid.
import { expect, test } from 'vitest';
import { Plan } from '$lib/planner/plan.svelte';
import { byCode } from '$lib/curriculum/data';
import type { StructureKind } from '$lib/types';

function filled(major: string, minor: string, structure: StructureKind = 'major-minor') {
	const plan = new Plan();
	plan.structure = structure;
	plan.picks = { ...plan.picks, major1: major, minor };
	plan.placements = {};
	const promised = plan.fillCount;
	plan.fillIn();
	return { plan, promised, placed: [...plan.placedCodes] };
}

const DEGREES: [string, string][] = [
	['mathematics', 'computer science'],
	['mathematics', 'data science'],
	['mathematics', 'psychology'],
	['computer science', 'mathematics'],
	['chemistry', 'psychology'],
	['economics', 'data science'],
	['economics', 'psychology']
];

test.each(DEGREES)('%s + %s minor: afterwards there is nothing left to fill', (major, minor) => {
	const { plan } = filled(major, minor);
	expect(plan.fillCount).toBe(0);
	expect(plan.suggestionCount).toBe(0);
});

test.each(DEGREES)('%s + %s minor: a required course left off is named, not dropped quietly', (major, minor) => {
	const { plan } = filled(major, minor);
	for (const code of plan.missingRequiredCodes) expect(plan.flash).toContain(plan.courseLabel(code));
});

// one-way: maths' linear algebra clears the applied one, so never both
test.each(DEGREES)('%s + %s minor: no applied course beside the maths one that clears it', (major, minor) => {
	const { placed } = filled(major, minor);
	for (const code of placed) expect((byCode(code).coveredBy ?? []).filter((m) => placed.includes(m))).toEqual([]);
});

test.each(DEGREES)('%s + %s minor: the button adds exactly as many as it says', (major, minor) => {
	const { promised, placed } = filled(major, minor);
	expect(placed.length).toBe(promised);
});

test('a prerequisite the path brings stays, though nothing requires it', () => {
	expect(filled('mathematics', 'psychology').placed).toContain('PSYC205');
});

test('a required course the path had no room for still finds a trimester', () => {
	expect(filled('economics', 'data science').placed).toContain('ECON313');
});

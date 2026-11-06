import { expect, test } from 'vitest';
import { Plan } from '$lib/planner/plan.svelte';

function csAndMath(code: string) {
	const plan = new Plan();
	plan.batchStartYear = 2024;
	plan.fourYear = false;
	plan.structure = 'major-minor';
	plan.picks.major1 = 'computer science';
	plan.picks.minor = 'mathematics';
	plan.placements = { '2-1': [code] };
	return plan;
}

test.each(['MATH230', 'MATH191', 'COMP201'])('%s counts toward both CS and maths, once toward graduation', (code) => {
	const plan = csAndMath(code);
	expect(plan.claims.get(code)).toEqual([0, 1]);
	expect(plan.stats.map((s) => s.requiredDone)).toEqual([4, 4]);
	expect(plan.stats.map((s) => s.electiveDone)).toEqual([0, 0]);
	expect(plan.totalPlacedCredits).toBe(4);
});

test('applied linear algebra does not replace the maths requirement', () => {
	const plan = csAndMath('COMP208');
	expect(plan.stats[0].requiredDone).toBe(4);
	expect(plan.stats[1].requiredDone).toBe(0);
	expect(plan.stats[1].requiredLeft).toContain('MATH230');
});

test('sharing equivalent requirements does not double the degree total', () => {
	const plan = csAndMath('MATH230');
	plan.placements = { '2-1': ['MATH230', 'MATH191'] };
	expect(plan.stats.map((s) => s.requiredDone)).toEqual([8, 8]);
	expect(plan.totalPlacedCredits).toBe(8);
	plan.placements = {};
	expect(plan.stats.map((s) => s.requiredDone)).toEqual([0, 0]);
});

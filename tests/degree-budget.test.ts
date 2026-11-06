import { expect, test } from 'vitest';
import { Plan } from '$lib/planner/plan.svelte';
import { byCode } from '$lib/curriculum/data';

test.each([false, true])('single CS major recommendations reach the degree target, four years: %s', (fourYear) => {
	const plan = new Plan();
	plan.fourYear = fourYear;
	plan.batchStartYear = 2024;
	plan.structure = 'single-major';
	plan.picks.major1 = 'computer science';
	const required = Object.values(plan.recommended)
		.flat()
		.reduce((sum, code) => sum + byCode(code).credits, 0);
	expect(plan.degreeTotal).toBe(fourYear ? 116 : 96);
	expect(plan.creditTarget).toBe(fourYear ? 160 : 120);
	expect(required + plan.recommendedElectiveCredits).toBe(plan.creditTarget);
	expect(required + plan.recommendedElectiveCount * 4).toBe(plan.creditTarget);
});

test('the required CS path flags a degree shortfall until the minimum is reached', () => {
	const plan = new Plan();
	plan.fourYear = false;
	plan.batchStartYear = 2024;
	plan.structure = 'single-major';
	plan.picks.major1 = 'computer science';
	plan.placements = plan.recommended;
	const required = Object.values(plan.recommended)
		.flat()
		.reduce((sum, code) => sum + byCode(code).credits, 0);
	expect(plan.hints.find((h) => h.id === 'credit-minimum')?.text).toContain(`${120 - required} more credits`);
	// Away credits count toward the degree total, even though they do not
	// fill programme requirements.
	plan.breaks = { '4-1': { kind: 'away', credits: 120 - required } };
	expect(plan.hints.some((h) => h.id === 'credit-minimum')).toBe(false);
	plan.creditTargetMode = 'maximum';
	expect(plan.hints.some((h) => h.id === 'credit-minimum')).toBe(false);
});

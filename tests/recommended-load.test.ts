// the suggested path spreads a degree's courses over its trimesters: never
// past the normal load in one, and no years left nearly empty while others
// are full. checked over every major with every minor and concentration,
// because single programmes were always fine; it's the combinations that
// used to stack up.
import { describe, expect, test } from 'vitest';
import { Plan } from '$lib/planner/plan.svelte';
import { recommendedPath } from '$lib/planner/recommended';
import { byCode, MAJOR_SUBJECTS, PROGRAMME_SUBJECTS, TRIM_NORMAL_MAX } from '$lib/curriculum/data';
import { slotKey, TRIMS, type StructureKind } from '$lib/types';

function planFor(structure: StructureKind, major1: string, other: string, fourYear = true) {
	const plan = new Plan();
	plan.fourYear = fourYear;
	plan.structure = structure;
	plan.picks = { major1, major2: other, minor: other, conc: other };
	plan.yearCount = plan.minYears;
	plan.placements = {};
	return plan;
}

/** credits in each trimester that takes programme courses, in order */
const loads = (plan: Plan, grid: Record<string, string[]>) =>
	plan.seedYears.flatMap((y) =>
		TRIMS.filter((t) => !plan.coreOnly(y, t)).map((t) =>
			(grid[slotKey(y, t)] ?? []).reduce((sum, c) => sum + byCode(c).credits, 0)
		)
	);

const COMBOS = MAJOR_SUBJECTS.flatMap((a) =>
	PROGRAMME_SUBJECTS.filter((b) => b.id !== a.id).flatMap((b) =>
		(['major-minor', 'major-conc'] as StructureKind[]).map((s) => [s, a.id, b.id] as const)
	)
);

describe.each([true, false])('a %s-year degree', (fourYear) => {
	test('the path never puts more than the normal load in a trimester', () => {
		for (const [structure, a, b] of COMBOS) {
			const plan = planFor(structure, a, b, fourYear);
			expect(Math.max(...loads(plan, recommendedPath(plan))), `${a} + ${b}`).toBeLessThanOrEqual(TRIM_NORMAL_MAX);
		}
	});
});

test('a double major leaves no year nearly empty while others are full', () => {
	// computer science + economics was 16 16 16 in year 2 and 4 4 0 in year 4
	const plan = planFor('double-major', 'computer science', 'economics');
	const l = loads(plan, recommendedPath(plan));
	expect(Math.max(...l) - Math.min(...l)).toBeLessThan(16);
});

test('fill in respects the target load on a plan the student has already filled', () => {
	const plan = planFor('major-minor', 'economics', 'data science');
	plan.placements = recommendedPath(plan);
	plan.picks = { ...plan.picks, minor: 'psychology' }; // the degree changes under a full plan
	plan.fillIn();
	for (const l of loads(plan, plan.placements)) expect(l).toBeLessThanOrEqual(plan.targetLoad);
});

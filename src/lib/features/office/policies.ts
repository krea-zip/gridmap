// what each of the university's planner numbers means, in the office's words.
// the numbers themselves live in the draft (curriculum.rules); every hint,
// the credit panel and the grid's colours answer to them.
import type { PlannerRules } from '$lib/curriculum/snapshot';

export type RuleKey = keyof PlannerRules;
type RuleInfo = { label: string; help: string; unit: string; max: number };

export const RULE_INFO: Record<RuleKey, RuleInfo> = {
	TRIM_MIN: {
		label: 'Minimum per trimester',
		help: 'Below this a student drops out of full-time status; the planner flags any trimester under it.',
		unit: 'credits',
		max: 24
	},
	TRIM_NORMAL_MAX: {
		label: 'Recommended load',
		help: 'The normal registration, and the line the planner colours a trimester against.',
		unit: 'credits',
		max: 24
	},
	TRIM_STANDARD_MAX: {
		label: 'Most without an extra-load allowance',
		help: 'A trimester above this is heavy, allowed only a few times in the whole degree.',
		unit: 'credits',
		max: 24
	},
	TRIM_HARD_MAX: {
		label: 'Hard cap per trimester',
		help: 'No trimester may go above this.',
		unit: 'credits',
		max: 24
	},
	HEAVY_TRIMS_ALLOWED: {
		label: 'Heavy trimesters allowed',
		help: 'How many trimesters across the whole tenure may go above the extra-load line.',
		unit: 'trimesters',
		max: 12
	},
	AUDIT_LIMIT: {
		label: 'Audits allowed',
		help: 'Audited courses allowed across the whole degree.',
		unit: 'audits',
		max: 12
	},
	MIN_TOTAL_3YR: {
		label: 'Credits to graduate, 3-year',
		help: 'The fewest credits a three-year degree is awarded with.',
		unit: 'credits',
		max: 400
	},
	MIN_TOTAL_4YR: {
		label: 'Credits to graduate, 4-year',
		help: 'The fewest credits a four-year degree is awarded with.',
		unit: 'credits',
		max: 400
	},
	MAX_TOTAL_3YR: {
		label: 'Tenure ceiling, 3-year',
		help: 'The most credits a three-year student may register in total.',
		unit: 'credits',
		max: 400
	},
	MAX_TOTAL_4YR: {
		label: 'Tenure ceiling, 4-year',
		help: 'The most credits a four-year student may register in total.',
		unit: 'credits',
		max: 400
	}
};

export const RULE_GROUPS: { title: string; note: string; keys: RuleKey[] }[] = [
	{
		title: 'Each trimester',
		note: 'How many credits one trimester may hold.',
		keys: ['TRIM_MIN', 'TRIM_NORMAL_MAX', 'TRIM_STANDARD_MAX', 'TRIM_HARD_MAX']
	},
	{
		title: 'Across the whole degree',
		note: 'Limits counted over a student’s entire tenure.',
		keys: ['HEAVY_TRIMS_ALLOWED', 'AUDIT_LIMIT', 'MIN_TOTAL_3YR', 'MIN_TOTAL_4YR', 'MAX_TOTAL_3YR', 'MAX_TOTAL_4YR']
	}
];

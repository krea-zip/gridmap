// what's left for the student to choose: each programme's pick pools and
// electives that aren't on the plan yet and still fit somewhere on it.
import { byCode, hasCode, subjectById } from '$lib/curriculum/data';
import type { Plan } from './plan.svelte';

export type ElectiveGroup = { label: string; codes: string[] };

const fitsSomewhere = (plan: Plan, code: string) =>
	plan.years.some((year) => plan.trims.some((trim) => plan.canDrop(code, year, trim)));

/** one group per programme; a course two programmes share lists under the first */
export function electiveChoices(plan: Plan): ElectiveGroup[] {
	const listed = new Set<string>();
	return plan.programmes
		.map((programme, i) => {
			const { pick, elective } = plan.programmeSets[i];
			const open = [...pick, ...elective]
				.filter(hasCode)
				.map((code) => byCode(code).code)
				.filter((code) => !listed.has(code) && !plan.placedCodes.has(code) && fitsSomewhere(plan, code));
			const codes = [...new Set(open)];
			codes.forEach((code) => listed.add(code));
			return { label: `${subjectById(programme.subject).label} ${programme.role}`, codes };
		})
		.filter((group) => group.codes.length);
}

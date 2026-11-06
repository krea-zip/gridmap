import { byCode, choiceGroupsFor, hasCode, satisfiedBy, subjectById } from '$lib/curriculum/data';
import type { Plan } from './plan.svelte';

// ── choice pools per programme (history's "any three of…" groups) ──
// the website's 'choose N from' groups the seeded required core can't make
// for the student, shown in the sidebar so the choices are visible
// Each pool also says what its picks count toward, the programme's
// required credits (most pools), its electives, or either (literature's
// "from the required courses … and the elective courses"), and how many
// of it the plan already holds.
export const choicePools = (plan: Plan) =>
	plan.programmes
		.map((prog, i) => {
			const sets = plan.programmeSets[i];
			const countsAs = (code: string | null): 'required' | 'elective' | null => {
				if (!code || !hasCode(code)) return null;
				const codes = byCode(code).codes;
				if (codes.some((x) => sets.requiredAll.has(x) || sets.pick.has(x))) return 'required';
				if (codes.some((x) => sets.elective.has(x))) return 'elective';
				return null;
			};
			const groups = choiceGroupsFor(prog.subject, prog.role, plan.fourYear, plan.isDouble, plan.batchStartYear).map(
				(group) => {
					const kinds = new Set(group.courses.map((c) => countsAs(c.code)).filter((k) => k !== null));
					if (/elective/i.test(group.rule)) kinds.add('elective');
					const counts =
						kinds.has('elective') && kinds.has('required')
							? 'required or elective'
							: kinds.has('elective')
								? 'elective'
								: 'required'; // a pick pool fills required credits unless shown otherwise
					// how many of the pool are already on the plan, or satisfied by an
					// interchangeable course
					const placed = (code: string) =>
						plan.placedCodes.has(code) || satisfiedBy(code).some((sub) => plan.placedCodes.has(sub));
					const chosen = group.courses.filter((c) => c.code && hasCode(c.code) && placed(byCode(c.code).code)).length;
					return { ...group, rule: group.rule.replace(/[\s:.]+$/, ''), counts, chosen };
				}
			);
			return { role: prog.role, label: subjectById(prog.subject).label, groups };
		})
		.filter((p) => p.groups.length);

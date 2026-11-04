// The subject a degree names for each role (major, second major, minor,
// concentration), and what each role's dropdown may offer. One subject can't
// fill two roles, so the roles claim subjects in order: a later role can't
// take what an earlier one holds. The sidebar, the welcome and what-if all
// read these, so the rule lives once.
import { MAJOR_SUBJECTS, OPEN_MINOR, PROGRAMME_SUBJECTS } from '$lib/curriculum/data';
import type { StructureKind, Subject } from '$lib/types';

/** the four subject picks a degree can name */
export type Picks = { major1: string; major2: string; minor: string; conc: string };
export type PickRole = keyof Picks;

/** the roles each degree fills, in the order they claim their subjects */
export const ROLES_OF: Record<StructureKind, PickRole[]> = {
	'single-major': ['major1'],
	'double-major': ['major1', 'major2'],
	'major-minor': ['major1', 'minor'],
	'major-conc': ['major1', 'conc'],
	'major-minor-conc': ['major1', 'minor', 'conc']
};

export const ROLE_LABEL: Record<PickRole, string> = {
	major1: 'major',
	major2: 'second major',
	minor: 'minor',
	conc: 'concentration'
};

// the open minor (free courses, no declared subject) leads the minor's list
const POOL: Record<PickRole, Subject[]> = {
	major1: MAJOR_SUBJECTS,
	major2: MAJOR_SUBJECTS,
	minor: [OPEN_MINOR, ...PROGRAMME_SUBJECTS],
	conc: PROGRAMME_SUBJECTS
};

export type PickOption = { subject: Subject; heldAs?: string };

/** everything a role's dropdown lists. a subject an earlier role holds stays
 *  in the list, disabled and named by that role, so it reads as taken rather
 *  than missing */
export function pickOptions(structure: StructureKind, picks: Picks, role: PickRole): PickOption[] {
	const roles = ROLES_OF[structure];
	const earlier = roles.slice(0, Math.max(0, roles.indexOf(role)));
	const name = (r: PickRole) => (r === 'major1' && roles.includes('major2') ? 'first major' : ROLE_LABEL[r]);
	return POOL[role].map((subject) => {
		const by = earlier.find((r) => picks[r] === subject.id);
		return by ? { subject, heldAs: name(by) } : { subject };
	});
}

/** the dropdown text for an option: "mathematics (major)" when taken */
export const optionLabel = (o: PickOption) => (o.heldAs ? `${o.subject.label} (${o.heldAs})` : o.subject.label);

/** after a pick or a change of degree, a later role that collides with an
 *  earlier one moves to the first subject nobody holds (a minor bumped this
 *  way lands on a real subject, never the open minor) */
export function keepPicksDistinct(structure: StructureKind, picks: Picks) {
	const taken = new Set<string>();
	for (const role of ROLES_OF[structure]) {
		if (taken.has(picks[role])) {
			const free = POOL[role].find((s) => s !== OPEN_MINOR && !taken.has(s.id));
			if (free) picks[role] = free.id;
		}
		taken.add(picks[role]);
	}
}

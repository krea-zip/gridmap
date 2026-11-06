// what the welcome has been told so far. the plan holds a default for every
// pick, which mustn't show as if the student had chosen it, so this keeps
// which ones are real. the degree is never asked: it follows from the slots
// the student keeps, and every answer writes it back to the plan so the grid
// behind fills in as they go.
import { ROLES_OF, type PickRole } from '$lib/planner/picks';
import type { Plan } from '$lib/planner/plan.svelte';
import type { ProgrammeRole, StructureKind } from '$lib/types';

type Extra = Exclude<PickRole, 'major1'>;

export class DegreeAnswers {
	#plan: Plan;
	answered = $state({ batch: false, major1: false, major2: false, minor: false, conc: false });
	// Start with one major; every additional programme is an explicit choice.
	extras = $state<Extra[]>([]);
	active = $state<PickRole>('major1');

	structure: StructureKind = $derived.by(() => {
		const has = (role: Extra) => this.extras.includes(role);
		if (has('major2')) return 'double-major';
		if (has('minor')) return has('conc') ? 'major-minor-conc' : 'major-minor';
		return has('conc') ? 'major-conc' : 'single-major';
	});
	roles = $derived(ROLES_OF[this.structure]);
	/** a second major stands alone: it can't sit with a minor or concentration */
	addable: Extra[] = $derived.by(() => {
		if (this.extras.includes('major2') || (!this.#plan.fourYear && this.extras.length)) return [];
		const free = (['minor', 'conc'] as const).filter((role) => !this.extras.includes(role));
		return this.extras.length ? free : [...free, 'major2'];
	});
	ready = $derived(this.answered.batch && this.roles.every((role) => this.answered[role]));

	constructor(plan: Plan) {
		this.#plan = plan;
	}

	/** the major comes first, so nothing it could collide with is chosen before it */
	canFocus = (role: PickRole) => this.roles.includes(role) && (role === 'major1' || this.answered.major1);

	focus(role: PickRole) {
		if (this.canFocus(role)) this.active = role;
	}

	/** the other answered role holding a subject; a tile can't be taken twice */
	heldBy(subject: string): PickRole | undefined {
		return this.roles.find((role) => role !== this.active && this.answered[role] && this.#plan.picks[role] === subject);
	}

	pick(subject: string) {
		this.#plan.picks[this.active] = subject;
		this.answered[this.active] = true;
		this.sync();
	}

	setBatch(year: number) {
		this.#plan.batchStartYear = year;
		this.answered.batch = true;
		this.sync();
	}

	setFourYear(four: boolean) {
		this.#plan.fourYear = four;
		if (!four && this.structure === 'major-minor-conc') {
			this.remove('conc');
			return;
		}
		this.sync();
	}

	add(role: Extra) {
		if (!this.answered.major1 || !this.addable.includes(role)) return;
		this.extras.push(role);
		this.active = role;
		this.sync();
	}

	remove(role: Extra) {
		this.extras = this.extras.filter((r) => r !== role);
		this.answered[role] = false;
		this.active = this.roles.find((r) => !this.answered[r]) ?? 'major1';
		this.sync();
	}

	/** the programmes answered so far, in the order the plan lists them */
	#chosen() {
		let majors = 0;
		const ok: Record<ProgrammeRole, () => boolean> = {
			major: () => this.answered[majors++ === 0 ? 'major1' : 'major2'],
			minor: () => this.answered.minor,
			concentration: () => this.answered.conc
		};
		return this.#plan.programmes.filter((p) => ok[p.role]());
	}

	sync() {
		const plan = this.#plan;
		plan.structure = this.structure;
		plan.ensureDistinctPicks();
		if (plan.yearCount < plan.minYears) plan.yearCount = plan.minYears;
		if (this.answered.batch) plan.growRecommended(this.#chosen());
	}
}

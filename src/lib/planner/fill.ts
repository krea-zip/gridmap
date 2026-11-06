// The suggested path and every required course in one move. They used to
// be two buttons that mostly did the same thing, each missing what the
// other caught: the path brings prerequisites that aren't required
// themselves (PSYC205 under a psychology minor), and the required list
// has what the path found no room for (ECON207 beside a data science
// minor). Nothing another course already clears goes on twice (MATH230
// clears COMP208).
import { byCode, satisfiedBy, TRIM_NORMAL_MAX, Y1_CORE_MAX } from '$lib/curriculum/data';
import { parseSlot, slotKey, TRIMS, type SlotKey, type TrimNum } from '$lib/types';
import type { Plan } from './plan.svelte';

/** required courses the suggested path won't place, given what's on (or
 *  about to be on) the grid */
function requiredBeyond(plan: Plan, placed: Set<string>): string[] {
	return plan.missingRequiredCodes.filter(
		(code) => !placed.has(code) && !satisfiedBy(code).some((sub) => placed.has(sub))
	);
}

/** what fillIn() would make of the grid: each suggestion in its own
 *  trimester, then each required course the path left out, and any
 *  suggestion whose trimester your own courses have filled, in the
 *  earliest trimester it can legally sit in with room under the target
 *  load. one that fits nowhere is left off and named, not forced into a
 *  broken slot. worked out ahead, so the button's count is exact */
export function planFill(plan: Plan) {
	const next: Record<SlotKey, string[]> = Object.fromEntries(
		Object.entries(plan.placements).map(([key, codes]) => [key, [...codes]])
	);
	const load = (key: SlotKey) => (next[key] ?? []).reduce((sum, c) => sum + byCode(c).credits, 0);
	const fits = (code: string, year: number, trim: TrimNum) => {
		const key = slotKey(year, trim);
		if (!plan.canDrop(code, year, trim)) return false;
		return plan.coreOnly(year, trim)
			? (next[key] ?? []).length < Y1_CORE_MAX
			: load(key) + byCode(code).credits <= TRIM_NORMAL_MAX;
	};
	const put = (code: string, key: SlotKey) => (next[key] = [...(next[key] ?? []), code]);

	const crowdedOut: string[] = [];
	for (const [key, codes] of Object.entries(plan.suggestions)) {
		const { year, trim } = parseSlot(key);
		for (const code of codes)
			if (fits(code, year, trim)) put(code, key as SlotKey);
			else crowdedOut.push(code);
	}
	// lowest-numbered first, so a prerequisite lands before what needs it
	const placedOrComing = new Set([...Object.values(next).flat(), ...crowdedOut]);
	const rest = [...crowdedOut, ...requiredBeyond(plan, placedOrComing)].sort((a, b) =>
		a.localeCompare(b, undefined, { numeric: true })
	);
	const slots = plan.years.flatMap((year) => TRIMS.map((trim) => ({ year, trim })));
	const unplaced: string[] = [];
	for (const code of rest) {
		const slot = slots.find(({ year, trim }) => fits(code, year, trim));
		if (slot) put(code, slotKey(slot.year, slot.trim));
		else unplaced.push(code);
	}
	const added = Object.values(next).flat().length - Object.values(plan.placements).flat().length;
	return { next, added, unplaced };
}

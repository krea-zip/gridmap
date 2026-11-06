import { byCode, satisfiedBy, TRIM_NORMAL_MAX } from '$lib/curriculum/data';
import { academicYear, slotOrder } from '$lib/planner/calendar';
import type { Plan } from '$lib/planner/plan.svelte';
import type { TrimNum } from '$lib/types';

/** where the course being read about sits on the plan, if it does */
type Placed = { year: number; trim: TrimNum } | null;

// ── a prerequisite against the plan: placed earlier (fine), placed too
//    late, or nowhere yet, an interchangeable course counts as placed ──
// Said in the grid's own trimester numbers (t8 is year 3, T2), short:
// "✓ t5" when taken (the tick alone says done), "t8" or "t8 · now" when
// planned, "t11 · too late", "not planned"; the full
// sentence waits in the tooltip. A missing one also says where it would
// fit, as a button that puts it there.
export type PrereqStatus = {
	kind: 'done' | 'ok' | 'late' | 'missing';
	text: string;
	title: string;
	fits?: { year: number; trim: TrimNum };
};
export const spelled = (plan: Plan, year: number, trim: TrimNum) =>
	`${plan.trimSpelled(year, trim)}, ${academicYear(plan.batchStartYear, year)}`;
// the first trimester after now, and before this course when it's placed,
// that the prerequisite runs in and has room in under the recommended load
function fitsFor(plan: Plan, pre: string, placedAt: Placed): { year: number; trim: TrimNum } | null {
	const hereAt = slotOrder(plan.here.year, plan.here.trim);
	const code = byCode(pre).code;
	const before = placedAt ? slotOrder(placedAt.year, placedAt.trim) : Infinity;
	for (const year of plan.years)
		for (const trim of plan.trims) {
			const o = slotOrder(year, trim);
			if (o <= hereAt || o >= before || !plan.canDrop(code, year, trim)) continue;
			if (!plan.coreOnly(year, trim) && plan.slotCredits(year, trim) + byCode(code).credits > TRIM_NORMAL_MAX) continue;
			return { year, trim };
		}
	return null;
}
export function prereqStatus(plan: Plan, pre: string, placedAt: Placed): PrereqStatus {
	const hereAt = slotOrder(plan.here.year, plan.here.trim);
	const options = [byCode(pre).code, ...satisfiedBy(pre)];
	const at = plan.placed.filter((p) => options.includes(p.code)).sort((a, b) => a.year - b.year || a.trim - b.trim)[0];
	if (!at) {
		const fits = fitsFor(plan, pre, placedAt) ?? undefined;
		return {
			kind: 'missing',
			text: 'not planned',
			title: fits
				? `not on your plan; it fits in ${spelled(plan, fits.year, fits.trim)}`
				: `not on your plan, and no trimester ${placedAt ? 'before this course' : 'ahead'} has room for it`,
			fits
		};
	}
	const o = slotOrder(at.year, at.trim);
	const n = plan.trimName(at.year, at.trim);
	const via = at.code === byCode(pre).code ? '' : `, as ${plan.courseLabel(at.code)}`;
	if (placedAt && o >= slotOrder(placedAt.year, placedAt.trim))
		return {
			kind: 'late',
			text: `${n} · too late`,
			title: `planned for ${spelled(plan, at.year, at.trim)}${via}, not before this course: move it earlier`
		};
	if (o < hereAt) return { kind: 'done', text: `✓ ${n}`, title: `taken in ${spelled(plan, at.year, at.trim)}${via}` };
	if (o === hereAt)
		return { kind: 'ok', text: `${n} · now`, title: `being taken now, ${spelled(plan, at.year, at.trim)}${via}` };
	return { kind: 'ok', text: n, title: `planned for ${spelled(plan, at.year, at.trim)}${via}` };
}

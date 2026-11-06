// the shapes a plan can take: its years, board views, breaks and degree
// structures. plain values, so the store and the components share them.
import type { Picks } from './picks';
import type { Programme, StructureKind, TrimNum } from '$lib/types';

/** the longest any plan runs: a 4-year degree's n + 2 years (a 3-year
 *  degree stops at 5, see Plan.maxYears) */
export const MAX_YEARS = 6;

/** What the board shows. 'plan' is the planner itself; every other view lays
 *  its own information over the same grid, one view at a time. Grouped as the
 *  menu shows them: your own plan and record, then ways to explore it. */
export const BOARD_VIEWS = [
	{ id: 'plan', group: 'yours', label: 'plan', note: 'arrange your courses' },
	{ id: 'grades', group: 'yours', label: 'grades', note: 'your grades, TGPA and CGPA' },
	{ id: 'runs', group: 'explore', label: 'will it run?', note: 'how often it ran in that trimester', wip: true },
	{ id: 'prereqs', group: 'explore', label: 'prerequisites', note: 'what a course needs and leads to', wip: true },
	{ id: 'whatif', group: 'explore', label: 'what-if', note: 'try another programme on your plan', wip: true }
] as const;
export type BoardView = (typeof BOARD_VIEWS)[number]['id'];
export const isBoardView = (v: unknown): v is BoardView => BOARD_VIEWS.some((b) => b.id === v);

/** A trimester not spent taking courses here. A term away (an exchange)
 *  brings credits back; they count toward the degree's total, not toward a
 *  programme, and carry no grade. */
export type BreakKind = 'break' | 'suspension' | 'away';
export type BreakInfo = { kind: BreakKind; credits?: number };
export const BREAK_KINDS: Record<BreakKind, { label: string; note: string }> = {
	break: { label: 'break', note: 'a trimester off: leave, health, work, anything' },
	suspension: { label: 'suspension', note: 'suspended for the trimester' },
	away: { label: 'away', note: 'an exchange or study-abroad term; its credits come back with you' }
};
export const isBreakKind = (v: unknown): v is BreakKind => v === 'break' || v === 'suspension' || v === 'away';

/** the programmes a degree structure and its picks add up to */
export function programmesFor(structure: StructureKind, picks: Picks): Programme[] {
	switch (structure) {
		case 'single-major':
			return [{ role: 'major', subject: picks.major1 }];
		case 'double-major':
			return [
				{ role: 'major', subject: picks.major1 },
				{ role: 'major', subject: picks.major2 }
			];
		case 'major-minor':
			return [
				{ role: 'major', subject: picks.major1 },
				{ role: 'minor', subject: picks.minor }
			];
		case 'major-conc':
			return [
				{ role: 'major', subject: picks.major1 },
				{ role: 'concentration', subject: picks.conc }
			];
		case 'major-minor-conc':
			return [
				{ role: 'major', subject: picks.major1 },
				{ role: 'minor', subject: picks.minor },
				{ role: 'concentration', subject: picks.conc }
			];
	}
}

/** first-year t1/t2 belong to the foundation core: ONLY common-core
 *  (KCCS) courses may sit there, at most Y1_CORE_MAX per trimester */
export const coreOnly = (year: number, trim: TrimNum): boolean => year === 1 && trim !== 3;

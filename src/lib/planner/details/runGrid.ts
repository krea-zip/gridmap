// when a course ran, against the timetables on record.
import { RECORDED_TERMS, ranIn } from '$lib/curriculum/data';
import type { TrimNum } from '$lib/types';

// the academic years the timetables cover: 24 is 24 to 25 (24_T1 … 24_T3)
const RUN_YEARS = [
	...new Set(([1, 2, 3] as TrimNum[]).flatMap((t) => RECORDED_TERMS[t].map((term) => term.split('_')[0])))
].sort();
/** laid out as the grid is: one row per academic year, one cell per
 *  trimester (t1 t2 t3 across); each ran, didn't run, or has no timetable */
export function runGrid(code: string) {
	const history = new Set(ranIn(code));
	return RUN_YEARS.map((yy) => ({
		yy,
		cells: ([1, 2, 3] as TrimNum[]).map((trim) => {
			const term = `${yy}_T${trim}`;
			const state = !RECORDED_TERMS[trim].includes(term) ? 'none' : history.has(term) ? 'ran' : 'not';
			return {
				trim,
				state,
				label: `${yy} to ${Number(yy) + 1}, T${trim}: ${state === 'ran' ? 'ran' : state === 'not' ? "didn't run" : 'no timetable on record'}`
			};
		})
	}));
}

import { CAPSTONES, COURSES, byCode, facultySearchText } from '$lib/curriculum/data';
import type { Course, CourseType, TrimNum } from '$lib/types';

const ranks: Record<CourseType, number> = { core: 0, required: 1, elective: 2, other: 3 };
const searchIndex = new WeakMap<Course, string>();

function searchText(course: Course): string {
	let text = searchIndex.get(course);
	if (text === undefined) {
		text = [...course.codes, course.title, facultySearchText(course)].join(' ').toLowerCase();
		searchIndex.set(course, text);
	}
	return text;
}

/** what the catalogue's second row of ticks narrows to */
export type CourseKind = 'required' | 'elective' | 'crosslisted';

/** the catalogue's quick filters; ticking more than one narrows further */
export type QuickFilter = 'needed' | 'ready' | 'next' | 'unplanned';
export type CatalogueSort = 'relevance' | 'code' | 'title' | 'credits';

/** a list with this item ticked or unticked */
export const toggled = <T>(list: T[], item: T): T[] =>
	list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

type CatalogueOptions = {
	search: string;
	filters: string[];
	kinds: CourseKind[];
	terms: TrimNum[];
	credits: number[];
	sort: CatalogueSort;
	quick: (course: Course) => boolean;
	selectedSubjects: string[];
	subject?: string;
	trim?: TrimNum;
	reveal?: string;
	courseType: (code: string) => CourseType;
};

/** Filter in one pass; resolve each course's programme rank once, before sorting. */
export function selectCatalogue({
	search,
	filters,
	kinds,
	terms,
	credits,
	sort,
	quick,
	selectedSubjects,
	subject,
	trim,
	reveal,
	courseType
}: CatalogueOptions): Course[] {
	const checked = subject ? [subject] : filters.filter((id) => id === 'core' || selectedSubjects.includes(id));
	const query = search.trim().toLowerCase();
	// required and elective widen each other; cross-listed narrows whatever they leave
	const roles = kinds.filter((kind) => kind !== 'crosslisted');
	const linking = kinds.includes('crosslisted');
	// a capstone lists only where one of your programmes takes it, it's no
	// catalogue course anyone else could pick up
	const capstones = CAPSTONES.filter((course) => courseType(course.code) !== 'other');
	const list = [...COURSES, ...capstones].filter((course) => {
		if (trim && !course.offered.includes(trim)) return false;
		if (!checked.includes('core') && course.subject === 'core') return false;
		if (checked.length && !course.subjects.some((id) => checked.includes(id))) return false;
		if (roles.length && !(roles as CourseType[]).includes(courseType(course.code))) return false;
		if (linking && course.subjects.filter((id) => selectedSubjects.includes(id)).length < 2) return false;
		// no term info counts as offered, as it does on the board
		if (terms.length && course.offered.length && !terms.some((t) => course.offered.includes(t))) return false;
		if (credits.length && !credits.includes(course.credits)) return false;
		if (query && !searchText(course).includes(query)) return false;
		return quick(course);
	});
	// Linked prerequisites remain reachable without discarding someone's filters.
	if (reveal && !list.some((course) => course.code === reveal)) list.push(byCode(reveal));
	return list
		.map((course) => ({ course, rank: ranks[courseType(course.code)] }))
		.sort((a, b) => {
			const byCourseCode = a.course.code.localeCompare(b.course.code);
			if (sort === 'code') return byCourseCode;
			if (sort === 'title') return a.course.title.localeCompare(b.course.title);
			if (sort === 'credits') return b.course.credits - a.course.credits || byCourseCode;
			return a.rank - b.rank || byCourseCode;
		})
		.map(({ course }) => course);
}

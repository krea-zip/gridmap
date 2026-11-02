// What the address bar brought with it: a course to show (?course=X, from a
// course page's "plan this course"), a shared plan (#plan=…), or a course list
// from the Canvas extension (#canvas-import=…). Each is read once and taken
// off the URL so a reload doesn't bring it back.
import { parseCourseImport, type CourseImport } from '$lib/features/plans/canvas-import';
import { sharedPlanIn } from '$lib/features/plans/share';

export type Incoming = {
	course: string | null;
	sharedPlan: string | null;
	canvas: CourseImport | null;
	canvasError: string;
};

export function takeIncoming(): Incoming {
	const url = new URL(location.href);
	const course = url.searchParams.get('course');
	if (course) {
		url.searchParams.delete('course');
		history.replaceState(history.state, '', url);
	}

	const sharedPlan = sharedPlanIn(location.hash);
	let canvas: CourseImport | null = null;
	let canvasError = '';
	if (location.hash.startsWith('#canvas-import=')) {
		try {
			canvas = parseCourseImport(decodeURIComponent(location.hash.slice('#canvas-import='.length)));
		} catch (e) {
			canvasError = e instanceof Error ? e.message : 'Could not read the Canvas import.';
		}
	}
	if (sharedPlan || canvas || canvasError) history.replaceState(history.state, '', location.pathname + location.search);

	return { course, sharedPlan, canvas, canvasError };
}

/** anything that should open straight over the planner instead of the welcome */
export const arrivedWithSomething = (i: Incoming) => !!(i.course || i.sharedPlan || i.canvas || i.canvasError);

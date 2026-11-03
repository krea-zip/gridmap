// What the address bar brought with it: a course to show (?course=X, from a
// course page's "plan this course") or a shared plan (#plan=…). Each is read
// once and taken off the URL so a reload doesn't bring it back.
import { sharedPlanIn } from '$lib/features/plans/share';

export type Incoming = {
	course: string | null;
	sharedPlan: string | null;
};

export function takeIncoming(): Incoming {
	const url = new URL(location.href);
	const course = url.searchParams.get('course');
	if (course) {
		url.searchParams.delete('course');
		history.replaceState(history.state, '', url);
	}

	const sharedPlan = sharedPlanIn(location.hash);
	if (sharedPlan) history.replaceState(history.state, '', location.pathname + location.search);

	return { course, sharedPlan };
}

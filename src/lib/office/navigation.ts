// the office's map: every page once. the keys are the main parts along the
// top; the rest wait in the menu beside them, and search reaches all of it.
export const OFFICE_KEYS = [
	{ path: '', label: 'overview', icon: 'home', detail: 'where the work stands' },
	{ path: 'courses', label: 'courses', icon: 'book', detail: 'every course in one list, edited in place' },
	{
		path: 'offerings',
		label: 'terms',
		icon: 'calendar',
		detail: 'what runs each trimester, its sections and who teaches'
	},
	{ path: 'batches', label: 'batches', icon: 'layers', detail: 'what changes for each entering batch, and why' },
	{
		path: 'requirements',
		label: 'degrees',
		icon: 'degree',
		detail: 'credits, courses, choice pools and suggested paths'
	},
	{ path: 'rules', label: 'rules', icon: 'sliders', detail: 'university policies and course equivalences' }
];
export const OFFICE_MORE = [
	{ path: 'faculty', label: 'faculty', icon: 'people', detail: 'profiles, contacts and teaching history' },
	{ path: 'departments', label: 'departments', icon: 'grid', detail: 'subjects, colours and code prefixes' },
	{ path: 'import', label: 'import spreadsheet', icon: 'upload', detail: 'bring in a csv or excel course list' },
	{ path: 'tree', label: 'prerequisite map', icon: 'branch', detail: 'explore course dependencies' },
	{ path: 'history', label: 'release history', icon: 'history', detail: 'review and restore earlier releases' },
	{ path: 'settings', label: 'office fields', icon: 'settings', detail: 'extra information tracked on each offering' }
];
const PUBLISH = {
	path: 'changes',
	label: 'review & publish',
	icon: 'publish',
	detail: 'check changes and update the student site'
};
export const OFFICE_LINKS = [...OFFICE_KEYS, ...OFFICE_MORE, PUBLISH];
export const officeHref = (path: string) => `/admin${path ? '/' + path : ''}`;

/** the page a path belongs to; a record under a page (one batch) counts as it */
export function officePage(pathname: string) {
	const path = pathname.replace(/\/$/, '');
	const under = OFFICE_LINKS.filter((link) => link.path && path.startsWith(officeHref(link.path)));
	return under.sort((a, b) => b.path.length - a.path.length)[0] ?? OFFICE_LINKS[0];
}

export function issueHref(area: string, record = '') {
	if (area === 'Batches' && record) return `/admin/batches/${record}?section=programmes`;
	const paths: Record<string, string> = {
		Courses: 'courses',
		Faculty: 'faculty',
		Departments: 'departments',
		Offerings: 'offerings',
		Terms: 'offerings',
		Policies: 'rules',
		Requirements: 'requirements',
		Batches: 'batches',
		'Batch rules': 'batches',
		Equivalences: 'rules',
		Substitutions: 'rules',
		'Cross-listing': 'courses',
		Prerequisites: 'courses',
		Workspace: 'settings'
	};
	return (
		officeHref(paths[area] ?? 'changes') + (area === 'Courses' && record ? `?course=${encodeURIComponent(record)}` : '')
	);
}

export const LESSONS = [
	{ id: 'progress', title: 'watch your credits grow', label: 'information', group: 'plan' },
	{ id: 'choices', title: 'make a choice', label: 'choices', group: 'plan' },
	{ id: 'board', title: 'give a course a home', label: 'place & move', group: 'plan' },
	{ id: 'labels', title: 'codes, titles, or both', label: 'course labels', group: 'explore' },
	{ id: 'terms', title: 'one trimester, two names', label: 'trimesters', group: 'explore' },
	{ id: 'catalogue', title: 'find your next course', label: 'catalogue', group: 'explore' },
	{ id: 'hints', title: 'let the little marks help', label: 'hints', group: 'check' },
	{ id: 'display', title: 'follow a colour', label: 'colours', group: 'check' },
	{ id: 'details', title: 'open a course', label: 'course details', group: 'course' },
	{ id: 'record', title: 'audit & result', label: 'audit & result', group: 'course' },
	{ id: 'about', title: 'see what comes next', label: 'description & links', group: 'course' },
	{ id: 'faculty', title: 'meet the teacher', label: 'teacher details', group: 'course' }
] as const;
export type Lesson = (typeof LESSONS)[number]['id'];

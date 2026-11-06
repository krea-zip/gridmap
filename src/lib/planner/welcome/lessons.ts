export const LESSONS = [
	{
		id: 'terms',
		title: 'two ways to name a trimester',
		label: 'trimesters',
		context: [
			'y2 t3 = year 2, trimester 3 = t6.',
			'on desktop, click a trimester name to switch numbering. click the dates or ··· to hide or show dates.'
		]
	},
	{
		id: 'display',
		title: 'colours, dots & outlines',
		label: 'display',
		context: [
			'a dot means required. a coloured left edge means elective. each subject has its own colour.',
			'open display: hover a colour to preview, or click to keep it highlighted. codes / titles switches are on desktop.'
		]
	},
	{
		id: 'board',
		title: 'your plan, one trimester at a time',
		label: 'your plan',
		context: [
			'click a course for details. on desktop, drag to move it; × removes it.',
			'click a trimester cell to open it and filter the catalogue. ← back returns to the grid.'
		]
	},
	{
		id: 'catalogue',
		title: 'find a course',
		label: 'catalogue',
		context: [
			'search a code, title or lecturer. subject pills and advanced filters narrow the list; clear resets it.',
			'click a course for details, then choose a trimester and add it. on desktop, you can also drag it onto the grid.'
		]
	},
	{
		id: 'progress',
		title: 'what counts toward your degree',
		label: 'information & choices',
		context: [
			'information counts the credits on your plan. click a programme for its required / elective breakdown.',
			'choices lists course options when your programme has them. its dots fill as you add courses; click a course to find it.'
		]
	},
	{
		id: 'hints',
		title: 'read the little marks',
		label: 'hints',
		context: [
			'▲ problem · ■ warning · ★ advisory.',
			'click a hint for details and highlighted courses. the count badges hide / show problems or warnings. click a course code to open it.'
		]
	},
	{
		id: 'details',
		title: 'everything about a course',
		label: 'course details',
		context: [
			'choose a trimester to add or move a course. audit earns no credits; record results in audit & result.',
			'open offered for past runs, or the folds for prerequisites, description, how it counts and lecturer contact details. linked courses open their details.'
		]
	},
	{
		id: 'views',
		title: 'look at your plan another way',
		label: 'views & credits',
		context: [
			'on desktop, view switches between plan, grades, will it run?, prerequisites and what-if.',
			'grades shows TGPA / CGPA. what-if tries another programme; “use this” keeps it. tap the credit total for rules, and min / max to change its target.'
		]
	}
] as const;
export type Lesson = (typeof LESSONS)[number]['id'];

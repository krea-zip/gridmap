// A complete, fictional curriculum for the isolated welcome frame. It goes
// through the same indexes, rules and components as the published curriculum,
// so every panel in the playground is the real one, reading pretend courses.
import type { ChoiceGroup, CurriculumSnapshot, ProgrammeRequirements, SnapshotCourse } from '$lib/curriculum/snapshot';
import type { TrimNum } from '$lib/types';

const TEACHERS: Record<string, { id: string; name: string }> = {
	dreams: { id: 'cloud', name: 'Professor Cloud' },
	cats: { id: 'whiskers', name: 'Dr. Whiskers' },
	clouds: { id: 'cloud', name: 'Professor Cloud' }
};

function course(
	code: string,
	title: string,
	subject: string,
	offered: TrimNum[],
	prereqs: string[] = [],
	required = true
): SnapshotCourse {
	const teacher = TEACHERS[subject];
	return {
		code,
		title,
		subject,
		subjects: [subject],
		codes: [code],
		codesBySubject: { [subject]: code },
		faculty: teacher?.name ?? '',
		credits: 4,
		required,
		offered,
		eligibleYears: [1, 2],
		prereqs,
		// two years of runs, so "when it ran" has something to show
		terms: ['26', '25'].flatMap((year) => offered.map((t) => `${year}_T${t}`)),
		lecturers: teacher ? [teacher.id] : []
	};
}

const courses = [
	course('KCCS101', 'Introduction to daydreaming', 'core', [1, 2]),
	course('KCCS102', 'The art of asking why', 'core', [1, 2]),
	course('NAP101', 'Pillow foundations', 'dreams', [1, 2, 3]),
	course('NAP201', 'Advanced napping', 'dreams', [1, 2], ['NAP101']),
	course('NAP301', 'Professional snoozing', 'dreams', [3], ['NAP201']),
	course('TEA202', 'Tea leaf theory', 'dreams', [2, 3], [], false),
	course('CAT101', 'Thinking like a cat', 'cats', [1, 2, 3]),
	course('CAT201', 'Cardboard architecture', 'cats', [2, 3], ['CAT101'], false),
	course('CAT205', 'Advanced purring', 'cats', [2, 3], ['CAT101'], false),
	course('MOON101', 'Moon gardening', 'clouds', [3], [], false)
];

const titleOf = (code: string) => courses.find((c) => c.code === code)?.title ?? code;

function programme(
	subject: string,
	variant: ProgrammeRequirements['variant'],
	required: string[],
	electives: string[],
	choices: ChoiceGroup[] = []
): ProgrammeRequirements {
	const picked = choices.reduce((sum, group) => sum + group.pick, 0);
	return {
		subject,
		variant,
		credits: {
			total: (required.length + picked + electives.length) * 4,
			required: (required.length + picked) * 4,
			elective: electives.length * 4
		},
		required,
		electives,
		picks: choices.flatMap((group) => group.courses.flatMap((c) => (c.code ? [c.code] : []))),
		choices,
		pathway: []
	};
}

export const playgroundSnapshot: CurriculumSnapshot & { descriptions: Record<string, string> } = {
	format: 1,
	release: 'welcome-playground',
	updatedOn: null,
	subjects: [
		{ id: 'core', label: 'kccs', short: 'kccs', majorable: false },
		{ id: 'dreams', label: 'dream studies', short: 'dreams', majorable: true, hue: 210 },
		{ id: 'cats', label: 'cat philosophy', short: 'cats', majorable: true, hue: 285 },
		{ id: 'clouds', label: 'cloud sciences', short: 'clouds', majorable: true, hue: 150 },
		{ id: 'open', label: 'open minor', short: 'open', majorable: false }
	],
	rules: {
		TRIM_MIN: 8,
		TRIM_NORMAL_MAX: 12,
		TRIM_STANDARD_MAX: 16,
		TRIM_HARD_MAX: 20,
		HEAVY_TRIMS_ALLOWED: 2,
		AUDIT_LIMIT: 2,
		MIN_TOTAL_3YR: 36,
		MIN_TOTAL_4YR: 36,
		MAX_TOTAL_3YR: 48,
		MAX_TOTAL_4YR: 48
	},
	courses,
	lecturers: [
		{
			id: 'cloud',
			name: 'Professor Cloud',
			position: 'Professor of imaginary studies',
			email: 'cloud@example.invalid',
			office_hours: 'After the afternoon nap · Cloud Room 2',
			image_url: '',
			url: ''
		},
		{
			id: 'whiskers',
			name: 'Dr. Whiskers',
			position: 'Reader in feline thought',
			email: 'whiskers@example.invalid',
			office_hours: 'Whenever the door is left open · Box 3',
			image_url: '',
			url: ''
		}
	],
	equivalences: { substitutes: [], covers: [], transcriptOnly: [] },
	batchRules: [],
	requirementSets: [
		{
			id: 'playground',
			name: 'Pretend degree',
			batches: null,
			programmes: [
				programme('dreams', 'single_major_4yr', ['NAP101', 'NAP201', 'NAP301'], ['TEA202']),
				// the other majors, so a course card and what-if have something true to say
				programme('cats', 'single_major_4yr', ['CAT101', 'CAT201', 'CAT205'], []),
				programme('clouds', 'single_major_4yr', ['MOON101'], []),
				programme(
					'cats',
					'minor_4yr',
					['CAT101'],
					[],
					[
						{
							rule: 'Any one of the following courses',
							pick: 1,
							courses: ['CAT201', 'CAT205'].map((code) => ({ code, title: titleOf(code) }))
						}
					]
				)
			]
		}
	],
	descriptions: Object.fromEntries(
		courses.map((c) => [
			c.code,
			`${c.title} explores the wonderfully imaginary world of ${c.subject === 'cats' ? 'cats and cardboard boxes' : 'dreams, tea and clouds'}. Practise asking questions, making discoveries and taking excellent notes. This is a fictional course created for the welcome playground. Its credits, offerings, prerequisites and teacher are examples only. In your real plan, this section contains the catalogue description of the course you selected.`
		])
	)
};

// the plan the playground opens on, with things left to do on purpose: NAP301
// sits before its prerequisite in a trimester it doesn't run in, y2 t3 is
// light, and the minor's "pick one" is still open. the lessons fix all of it.
export const playgroundPlacements = (): Record<string, string[]> => ({
	'1-1': ['KCCS101'],
	'1-2': ['KCCS102'],
	'1-3': ['NAP101'],
	'2-1': ['NAP301', 'CAT101'],
	'2-2': ['NAP201', 'TEA202'],
	'2-3': ['MOON101']
});

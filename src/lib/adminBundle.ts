// ─────────────────────────────────────────────
// Everything /admin has changed, seen as one thing.
//
// Each editor saves to its own storage key (courseEdits.ts, prereqEdits.ts,
// batchEdits.ts, adminEdits.ts). This module reads them all back so the home
// page and the changes page can count, list, export, import and discard them
// without knowing what any editor does. Browser-only: every function touches
// localStorage.
// ─────────────────────────────────────────────

import {
	DESCRIPTION_EDITS_KEY,
	LECTURER_EDITS_KEY,
	PROGRAMME_EDITS_KEY,
	SUBJECT_EDITS_KEY,
	ADMIN_CHANGED,
	VARIANTS,
	loadDescriptionEdits,
	loadLecturerEdits,
	loadProgrammeEdits,
	loadSubjectEdits,
	parseDescriptionEdits,
	parseLecturerEdits,
	parseProgrammeEdits,
	parseSubjectEdits,
	saveDescriptionEdits,
	saveLecturerEdits,
	saveProgrammeEdits,
	saveSubjectEdits
} from './adminEdits';
import { BATCH_EDITS_KEY, loadBatchEdits, parseBatchEdits, saveBatchEdits } from './batchEdits';
import {
	COURSE_EDITS_KEY,
	NEW_COURSES_KEY,
	RULE_DEFAULTS,
	RULE_EDITS_KEY,
	RULE_INFO,
	SHARE_DEFAULT_KEY,
	loadCourseEdits,
	loadNewCourses,
	loadRuleEdits,
	loadShareDefault,
	parseCourseEdits,
	parseNewCourses,
	parseRuleEdits,
	parseShare,
	saveCourseEdits,
	saveNewCourses,
	saveRuleEdits,
	saveShareDefault
} from './courseEdits';
import { PREREQ_EDITS_KEY, loadPrereqEdits, parsePrereqEdits, savePrereqEdits } from './prereqEdits';

export type ChangeSection = {
	id: 'courses' | 'faculty' | 'departments' | 'requirements' | 'rules' | 'batches' | 'descriptions';
	label: string;
	href: string;
	/** how many things were changed */
	count: number;
	unit: string;
	/** one plain line per change */
	lines: string[];
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** the storage keys each section owns, what a discard removes */
const KEYS: Record<ChangeSection['id'], string[]> = {
	courses: [COURSE_EDITS_KEY, PREREQ_EDITS_KEY, NEW_COURSES_KEY, SHARE_DEFAULT_KEY],
	faculty: [LECTURER_EDITS_KEY],
	departments: [SUBJECT_EDITS_KEY],
	requirements: [PROGRAMME_EDITS_KEY],
	rules: [RULE_EDITS_KEY],
	batches: [BATCH_EDITS_KEY],
	descriptions: [DESCRIPTION_EDITS_KEY]
};

const FIELD_WORD: Record<string, string> = {
	title: 'title',
	credits: 'credits',
	required: 'university flag',
	offered: 'trimesters',
	eligibleYears: 'years',
	faculty: 'faculty text',
	codesBySubject: 'cross-listing',
	share: 'credit sharing',
	retired: 'retired'
};

/** every section with its changes, empty ones included, in the order the
 *  admin presents them */
export function sections(): ChangeSection[] {
	const courseEdits = loadCourseEdits();
	const prereqs = loadPrereqEdits();
	const added = loadNewCourses();
	const shareAll = loadShareDefault() === 'all';

	const courseLines: string[] = [];
	for (const code of new Set([...Object.keys(added), ...Object.keys(courseEdits), ...Object.keys(prereqs)])) {
		const what = [
			...Object.keys(courseEdits[code] ?? {}).map((f) => FIELD_WORD[f] ?? f),
			...(code in prereqs ? ['prerequisites'] : [])
		];
		courseLines.push(`${code}${code in added ? ' (new course)' : ''} — ${what.join(', ') || 'added'}`);
	}
	if (shareAll) courseLines.push('site default — shared courses credit both programmes');

	const lecturers = loadLecturerEdits();
	const facultyLines = [
		...Object.values(lecturers.added).map((l) => `${l.name} — added`),
		...Object.entries(lecturers.edited).map(([id, e]) => `${e.name ?? id} — ${Object.keys(e).join(', ')} changed`),
		...lecturers.removed.map((id) => `${id} — removed`),
		...Object.keys(lecturers.teaches).map((code) => `${code} — teachers changed`)
	];

	const subjects = loadSubjectEdits();
	const departmentLines = [
		...Object.values(subjects.added).map((s) => `${s.label} — added`),
		...Object.entries(subjects.edited).map(([id, e]) => `${id} — ${Object.keys(e).join(', ')} changed`)
	];

	const programmes = loadProgrammeEdits();
	const requirementLines = Object.entries(programmes).map(([key, e]) => {
		const [set, subject, variant] = key.split('|');
		const what = [
			...(e.total !== undefined || e.required !== undefined || e.elective !== undefined ? ['credits'] : []),
			...(e.requiredCourses ? ['required courses'] : []),
			...(e.electives ? ['electives'] : [])
		];
		return `${subject} ${VARIANTS.find((v) => v.id === variant)?.label ?? variant} (${set}) — ${what.join(', ') || 'created'}`;
	});

	const rules = loadRuleEdits();
	const ruleLines = Object.entries(rules).map(
		([k, v]) =>
			`${RULE_INFO[k as keyof typeof RULE_INFO]?.label ?? k} — ${RULE_DEFAULTS[k as keyof typeof RULE_DEFAULTS]} → ${v}`
	);

	const batches = loadBatchEdits();
	const batchLines = Object.entries(batches).map(([key, rule]) => {
		try {
			const [year, subject, role, fourYear, double] = JSON.parse(key);
			const n = Object.keys(rule.courses).length;
			return `${year} batch · ${subject} ${double ? 'double ' : ''}${role} ${fourYear ? '4' : '3'}-year — ${plural(n, 'course override')}${rule.requiredCredits !== undefined ? `, ${rule.requiredCredits} required credits` : ''}`;
		} catch {
			return key;
		}
	});

	const descriptions = loadDescriptionEdits();
	const descriptionLines = Object.entries(descriptions).map(([code, d]) => `${code} — ${d ? 'rewritten' : 'cleared'}`);

	return [
		{
			id: 'courses',
			label: 'Courses',
			href: '/admin/courses',
			unit: 'course',
			count:
				new Set([...Object.keys(added), ...Object.keys(courseEdits), ...Object.keys(prereqs)]).size +
				(shareAll ? 1 : 0),
			lines: courseLines
		},
		{
			id: 'descriptions',
			label: 'Descriptions',
			href: '/admin/courses',
			unit: 'description',
			count: descriptionLines.length,
			lines: descriptionLines
		},
		{
			id: 'faculty',
			label: 'Faculty',
			href: '/admin/faculty',
			unit: 'change',
			count: facultyLines.length,
			lines: facultyLines
		},
		{
			id: 'departments',
			label: 'Departments',
			href: '/admin/departments',
			unit: 'change',
			count: departmentLines.length,
			lines: departmentLines
		},
		{
			id: 'requirements',
			label: 'Degree requirements',
			href: '/admin/requirements',
			unit: 'programme',
			count: requirementLines.length,
			lines: requirementLines
		},
		{
			id: 'batches',
			label: 'Batch overrides',
			href: '/admin/batches',
			unit: 'override',
			count: batchLines.length,
			lines: batchLines
		},
		{
			id: 'rules',
			label: 'University rules',
			href: '/admin/rules',
			unit: 'rule',
			count: ruleLines.length,
			lines: ruleLines
		}
	];
}

export const pendingCount = () => sections().reduce((sum, s) => sum + s.count, 0);

// ── the export file ──

export function buildBundle() {
	return {
		kcal: 'admin-edits',
		version: 2,
		exported: new Date().toISOString(),
		courses: loadCourseEdits(),
		prereqs: loadPrereqEdits(),
		rules: loadRuleEdits(),
		newCourses: loadNewCourses(),
		creditSharing: loadShareDefault(),
		batchRequirements: loadBatchEdits(),
		descriptions: loadDescriptionEdits(),
		lecturers: loadLecturerEdits(),
		departments: loadSubjectEdits(),
		programmes: loadProgrammeEdits()
	};
}

export const bundleFileName = () => `kcal-changes-${new Date().toISOString().slice(0, 10)}.json`;

/** Replace every edit with what an exported file holds. A section the file
 *  doesn't mention comes out empty. Returns false if the file isn't ours;
 *  the older prerequisite-only export (a bare code → list object) is accepted. */
export function importBundle(raw: unknown): boolean {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
	const file = raw as Record<string, unknown>;
	if (file.kcal !== 'admin-edits' && !('courses' in file || 'prereqs' in file || 'rules' in file)) {
		savePrereqEdits(parsePrereqEdits(file)); // legacy prerequisite-only export
		return true;
	}
	saveCourseEdits(parseCourseEdits(file.courses));
	savePrereqEdits(parsePrereqEdits(file.prereqs));
	saveRuleEdits(parseRuleEdits(file.rules));
	saveNewCourses(parseNewCourses(file.newCourses));
	saveShareDefault(parseShare(file.creditSharing));
	saveBatchEdits(parseBatchEdits(file.batchRequirements));
	saveDescriptionEdits(parseDescriptionEdits(file.descriptions));
	saveLecturerEdits(parseLecturerEdits(file.lecturers));
	saveSubjectEdits(parseSubjectEdits(file.departments));
	saveProgrammeEdits(parseProgrammeEdits(file.programmes));
	return true;
}

/** throw away one section's changes, or every section's */
export function discard(ids: ChangeSection['id'][] = Object.keys(KEYS) as ChangeSection['id'][]) {
	for (const id of ids)
		for (const key of KEYS[id])
			try {
				localStorage.removeItem(key);
			} catch {
				// blocked storage: nothing was saved to discard
			}
	window.dispatchEvent(new Event(ADMIN_CHANGED));
}

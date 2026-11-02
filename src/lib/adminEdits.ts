// ─────────────────────────────────────────────
// Hand-edited descriptions, faculty, departments and programme requirements,
// the editors added to /admin after the course, prerequisite, rule and batch
// ones (courseEdits.ts, prereqEdits.ts, batchEdits.ts).
//
// Same model as those: an edit lives in this browser, data.ts applies it at
// load so the planner answers to it at once, and /admin exports everything as
// one JSON file (adminBundle.ts). An edit only carries what was changed; a
// missing field keeps the shipped value.
//
// Kept free of any import from data.ts, data.ts imports THIS.
// ─────────────────────────────────────────────

import type { Lecturer, Variant } from './curriculum/snapshot';
import type { Subject } from './types';

export const DESCRIPTION_EDITS_KEY = 'kcal-description-edits';
export const LECTURER_EDITS_KEY = 'kcal-lecturer-edits';
export const SUBJECT_EDITS_KEY = 'kcal-subject-edits';
export const PROGRAMME_EDITS_KEY = 'kcal-programme-edits';

/** fired on window whenever any /admin edit is saved, so the sidebar badge
 *  and the changes page can recount without polling storage */
export const ADMIN_CHANGED = 'kcal-admin-changed';

const CODE = /^[A-Z]{3,5}\d{3}[A-Z]?$/;
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

export function load<T>(key: string, parse: (raw: unknown) => T, empty: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw ? parse(JSON.parse(raw)) : empty;
	} catch {
		return empty; // unreadable or blocked storage, the shipped data stands
	}
}

export function save(key: string, value: unknown) {
	try {
		const empty =
			!value ||
			(typeof value === 'object' &&
				(Array.isArray(value) ? !value.length : Object.values(value).every((v) => isEmpty(v))));
		if (empty) localStorage.removeItem(key);
		else localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// storage full or blocked; the edit still applies for this session
	}
	if (typeof window !== 'undefined') window.dispatchEvent(new Event(ADMIN_CHANGED));
}

const isEmpty = (v: unknown): boolean =>
	v === undefined || (Array.isArray(v) ? !v.length : isObject(v) && !Object.keys(v).length);

// ── course descriptions ──

/** course code → the description that replaces the shipped one. An empty
 *  string is a real edit: it blanks the description. */
export type DescriptionEdits = Record<string, string>;

export function parseDescriptionEdits(raw: unknown): DescriptionEdits {
	const out: DescriptionEdits = {};
	if (!isObject(raw)) return out;
	for (const [code, v] of Object.entries(raw))
		if (CODE.test(code) && typeof v === 'string') out[code] = v.trim().slice(0, 20000);
	return out;
}
export const loadDescriptionEdits = () => load(DESCRIPTION_EDITS_KEY, parseDescriptionEdits, {} as DescriptionEdits);
export const saveDescriptionEdits = (e: DescriptionEdits) => save(DESCRIPTION_EDITS_KEY, e);

// ── faculty ──

export type LecturerFields = Omit<Lecturer, 'id'>;
export type LecturerEdits = {
	/** shipped lecturers, with the fields that were changed */
	edited: Record<string, Partial<LecturerFields>>;
	/** lecturers /admin added */
	added: Record<string, Lecturer>;
	/** taken out of the directory */
	removed: string[];
	/** course code → lecturer ids; replaces who the course lists outright */
	teaches: Record<string, string[]>;
};
export const emptyLecturerEdits = (): LecturerEdits => ({ edited: {}, added: {}, removed: [], teaches: {} });

const LECTURER_TEXT: [keyof LecturerFields, number][] = [
	['name', 120],
	['email', 200],
	['position', 200],
	['office_hours', 400],
	['image_url', 500],
	['url', 500],
	['date_of_joining', 40]
];

function lecturerFields(raw: Record<string, unknown>): Partial<LecturerFields> {
	const out: Partial<LecturerFields> = {};
	for (const [field, max] of LECTURER_TEXT) {
		const v = text(raw[field], max);
		if (v !== undefined) out[field] = v;
	}
	if (out.name === '') delete out.name; // a lecturer always has a name
	return out;
}

export function parseLecturerEdits(raw: unknown): LecturerEdits {
	const out = emptyLecturerEdits();
	if (!isObject(raw)) return out;
	if (isObject(raw.edited))
		for (const [id, e] of Object.entries(raw.edited)) {
			const fields = isObject(e) ? lecturerFields(e) : {};
			if (Object.keys(fields).length) out.edited[id] = fields;
		}
	if (isObject(raw.added))
		for (const [id, e] of Object.entries(raw.added)) {
			if (!isObject(e)) continue;
			const f = lecturerFields(e);
			if (!f.name) continue;
			out.added[id] = {
				id,
				name: f.name,
				email: f.email ?? '',
				position: f.position ?? '',
				office_hours: f.office_hours ?? '',
				image_url: f.image_url ?? '',
				url: f.url ?? '',
				...(f.date_of_joining ? { date_of_joining: f.date_of_joining } : {})
			};
		}
	if (Array.isArray(raw.removed)) out.removed = [...new Set(raw.removed.filter((v): v is string => typeof v === 'string'))];
	if (isObject(raw.teaches))
		for (const [code, ids] of Object.entries(raw.teaches))
			if (CODE.test(code) && Array.isArray(ids))
				out.teaches[code] = [...new Set(ids.filter((v): v is string => typeof v === 'string'))];
	return out;
}
export const loadLecturerEdits = () => load(LECTURER_EDITS_KEY, parseLecturerEdits, emptyLecturerEdits());
export const saveLecturerEdits = (e: LecturerEdits) => save(LECTURER_EDITS_KEY, e);

/** a stable id for a lecturer /admin adds: their name, lower-cased and dashed */
export const lecturerIdFor = (name: string, taken: (id: string) => boolean): string => {
	const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'lecturer';
	let id = base;
	for (let n = 2; taken(id); n++) id = `${base}-${n}`;
	return id;
};

// ── departments ──

export type SubjectFields = Omit<Subject, 'id'>;
export type SubjectEdits = {
	edited: Record<string, Partial<SubjectFields>>;
	added: Record<string, Subject>;
};
export const emptySubjectEdits = (): SubjectEdits => ({ edited: {}, added: {} });

/** what a department id looks like: lower-case words, as the shipped ones */
export const SUBJECT_ID_RE = /^[a-z][a-z ]{1,39}$/;

function subjectFields(raw: Record<string, unknown>): Partial<SubjectFields> {
	const out: Partial<SubjectFields> = {};
	const label = text(raw.label, 60);
	if (label) out.label = label;
	const short = text(raw.short, 12);
	if (short) out.short = short;
	if (typeof raw.majorable === 'boolean') out.majorable = raw.majorable;
	if (typeof raw.hue === 'number' && Number.isFinite(raw.hue)) out.hue = Math.max(0, Math.min(360, Math.round(raw.hue)));
	return out;
}

export function parseSubjectEdits(raw: unknown): SubjectEdits {
	const out = emptySubjectEdits();
	if (!isObject(raw)) return out;
	if (isObject(raw.edited))
		for (const [id, e] of Object.entries(raw.edited)) {
			const fields = isObject(e) ? subjectFields(e) : {};
			if (Object.keys(fields).length) out.edited[id] = fields;
		}
	if (isObject(raw.added))
		for (const [id, e] of Object.entries(raw.added)) {
			if (!SUBJECT_ID_RE.test(id) || !isObject(e)) continue;
			const f = subjectFields(e);
			if (!f.label || !f.short) continue;
			out.added[id] = { id, label: f.label, short: f.short, majorable: f.majorable ?? false, hue: f.hue };
		}
	return out;
}
export const loadSubjectEdits = () => load(SUBJECT_EDITS_KEY, parseSubjectEdits, emptySubjectEdits());
export const saveSubjectEdits = (e: SubjectEdits) => save(SUBJECT_EDITS_KEY, e);

// ── programme requirements ──

export const VARIANTS: { id: Variant; label: string }[] = [
	{ id: 'single_major_4yr', label: 'major · 4-year' },
	{ id: 'double_major_4yr', label: 'double major · 4-year' },
	{ id: 'single_major_3yr', label: 'major · 3-year' },
	{ id: 'double_major_3yr', label: 'double major · 3-year' },
	{ id: 'minor_4yr', label: 'minor · 4-year' },
	{ id: 'minor_3yr', label: 'minor · 3-year' },
	{ id: 'concentration_4yr', label: 'concentration · 4-year' },
	{ id: 'concentration_3yr', label: 'concentration · 3-year' }
];
const VARIANT_IDS = new Set<string>(VARIANTS.map((v) => v.id));

/** the key a programme edit is stored under */
export const programmeKey = (setId: string, subject: string, variant: Variant) => `${setId}|${subject}|${variant}`;

/** One programme in one requirement set. Course lists REPLACE the shipped
 *  list outright (an empty list is a real edit); credits are per field. */
export type ProgrammeEdit = {
	total?: number;
	required?: number | null;
	elective?: number | null;
	requiredCourses?: string[];
	electives?: string[];
	/** the programme did not exist, /admin made it */
	created?: boolean;
};
export type ProgrammeEdits = Record<string, ProgrammeEdit>;

const credits = (v: unknown, nullable: boolean) =>
	nullable && v === null ? null : typeof v === 'number' && v >= 0 && v <= 400 ? Math.round(v * 2) / 2 : undefined;
const codeList = (v: unknown) =>
	Array.isArray(v) ? [...new Set(v.filter((c): c is string => typeof c === 'string' && CODE.test(c)))] : undefined;

export function parseProgrammeEdits(raw: unknown): ProgrammeEdits {
	const out: ProgrammeEdits = {};
	if (!isObject(raw)) return out;
	for (const [key, e] of Object.entries(raw)) {
		const [setId, subject, variant] = key.split('|');
		if (!setId || !subject || !VARIANT_IDS.has(variant) || !isObject(e)) continue;
		const edit: ProgrammeEdit = {};
		const total = credits(e.total, false);
		if (total !== undefined && total !== null) edit.total = total;
		const required = credits(e.required, true);
		if (required !== undefined) edit.required = required;
		const elective = credits(e.elective, true);
		if (elective !== undefined) edit.elective = elective;
		const requiredCourses = codeList(e.requiredCourses);
		if (requiredCourses) edit.requiredCourses = requiredCourses;
		const electives = codeList(e.electives);
		if (electives) edit.electives = electives;
		if (e.created === true) edit.created = true;
		if (Object.keys(edit).length) out[key] = edit;
	}
	return out;
}
export const loadProgrammeEdits = () => load(PROGRAMME_EDITS_KEY, parseProgrammeEdits, {} as ProgrammeEdits);
export const saveProgrammeEdits = (e: ProgrammeEdits) => save(PROGRAMME_EDITS_KEY, e);

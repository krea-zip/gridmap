import type { BatchProfile, CurriculumSnapshot, SnapshotCourse, Lecturer, Variant } from '$lib/curriculum/snapshot';

export type Approval = 'draft' | 'clarification' | 'submitted' | 'approved' | 'cancelled';
export const APPROVALS: { value: Approval; label: string }[] = [
	{ value: 'draft', label: 'Draft' },
	{ value: 'clarification', label: 'Needs clarification' },
	{ value: 'submitted', label: 'Awaiting approval' },
	{ value: 'approved', label: 'Approved' },
	{ value: 'cancelled', label: 'Cancelled' }
];
export type Eligibility = 'allowed' | 'not-allowed' | 'permission' | 'repeaters' | 'unknown';
export const ELIGIBILITY: { value: Eligibility; label: string }[] = [
	{ value: 'unknown', label: 'Not specified' },
	{ value: 'allowed', label: 'Allowed' },
	{ value: 'not-allowed', label: 'Not allowed' },
	{ value: 'permission', label: 'Permission required' },
	{ value: 'repeaters', label: 'Repeaters only' }
];
export type PrerequisiteGroup = { codes: string[]; concurrent: boolean };
export type AdmissionRule = {
	groups: PrerequisiteGroup[];
	recommended: string[];
	permission: boolean;
	note: string;
	source: string;
};
export type OfficeCourse = SnapshotCourse & { admission?: AdmissionRule; audit?: Eligibility; notes?: string };
export type Term = {
	id: string;
	label: string;
	year: number;
	trimester: 1 | 2 | 3;
	starts: string;
	ends: string;
	status: 'planning' | 'open' | 'archived';
};
export type Offering = {
	id: string;
	term: string;
	code: string;
	section: string;
	faculty: string[];
	facultyText: string;
	eligibility: Record<string, Eligibility>;
	audit: Eligibility;
	capacity: number | null;
	minimum: number | null;
	delivery: string;
	practical: string;
	requirements: string;
	publicNote: string;
	officeNote: string;
	approval: Approval;
	approvalNote: string;
	approvalDocument: string;
	sourceImport: string;
	sourceRow: number | null;
	extras: Record<string, string>;
};
export type SourceImport = {
	id: string;
	name: string;
	term: string;
	fingerprint: string;
	importedAt: string;
	headers: string[];
	rows: string[][];
	count: number;
};
export type CustomField = {
	id: string;
	label: string;
	type: 'text' | 'number' | 'date' | 'select';
	options: string[];
	required: boolean;
};
export type AcademicPolicies = {
	graduationCgpa: number;
	aidCgpa: number;
	exitCgpa: number;
	foundationMax: number;
	auditCredits: number[];
	auditExcluded: string[];
	gradePoints: Record<string, number>;
	effectiveFrom: string;
	reference: string;
	notes: string;
};
export const CHANGE_AREAS = [
	{ value: 'programme', label: 'Programmes offered' },
	{ value: 'requirements', label: 'Degree requirements' },
	{ value: 'courses', label: 'Courses' },
	{ value: 'credits', label: 'Credits' },
	{ value: 'policy', label: 'Policy' },
	{ value: 'other', label: 'Other' }
] as const;
export type ChangeArea = (typeof CHANGE_AREAS)[number]['value'];
export const CHANGE_STATUSES = [
	{ value: 'proposed', label: 'Proposed' },
	{ value: 'approved', label: 'Approved' },
	{ value: 'done', label: 'Done' }
] as const;
export type ChangeStatus = (typeof CHANGE_STATUSES)[number]['value'];
/** one entry in a batch's record of what changed and why. office-only: it
 *  explains the edits, the edits themselves are what reach students */
export type BatchChange = {
	id: string;
	area: ChangeArea;
	subject: string;
	title: string;
	detail: string;
	reference: string;
	status: ChangeStatus;
	by: string;
	on: string;
};
export type OfficeBatchProfile = BatchProfile & { changes: BatchChange[]; note: string };
export type OfficeDocument = {
	format: 1;
	// Omit first: intersecting two `courses` types would keep the narrower one
	curriculum: Omit<CurriculumSnapshot, 'courses' | 'batchProfiles'> & {
		courses: OfficeCourse[];
		creditSharing?: 'one' | 'all';
		policies?: AcademicPolicies;
		batchProfiles?: OfficeBatchProfile[];
	};
	descriptions: Record<string, string>;
	terms: Term[];
	offerings: Offering[];
	imports: SourceImport[];
	fields: CustomField[];
	prefixes: Record<string, string>;
};
/** the shared draft as the server hands it to the office */
export type WorkspacePayload = {
	document: OfficeDocument;
	revision: number;
	status: string;
	deployment: string;
	release: string;
};
export type OfficeIssue = { severity: 'error' | 'warning'; area: string; record: string; message: string };
export type OfficeRevision = {
	revision: number;
	action: string;
	note: string;
	actor_name: string;
	created_at: string;
	status: string;
};
export const VARIANTS: { id: Variant; label: string }[] = [
	{ id: 'single_major_4yr', label: 'Single major · 4 years' },
	{ id: 'double_major_4yr', label: 'Double major · 4 years' },
	{ id: 'single_major_3yr', label: 'Single major · 3 years' },
	{ id: 'double_major_3yr', label: 'Double major · 3 years' },
	{ id: 'minor_4yr', label: 'Minor · 4 years' },
	{ id: 'minor_3yr', label: 'Minor · 3 years' },
	{ id: 'concentration_4yr', label: 'Concentration · 4 years' },
	{ id: 'concentration_3yr', label: 'Concentration · 3 years' }
];
export const DEFAULT_POLICIES: AcademicPolicies = {
	graduationCgpa: 5.5,
	aidCgpa: 6.5,
	exitCgpa: 3.5,
	foundationMax: 4,
	auditCredits: [2, 4],
	auditExcluded: ['391', '490', '491'],
	gradePoints: { 'A+': 10, A: 9.6, 'A-': 9.2, 'B+': 8.7, B: 8.2, 'B-': 7.7, 'C+': 7.2, C: 6.7, D: 6.2, E: 5.5, U: 0 },
	effectiveFrom: '',
	reference: '',
	notes: ''
};
export function makeOfficeDocument(snapshot: CurriculumSnapshot, descriptions: Record<string, string>): OfficeDocument {
	const curriculum = structuredClone(snapshot) as OfficeDocument['curriculum'];
	curriculum.policies ??= structuredClone(DEFAULT_POLICIES);
	const prefixes: Record<string, string> = {};
	for (const c of curriculum.courses)
		for (const [subject, code] of Object.entries(c.codesBySubject))
			prefixes[code.match(/^[A-Z]+/)?.[0] ?? ''] = subject;
	const terms = [...new Set(curriculum.courses.flatMap((c) => c.terms))]
		.filter((t) => /^\d{2}_T[123]$/.test(t))
		.sort()
		.reverse()
		.map((id) => ({
			id,
			label: `20${id.slice(0, 2)} · Trimester ${id.at(-1)}`,
			year: 2000 + Number(id.slice(0, 2)),
			trimester: Number(id.at(-1)) as 1 | 2 | 3,
			starts: '',
			ends: '',
			status: 'archived' as const
		}));
	return {
		format: 1,
		curriculum,
		descriptions: structuredClone(descriptions),
		terms,
		offerings: [],
		imports: [],
		fields: [],
		prefixes
	};
}
export function newCourse(code: string, title: string, subject: string): OfficeCourse {
	return {
		code,
		title,
		subject,
		subjects: [subject],
		codes: [code],
		codesBySubject: { [subject]: code },
		credits: 0,
		pendingCredits: true,
		required: false,
		offered: [],
		eligibleYears: [],
		prereqs: [],
		terms: [],
		lecturers: [],
		faculty: ''
	};
}
/** give a course another home department. a department it's already listed
 *  under just takes over; otherwise the old listing moves across with it */
export function moveCourse(course: OfficeCourse, subject: string) {
	const from = course.subject;
	if (from === subject) return;
	course.subject = subject;
	if (course.subjects.includes(subject)) return;
	delete course.codesBySubject[from];
	course.codesBySubject[subject] = course.code;
	course.subjects = [subject, ...course.subjects.filter((s) => s !== from)];
}
export function toggleOffered(course: OfficeCourse, trim: 1 | 2 | 3) {
	course.offered = course.offered.includes(trim)
		? course.offered.filter((t) => t !== trim)
		: [...course.offered, trim].sort();
}
export function newOffering(code: string, term: string, section = ''): Offering {
	return {
		id: crypto.randomUUID(),
		term,
		code,
		section,
		faculty: [],
		facultyText: '',
		eligibility: {},
		audit: 'unknown',
		capacity: null,
		minimum: null,
		delivery: 'Classroom',
		practical: '',
		requirements: '',
		publicNote: '',
		officeNote: '',
		approval: 'draft',
		approvalNote: '',
		approvalDocument: '',
		sourceImport: '',
		sourceRow: null,
		extras: {}
	};
}
export function admissionFor(course: OfficeCourse): AdmissionRule {
	return (
		course.admission ?? {
			groups: course.prereqs.map((code) => ({ codes: [code], concurrent: false })),
			recommended: [],
			permission: false,
			note: '',
			source: ''
		}
	);
}
export function applyAdmission(course: OfficeCourse, admission: AdmissionRule) {
	course.admission = admission;
	// The legacy graph only contains compulsory, strictly earlier courses.
	course.prereqs = admission.groups.filter((g) => g.codes.length === 1 && !g.concurrent).map((g) => g.codes[0]);
}
export const courseByCode = (doc: OfficeDocument, code: string) =>
	doc.curriculum.courses.find((c) => c.code === code || c.codes.includes(code));
export const emptyFaculty = (id: string, name: string): Lecturer => ({
	id,
	name,
	email: '',
	position: '',
	office_hours: '',
	image_url: '',
	url: ''
});
/** what students get of the batch records: the offers. the notes and change log
 *  stay in the office, and a batch that offers nothing new isn't sent at all */
const publishedOffers = (doc: OfficeDocument): BatchProfile[] =>
	(doc.curriculum.batchProfiles ?? [])
		.filter((p) => Object.keys(p.offers).length)
		.map(({ batch, offers }) => ({ batch, offers: structuredClone(offers) }));

export function publication(doc: OfficeDocument): CurriculumSnapshot & { descriptions: Record<string, string> } {
	const { batchProfiles: _office, ...curriculum } = structuredClone(doc.curriculum);
	const snapshot = { ...curriculum, batchProfiles: publishedOffers(doc) };
	snapshot.updatedOn = new Date().toISOString().slice(0, 10);
	// Only approved offerings inform student availability; preserve historical records.
	for (const c of snapshot.courses) {
		const approved = doc.offerings.filter((o) => o.code === c.code && o.approval === 'approved');
		c.terms = [...new Set([...c.terms, ...approved.map((o) => o.term)])].sort().reverse();
		// the office's usual trimesters stand; an approved offering only adds to them
		const running = approved.map((o) => Number(o.term.match(/_T([123])$/)?.[1])).filter((t) => t >= 1 && t <= 3);
		c.offered = [...new Set([...c.offered, ...running])].sort() as (1 | 2 | 3)[];
	}
	return { ...snapshot, descriptions: structuredClone(doc.descriptions) };
}
export function changesBetween(
	before: OfficeDocument,
	after: OfficeDocument
): { area: string; record: string; field: string; before: string; after: string }[] {
	const changes: { area: string; record: string; field: string; before: string; after: string }[] = [];
	const show = (v: unknown) => (v === undefined ? '-' : typeof v === 'string' ? v : JSON.stringify(v));
	const compare = (area: string, oldRows: Record<string, unknown>[], rows: Record<string, unknown>[], key: string) => {
		const previous = new Map(oldRows.map((r) => [String(r[key]), r]));
		const next = new Map(rows.map((r) => [String(r[key]), r]));
		for (const id of new Set([...previous.keys(), ...next.keys()])) {
			const a = previous.get(id),
				b = next.get(id);
			if (!a || !b) {
				changes.push({
					area,
					record: id,
					field: a ? 'Removed' : 'Added',
					before: a ? show(a) : '-',
					after: b ? show(b) : '-'
				});
				continue;
			}
			for (const field of new Set([...Object.keys(a), ...Object.keys(b)]))
				if (JSON.stringify(a[field]) !== JSON.stringify(b[field]))
					changes.push({ area, record: id, field, before: show(a[field]), after: show(b[field]) });
		}
	};
	compare('Courses', before.curriculum.courses, after.curriculum.courses, 'code');
	compare('Faculty', before.curriculum.lecturers, after.curriculum.lecturers, 'id');
	compare('Departments', before.curriculum.subjects, after.curriculum.subjects, 'id');
	compare('Offerings', before.offerings, after.offerings, 'id');
	compare('Terms', before.terms, after.terms, 'id');
	compare('Requirements', before.curriculum.requirementSets, after.curriculum.requirementSets, 'id');
	const [offered, offers] = [publishedOffers(before), publishedOffers(after)];
	if (JSON.stringify(offered) !== JSON.stringify(offers))
		changes.push({
			area: 'Academic rules',
			record: 'batchProfiles',
			field: 'programmes offered',
			before: show(offered),
			after: show(offers)
		});
	for (const field of ['rules', 'equivalences', 'batchRules', 'policies', 'creditSharing'] as const)
		if (JSON.stringify(before.curriculum[field]) !== JSON.stringify(after.curriculum[field]))
			changes.push({
				area: 'Academic rules',
				record: field,
				field,
				before: show(before.curriculum[field]),
				after: show(after.curriculum[field])
			});
	for (const field of ['descriptions', 'fields', 'prefixes'] as const)
		if (JSON.stringify(before[field]) !== JSON.stringify(after[field]))
			changes.push({ area: 'Catalogue', record: field, field, before: show(before[field]), after: show(after[field]) });
	return changes;
}

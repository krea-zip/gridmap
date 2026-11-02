import type { CurriculumSnapshot, SnapshotCourse, Lecturer, Variant } from '../../curriculum/snapshot';

export type OfficeRole = 'admin' | 'publisher' | 'reviewer' | 'editor' | 'contributor';
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
export type OfficeDocument = {
	format: 1;
	curriculum: CurriculumSnapshot & {
		courses: OfficeCourse[];
		creditSharing?: 'one' | 'all';
		policies?: AcademicPolicies;
	};
	descriptions: Record<string, string>;
	terms: Term[];
	offerings: Offering[];
	imports: SourceImport[];
	fields: CustomField[];
	prefixes: Record<string, string>;
};
export type OfficeIssue = { severity: 'error' | 'warning'; area: string; record: string; message: string };
export type OfficeRevision = {
	revision: number;
	action: string;
	note: string;
	actor: string | null;
	created_at: string;
	status: string;
};
export type StaffMember = { email: string; role: OfficeRole; department: string | null; active: boolean };
export type Submission = {
	id: string;
	author: string;
	department: string;
	course: string;
	term: string;
	request: string;
	status: 'submitted' | 'clarification' | 'accepted' | 'declined';
	response: string;
	created_at: string;
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
export function publication(doc: OfficeDocument): CurriculumSnapshot & { descriptions: Record<string, string> } {
	const snapshot = structuredClone(doc.curriculum);
	snapshot.updatedOn = new Date().toISOString().slice(0, 10);
	// Only approved offerings inform student availability; preserve historical records.
	for (const c of snapshot.courses) {
		const approved = doc.offerings.filter((o) => o.code === c.code && o.approval === 'approved');
		c.terms = [...new Set([...c.terms, ...approved.map((o) => o.term)])].sort().reverse();
		c.offered = [
			...new Set(c.terms.map((t) => Number(t.match(/_T([123])$/)?.[1])).filter((t) => t >= 1 && t <= 3))
		] as (1 | 2 | 3)[];
	}
	return { ...snapshot, descriptions: structuredClone(doc.descriptions) };
}
export function changesBetween(
	before: OfficeDocument,
	after: OfficeDocument
): { area: string; record: string; field: string; before: string; after: string }[] {
	const changes: { area: string; record: string; field: string; before: string; after: string }[] = [];
	const show = (v: unknown) => (v === undefined ? '—' : typeof v === 'string' ? v : JSON.stringify(v));
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
					before: a ? show(a) : '—',
					after: b ? show(b) : '—'
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

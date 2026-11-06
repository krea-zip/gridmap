import { admissionFor, VARIANTS, type OfficeDocument, type OfficeIssue } from './model.ts';
import { batchProblems } from './batches.ts';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const codePattern = /^[A-Z]{2,5}\d{3}[A-Z]?$/;
const list = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
export function documentShape(raw: unknown): raw is OfficeDocument {
	if (!object(raw) || raw.format !== 1 || !object(raw.curriculum) || !object(raw.descriptions) || !object(raw.prefixes))
		return false;
	const c = raw.curriculum;
	if (c.format !== 1 || !object(c.rules) || !object(c.equivalences)) return false;
	for (const k of ['courses', 'subjects', 'lecturers', 'requirementSets', 'batchRules'])
		if (!Array.isArray(c[k])) return false;
	for (const k of ['terms', 'offerings', 'imports', 'fields']) if (!Array.isArray(raw[k])) return false;
	if (
		!list(c.equivalences.transcriptOnly) ||
		!Array.isArray(c.equivalences.substitutes) ||
		!Array.isArray(c.equivalences.covers)
	)
		return false;
	return true;
}
export function validateOffice(raw: unknown): OfficeIssue[] {
	const issues: OfficeIssue[] = [];
	const add = (area: string, record: string, message: string, severity: 'error' | 'warning' = 'error') =>
		issues.push({ area, record, message, severity });
	if (!documentShape(raw)) {
		add('Workspace', 'Document', 'This is not a complete academic-office document.');
		return issues;
	}
	const d = raw,
		c = d.curriculum;
	try {
		const subjects = new Set(c.subjects.map((s) => s.id));
		const codes = new Map<string, string>();
		const canonical = new Set(c.courses.map((c) => c.code));
		const faculty = new Set(c.lecturers.map((f) => f.id));
		if (c.subjects.length !== subjects.size) add('Departments', '', 'Department identifiers must be unique.');
		for (const s of c.subjects)
			if (!/^[a-z][a-z ]{1,39}$/.test(s.id) || !s.label?.trim() || !s.short?.trim())
				add('Departments', s.id, 'Enter a department name, short label and valid identifier.');
		if (!subjects.has('core') || !subjects.has('open'))
			add('Departments', '', 'Keep the foundation core and open minor departments.');
		if (faculty.size !== c.lecturers.length) add('Faculty', '', 'Faculty identifiers must be unique.');
		for (const f of c.lecturers) {
			if (!f.id || !f.name?.trim()) add('Faculty', f.id, 'Enter a faculty name.');
			for (const url of [f.image_url, f.url])
				if (url && !/^https?:\/\//i.test(url))
					add('Faculty', f.id, 'Profile and photo links must start with https:// or http://.');
		}
		if (canonical.size !== c.courses.length) add('Courses', '', 'Course identifiers must be unique.');
		for (const course of c.courses) {
			if (!codePattern.test(course.code) || !course.title?.trim())
				add('Courses', course.code, 'Enter a valid course code and title.');
			if (!subjects.has(course.subject)) add('Courses', course.code, 'Select an existing department.');
			if (!Number.isFinite(course.credits) || course.credits < 0 || course.credits > 30)
				add('Courses', course.code, 'Credits must be between 0 and 30.');
			if (!course.retired && course.credits === 0)
				add('Courses', course.code, 'Credits have not been confirmed.', 'warning');
			if (
				!list(course.codes) ||
				!course.codes.includes(course.code) ||
				!list(course.subjects) ||
				!object(course.codesBySubject) ||
				!list(course.prereqs) ||
				!list(course.lecturers) ||
				!list(course.terms)
			)
				throw Error('Incomplete course record');
			if (
				course.offered.some((t) => ![1, 2, 3].includes(t)) ||
				course.eligibleYears.some((y) => !Number.isInteger(y) || y < 1 || y > 5)
			)
				add('Courses', course.code, 'Select valid trimesters and eligible years.');
			for (const alias of course.codes) {
				if (!codePattern.test(alias) || (codes.has(alias) && codes.get(alias) !== course.code))
					add('Courses', course.code, `Code ${alias} is invalid or already assigned to another course.`);
				codes.set(alias, course.code);
			}
			for (const [subject, alias] of Object.entries(course.codesBySubject))
				if (!subjects.has(subject) || !course.codes.includes(alias))
					add('Cross-listing', course.code, `Check the code assigned to ${subject}.`);
			for (const id of course.lecturers)
				if (!faculty.has(id)) add('Faculty', course.code, `Faculty record ${id} does not exist.`);
			if (!d.descriptions[course.code] && !course.retired)
				add('Courses', course.code, 'No course description.', 'warning');
		}
		const edges = new Map<string, string[]>();
		for (const course of c.courses) {
			const rule = admissionFor(course);
			for (const g of rule.groups) {
				if (!list(g.codes) || !g.codes.length)
					add('Prerequisites', course.code, 'Each prerequisite group needs at least one course.');
				for (const pre of g.codes) {
					if (!codes.has(pre)) add('Prerequisites', course.code, `${pre} is not in the catalogue.`);
					if (codes.get(pre) === course.code) add('Prerequisites', course.code, 'A course cannot require itself.');
				}
			}
			// OR groups are alternatives, not multiple mandatory edges.
			edges.set(
				course.code,
				rule.groups.filter((g) => g.codes.length === 1 && !g.concurrent).map((g) => codes.get(g.codes[0]) ?? g.codes[0])
			);
		}
		const visited = new Set<string>(),
			active = new Set<string>();
		function visit(code: string) {
			if (active.has(code)) {
				add('Prerequisites', code, 'A circular prerequisite chain must be corrected.');
				return;
			}
			if (visited.has(code)) return;
			active.add(code);
			for (const pre of edges.get(code) ?? []) visit(pre);
			active.delete(code);
			visited.add(code);
		}
		for (const code of edges.keys()) visit(code);
		const batches = new Set<number>();
		if (c.requirementSets.filter((s) => s.batches === null).length !== 1)
			add('Requirements', '', 'Keep exactly one default curriculum.');
		for (const set of c.requirementSets) {
			if (!/^[a-z0-9-]{1,40}$/.test(set.id) || !set.name?.trim())
				add('Requirements', set.id, 'Enter a curriculum name and identifier.');
			if (set.batches?.length === 0)
				add('Requirements', set.id, 'Select at least one batch, or make this the default.');
			for (const b of set.batches ?? []) {
				if (!Number.isInteger(b) || b < 2018 || b > 2100 || batches.has(b))
					add('Requirements', set.id, `Batch ${b} must belong to exactly one curriculum.`);
				batches.add(b);
			}
			const variants = new Set<string>();
			for (const p of set.programmes) {
				const id = `${set.name} · ${p.subject} · ${p.variant}`;
				if (
					!subjects.has(p.subject) ||
					!VARIANTS.some((v) => v.id === p.variant) ||
					variants.has(p.subject + p.variant)
				)
					add('Requirements', id, 'Select a unique department and programme.');
				variants.add(p.subject + p.variant);
				if (!Number.isFinite(p.credits.total) || p.credits.total < 0 || p.credits.total > 400)
					add('Requirements', id, 'Enter a valid total credit requirement.');
				for (const n of [p.credits.required, p.credits.elective])
					if (n !== null && (!Number.isFinite(n) || n < 0 || n > p.credits.total))
						add('Requirements', id, 'Required and elective credits must each be within the programme total.');
				for (const code of [...p.required, ...p.picks, ...p.electives, ...p.pathway.map((x) => x.code)])
					if (!canonical.has(code)) add('Requirements', id, `${code} must refer to a catalogue course.`);
				for (const g of p.choices) {
					if (!g.rule.trim() || !Number.isInteger(g.pick) || g.pick < 1 || g.pick > g.courses.length)
						add('Requirements', id, 'A choice group must have a name and enough options.');
					for (const o of g.courses)
						if (o.code && !codes.has(o.code)) add('Requirements', id, `Choice ${o.code} is not in the catalogue.`);
				}
				for (const slot of p.pathway)
					if (slot.year < 1 || slot.year > 5 || ![1, 2, 3].includes(slot.trim))
						add('Requirements', id, 'Pathways use years 1–5 and trimesters 1–3.');
			}
		}
		for (const problem of batchProblems(d)) add('Batches', problem.batch, problem.message, problem.severity);
		for (const group of c.equivalences.substitutes)
			for (const code of group) if (!canonical.has(code)) add('Substitutions', code, 'Select an existing course.');
		for (const pair of c.equivalences.covers)
			if (!canonical.has(pair.maths) || !canonical.has(pair.applied) || pair.maths === pair.applied)
				add('Substitutions', pair.maths, 'Select two different catalogue courses.');
		const r = c.rules;
		for (const [key, v] of Object.entries(r))
			if (!Number.isFinite(v) || v < 0 || v > 400)
				add('Policies', key, 'Enter a non-negative number no greater than 400.');
		if (r.TRIM_MIN > r.TRIM_NORMAL_MAX || r.TRIM_NORMAL_MAX > r.TRIM_HARD_MAX || r.TRIM_STANDARD_MAX > r.TRIM_HARD_MAX)
			add('Policies', '', 'Minimum, normal and maximum trimester loads contradict one another.');
		if (r.MIN_TOTAL_3YR > r.MAX_TOTAL_3YR || r.MIN_TOTAL_4YR > r.MAX_TOTAL_4YR)
			add('Policies', '', 'Graduation minimum cannot exceed the maximum.');
		if (r.MAX_TOTAL_3YR_DOUBLE !== undefined && r.MAX_TOTAL_3YR_DOUBLE < r.MAX_TOTAL_3YR)
			add('Policies', '', 'The double-major ceiling cannot be below the three-year ceiling.');
		const policy = c.policies;
		if (policy) {
			for (const n of [policy.graduationCgpa, policy.aidCgpa, policy.exitCgpa])
				if (!Number.isFinite(n) || n < 0 || n > 10) add('Policies', '', 'CGPA thresholds must be between 0 and 10.');
			for (const n of Object.values(policy.gradePoints))
				if (!Number.isFinite(n) || n < 0 || n > 10) add('Policies', '', 'Grade points must be between 0 and 10.');
			if (policy.gradePoints.U !== 0) add('Policies', 'U', 'A failed grade must have zero points.');
		}
		const terms = new Set(d.terms.map((t) => t.id));
		const offerings = new Set<string>();
		for (const t of d.terms)
			if (
				!/^\d{2}_T[123]$/.test(t.id) ||
				t.year < 2018 ||
				t.year > 2099 ||
				![1, 2, 3].includes(t.trimester) ||
				(t.starts && t.ends && t.starts > t.ends)
			)
				add('Terms', t.id, 'Check the term year, trimester and dates.');
		for (const o of d.offerings) {
			const key = `${o.term}|${o.code}|${o.section}`;
			if (offerings.has(key)) add('Offerings', o.code, `Section ${o.section || 'default'} occurs twice in ${o.term}.`);
			offerings.add(key);
			if (!terms.has(o.term) || !canonical.has(o.code)) add('Offerings', o.code, 'Select an existing term and course.');
			for (const n of [o.capacity, o.minimum])
				if (n !== null && (!Number.isInteger(n) || n < 0 || n > 10000))
					add('Offerings', o.code, 'Capacity and minimum enrolment must be whole numbers from 0 to 10,000.');
			if (o.capacity !== null && o.minimum !== null && o.minimum > o.capacity)
				add('Offerings', o.code, 'Minimum enrolment exceeds capacity.');
			for (const id of o.faculty)
				if (!faculty.has(id)) add('Offerings', o.code, `Faculty record ${id} does not exist.`);
			if (o.approval !== 'cancelled' && !o.faculty.length && !o.facultyText.trim())
				add('Offerings', o.code, `${o.term}: faculty not assigned.`, 'warning');
			if (o.approval === 'clarification' || o.approval === 'submitted')
				add('Offerings', o.code, `${o.term}: approval is pending.`, 'warning');
			for (const field of d.fields)
				if (field.required && !o.extras[field.id]?.trim()) add('Offerings', o.code, `${field.label} is required.`);
		}
		for (const [code, text] of Object.entries(d.descriptions))
			if (typeof text !== 'string' || text.length > 20000)
				add('Courses', code, 'Descriptions must be text, at most 20,000 characters.');
	} catch {
		add(
			'Workspace',
			'',
			'One or more records have missing or invalid fields. Restore the last saved version or correct the imported document.'
		);
	}
	return issues;
}

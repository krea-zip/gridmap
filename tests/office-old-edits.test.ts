// edits from the old browser-only admin, carried into an office draft
import { expect, test } from 'vitest';
import { makeOfficeDocument } from '$lib/features/office/model';
import { applyOldEdits } from '$lib/features/office/oldEdits';
import type { CurriculumSnapshot } from '$lib/curriculum/snapshot';
import snapshot from '$lib/data/curriculum.json';

const fresh = () => makeOfficeDocument(snapshot as unknown as CurriculumSnapshot, {});
const course = (doc: ReturnType<typeof fresh>, code: string) => doc.curriculum.courses.find((c) => c.code === code)!;

test('course, prerequisite and description edits land on the course', () => {
	const doc = fresh();
	const n = applyOldEdits(doc, {
		courses: { MATH201: { title: 'Analysis One', credits: 6, offered: [1, 3], retired: true } },
		prereqs: { MATH202: ['MATH201', 'MATH202'] },
		descriptions: { MATH201: 'Limits, rigorously.' }
	});
	expect(n).toBe(3);
	expect(course(doc, 'MATH201')).toMatchObject({ title: 'Analysis One', credits: 6, offered: [1, 3], retired: true });
	expect(course(doc, 'MATH202').prereqs).toEqual(['MATH201']); // never its own prerequisite
	expect(doc.descriptions.MATH201).toBe('Limits, rigorously.');
});

test('a new course is added once, and an existing code is left alone', () => {
	const doc = fresh();
	const before = doc.curriculum.courses.length;
	applyOldEdits(doc, {
		newCourses: {
			ZZZZ101: { code: 'ZZZZ101', title: 'New', subject: 'mathematics' },
			MATH201: { code: 'MATH201', title: 'Clash', subject: 'mathematics' }
		}
	});
	expect(doc.curriculum.courses.length).toBe(before + 1);
	expect(course(doc, 'MATH201').title).not.toBe('Clash');
});

test('rules and the credit-sharing default carry over; unknown rule keys do not', () => {
	const doc = fresh();
	applyOldEdits(doc, { rules: { TRIM_MIN: 10, NOT_A_RULE: 3 }, share: 'all' });
	expect(doc.curriculum.rules.TRIM_MIN).toBe(10);
	expect('NOT_A_RULE' in doc.curriculum.rules).toBe(false);
	expect(doc.curriculum.creditSharing).toBe('all');
});

test('programme and batch edits find their requirement set and track', () => {
	const doc = fresh();
	applyOldEdits(doc, {
		programmes: { 'fyup-2024|mathematics|single_major_4yr': { total: 84, electives: ['MATH434'] } },
		batches: { '[2025,"mathematics","major",true,false]': { courses: { MATH434: 'required' }, requiredCredits: 70 } }
	});
	const set = doc.curriculum.requirementSets.find((s) => s.id === 'fyup-2024')!;
	const maths = set.programmes.find((p) => p.subject === 'mathematics' && p.variant === 'single_major_4yr')!;
	expect(maths.credits.total).toBe(84);
	expect(maths.electives).toEqual(['MATH434']);
	expect(
		doc.curriculum.batchRules.find(
			(r) => r.batch === 2025 && r.subject === 'mathematics' && r.variant === 'single_major_4yr'
		)
	).toMatchObject({ courses: { MATH434: 'required' }, requiredCredits: 70 });
});

test('garbage in storage changes nothing', () => {
	const doc = fresh();
	const json = JSON.stringify(doc);
	expect(applyOldEdits(doc, { courses: 'nope', rules: [1, 2], batches: { 'not json': {} }, lecturers: 7 })).toBe(0);
	expect(JSON.stringify(doc)).toBe(json);
});

// the office's search: settings by the words staff actually use, records by
// their codes, and links that land on the right thing
import { describe, expect, test } from 'vitest';
import { makeOfficeDocument } from '$lib/features/office/model';
import { scoreEntry, searchOffice, shortcuts } from '$lib/features/office/search';
import { OFFICE_LINKS, officePage } from '$lib/features/office/navigation';
import type { CurriculumSnapshot } from '$lib/curriculum/snapshot';
import snapshot from '$lib/data/curriculum.json';

const doc = makeOfficeDocument(snapshot as unknown as CurriculumSnapshot, {});
const now = new Date('2026-11-04');
const search = (q: string) => searchOffice(doc, q, now);
const top = (q: string) => search(q)[0]?.hits[0];
const all = (q: string) => search(q).flatMap((g) => g.hits);

describe('finding settings', () => {
	test('a setting comes up by the words someone would use', () => {
		expect(all('overload').length + all('credit limit').length).toBeGreaterThan(0);
		expect(all('gpa scholarship').map((h) => h.href)).toContain('/admin/rules#policy-aid');
		expect(all('new major').map((h) => h.href)).toContain('/admin/batches/2027?section=programmes');
		expect(all('undo release').map((h) => h.href)).toContain('/admin/history');
	});

	test('every word has to match', () => {
		expect(search('philosophy zzzz')).toEqual([]);
	});

	test('nothing typed, nothing searched', () => {
		expect(search('   ')).toEqual([]);
	});

	test('a regex character in the query does no harm', () => {
		expect(() => search('c++ (hard')).not.toThrow();
	});
});

describe('finding records', () => {
	test('a course by its code opens that course', () => {
		expect(top('MATH201')?.href).toBe('/admin/courses?course=MATH201');
	});

	test('a batch by its year', () => {
		expect(top('2027')?.href).toBe('/admin/batches/2027');
	});

	test('a programme opens its requirements', () => {
		expect(all('philosophy double major').map((h) => h.href)).toContain(
			'/admin/requirements?subject=philosophy&variant=double_major_4yr'
		);
	});

	test('a department and a person open their records', () => {
		expect(all('sociology').map((h) => h.href)).toContain('/admin/departments?id=sociology');
		const person = doc.curriculum.lecturers[0];
		expect(all(person.name).map((h) => h.href)).toContain(`/admin/faculty?id=${encodeURIComponent(person.id)}`);
	});

	test('without a draft loaded, pages and settings still work', () => {
		expect(searchOffice(null, 'policies', now).length).toBeGreaterThan(0);
	});
});

describe('ranking', () => {
	test('an exact name beats a word in the detail', () => {
		const entry = { label: 'Grade points', detail: '', icon: '' };
		const passing = { label: 'Other', detail: 'grade points', icon: '' };
		expect(scoreEntry(entry, ['grade'])).toBeGreaterThan(scoreEntry(passing, ['grade']));
	});
});

describe('the map', () => {
	test('shortcuts point at the next intake', () => {
		expect(shortcuts(now)[0].hits[0].href).toBe('/admin/batches/2027');
	});

	test('one batch sits under Batches in the breadcrumb', () => {
		expect(officePage('/admin/batches/2027').label).toBe('batches');
		expect(officePage('/admin').label).toBe('overview');
	});

	test('every page in the map is really there', async () => {
		const routes = import.meta.glob('/src/routes/admin/**/+page.svelte');
		for (const link of OFFICE_LINKS) {
			const file = `/src/routes/admin${link.path ? '/' + link.path : ''}/+page.svelte`;
			expect(Object.keys(routes), link.label).toContain(file);
		}
	});
});

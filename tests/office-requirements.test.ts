// which degree requirements a batch graduates under, read from an office
// draft built from the shipped curriculum
import { describe, expect, test } from 'vitest';
import { makeOfficeDocument } from '$lib/features/office/model';
import { batchYears, programmeFor, setFor } from '$lib/features/office/requirements';
import type { CurriculumSnapshot } from '$lib/curriculum/snapshot';
import snapshot from '$lib/data/curriculum.json';

const doc = makeOfficeDocument(snapshot as unknown as CurriculumSnapshot, {});

describe('requirement sets', () => {
	test('a batch a set names graduates under it', () => {
		expect(setFor(doc, 2025)?.id).toBe('fyup-2024');
	});

	test('any other batch falls back to the default set', () => {
		expect(setFor(doc, 2022)?.id).toBe('website');
	});

	test('a programme is found by department and track', () => {
		const maths = programmeFor(doc, 2025, 'mathematics', 'single_major_4yr');
		expect(maths?.credits.total).toBeGreaterThan(0);
		expect(programmeFor(doc, 2025, 'astrology', 'single_major_4yr')).toBeUndefined();
	});

	test('the batch list runs from the earliest data to next year', () => {
		const years = batchYears(doc, new Date('2026-11-03'));
		expect(years[0]).toBe(2022);
		expect(years.at(-1)).toBe(2027);
	});
});

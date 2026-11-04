// what one batch can change: which programmes it may take, which curriculum it
// follows, and how that reads back, on a draft built from the shipped catalogue
import { beforeEach, describe, expect, test } from 'vitest';
import {
	changesBetween,
	makeOfficeDocument,
	moveCourse,
	newCourse,
	publication,
	toggleOffered,
	type OfficeDocument
} from '$lib/features/office/model';
import { validateOffice } from '$lib/features/office/validation';
import {
	assignSet,
	batchDifferences,
	batchProblems,
	batchStage,
	copyBatch,
	fellBack,
	forkSet,
	logChange,
	missingTracks,
	nextBatch,
	offerState,
	profileOf,
	removeChange,
	setOffer,
	tracksOf
} from '$lib/features/office/batches';
import { batchYears, setFor } from '$lib/features/office/requirements';
import { subjectOffered, type CurriculumSnapshot } from '$lib/curriculum/snapshot';
import snapshot from '$lib/data/curriculum.json';

let doc: OfficeDocument;
const subject = (id: string) => doc.curriculum.subjects.find((s) => s.id === id)!;
const change = {
	area: 'programme',
	subject: '',
	title: 'x',
	detail: '',
	reference: '',
	status: 'done',
	by: 'a',
	on: '2026-11-04'
} as const;

beforeEach(() => {
	doc = makeOfficeDocument(snapshot as unknown as CurriculumSnapshot, {});
	doc.curriculum.batchProfiles = [];
});

describe('programmes offered', () => {
	test('nothing said, a subject keeps its usual offers', () => {
		expect(offerState(doc, subject('philosophy'), 'major', 2027)).toMatchObject({ on: false, from: null });
		expect(offerState(doc, subject('philosophy'), 'minor', 2027).on).toBe(true);
	});

	test('opening a major carries forward, and not back', () => {
		setOffer(doc, 'philosophy', 'major', 2027, true);
		const on = (batch: number) => offerState(doc, subject('philosophy'), 'major', batch).on;
		expect([on(2026), on(2027), on(2030)]).toEqual([false, true, true]);
		expect(offerState(doc, subject('philosophy'), 'major', 2030).from).toBe(2027);
	});

	test('a later batch can close it again', () => {
		setOffer(doc, 'philosophy', 'major', 2027, true);
		setOffer(doc, 'philosophy', 'major', 2029, false);
		expect(offerState(doc, subject('philosophy'), 'major', 2030).on).toBe(false);
	});

	test('going back to inherited leaves no record behind', () => {
		setOffer(doc, 'philosophy', 'major', 2027, true);
		setOffer(doc, 'philosophy', 'major', 2027, undefined);
		expect(doc.curriculum.batchProfiles).toEqual([]);
	});

	test('a planned batch joins the list of years', () => {
		setOffer(doc, 'philosophy', 'major', 2031, true);
		expect(batchYears(doc, new Date('2026-11-03')).at(-1)).toBe(2031);
	});

	test('a major has four tracks, a minor two', () => {
		expect(tracksOf('major')).toHaveLength(4);
		expect(tracksOf('minor')).toEqual(['minor_4yr', 'minor_3yr']);
	});

	test('an offered programme with no requirements is flagged, not blocked', () => {
		setOffer(doc, 'philosophy', 'major', 2027, true);
		expect(missingTracks(doc, 'philosophy', 'major', 2027).length).toBeGreaterThan(0);
		const gaps = batchProblems(doc).filter((p) => p.message.includes('no requirements'));
		expect(gaps).toEqual([expect.objectContaining({ batch: '2027', severity: 'warning' })]);
	});

	test('an unknown department is an error', () => {
		setOffer(doc, 'alchemy', 'major', 2027, true);
		expect(batchProblems(doc)[0]).toMatchObject({ severity: 'error' });
	});
});

describe('which curriculum a batch follows', () => {
	test('a batch can move to another set, and back to the default', () => {
		assignSet(doc, 2027, 'website-2026');
		expect(setFor(doc, 2027)?.id).toBe('website-2026');
		assignSet(doc, 2027, 'website');
		expect(setFor(doc, 2027)?.id).toBe('website');
	});

	test('its own copy leaves the batches that shared the original alone', () => {
		const before = setFor(doc, 2024)!;
		const total = before.programmes.length;
		const own = forkSet(doc, 2025);
		own.programmes[0].credits.total = 999;
		expect(setFor(doc, 2025)?.id).toBe('batch-2025');
		expect(setFor(doc, 2024)?.id).toBe(before.id);
		expect(before.batches).not.toContain(2025);
		expect(before.programmes[0].credits.total).not.toBe(999);
		expect(own.programmes).toHaveLength(total);
	});

	test('a copy keeps the sets in batch order, so the newest stays last', () => {
		forkSet(doc, 2025);
		const named = doc.curriculum.requirementSets.filter((s) => s.batches);
		expect(named.at(-1)?.id).toBe('website-2026');
	});
});

describe('a batch nobody assigned', () => {
	test('falling back to the default is flagged, choosing it is not an oversight of the next batch', () => {
		expect(fellBack(doc, 2027)).toBe(true);
		expect(fellBack(doc, 2028)).toBe(false);
		expect(fellBack(doc, 2026)).toBe(false);
		assignSet(doc, 2027, 'website-2026');
		expect(fellBack(doc, 2027)).toBe(false);
	});

	test('it shows up in the checks once the batch is being worked on', () => {
		setOffer(doc, 'philosophy', 'minor', 2027, false);
		expect(batchProblems(doc).map((p) => p.message)).toContain(
			'The 2027 batch has no curriculum assigned, so it falls back to the default.'
		);
	});
});

describe('what differs from the batch before', () => {
	test('a programme opening is named', () => {
		setOffer(doc, 'philosophy', 'major', 2027, true);
		expect(batchDifferences(doc, 2027).map((d) => d.title)).toContain('philosophy opens as a major');
		expect(batchDifferences(doc, 2028).map((d) => d.title)).not.toContain('philosophy opens as a major');
	});

	test('moving curriculum lists what changes in it', () => {
		const own = forkSet(doc, 2027);
		const programme = own.programmes[0];
		programme.credits.total += 4;
		const found = batchDifferences(doc, 2027).find((d) => d.kind === 'requirements' && d.subject === programme.subject);
		expect(found?.detail).toContain('credits');
	});

	test('the first batch on record has nothing to differ from', () => {
		expect(batchDifferences(doc, 2022).filter((d) => d.kind === 'curriculum')).toEqual([]);
	});

	test('any two batches can be compared', () => {
		expect(batchDifferences(doc, 2026, 2023).map((d) => d.kind)).toContain('curriculum');
		expect(batchDifferences(doc, 2025, 2023)).toEqual([]);
	});

	test('course rules for the batch are listed', () => {
		const titles = batchDifferences(doc, 2022).filter((d) => d.kind === 'override');
		expect(titles.length).toBeGreaterThan(0);
		expect(titles[0].detail).toContain('ENVS201');
	});
});

describe('reusing and recording', () => {
	test('copying never overwrites what the batch already decided', () => {
		setOffer(doc, 'philosophy', 'major', 2027, true);
		setOffer(doc, 'arts', 'major', 2027, true);
		setOffer(doc, 'philosophy', 'major', 2028, false);
		expect(copyBatch(doc, 2027, 2028)).toBe(1);
		expect(profileOf(doc, 2028)?.offers).toEqual({ philosophy: { major: false }, arts: { major: true } });
	});

	test('a recorded change can be removed, and leaves nothing empty', () => {
		logChange(doc, 2027, change);
		const id = profileOf(doc, 2027)!.changes[0].id;
		removeChange(doc, 2027, id);
		expect(doc.curriculum.batchProfiles).toEqual([]);
	});

	test('the record stays in the office; the offers reach students', () => {
		setOffer(doc, 'philosophy', 'major', 2027, true);
		logChange(doc, 2027, { ...change, detail: 'senate minutes, not for students' });
		const published = publication(doc);
		expect(published.batchProfiles).toEqual([{ batch: 2027, offers: { philosophy: { major: true } } }]);
		expect(JSON.stringify(published.batchProfiles)).not.toContain('senate');
		expect(subjectOffered(subject('philosophy'), 'major', 2027, published.batchProfiles)).toBe(true);
	});
});

describe('what review & publish counts as a change', () => {
	const published = () => makeOfficeDocument(snapshot as unknown as CurriculumSnapshot, {});

	test('an empty batch record is not a change', () => {
		expect(changesBetween(published(), doc)).toEqual([]);
	});

	test('the office log is not a change, because students never get it', () => {
		logChange(doc, 2027, change);
		expect(changesBetween(published(), doc)).toEqual([]);
	});

	test('a programme opening is', () => {
		setOffer(doc, 'philosophy', 'major', 2027, true);
		expect(changesBetween(published(), doc).map((c) => c.field)).toEqual(['programmes offered']);
	});
});

describe('where a batch stands', () => {
	const november = new Date('2026-11-04');
	test('the next intake turns over in august', () => {
		expect(nextBatch(november)).toBe(2027);
		expect(nextBatch(new Date('2026-07-01'))).toBe(2026);
		expect(nextBatch(new Date('2026-08-01'))).toBe(2027);
	});

	test('stages read from where the batch is now', () => {
		expect(batchStage(2028, november)).toBe('planned');
		expect(batchStage(2027, november)).toBe('next intake');
		expect(batchStage(2026, november)).toBe('year 1');
		expect(batchStage(2022, november)).toBe('graduated');
	});
});

describe('editing a course in the list', () => {
	const fresh = () => newCourse('PHIL999', 'Test', 'philosophy');
	const problems = () => validateOffice(doc).filter((i) => i.severity === 'error' && i.record === 'PHIL999');

	test('moving a course takes its listing with it, and stays valid', () => {
		const course = fresh();
		doc.curriculum.courses.push(course);
		moveCourse(course, 'history');
		expect(course).toMatchObject({ subject: 'history', subjects: ['history'], codesBySubject: { history: 'PHIL999' } });
		expect(problems()).toEqual([]);
	});

	test('moving to a department it is cross-listed in keeps both listings', () => {
		const course = fresh();
		course.codesBySubject.history = 'HIST999';
		course.codes.push('HIST999');
		course.subjects.push('history');
		moveCourse(course, 'history');
		expect(course.subject).toBe('history');
		expect(course.codes).toEqual(['PHIL999', 'HIST999']);
		expect(Object.keys(course.codesBySubject).sort()).toEqual(['history', 'philosophy']);
	});

	test('trimesters toggle and stay in order', () => {
		const course = fresh();
		toggleOffered(course, 3);
		toggleOffered(course, 1);
		expect(course.offered).toEqual([1, 3]);
		toggleOffered(course, 3);
		expect(course.offered).toEqual([1]);
	});

	test('a trimester set by hand survives the preview', () => {
		const course = doc.curriculum.courses[0];
		const unused = ([1, 2, 3] as const).find((t) => !course.offered.includes(t))!;
		toggleOffered(course, unused);
		const shown = publication(doc).courses.find((c) => c.code === course.code);
		expect(shown?.offered).toContain(unused);
	});
});

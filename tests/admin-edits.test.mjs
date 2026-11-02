import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	lecturerIdFor,
	parseDescriptionEdits,
	parseLecturerEdits,
	parseProgrammeEdits,
	parseSubjectEdits,
	programmeKey,
	save
} from '../src/lib/adminEdits.ts';

test('description edits keep real codes and strings, including a deliberate blank', () => {
	assert.deepEqual(parseDescriptionEdits({ MATH201: '  Analysis.  ', MATH202: '', nope: 'x', MATH203: 5 }), {
		MATH201: 'Analysis.',
		MATH202: ''
	});
	assert.deepEqual(parseDescriptionEdits(null), {});
	assert.deepEqual(parseDescriptionEdits([]), {});
});

test('lecturer edits drop bad fields one by one, never the whole file', () => {
	const out = parseLecturerEdits({
		edited: { a: { position: ' Dean ', email: 4, name: '' }, b: { bogus: 'x' } },
		added: { c: { name: 'Cee', email: 'c@x.org' }, d: { email: 'no name' } },
		removed: ['a', 'a', 7],
		teaches: { MATH201: ['c', 'c'], bad: ['x'] }
	});
	assert.deepEqual(out.edited, { a: { position: 'Dean' } });
	assert.deepEqual(Object.keys(out.added), ['c']);
	assert.equal(out.added.c.email, 'c@x.org');
	assert.deepEqual(out.removed, ['a']);
	assert.deepEqual(out.teaches, { MATH201: ['c'] });
});

test('a new lecturer id comes from the name and never collides', () => {
	const taken = new Set(['ada-lovelace']);
	assert.equal(
		lecturerIdFor('Ada Lovelace', (id) => taken.has(id)),
		'ada-lovelace-2'
	);
	assert.equal(
		lecturerIdFor('  ', () => false),
		'lecturer'
	);
});

test('department edits clamp the hue and need a label and tag to be added', () => {
	const out = parseSubjectEdits({
		edited: { mathematics: { short: 'maths', hue: 999, majorable: 'yes' } },
		added: {
			anthropology: { label: 'Anthropology', short: 'anth', majorable: true },
			'Bad Id!': { label: 'x', short: 'y' },
			nolabel: { short: 'n' }
		}
	});
	assert.deepEqual(out.edited, { mathematics: { short: 'maths', hue: 360 } });
	assert.deepEqual(Object.keys(out.added), ['anthropology']);
});

test('programme edits only accept known variants, sane credits and real course codes', () => {
	const key = programmeKey('fyup-2024', 'mathematics', 'single_major_4yr');
	const out = parseProgrammeEdits({
		[key]: { total: 130, required: null, elective: -3, requiredCourses: ['MATH191', 'MATH191', 'junk'], created: true },
		'fyup-2024|mathematics|not_a_variant': { total: 10 },
		'fyup-2024|physics|minor_4yr': {}
	});
	assert.deepEqual(out, { [key]: { total: 130, required: null, requiredCourses: ['MATH191'], created: true } });
});

test('saving an empty edit removes the key and announces the change', () => {
	const values = new Map();
	const events = [];
	globalThis.localStorage = {
		getItem: (k) => values.get(k) ?? null,
		setItem: (k, v) => values.set(k, v),
		removeItem: (k) => values.delete(k)
	};
	globalThis.window = { dispatchEvent: (e) => events.push(e.type) };
	save('k', { edited: { a: { x: 1 } }, removed: [] });
	assert.ok(values.has('k'));
	save('k', { edited: {}, added: {}, removed: [], teaches: {} });
	assert.ok(!values.has('k'));
	save('k', { MATH201: '' }); // a blanked description is a real edit
	assert.ok(values.has('k'));
	assert.equal(events.length, 3);
	delete globalThis.window;
	delete globalThis.localStorage;
});

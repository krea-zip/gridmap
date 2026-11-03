// Works out which subject gets which hue (the `hue` on each subject in
// src/lib/curriculum/compiler.ts, which the office can also change under
// Departments). Sixteen subjects share the palette's arc 15° apart, too
// close to tell neighbours apart on one plan, so the order should sit side
// by side the subjects students least often combine. Run it again when a
// subject is added; it prints an order, it doesn't change anything. The
// search is random, so runs differ a little; orders whose numbers at the end
// are within a few hundredths are as good as each other, and only a clearly
// lower one is worth recolouring every subject for.
//
//   node scripts/hue-order.mjs
//
// How likely a pair is to be taken together comes from two places:
// - the curriculum itself: courses cross-listed between the two, a
//   programme requiring or offering the other's courses, prerequisites
//   across them, substitutes. Departments that share courses get shared
//   students.
// - what's known outside it (EVIDENCE below). No university publishes its
//   pairs in full; these are what could be found in 2026.
// The search then keeps likely pairs 40° or more apart (closer reads as one
// colour), prefers them 45°–105° apart (a 'theme', like blue and green),
// and leaves environmental studies blue and biology green, which students
// liked.
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync(new URL('../src/lib/data/curriculum.json', import.meta.url), 'utf8'));
const SUBJECTS = snapshot.subjects.filter((s) => s.hue !== undefined).map((s) => s.id);
const PINNED = { 'environmental studies': 235, biology: 130 };
const SLOTS = SUBJECTS.map((_, i) => 115 + 15 * i);
const key = (a, b) => [a, b].sort().join(' + ');

// 1 = a common pairing, 0.5 = one that turns up
const EVIDENCE = {
	'economics + mathematics': 1, // Teagle double-majors study's top ten; Wesleyan's 2nd pairing; MIT
	'economics + political science': 1, // Teagle; UW–Madison; Wesleyan Argus
	'business studies + economics': 1, // Teagle; Krea's economics page
	'data science + economics': 1, // UW–Madison, data science's most common add
	'computer science + data science': 1, // UW–Madison's most common pairing
	'computer science + mathematics': 1, // UW–Madison; MIT
	'mathematics + physics': 1, // MIT second majors
	'biology + chemistry': 1, // the pre-med pairing everywhere
	'history + political science': 1, // Krea offers politics and history as a joint major
	'arts + literature': 1, // Krea runs literature and arts as one major
	'computer science + economics': 0.5, // a Krea alumna's double major; MIT 6-14
	'economics + environmental studies': 0.5, // a Krea alumnus's double major
	'literature + psychology': 0.5, // the Krea brochure's week in the life
	'biology + psychology': 0.5, // UW–Madison
	'economics + psychology': 0.5, // UW–Madison
	'psychology + sociology': 0.5,
	'data science + mathematics': 0.5,
	'literature + philosophy': 0.5,
	'philosophy + political science': 0.5,
	'biology + environmental studies': 0.5,
	'environmental studies + sociology': 0.5,
	'chemistry + physics': 0.5
};
const DIVISION = {
	sciences: [
		'biology',
		'chemistry',
		'physics',
		'mathematics',
		'computer science',
		'data science',
		'environmental studies'
	],
	social: ['economics', 'political science', 'psychology', 'sociology', 'business studies'],
	humanities: ['history', 'literature', 'philosophy', 'arts']
};
const divisionOf = (s) => Object.keys(DIVISION).find((d) => DIVISION[d].includes(s));

// ── how tied two subjects are in the curriculum ──
const byCode = new Map();
for (const c of snapshot.courses) for (const code of c.codes ?? [c.code]) byCode.set(code, c);
const ties = {};
const tie = (a, b, n) =>
	a !== b && SUBJECTS.includes(a) && SUBJECTS.includes(b) && (ties[key(a, b)] = (ties[key(a, b)] ?? 0) + n);
for (const c of snapshot.courses) {
	for (const [i, a] of c.subjects.entries()) for (const b of c.subjects.slice(i + 1)) tie(a, b, 2);
	for (const pre of c.prereqs ?? [])
		for (const a of c.subjects) for (const b of byCode.get(pre)?.subjects ?? []) tie(a, b, 1);
}
const set = snapshot.requirementSets.at(-1);
for (const p of set.programmes.filter((p) => p.variant === 'single_major_4yr'))
	for (const [codes, n] of [
		[p.required, 3],
		[(p.pathway ?? []).map((s) => s.code), 2],
		[p.electives ?? [], 1]
	])
		for (const code of codes)
			for (const b of byCode.get(code)?.subjects ?? []) if (b !== p.subject) tie(p.subject, b, n);
const equivalent = [
	...snapshot.equivalences.substitutes,
	...snapshot.equivalences.covers.map((c) => [c.maths, c.applied])
];
for (const group of equivalent)
	for (const [i, a] of group.entries())
		for (const b of group.slice(i + 1))
			for (const x of byCode.get(a)?.subjects ?? []) for (const y of byCode.get(b)?.subjects ?? []) tie(x, y, 2);

// ── likelihood: half curriculum, half evidence, a little for sharing a division ──
const most = Math.max(...Object.values(ties));
const weight = {};
for (const [i, a] of SUBJECTS.entries())
	for (const b of SUBJECTS.slice(i + 1))
		weight[key(a, b)] =
			0.45 * Math.sqrt((ties[key(a, b)] ?? 0) / most) +
			0.45 * (EVIDENCE[key(a, b)] ?? 0) +
			0.1 * (divisionOf(a) === divisionOf(b) ? 1 : 0.2);

// ── the order: likely pairs apart, a theme apart if possible ──
const NEAR = [0, 1, 0.6, 0.12, 0.03]; // by slots apart; under 3 (40°) is a clash
function cost(order) {
	let c = 0;
	for (let i = 0; i < order.length; i++)
		for (let j = i + 1; j < Math.min(order.length, i + 8); j++) {
			const w = weight[key(order[i], order[j])];
			c += j - i < NEAR.length ? w * NEAR[j - i] : 0;
			if (j - i >= 3) c -= 0.15 * w; // 45°–105°
		}
	return c;
}
const pinnedAt = new Map(Object.entries(PINNED).map(([s, h]) => [SLOTS.indexOf(h), s]));
const movable = SLOTS.map((_, i) => i).filter((i) => !pinnedAt.has(i));
function anneal() {
	const free = SUBJECTS.filter((s) => !(s in PINNED)).sort(() => Math.random() - 0.5);
	let order = SLOTS.map((_, i) => pinnedAt.get(i) ?? free.pop());
	let c = cost(order);
	let best = { order, c };
	for (let t = 2; t > 0.0005; t *= 0.9995) {
		const [i, j] = [0, 0].map(() => movable[Math.floor(Math.random() * movable.length)]);
		const next = [...order];
		[next[i], next[j]] = [next[j], next[i]];
		const nc = cost(next);
		if (nc < c || Math.random() < Math.exp((c - nc) / t)) [order, c] = [next, nc];
		if (c < best.c) best = { order, c };
	}
	return best;
}
let best = { c: Infinity };
for (let run = 0; run < 60; run++) {
	const found = anneal();
	if (found.c < best.c) best = found;
}

const hueOf = Object.fromEntries(snapshot.subjects.map((s) => [s.id, s.hue]));
const closeLikelihood = (at) =>
	Object.entries(weight)
		.filter(([k]) => Math.abs(at(k.split(' + ')[0]) - at(k.split(' + ')[1])) < 40)
		.reduce((sum, [, w]) => sum + w, 0);
const proposed = (s) => SLOTS[best.order.indexOf(s)];
console.log('subject                 now   proposed');
for (const s of best.order) console.log(`${s.padEnd(24)}${String(hueOf[s]).padEnd(6)}${proposed(s)}°`);
console.log(
	`\nlikelihood of a pair under 40° apart: ${closeLikelihood((s) => hueOf[s]).toFixed(2)} now, ` +
		`${closeLikelihood(proposed).toFixed(2)} proposed`
);

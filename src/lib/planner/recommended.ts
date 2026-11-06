// the department's suggested path for the chosen programmes: what the
// grid is seeded with on a first visit and what the dashed ghosts show
// afterwards. plain functions of the plan, derived by the store.
import type { Plan } from '$lib/planner/plan.svelte';
import type { Programme } from '$lib/types';
import {
	byCode,
	capstoneFor,
	CORE_COURSES,
	hasCode,
	isCore,
	MATHS_COVERS,
	reachableIn,
	recommendedFor,
	requiredSetFor,
	satisfiedBy,
	TRIM_NORMAL_MAX,
	Y1_CORE_MAX
} from '$lib/curriculum/data';
import { slotKey, TRIMS, type SlotKey, type TrimNum } from '$lib/types';

/**
 * The department's recommended path for the CURRENT programme, as a pure
 * function of it: the published pathway where one exists, otherwise the
 * required courses scheduled into the earliest slot that satisfies
 * offering, year eligibility, prereq order and the 16-credit normal load,
 * then evened out across the trimesters (see level).
 *
 * Derived, not stored, because it is not a second plan the student can get
 * lost in, it is what the app would suggest, recomputed whenever the
 * degree changes, and shown as ghosts in the slots it would use.
 */
export function recommendedPath(plan: Plan, programmes: Programme[] = plan.programmes): Record<SlotKey, string[]> {
	const subjects = programmes.map((p) => p.subject);
	const placements: Record<SlotKey, string[]> = {};
	const pos = new Map<string, number>(); // code -> year*10+trim
	const published = new Map<string, number>(); // a pathway course -> the slot its department gave it
	const load = (y: number, t: TrimNum) => (placements[slotKey(y, t)] ?? []).reduce((s, c) => s + byCode(c).credits, 0);
	const put = (code: string, y: number, t: TrimNum) => {
		const key = slotKey(y, t);
		placements[key] = [...(placements[key] ?? []), code];
		pos.set(code, y * 10 + t);
	};

	// A valid slot (lock, eligibility, offering, ordering, load all OK).
	// `spread` picks between two objectives:
	//   • spread=false → EARLIEST slot. Used for a course that still has
	//     dependents to place, so a prereq chain stays feasible (a t1-only
	//     course whose dependent is also t1-only must not land in the last
	//     year, or the dependent has nowhere to go).
	//   • spread=true → EMPTIEST slot (tie-break earliest). Used for a leaf
	//     course, so the required load fans out across the years, one or
	//     two per trimester, instead of stacking into year 2.
	const findSlot = (
		code: string,
		after: number,
		before = Infinity,
		spread = true
	): { y: number; t: TrimNum } | undefined => {
		const course = byCode(code);
		let best: { y: number; t: TrimNum } | undefined;
		let bestKey = [Infinity, Infinity];
		for (const y of plan.seedYears) {
			for (const t of TRIMS) {
				// year-1 t1/t2 are reserved for the foundation core (seeded below)
				if (plan.coreOnly(y, t)) continue;
				if (course.eligibleYears.length && !course.eligibleYears.includes(y)) continue;
				if (course.offered.length && !course.offered.includes(t)) continue;
				const order = y * 10 + t;
				if (order <= after || order >= before) continue;
				const l = load(y, t);
				if (l + course.credits > TRIM_NORMAL_MAX) continue;
				// primary/secondary sort key: by load then order when spreading,
				// by order then load when packing a chain in early
				const key = spread ? [l, order] : [order, l];
				if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
					best = { y, t };
					bestKey = key;
				}
			}
		}
		return best;
	};

	// ── the foundation core seeds first ──
	// year-1 t1/t2 take ONLY these (4 per trimester), the rest fan into
	// y1 t3 / year 2, and the year-3-only Engaging with the Environment
	// lands in year 3. Most-constrained first (fewest offered trimesters),
	// so the t1-only courses claim y1 t1 before the flexible ones fill it.
	const coreSlots: { y: number; t: TrimNum }[] = plan.seedYears.flatMap((y) =>
		TRIMS.map((t) => ({ y, t: t as TrimNum }))
	);
	const cores = [...CORE_COURSES].sort(
		(a, b) => (a.offered.length || TRIMS.length) - (b.offered.length || TRIMS.length)
	);
	for (const course of cores) {
		for (const { y, t } of coreSlots) {
			if (course.eligibleYears.length && !course.eligibleYears.includes(y)) continue;
			if (course.offered.length && !course.offered.includes(t)) continue;
			if (plan.coreOnly(y, t)) {
				if ((placements[slotKey(y, t)] ?? []).length >= Y1_CORE_MAX) continue;
			} else if (load(y, t) + course.credits > TRIM_NORMAL_MAX) {
				continue;
			}
			put(course.code, y, t);
			break;
		}
	}

	// the required set for every programme (already capped at the credit
	// table's required figure), unioned, the default plan seeds exactly
	// these, so the elective credits the table allows stay OPEN for the
	// student to fill (maths: 52 required placed, 8 left, not pre-filled)
	const requiredUnion = new Set(
		programmes.flatMap((prog) => {
			const args = [prog.subject, prog.role, plan.fourYear, plan.isDouble, plan.batchStartYear] as const;
			// a required capstone (chemistry's) is seeded like any required course
			const capstone = capstoneFor(...args);
			return [...requiredSetFor(...args), ...(capstone?.required ? [capstone.code] : [])];
		})
	);
	// two programmes can ask for the same material under different codes.
	// A maths + computer-science student is required to do maths' Linear
	// Algebra AND cs' applied version, but the maths one clears the
	// applied one, so seed only that. One-way: the applied course never
	// displaces the maths one (see MATHS_COVERS).
	for (const code of [...requiredUnion]) {
		if (!hasCode(code)) continue;
		if ((byCode(code).coveredBy ?? []).some((m) => requiredUnion.has(m))) requiredUnion.delete(code);
	}

	// the departments' published pathways first, where they exist, but
	// only for the courses that are actually required, so a pathway's
	// recommended electives (maths Topology 1) aren't force-placed
	for (const prog of programmes) {
		for (const { year, trim, code } of recommendedFor(
			prog.subject,
			prog.role,
			plan.fourYear,
			plan.isDouble,
			plan.batchStartYear
		)) {
			if (pos.has(code) || !requiredUnion.has(code)) continue;
			// the published grid itself is not always feasible (it lists
			// MATH427 alongside its prerequisite MATH303), never place a
			// course at or before a prerequisite already on the grid
			const after = Math.max(0, ...byCode(code).prereqs.map((p) => pos.get(p) ?? 0));
			if (plan.seedYears.includes(year) && !plan.coreOnly(year, trim) && year * 10 + trim > after) {
				put(code, year, trim);
				published.set(code, year * 10 + trim);
			} else {
				// pathway claims a core-only/invisible slot (e.g. MATH191 in
				// y1 t1) or one that breaks prereq order, tuck it into
				// the EARLIEST slot that actually works (spread=false), so a
				// displaced early course (Proofs, t3-only) still lands in year 1
				// and doesn't push its whole chain, Analysis 1 → 2 → 3, so late
				// that a t1-only tail (Analysis 3) has no valid slot left
				const slot = findSlot(code, after, Infinity, false);
				if (slot) put(code, slot.y, slot.t);
			}
		}
	}

	// a placed course, or one about to be scheduled, counts any of its
	// interchangeable substitutes as itself (Discrete Maths or Maths
	// Foundations satisfies a Proofs-and-Ideas prereq, and vice-versa)
	const subs = (code: string): string[] => (hasCode(code) ? satisfiedBy(code) : []);

	// Everything the programmes require that the pathways didn't place,
	// PLUS the prerequisites those courses depend on (the 1-credit tools
	// courses, BIOS207 which the required BIOS228 needs, …). Building the
	// closure up front and scheduling it in ONE prereq-ordered pass is
	// what keeps a pulled-in prereq ordered after ITS OWN prereqs, the
	// old separate "pull in prerequisites" loop dropped them into the
	// earliest free slot and put BIOS207 ahead of BIOS201.
	const remaining = new Set(requiredUnion);
	for (const code of [...remaining]) {
		const stack = hasCode(code) ? [...byCode(code).prereqs] : [];
		while (stack.length) {
			const pre = stack.pop()!;
			if (!hasCode(pre) || remaining.has(pre) || !reachableIn(pre, plan.fourYear)) continue;
			if (subs(pre).some((s) => remaining.has(s))) continue; // a substitute already covers it
			// only pull in a prereq from one of the student's OWN departments.
			// A cross-department prereq (the computer-science courses behind a
			// data-science requirement, biology's BIOS201 behind an env-studies
			// course) isn't on the programme's list, seeding it buries the plan
			// in green 'other' support courses. The prereq LAW still flags the
			// ordering if the student chooses to add it.
			if (!byCode(pre).subjects.some((subj) => subjects.includes(subj))) continue;
			remaining.add(pre);
			stack.push(...byCode(pre).prereqs);
		}
	}
	for (const code of [...remaining]) if (!hasCode(code) || pos.has(code)) remaining.delete(code);

	// greedy earliest-fit over all programmes together; foundational
	// courses (the ones that unlock the most) go first so prereqs land
	// before their dependents
	let progress = true;
	while (remaining.size && progress) {
		progress = false;
		const order = [...remaining].sort((a, b) => byCode(b).unlocks.length - byCode(a).unlocks.length);
		for (const code of order) {
			const course = byCode(code);
			// wait until every prereq we're also scheduling (or one of its
			// substitutes) has been placed
			const preReady = course.prereqs.every((p) => !(remaining.has(p) || subs(p).some((s) => remaining.has(s))));
			if (!preReady) continue;
			const after = Math.max(
				0,
				...course.prereqs.map((p) => Math.max(pos.get(p) ?? 0, ...subs(p).map((s) => pos.get(s) ?? 0)))
			);
			// and stay strictly before any already-placed dependent
			const before = Math.min(Infinity, ...course.unlocks.map((u) => pos.get(u) ?? Infinity));
			// a course that still has a dependent to schedule is packed in as
			// early as possible (keeping the chain feasible); a leaf course
			// fans out to the emptiest trimester
			const hasDownstream = course.unlocks.some((u) => remaining.has(u));
			const slot = findSlot(code, after, before, !hasDownstream);
			if (slot) put(code, slot.y, slot.t);
			// placed or unplaceable, either way it's off the list
			remaining.delete(code);
			progress = true;
		}
	}

	level(plan, placements, pos, published, subs);
	return placements;
}

/**
 * Even the path out. Each programme's courses are laid out well on their
 * own, but with two or three programmes the same years fill up (years 2
 * and 3 at 16 credits, year 4 nearly empty), so this moves single courses
 * from a heavy trimester to a lighter one while that makes the loads more
 * even (the sum of squared loads drops). A move is only ever one the
 * student could make: offered that term, a year the course is open to,
 * after its prerequisites and before what needs it, under the normal load.
 *
 * Two things hold a course where it is. A course goes later than its level
 * only reluctantly (a 200-level course belongs in year 2, and only a much
 * heavier trimester sends it to year 4). A course a department's published
 * pathway placed leaves that slot only when it clearly helps: the pathways
 * are the departments' advice, though maths' FYUP page says other pathways
 * work too, and its double-major versions spread over years 2 to 4.
 * The foundation core stays put.
 */
function level(
	plan: Plan,
	placements: Record<SlotKey, string[]>,
	pos: Map<string, number>,
	published: Map<string, number>,
	subs: (code: string) => string[]
) {
	const LATE = 6; // per credit, per year past the course's level
	const OFF_PATHWAY = 4; // per credit, for leaving a published slot
	const slots = plan.seedYears.flatMap((y) =>
		TRIMS.filter((t) => !plan.coreOnly(y, t)).map((t) => ({ y, t, order: y * 10 + t, key: slotKey(y, t) }))
	);
	const loadAt = new Map(
		slots.map((s) => [s.order, (placements[s.key] ?? []).reduce((sum, c) => sum + byCode(c).credits, 0)])
	);
	// the year a course's number says it's for: MATH191 year 1, ECON309 year 3
	const levelYear = (code: string) => Math.min(4, Math.max(1, Number(code.match(/\d/)?.[0] ?? 2)));
	const cost = (code: string, order: number) => {
		const credits = byCode(code).credits;
		const late = Math.max(0, Math.floor(order / 10) - levelYear(code));
		const off = published.has(code) && published.get(code) !== order ? 1 : 0;
		return credits * (LATE * late + OFF_PATHWAY * off);
	};
	// what a course must come after and before, among what's on the path
	const after = (code: string) =>
		Math.max(0, ...byCode(code).prereqs.flatMap((p) => [p, ...subs(p)].map((q) => pos.get(q) ?? 0)));
	const before = (code: string) =>
		Math.min(
			Infinity,
			...[...pos.keys()]
				.filter((d) => byCode(d).prereqs.some((p) => p === code || subs(p).includes(code)))
				.map((d) => pos.get(d)!)
		);

	const movable = [...pos.keys()].filter((code) => !isCore(code)).sort();
	for (let round = 0; round < 200; round++) {
		let best: { code: string; from: number; to: (typeof slots)[number]; gain: number } | undefined;
		for (const code of movable) {
			const course = byCode(code);
			const from = pos.get(code)!;
			const fromLoad = loadAt.get(from) ?? 0;
			const [lo, hi] = [after(code), before(code)];
			for (const to of slots) {
				if (to.order === from || to.order <= lo || to.order >= hi) continue;
				if (course.eligibleYears.length && !course.eligibleYears.includes(to.y)) continue;
				if (course.offered.length && !course.offered.includes(to.t)) continue;
				const toLoad = loadAt.get(to.order)!;
				if (toLoad + course.credits > TRIM_NORMAL_MAX) continue;
				// the change in the sum of squared loads, plus what the move costs
				const gain =
					2 * course.credits * (fromLoad - toLoad - course.credits) - cost(code, to.order) + cost(code, from);
				if (gain > 0 && (!best || gain > best.gain)) best = { code, from, to, gain };
			}
		}
		if (!best) return;
		const { code, from, to } = best;
		const fromKey = slotKey(Math.floor(from / 10), (from % 10) as TrimNum);
		placements[fromKey] = placements[fromKey].filter((c) => c !== code);
		if (!placements[fromKey].length) delete placements[fromKey];
		placements[to.key] = [...(placements[to.key] ?? []), code];
		loadAt.set(from, (loadAt.get(from) ?? 0) - byCode(code).credits);
		loadAt.set(to.order, loadAt.get(to.order)! + byCode(code).credits);
		pos.set(code, to.order);
	}
}

/**
 * The credits the degree still needs beyond the recommended path, as
 * elective placeholders spread across the trimesters that have room.
 *
 * The path seeds REQUIRED courses only, the elective budget the credit
 * table allows is deliberately left open, because choosing those courses is
 * the student's job. Without showing them, though, the reference plan reads
 * as a degree that is twenty credits short, and the trimesters it does fill
 * look under-loaded. So the remainder is drawn as "elective" boxes: not
 * courses, just the room the degree leaves you.
 *
 * Year 1 t1/t2 are skipped, those take foundation courses only.
 */
export function recommendedElectives(plan: Plan): Record<SlotKey, number> {
	const SLOT_CREDITS = 4; // the ordinary course size the placeholders stand for
	const out: Record<SlotKey, number> = {};
	const placed = Object.values(plan.recommended)
		.flat()
		.reduce((sum, code) => sum + byCode(code).credits, 0);
	let left = plan.creditTarget - placed;
	if (left < SLOT_CREDITS) return out;

	const slots: SlotKey[] = [];
	for (const year of plan.seedYears) {
		for (const trim of TRIMS) {
			if (plan.coreOnly(year, trim)) continue;
			slots.push(slotKey(year, trim));
		}
	}
	const load = (key: SlotKey) =>
		(plan.recommended[key] ?? []).reduce((sum, code) => sum + byCode(code).credits, 0) + (out[key] ?? 0) * SLOT_CREDITS;

	// emptiest trimester first, so the electives fan out across the degree
	// instead of stacking into whichever year the required courses left free
	while (left >= SLOT_CREDITS) {
		let best: SlotKey | undefined;
		for (const key of slots) {
			if (load(key) + SLOT_CREDITS > TRIM_NORMAL_MAX) continue;
			if (!best || load(key) < load(best)) best = key;
		}
		if (!best) break; // every trimester is full, the rest won't fit
		out[best] = (out[best] ?? 0) + 1;
		left -= SLOT_CREDITS;
	}
	return out;
}

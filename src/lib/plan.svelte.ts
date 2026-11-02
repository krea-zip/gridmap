// ─────────────────────────────────────────────
// Plan, all app state + the "laws" in one class.
// Instantiated once in +page.svelte, passed down as a prop.
// ─────────────────────────────────────────────

import { browser } from '$app/environment';
import { restoreBoard, saveBoard } from './features/plans/autosave';
// the board's motion is a plan concern: only the plan knows when a change is
// one course moving (worth watching fly) and when it is a whole-board redraw
import { quietRedraw } from './transitions';
import { selectCatalogue } from './catalogue';
import { mergeCanvasCourses } from './canvasImport';
import { guessNow, offeredIn, slotAt, slotOrder, trimName, trimSpelled, type Here, type TrimNaming } from './calendar';
import {
	AUDIT_LIMIT,
	CORE_COURSES,
	CORE_CREDITS,
	COURSES,
	CREDIT_SHARE_DEFAULT,
	SUBJECTS,
	HEAVY_TRIMS_ALLOWED,
	MAX_TOTAL_3YR,
	MAX_TOTAL_4YR,
	MIN_TOTAL_3YR,
	MIN_TOTAL_4YR,
	TRIM_HARD_MAX,
	TRIM_MIN,
	TRIM_NORMAL_MAX,
	TRIM_STANDARD_MAX,
	MAJOR_SUBJECTS,
	OPEN_MINOR,
	MATHS_COVERS,
	PROGRAMME_SUBJECTS,
	Y1_CORE_MAX,
	attemptId,
	attemptNumber,
	baseCode,
	byCode,
	canAudit,
	isCore,
	isTranscriptOnly,
	choiceGroupsFor,
	creditsFor,
	creditsOfCodes,
	electiveSetFor,
	hasCode,
	isAttemptId,
	pickSetFor,
	reachableIn,
	recommendedFor,
	requiredCreditsFor,
	requiredSetFor,
	batchRuleFor,
	satisfiedBy,
	subjectById
} from './data';
import {
	GRADE_POINTS,
	GRAD_MIN_CGPA,
	isGradeLetter,
	isGradeMark,
	recovery,
	weightedGpa,
	type GradeMark
} from './grades';
import {
	slotKey,
	parseSlot,
	type Course,
	type CourseType,
	type Hint,
	type Programme,
	type ProgrammeRole,
	type ProgrammeStat,
	type SlotKey,
	type StructureKind,
	type TrimNum
} from './types';

const TRIMS: TrimNum[] = [1, 2, 3];

// bump only when the saved shape changes in a way applySave can't read
const SAVE_VERSION = 1;
// the most years the grid can run to: a 4-year degree plus one
/** the longest any plan runs: a 4-year degree's n + 2 years (a 3-year
 *  degree stops at 5, see Plan.maxYears) */
export const MAX_YEARS = 6;

/** What the board shows. 'plan' is the planner itself; every other view lays
 *  its own information over the same grid, one view at a time. Grouped as the
 *  menu shows them: your own plan and record, then ways to explore it. */
export const BOARD_VIEWS = [
	{ id: 'plan', group: 'yours', label: 'plan', note: 'arrange your courses' },
	{ id: 'grades', group: 'yours', label: 'grades', note: 'your grades, TGPA and CGPA' },
	{ id: 'milestones', group: 'yours', label: 'milestones', note: 'where each year leaves you' },
	{ id: 'runs', group: 'explore', label: 'will it run?', note: 'how often it ran in that trimester' },
	{ id: 'prereqs', group: 'explore', label: 'prerequisites', note: 'what a course needs and leads to' },
	{ id: 'whatif', group: 'explore', label: 'what-if', note: 'try another programme on your plan' },
	{ id: 'faculty', group: 'explore', label: 'faculty', note: 'who teaches each course' }
] as const;
export type BoardView = (typeof BOARD_VIEWS)[number]['id'];
const isBoardView = (v: unknown): v is BoardView => BOARD_VIEWS.some((b) => b.id === v);

/** A trimester not spent taking courses here. A term away (an exchange)
 *  brings credits back; they count toward the degree's total, not toward a
 *  programme, and carry no grade. */
export type BreakKind = 'break' | 'suspension' | 'away';
export type BreakInfo = { kind: BreakKind; credits?: number };
export const BREAK_KINDS: Record<BreakKind, { label: string; note: string }> = {
	break: { label: 'break', note: 'a trimester off: leave, health, work, anything' },
	suspension: { label: 'suspension', note: 'suspended for the trimester' },
	away: { label: 'away', note: 'an exchange or study-abroad term; its credits come back with you' }
};
const isBreakKind = (v: unknown): v is BreakKind => v === 'break' || v === 'suspension' || v === 'away';

/** the four subject picks a degree can name */
export type Picks = { major1: string; major2: string; minor: string; conc: string };

/** the programmes a degree structure and its picks add up to */
export function programmesFor(structure: StructureKind, picks: Picks): Programme[] {
	switch (structure) {
		case 'single-major':
			return [{ role: 'major', subject: picks.major1 }];
		case 'double-major':
			return [
				{ role: 'major', subject: picks.major1 },
				{ role: 'major', subject: picks.major2 }
			];
		case 'major-minor':
			return [
				{ role: 'major', subject: picks.major1 },
				{ role: 'minor', subject: picks.minor }
			];
		case 'major-conc':
			return [
				{ role: 'major', subject: picks.major1 },
				{ role: 'concentration', subject: picks.conc }
			];
		case 'major-minor-conc':
			return [
				{ role: 'major', subject: picks.major1 },
				{ role: 'minor', subject: picks.minor },
				{ role: 'concentration', subject: picks.conc }
			];
	}
}

export class Plan {
	storageError = $state('');
	// ── raw state ──
	fourYear = $state(true);
	// how far the grid runs, see `years` below
	yearCount = $state(4);
	batchStartYear = $state(2026);
	structure = $state<StructureKind>('major-minor');
	// mathematics is the one subject with a published pathway, so the
	// first-visit grid actually demonstrates the recommended order
	picks = $state({ major1: 'mathematics', major2: 'history', minor: 'physics', conc: 'physics' });
	placements = $state<Record<SlotKey, string[]>>({});
	audited = $state<string[]>([]); // codes the student has marked as audits
	grades = $state<Record<string, GradeMark>>({}); // code → grade / status (audits never carry one)
	// what a grid chip is labelled with, either, or both. Turning one off
	// forces the other on, so a chip is never blank
	showCodes = $state(true);
	showTitles = $state(false);
	creditTargetMode = $state<'minimum' | 'maximum'>('minimum');
	// the board's view, picked at the top of the board. Plan by default so the
	// planner stays clean.
	view = $state<BoardView>('plan');
	// Grade view is the 'grades' view: it unlocks grade entry on chips, in the
	// details panel, the CGPA / recovery panel, and the grade hints. Nothing
	// grade-related shows in any other view, except a failed attempt's U.
	get gradeMode(): boolean {
		return this.view === 'grades';
	}
	set gradeMode(on: boolean) {
		this.view = on ? 'grades' : 'plan';
	}
	showGradeLabels = $state(true); // show the grade on each chip (only ever in grade view)
	// students count trimesters by year or through the degree; see calendar.ts
	trimNaming = $state<TrimNaming>('year');
	// the load the student is aiming for each trimester. The university's own
	// numbers are fixed (12 min / 20 cap); this is the line THEY want to sit
	// on, and it's what the grid colours a trimester against, 16 is the
	// registration the drop form recommends.
	targetLoad = $state(TRIM_NORMAL_MAX);
	// Has the student changed anything yet? The grid arrives pre-filled with the
	// department's recommended path, so until they touch it their plan and the
	// recommendation are the same thing and a programme change should re-lay it
	// out. Once they've edited it, it is THEIR plan and a programme change must
	// never move their courses. No UI, the student never sees this decision,
	// they just find that the app does the obvious thing either way.
	touched = $state(false);
	// warn hints the student has waived, a broken prerequisite is a real rule,
	// but plenty of students hold a waiver for one, so a red hint can be crossed
	// off. Keyed by the hint's rule id, so it stays crossed off across reloads
	// and re-appears the moment a DIFFERENT course breaks the same rule.
	waived = $state<string[]>([]);
	// Trimesters not spent taking courses here: a break, a suspension, or a
	// term away (see BreakKind). Nothing can be placed in one, and no load
	// rule applies to it. Set from a trimester's own view: most students never
	// need it, so nothing about it shows on the board until it's used.
	breaks = $state<Record<SlotKey, BreakInfo>>({});
	// "you are here": the trimester the student is in now, the line between
	// what they've taken and what they can still change. null until they say;
	// then it's guessed from the batch and the date (calendar.ts)
	now = $state<Here | null>(null);
	// where a course sits on the zoomed credit canvas (cell index 0-23, 4 per
	// row), set when the student drops it on a specific spot; absent = packed
	zoomPos = $state<Record<string, number>>({});
	zoom = $state<{ year: number; trim: TrimNum } | null>(null);
	// the courses a hint names, while the student points at that hint, they
	// light up on the grid so the hint and the trimester it's about connect
	highlight = $state<string[]>([]);
	// the feedback window: null = shut, otherwise the text it opens with (a
	// course or a hint can open it pre-filled with what it's about)
	feedbackDraft = $state<string | null>(null);
	search = $state('');
	catalogueReveal = $state<{ code: string } | null>(null);

	revealCourse(code: string) {
		if (!hasCode(code)) return;
		const course = byCode(code);
		this.selected = course;
		this.catalogueReveal = { code: course.code };
	}

	filters = $state<string[]>([]); // checked catalogue subject filters
	#selected = $state<Course | null>(null); // course shown in the details bar
	/** which attempt of it the bar is about, when that is a failed one (COMP201~1) */
	selectedId = $state<string | null>(null);
	get selected(): Course | null {
		return this.#selected;
	}
	set selected(course: Course | null) {
		this.#selected = course;
		this.selectedId = null;
		// a reveal answers one click ("show me COMP350"); choosing anything
		// else ends it, so no stale outline or "showing" bar is left behind
		if (course?.code !== this.catalogueReveal?.code) this.catalogueReveal = null;
	}
	/** show a course on the board, a failed attempt of it included */
	select(id: string) {
		const course = byCode(id);
		this.#selected = course;
		this.selectedId = isAttemptId(id) ? id : null;
		if (course.code !== this.catalogueReveal?.code) this.catalogueReveal = null;
	}
	railOpen = $state(false); // the sidebar slid in, where it doesn't fit as a column
	dragging = $state<string | null>(null); // code mid-drag → grid shows where it fits
	flash = $state<string | null>(null); // transient "not offered" style message
	#flashTimer: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		// default plan = the department order for the chosen programmes;
		// a saved plan (below) replaces it
		this.seedRecommended();
		if (!browser) return;
		try {
			restoreBoard(localStorage, (value) => this.applySave(value));
		} catch {
			/* Browser storage can be blocked; the current session still works. */
		}

		$effect(() => {
			const json = JSON.stringify(this.snapshot());
			try {
				this.storageError = saveBoard(localStorage, json) ? '' : 'Your browser could not save the latest changes.';
			} catch {
				this.storageError = 'Browser storage is unavailable. Save a cloud copy before closing.';
			}
			this.#recordHistory();
		});
	}

	// ── undo / redo ──
	// Each entry is a whole planning state, courses, programmes, batch,
	// grades, audits, crossed-off hints, so undo puts back exactly what was
	// there, however many courses one action moved. How the board is viewed
	// (codes, titles, filters, grade view) is not history.
	static readonly HISTORY_LIMIT = 100;
	#past: string[] = [];
	#future: string[] = [];
	#present = '';
	#travelling = false;
	#recording = false;
	canUndo = $state(false);
	canRedo = $state(false);

	#planningState(): string {
		const {
			placements,
			picks,
			structure,
			fourYear,
			yearCount,
			batchStartYear,
			grades,
			audited,
			waived,
			targetLoad,
			touched,
			breaks,
			now
		} = this.snapshot();
		return JSON.stringify({
			placements,
			picks,
			structure,
			fourYear,
			yearCount,
			batchStartYear,
			grades,
			audited,
			waived,
			targetLoad,
			touched,
			breaks,
			now
		});
	}

	/** after every change (the autosave effect): a new state pushes the last one */
	#recordHistory() {
		const state = this.#planningState();
		// the change an undo/redo itself made is never a new step
		const travelled = this.#travelling;
		this.#travelling = false;
		if (state === this.#present) return;
		if (this.#recording && !travelled && this.#present) {
			this.#past.push(this.#present);
			if (this.#past.length > Plan.HISTORY_LIMIT) this.#past.shift();
			this.#future = [];
		}
		this.#present = state;
		this.#syncHistoryFlags();
	}

	/** Start recording once the page is up, the restore and first-render
	 *  normalisation of a saved plan aren't steps anyone could undo. */
	startHistory() {
		this.#present = this.#planningState();
		this.#past = [];
		this.#future = [];
		this.#recording = true;
		this.#syncHistoryFlags();
	}

	#syncHistoryFlags() {
		this.canUndo = this.#past.length > 0;
		this.canRedo = this.#future.length > 0;
	}

	undo() {
		const previous = this.#past.pop();
		if (previous === undefined) return;
		this.#future.push(this.#present);
		this.#travel(previous, 'undone');
	}

	redo() {
		const next = this.#future.pop();
		if (next === undefined) return;
		this.#past.push(this.#present);
		this.#travel(next, 'redone');
	}

	#travel(state: string, done: string) {
		quietRedraw(); // a whole state at once, fade, don't fly
		this.#travelling = true;
		this.#present = state;
		this.applySave({ ...this.snapshot(), ...JSON.parse(state) });
		this.#syncHistoryFlags();
		this.#setFlash(done);
	}

	/** Everything that makes up a schedule, in the exact shape applySave reads.
	 *  The autosave writes this; so does a named save. One serialiser means a
	 *  saved schedule can never drift from what the restore path understands. */
	snapshot() {
		return {
			// stamped so a future build can tell an old save's shape from a new
			// one and migrate it, instead of having to discard it
			version: SAVE_VERSION,
			placements: this.placements,
			breaks: this.breaks,
			now: this.now,
			touched: this.touched,
			waived: this.waived,
			zoomPos: this.zoomPos,
			audited: this.audited,
			grades: this.grades,
			view: this.view,
			gradeMode: this.gradeMode, // older builds read this, keep writing it
			showGradeLabels: this.showGradeLabels,
			trimNaming: this.trimNaming,
			targetLoad: this.targetLoad,
			creditTargetMode: this.creditTargetMode,
			showCodes: this.showCodes,
			showTitles: this.showTitles,
			fourYear: this.fourYear,
			yearCount: this.yearCount,
			batchStartYear: this.batchStartYear,
			structure: this.structure,
			picks: this.picks,
			filters: this.filters
		};
	}

	/** load a schedule saved earlier, same validation as a page load, so a
	 *  snapshot from an older build can never break the app */
	restore(data: unknown) {
		quietRedraw(); // the whole board changes at once, fade, don't fly
		if (data && typeof data === 'object') this.applySave(data as Record<string, unknown>);
		this.selected = null;
		this.zoom = null;
	}

	/** validate + apply a saved/imported plan object. Shared by the
	 *  localStorage restore and the import button, everything is checked
	 *  against the current catalogue, so a stale save can't break the app. */
	private applySave(parsed: {
		fourYear?: unknown;
		batchStartYear?: unknown;
		structure?: unknown;
		picks?: Record<string, unknown>;
		filters?: unknown;
		placements?: unknown;
		audited?: unknown;
		grades?: unknown;
		gradeMode?: unknown;
		view?: unknown;
		breaks?: unknown;
		now?: unknown;
		showGradeLabels?: unknown;
		trimNaming?: unknown;
		trimNumbers?: unknown; // before trimNaming
		creditTargetMode?: unknown;
		showCodes?: unknown;
		showTitles?: unknown;
	}) {
		if (typeof parsed.fourYear === 'boolean') this.fourYear = parsed.fourYear;
		const yearCount = (parsed as { yearCount?: unknown }).yearCount;
		this.yearCount =
			typeof yearCount === 'number' && Number.isInteger(yearCount) && yearCount >= 3 && yearCount <= MAX_YEARS
				? yearCount
				: 4;
		this.batchStartYear =
			typeof parsed.batchStartYear === 'number' &&
			Number.isInteger(parsed.batchStartYear) &&
			parsed.batchStartYear >= 2022 &&
			parsed.batchStartYear <= 2026
				? parsed.batchStartYear
				: 2026;
		if (
			typeof parsed.structure === 'string' &&
			['single-major', 'double-major', 'major-minor', 'major-conc', 'major-minor-conc'].includes(parsed.structure)
		)
			this.structure = parsed.structure as StructureKind;
		// older saves stored subject codes ("BUSI"), only accept current ids,
		// and majors additionally must be subjects offered as a major
		const isSubject = (v: unknown) => SUBJECTS.some((s) => s.id === v);
		const isMajor = (v: unknown) => SUBJECTS.some((s) => s.id === v && s.majorable);
		for (const k of Object.keys(this.picks) as (keyof typeof this.picks)[]) {
			const ok = k === 'major1' || k === 'major2' ? isMajor : isSubject;
			const pick = parsed.picks?.[k];
			if (ok(pick)) this.picks[k] = pick as string;
		}
		if (Array.isArray(parsed.filters)) this.filters = parsed.filters.filter(isSubject);
		// breaks: a known kind on a real trimester, an away term's credits a
		// sensible number
		const rawBreaks = parsed.breaks;
		if (rawBreaks && typeof rawBreaks === 'object' && !Array.isArray(rawBreaks)) {
			const out: Record<SlotKey, BreakInfo> = {};
			for (const [key, b] of Object.entries(rawBreaks)) {
				const { year, trim } = parseSlot(key);
				if (!(year >= 1 && year <= MAX_YEARS) || ![1, 2, 3].includes(trim)) continue;
				if (!b || typeof b !== 'object' || !isBreakKind((b as BreakInfo).kind)) continue;
				const credits = (b as BreakInfo).credits;
				out[key] = {
					kind: (b as BreakInfo).kind,
					...((b as BreakInfo).kind === 'away' && typeof credits === 'number' && credits >= 0 && credits <= 40
						? { credits: Math.round(credits) }
						: {})
				};
			}
			this.breaks = out;
		}
		const rawNow = parsed.now as { year?: unknown; trim?: unknown } | null | undefined;
		if (
			rawNow &&
			typeof rawNow.year === 'number' &&
			rawNow.year >= 1 &&
			rawNow.year <= MAX_YEARS &&
			(rawNow.trim === 1 || rawNow.trim === 2 || rawNow.trim === 3)
		)
			this.now = { year: rawNow.year, trim: rawNow.trim };
		const placements = this.#cleanPlacements(parsed.placements);
		if (placements) this.placements = placements;
		const rawPos = (parsed as { zoomPos?: unknown }).zoomPos;
		if (rawPos && typeof rawPos === 'object' && !Array.isArray(rawPos)) {
			const pos: Record<string, number> = {};
			for (const [code, cell] of Object.entries(rawPos)) {
				if (hasCode(code) && typeof cell === 'number' && cell >= 0 && cell < 24) pos[code] = cell;
			}
			this.zoomPos = pos;
		}
		if (Array.isArray(parsed.audited))
			this.audited = parsed.audited.filter((c: unknown): c is string => typeof c === 'string' && hasCode(c));
		if (parsed.grades && typeof parsed.grades === 'object' && !Array.isArray(parsed.grades)) {
			const g: Record<string, GradeMark> = {};
			for (const [code, mark] of Object.entries(parsed.grades)) if (hasCode(code) && isGradeMark(mark)) g[code] = mark;
			this.grades = g;
		}
		if (parsed.creditTargetMode === 'minimum' || parsed.creditTargetMode === 'maximum')
			this.creditTargetMode = parsed.creditTargetMode;
		if (typeof parsed.showCodes === 'boolean') this.showCodes = parsed.showCodes;
		if (typeof parsed.showTitles === 'boolean') this.showTitles = parsed.showTitles;
		if (!this.showCodes && !this.showTitles) this.showCodes = true;
		if (isBoardView(parsed.view)) this.view = parsed.view;
		else if (typeof parsed.gradeMode === 'boolean') this.gradeMode = parsed.gradeMode; // a save from before views
		if (typeof parsed.showGradeLabels === 'boolean') this.showGradeLabels = parsed.showGradeLabels;
		if (parsed.trimNaming === 'year' || parsed.trimNaming === 'degree') this.trimNaming = parsed.trimNaming;
		// earlier builds: 'current' (and before it 'degree') put degree numbers
		// in the header, the closest thing to naming through the degree
		else if (parsed.trimNumbers === 'current' || parsed.trimNumbers === 'degree') this.trimNaming = 'degree';
		// A save exists, so this plan has been used before: treat it as touched
		// unless it says otherwise. Getting this wrong in the `false` direction
		// would let a programme change re-lay-out a plan somebody built, and a
		// save written before this field existed can't tell us either way.
		this.touched = true;
		const touched = (parsed as { touched?: unknown }).touched;
		if (typeof touched === 'boolean') this.touched = touched;
		// waivers are opaque rule ids, a hint the build no longer emits simply
		// never matches, so an old id costs nothing and is kept
		const waived = (parsed as { waived?: unknown }).waived;
		if (Array.isArray(waived)) this.waived = waived.filter((v): v is string => typeof v === 'string');
		const target = (parsed as { targetLoad?: unknown }).targetLoad;
		if (typeof target === 'number' && target >= TRIM_MIN && target <= TRIM_HARD_MAX) this.targetLoad = target;
		this.ensureDistinctPicks();
	}

	/** validate a raw placements object against the current catalogue,
	 *  null when it isn't one at all */
	#cleanPlacements(raw: unknown): Record<SlotKey, string[]> | null {
		if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
		const placements: Record<SlotKey, string[]> = {};
		for (const [key, codes] of Object.entries(raw)) {
			const { year, trim } = parseSlot(key);
			if (!(year >= 1 && year <= MAX_YEARS) || ![1, 2, 3].includes(trim)) continue;
			if (!Array.isArray(codes)) continue;
			let valid = codes.filter((c): c is string => typeof c === 'string' && hasCode(c));
			// year-1 t1/t2 hold only foundation courses (an over-max slot
			// is kept as-is, the hints flag it rather than dropping data)
			if (this.coreOnly(year, trim)) valid = valid.filter(isCore);
			if (valid.length) placements[key] = valid;
		}
		return placements;
	}

	/** first-year t1/t2 belong to the foundation core: ONLY common-core
	 *  (KCCS) courses may sit there, at most Y1_CORE_MAX per trimester */
	coreOnly(year: number, trim: TrimNum): boolean {
		return year === 1 && trim !== 3;
	}

	// ── derived: structure ──
	// year 4 is on the grid by default, plenty of 3-year students spread
	// their degree over four years. 4yup only picks WHICH variant's
	// requirements apply (3yr vs 4yr lists and credit tables) and how far the
	// seeder packs. The student can add a fifth year (the manual allows n + 2)
	// or, on a 3-year degree, take year 4 off, never below the degree's own
	// length.
	minYears = $derived(this.fourYear ? 4 : 3);
	years = $derived(Array.from({ length: Math.max(this.yearCount, this.minYears) }, (_, i) => i + 1));
	canRemoveYear = $derived(this.years.length > this.minYears);
	/** an n-year degree gets n + 2 years: the grid never runs past that */
	maxYears = $derived(this.minYears + 2);
	/** where the student is now: what they said, or the guess */
	here: Here = $derived(this.now ?? guessNow(this.batchStartYear, new Date(), this.years.length));
	/** credits earned on terms away, toward the total (not a programme) */
	awayCredits = $derived(
		Object.values(this.breaks).reduce((sum, b) => sum + (b.kind === 'away' ? (b.credits ?? 0) : 0), 0)
	);
	trims = TRIMS;
	seedYears = $derived(this.fourYear ? [1, 2, 3, 4] : [1, 2, 3]);

	programmes: Programme[] = $derived(programmesFor(this.structure, this.picks));

	selectedSubjects = $derived(this.programmes.map((p) => p.subject));
	isDouble = $derived(this.structure === 'double-major');
	// the degree total is the sum of whatever each chosen major/minor/concentration
	// actually requires (from programme.json), not a flat university-wide number,
	// plus the foundation core every student completes on top
	degreeTotal = $derived(
		this.programmes.reduce(
			(sum, p) => sum + creditsFor(p.subject, p.role, this.fourYear, this.isDouble, this.batchStartYear),
			0
		) + CORE_CREDITS
	);

	creditCeiling = $derived(this.fourYear ? MAX_TOTAL_4YR : MAX_TOTAL_3YR);
	/** the fewest credits to graduate: the degree's own minimum (120 / 160),
	 *  or what the chosen programmes add up to when that is more */
	creditMinimum = $derived(Math.max(this.fourYear ? MIN_TOTAL_4YR : MIN_TOTAL_3YR, this.degreeTotal));
	/** the programmes need more than the ceiling allows, only overlap between
	 *  them (a course counting twice) can make the plan fit */
	creditsConflict = $derived(this.creditMinimum > this.creditCeiling);
	creditTarget = $derived(this.creditTargetMode === 'maximum' ? this.creditCeiling : this.creditMinimum);

	// ── derived: placements ──
	/** everything on the board in a *visible* year, failed attempts included:
	 *  `id` is what the grid holds, `code` the course it is (COMP201~1 → COMP201) */
	attempts = $derived.by(() => {
		const out: { id: string; code: string; key: SlotKey; year: number; trim: TrimNum }[] = [];
		for (const [key, ids] of Object.entries(this.placements)) {
			const { year, trim } = parseSlot(key);
			if (!this.years.includes(year)) continue;
			for (const id of ids) out.push({ id, code: baseCode(id), key, year, trim });
		}
		return out;
	});

	/** every course placed in a *visible* year, with its slot. A failed
	 *  attempt is not here: it earned nothing, so no rule, credit total or
	 *  prerequisite counts it. */
	placed = $derived(
		this.attempts.filter((a) => a.id === a.code).map(({ code, key, year, trim }) => ({ code, key, year, trim }))
	);

	placedCodes = $derived(new Set(this.placed.map((p) => p.code)));

	/** is this id anywhere on the board (hidden years too) */
	onBoard(id: string): boolean {
		return Object.values(this.placements).some((ids) => ids.includes(id));
	}

	/** the failed attempts of a course, oldest first */
	attemptsOf(code: string) {
		const base = baseCode(code);
		return this.attempts
			.filter((a) => a.code === base && a.id !== base)
			.sort((a, b) => attemptNumber(a.id) - attemptNumber(b.id));
	}

	/** Failed attempts still holding the grade a U gives: the latest one of a
	 *  course, until the retake carries a letter grade, which replaces it. */
	failedAttempts = $derived.by(() => {
		const latest = new Map<string, (typeof this.attempts)[number]>();
		for (const a of this.attempts) {
			if (a.id === a.code || this.grades[a.id] !== 'U') continue;
			const seen = latest.get(a.code);
			if (!seen || attemptNumber(a.id) > attemptNumber(seen.id)) latest.set(a.code, a);
		}
		return [...latest.values()].filter((a) => !isGradeLetter(this.grades[a.code]) && !this.isAudit(a.code));
	});
	totalPlacedCredits = $derived(this.placed.reduce((sum, p) => sum + byCode(p.code).credits, 0) + this.awayCredits);

	// ── grades / CGPA ──
	// every placed, non-audit course that carries a grade, one row per unique
	// code, with its credits and grade points (a U scores 0 but still counts,
	// exactly as the manual computes CGPA)
	gradedCourses = $derived.by(() => {
		const out: { code: string; credits: number; points: number; letter: GradeMark }[] = [];
		for (const code of this.placedCodes) {
			const mark = this.grades[code];
			// only real letter grades count toward the CGPA, W / I earn no points
			if (!mark || this.isAudit(code) || !isGradeLetter(mark)) continue;
			out.push({ code, credits: byCode(code).credits, points: GRADE_POINTS[mark], letter: mark });
		}
		// a failed course scores 0 until its retake has a grade
		for (const a of this.failedAttempts)
			out.push({ code: a.id, credits: byCode(a.code).credits, points: 0, letter: 'U' });
		return out;
	});
	gradedCredits = $derived(this.gradedCourses.reduce((s, c) => s + c.credits, 0));
	earnedPoints = $derived(this.gradedCourses.reduce((s, c) => s + c.points * c.credits, 0));
	/** cumulative GPA over everything graded so far, null until a grade exists */
	cgpa = $derived(this.gradedCredits > 0 ? this.earnedPoints / this.gradedCredits : null);
	/** every placed non-audit credit, what the final CGPA will be taken over,
	 *  so the recovery projection runs against the plan the student actually built */
	gradableCredits = $derived.by(() => {
		let c = 0;
		for (const code of this.placedCodes) if (!this.isAudit(code)) c += byCode(code).credits;
		for (const a of this.failedAttempts) c += byCode(a.code).credits; // graded, so in the denominator
		return c;
	});

	// ── laws: course type ──
	// per-programme required/elective sets for the exact variant on the plan
	// (a 3-year single major's list, not some other variant's), from the
	// scraped website structure (requirements.json). Required closes over
	// prerequisites: a hard prereq of a required course (Analysis 4 for
	// Topology 1) must be taken too, so it reads as required.
	programmeSets = $derived(this.#setsFor(this.programmes, this.isDouble));

	/** the sets for a list of programmes (the what-if view's, say) */
	programmeSetsOf(programmes: Programme[], double: boolean) {
		return this.#setsFor(programmes, double);
	}

	/** each programme's required / choice / elective sets, for the exact variant */
	#setsFor(programmes: Programme[], double: boolean, fourYear = this.fourYear, batch = this.batchStartYear) {
		return programmes.map((p) => {
			// start from the stated required core, THEN close over prerequisites
			//, but a prereq whose interchangeable partner is already required
			// (COMP321 needs MATH191, and COMP201 ⇄ MATH191 is already in) is
			// already satisfied, so it must not be added as a separate course.
			// `required` = what reads as required (lavender); `requiredAll` also
			// carries cross-department prereqs for the credit budget.
			const required = new Set(requiredSetFor(p.subject, p.role, fourYear, double, batch));
			const requiredAll = new Set(required);
			// the degree's stated required-credit figure, prereqs only fill
			// the budget up to it, so a course's biology prereq (BIOS201 for an
			// env-studies major) doesn't inflate the requirement past the table
			const cap = requiredCreditsFor(p.subject, p.role, fourYear, double, batch);
			let sum = [...requiredAll].reduce((s, c) => s + byCode(c).credits, 0);
			const queue = [...required];
			while (queue.length) {
				const code = queue.pop()!;
				for (const pre of byCode(code).prereqs) {
					if (!reachableIn(pre, fourYear) || requiredAll.has(pre)) continue;
					if (batchRuleFor(p.subject, p.role, fourYear, double, batch)?.courses[byCode(pre).code] === 'elective')
						continue;
					if (satisfiedBy(pre).some((s) => requiredAll.has(s))) continue;
					if (cap !== undefined && sum + byCode(pre).credits > cap) continue;
					requiredAll.add(pre);
					sum += byCode(pre).credits;
					queue.push(pre);
					// it only READS as required (white) if it's a course of this
					// subject, a cross-department prereq stays a green 'other'
					// support course (it's on the site's list nowhere)
					if (byCode(pre).subjects.includes(p.subject)) required.add(pre);
				}
			}
			return {
				subject: p.subject,
				required,
				requiredAll,
				// 'choose N from' pools, required choices, coloured as required
				pick: new Set(pickSetFor(p.subject, p.role, fourYear, double, batch)),
				elective: new Set(electiveSetFor(p.subject, p.role, fourYear, double, batch))
			};
		});
	}

	// role toward your chosen major/minor. Anything the programmes don't
	// list, a different department, or an in-department course that isn't a
	// stated requirement, is 'other', NOT an audit. Audits are a separate
	// flag the student sets.
	courseType(code: string): CourseType {
		return this.#typeIn(code, this.programmeSets);
	}

	#typeIn(code: string, sets: ReturnType<Plan['programmeSetsOf']>): CourseType {
		if (isCore(code)) return 'core'; // the foundation curriculum, everyone's requirement
		if (isTranscriptOnly(code)) return 'other'; // on the transcript, toward no programme
		const c = byCode(code);
		let role: CourseType = 'other';
		for (const s of sets) {
			if (c.codes.some((x) => s.required.has(x) || s.pick.has(x))) return 'required';
			// in the variant's elective pool, OR simply a course in your
			// major/minor's own department (a general subject elective),
			// either way it's not 'other'. 'other' (untinted) is reserved for a
			// different department.
			if (c.codes.some((x) => s.elective.has(x)) || c.subjects.includes(s.subject)) role = 'elective';
		}
		return role;
	}

	// ── what-if ──
	// Another degree tried on top of the plan: the grid reads as if these were
	// your programmes, and nothing changes until applyWhatIf.
	whatIf = $state<{ structure: StructureKind; picks: Picks; fourYear: boolean; batch: number } | null>(null);
	whatIfProgrammes = $derived(this.whatIf ? programmesFor(this.whatIf.structure, this.whatIf.picks) : []);
	whatIfSets = $derived(
		this.whatIf
			? this.#setsFor(
					this.whatIfProgrammes,
					this.whatIf.structure === 'double-major',
					this.whatIf.fourYear,
					this.whatIf.batch
				)
			: []
	);
	/** what the degree tried would ask for in all, as degreeTotal is for yours */
	whatIfTotal = $derived(
		this.whatIf
			? this.whatIfProgrammes.reduce(
					(sum, p) =>
						sum +
						creditsFor(
							p.subject,
							p.role,
							this.whatIf!.fourYear,
							this.whatIf!.structure === 'double-major',
							this.whatIf!.batch
						),
					0
				) + CORE_CREDITS
			: 0
	);
	/** the tried degree's required courses that aren't on the plan */
	whatIfMissing = $derived.by(() => {
		const out = new Set<string>();
		for (const s of this.whatIfSets)
			for (const code of s.required)
				if (
					hasCode(code) &&
					!this.placedCodes.has(byCode(code).code) &&
					!satisfiedBy(code).some((x) => this.placedCodes.has(x))
				)
					out.add(byCode(code).code);
		return [...out];
	});

	/** start a what-if from the plan as it is */
	startWhatIf() {
		this.whatIf = {
			structure: this.structure,
			picks: { ...this.picks },
			fourYear: this.fourYear,
			batch: this.batchStartYear
		};
	}

	whatIfType(code: string): CourseType {
		return this.#typeIn(code, this.whatIfSets);
	}

	/** the hue a course would wear under the tried degree */
	whatIfHue(code: string): number | undefined {
		const c = byCode(code);
		for (const s of this.whatIfSets)
			if (
				c.codes.some((x) => s.required.has(x) || s.pick.has(x) || s.elective.has(x)) ||
				c.subjects.includes(s.subject)
			)
				return s.subject === 'open' ? undefined : subjectById(s.subject).hue;
		return undefined;
	}

	/** Make the tried degree yours, the same as picking it on the left, and
	 *  with `adds`, put the courses it still needs where the what-if found room
	 *  for them. A plan nobody has edited yet is laid out afresh for the new
	 *  degree instead, the way the sidebar does it. */
	applyWhatIf(adds: { code: string; year: number; trim: TrimNum }[] = []) {
		if (!this.whatIf) return;
		const wasTouched = this.touched;
		this.structure = this.whatIf.structure;
		this.picks = { ...this.whatIf.picks };
		this.fourYear = this.whatIf.fourYear;
		this.batchStartYear = this.whatIf.batch;
		this.programmeChanged();
		let added = 0;
		if (wasTouched && adds.length) {
			this.#touch();
			const next: Record<SlotKey, string[]> = Object.fromEntries(
				Object.entries(this.placements).map(([key, codes]) => [key, [...codes]])
			);
			for (const { code, year, trim } of adds) {
				if (this.placedCodes.has(code) || this.breaks[slotKey(year, trim)]) continue;
				next[slotKey(year, trim)] = [...(next[slotKey(year, trim)] ?? []), code];
				if (year > this.yearCount) this.yearCount = Math.min(MAX_YEARS, year);
				added++;
			}
			this.placements = next;
		}
		this.view = 'plan';
		this.#setFlash(
			added
				? `your programme is now the one you tried, ${added} course${added === 1 ? '' : 's'} it needs added`
				: 'your programme is now the one you tried'
		);
	}

	// ── breaks ──
	/** the break a trimester is marked as, if it is one */
	breakAt(year: number, trim: TrimNum): BreakInfo | undefined {
		return this.breaks[slotKey(year, trim)];
	}

	/** Mark a trimester as a break, a suspension or a term away. Its courses,
	 *  and every course after it, move later by `shift` trimesters: 3 keeps
	 *  each course in the trimester it runs, 1 is the shortest delay. A course
	 *  never lands in another break. Says no (and why) when the grid would
	 *  have to run past its last year. */
	setBreak(year: number, trim: TrimNum, info: BreakInfo, shift: 0 | 1 | 3 = 0): boolean {
		const key = slotKey(year, trim);
		const start = slotOrder(year, trim);
		const last = slotOrder(this.maxYears, 3);
		const off = (o: number) => o === start || !!this.breaks[slotKey(slotAt(o).year, slotAt(o).trim)];
		const moving = Object.entries(this.placements).filter(
			([k, codes]) => codes.length && slotOrder(parseSlot(k).year, parseSlot(k).trim) >= start
		);
		// a trimester with courses needs them moved; an empty one is just marked
		if (!shift && (this.placements[key]?.length ?? 0) > 0) return false;
		const dest = (o: number) => {
			let d = o + shift;
			while (d <= last && off(d)) d += shift;
			return d;
		};
		const next: Record<SlotKey, string[]> = {};
		let furthest = 0;
		for (const [k, codes] of Object.entries(this.placements)) {
			const o = slotOrder(parseSlot(k).year, parseSlot(k).trim);
			const to = o >= start && codes.length && shift ? dest(o) : o;
			if (to > last) {
				this.#setFlash(
					`no room to move everything back: it would run past year ${this.maxYears}, the most a ${this.minYears}-year degree has (n + 2)`
				);
				return false;
			}
			const at = slotAt(to);
			next[slotKey(at.year, at.trim)] = [...(next[slotKey(at.year, at.trim)] ?? []), ...codes];
			furthest = Math.max(furthest, at.year);
		}
		quietRedraw();
		this.#touch();
		this.placements = next;
		this.breaks = { ...this.breaks, [key]: info };
		if (furthest > this.years.length) this.yearCount = furthest;
		const moved = shift ? moving.reduce((n, [, codes]) => n + codes.length, 0) : 0;
		this.#setFlash(
			moved
				? `${this.trimName(year, trim)} is ${info.kind === 'away' ? 'a term away' : `a ${BREAK_KINDS[info.kind].label}`} now, ${moved} course${moved === 1 ? '' : 's'} moved back ${shift === 3 ? 'a year' : 'a trimester'}`
				: `${this.trimName(year, trim)} is ${info.kind === 'away' ? 'a term away' : `a ${BREAK_KINDS[info.kind].label}`} now`
		);
		return true;
	}

	/** an away term's credits, as the student updates them */
	setAwayCredits(year: number, trim: TrimNum, credits: number) {
		const key = slotKey(year, trim);
		const b = this.breaks[key];
		if (b?.kind !== 'away') return;
		this.breaks = {
			...this.breaks,
			[key]: { kind: 'away', credits: Math.max(0, Math.min(40, Math.round(credits) || 0)) }
		};
	}

	/** back to a normal trimester; courses moved for the break stay where they are */
	clearBreak(year: number, trim: TrimNum) {
		const key = slotKey(year, trim);
		if (!this.breaks[key]) return;
		this.#touch();
		const { [key]: _gone, ...rest } = this.breaks;
		this.breaks = rest;
		this.#setFlash(`${this.trimName(year, trim)} is a normal trimester again`);
	}

	// true once more than one programme is on the plan
	multiProgramme = $derived(this.programmes.length > 1);

	/** which chosen programme (by index) a course counts toward, picks the
	 *  hue it wears. -1 when it belongs to none of them. A placed course wears
	 *  the programme that claims its credits; any other, the first programme
	 *  whose requirement or department it is part of. */
	programmeOf(code: string): number {
		const c = byCode(code);
		// a placed course: the programme it actually counts toward
		const claimed = this.claims.get(c.code);
		if (claimed?.length && this.programmes[claimed[0]]?.subject !== 'open') return claimed[0];
		for (let i = 0; i < this.programmeSets.length; i++) {
			const s = this.programmeSets[i];
			if (
				c.codes.some((x) => s.required.has(x) || s.pick.has(x) || s.elective.has(x)) ||
				c.subjects.includes(s.subject)
			)
				return i;
		}
		return -1;
	}

	/** what a course is to this plan, in words: "required · computer science major" */
	roleLabel(code: string): string {
		const type = this.courseType(code);
		if (type === 'core') return 'foundation core (KCCS)';
		if (type === 'other') return 'counts toward none of your programmes';
		const prog = this.programmes[this.programmeOf(code)];
		return prog ? `${type} · ${subjectById(prog.subject).label} ${prog.role}` : type;
	}

	/** How a cross-listed course counts in each department it belongs to. The
	 *  role is a department's own call (Electronics I is required for physics
	 *  majors and an elective for computer science ones), so the details panel
	 *  spells out every one: each department's major, plus the student's own
	 *  programme there when it is a minor or concentration. */
	rolesIn(code: string): {
		subject: string;
		label: string;
		/** "physics major", "physics minor" */
		scope: string;
		role: 'required' | 'elective';
		/** the student's own programme */
		mine: boolean;
	}[] {
		const c = byCode(code);
		if (isCore(code)) return [];
		const out: ReturnType<Plan['rolesIn']> = [];
		for (const subject of c.subjects) {
			if (subject === 'core' || subject === 'open') continue;
			const label = subjectById(subject).label;
			const mine = this.programmes.find((p) => p.subject === subject);
			const read = (role: ProgrammeRole, double: boolean): 'required' | 'elective' => {
				const required = new Set([
					...requiredSetFor(subject, role, this.fourYear, double, this.batchStartYear),
					...pickSetFor(subject, role, this.fourYear, double, this.batchStartYear)
				]);
				// listed as required, or else an elective, a general one when the
				// department doesn't list it, exactly as courseType reads it
				return c.codes.some((x) => required.has(x)) ? 'required' : 'elective';
			};
			const ownMajor = mine?.role === 'major';
			out.push({
				subject,
				label,
				scope: `${label.toLowerCase()} major`,
				role: read('major', ownMajor ? this.isDouble : false),
				mine: ownMajor
			});
			if (mine && !ownMajor)
				out.push({
					subject,
					label,
					scope: `${label.toLowerCase()} ${mine.role}`,
					role: read(mine.role, false),
					mine: true
				});
		}
		return out;
	}

	/** the hue a chip/card wears: its programme's subject's fixed hue
	 *  (undefined for KCCS, other-dept. courses and the open minor) */
	hueOf(code: string): number | undefined {
		const i = this.programmeOf(code);
		return i >= 0 ? subjectById(this.programmes[i].subject).hue : undefined;
	}

	isAudit(code: string): boolean {
		return this.audited.includes(code);
	}

	toggleAudit(code: string) {
		// marking an audit is a decision about YOUR plan, not the preview
		this.#touch();
		this.audited = this.audited.includes(code) ? this.audited.filter((c) => c !== code) : [...this.audited, code];
	}

	gradeOf(code: string): GradeMark | undefined {
		return this.grades[code];
	}

	/** set a course's grade / status, or clear it with null. A U fails the
	 *  course: that attempt stays where it was, as a record, and the course is
	 *  free to place again. Re-grading a failed attempt brings it back. */
	setGrade(code: string, mark: GradeMark | null) {
		if (mark === 'U' && !isAttemptId(code) && this.onBoard(code)) {
			this.#fail(code);
			return;
		}
		if (isAttemptId(code) && mark !== 'U') {
			this.#unfail(code, mark);
			return;
		}
		if (mark) {
			this.grades = { ...this.grades, [code]: mark };
		} else {
			const { [code]: _drop, ...rest } = this.grades;
			this.grades = rest;
		}
	}

	/** the slot a board id sits in */
	#slotOf(id: string): SlotKey | undefined {
		return Object.keys(this.placements).find((key) => this.placements[key].includes(id));
	}

	/** swap one board id for another in place, grade, audit and canvas spot following */
	#rename(from: string, to: string, mark: GradeMark | null) {
		const key = this.#slotOf(from);
		if (!key) return;
		this.#touch();
		this.placements[key] = this.placements[key].map((c) => (c === from ? to : c));
		const { [from]: _gone, ...rest } = this.grades;
		this.grades = mark ? { ...rest, [to]: mark } : rest;
		if (from in this.zoomPos) {
			this.zoomPos[to] = this.zoomPos[from];
			delete this.zoomPos[from];
		}
		if (this.selectedId === from) this.selectedId = isAttemptId(to) ? to : null;
	}

	#fail(code: string) {
		let n = 1;
		while (this.onBoard(attemptId(code, n))) n++;
		this.audited = this.audited.filter((c) => c !== code); // an audit has no grade to fail
		this.#rename(code, attemptId(code, n), 'U');
		// the panel was on this course: stay with the attempt, not the empty code
		if (this.#selected?.code === baseCode(code)) this.selectedId = attemptId(code, n);
	}

	#unfail(id: string, mark: GradeMark | null) {
		const base = baseCode(id);
		if (this.onBoard(base)) {
			this.#setFlash(`${this.courseLabel(base)} is already retaken on the plan, remove that first`);
			return;
		}
		this.#rename(id, base, mark);
		if (this.#selected?.code === base) this.selectedId = null;
	}

	/** the code a placed course should read as on the grid: the one from
	 *  the student's own programme (HIST235 for a historian) when the
	 *  cross-listed course belongs to exactly one of their subjects */
	shownCode(code: string): string {
		const c = byCode(code);
		const inProgramme = this.selectedSubjects.filter((s) => c.subjects.includes(s));
		return inProgramme.length === 1 ? (c.codesBySubject[inProgramme[0]] ?? c.code) : c.code;
	}

	/** Shared course label: whichever of the code / title switches above the grid
	 *  are on. Both on reads "COMP236 · Digitalization and Society" */
	courseLabel(code: string, displayCode?: string): string {
		if (!hasCode(code)) return code;
		const parts: string[] = [];
		if (this.showCodes) parts.push(displayCode ?? this.shownCode(code));
		if (this.showTitles) parts.push(byCode(code).title);
		return parts.join(' · ');
	}

	/** flip one of the label switches, keeping at least one of them on */
	trimName(year: number, trim: TrimNum): string {
		return trimName(year, trim, this.trimNaming);
	}
	trimSpelled(year: number, trim: TrimNum): string {
		return trimSpelled(year, trim, this.trimNaming);
	}

	toggleLabel(which: 'code' | 'title') {
		if (which === 'code') {
			this.showCodes = !this.showCodes;
			if (!this.showCodes) this.showTitles = true;
		} else {
			this.showTitles = !this.showTitles;
			if (!this.showTitles) this.showCodes = true;
		}
	}

	// ── slot helpers ──
	slotCourses(year: number, trim: TrimNum): string[] {
		return this.placements[slotKey(year, trim)] ?? [];
	}

	slotCredits(year: number, trim: TrimNum): number {
		return this.slotCourses(year, trim).reduce((sum, code) => sum + byCode(code).credits, 0);
	}

	/** A trimester's credit load against the drop form, as its footer shows it.
	 *  Year 1 (the foundation core) and a year past the degree's length are
	 *  exempt, as in the hints. 'heavy' is allowed, but only HEAVY_TRIMS_ALLOWED
	 *  times in the whole tenure. A fine load says nothing about other rules. */
	/** the trimesters past the degree's first year holding more than
	 *  TRIM_STANDARD_MAX (but not over the hard cap), each one uses an
	 *  extra-load allowance, and only HEAVY_TRIMS_ALLOWED are allowed */
	heavyTrimesters = $derived(
		this.years
			.filter((y) => y !== 1)
			.flatMap(
				(year) =>
					TRIMS.filter((t) => {
						const c = this.slotCredits(year, t);
						return c > TRIM_STANDARD_MAX && c <= TRIM_HARD_MAX;
					}).length
			)
			.reduce((a, b) => a + b, 0)
	);

	/** How a trimester's load stands. 'over' is what the corner shows red:
	 *  past the hard cap, or heavy once more trimesters are heavy than the
	 *  allowance covers. */
	slotLoad(
		year: number,
		trim: TrimNum
	): { credits: number; status: 'exempt' | 'under' | 'ok' | 'heavy' | 'over'; note: string } {
		const credits = this.slotCredits(year, trim);
		if (this.breaks[slotKey(year, trim)]) return { credits, status: 'exempt', note: '' };
		if (year === 1 || year > (this.fourYear ? 4 : 3)) return { credits, status: 'exempt', note: '' };
		if (credits > TRIM_HARD_MAX) return { credits, status: 'over', note: `over the ${TRIM_HARD_MAX}-credit cap` };
		if (credits > TRIM_STANDARD_MAX)
			return this.heavyTrimesters > HEAVY_TRIMS_ALLOWED
				? {
						credits,
						status: 'over',
						note: `over ${TRIM_STANDARD_MAX}, more than the ${HEAVY_TRIMS_ALLOWED} heavy trimesters allowed`
					}
				: {
						credits,
						status: 'heavy',
						note: `heavy: over ${TRIM_STANDARD_MAX}, allowed ${HEAVY_TRIMS_ALLOWED} times in the degree`
					};
		if (credits < TRIM_MIN) return { credits, status: 'under', note: `under the ${TRIM_MIN}-credit minimum` };
		return { credits, status: 'ok', note: '' };
	}

	/** trimester GPA for a slot, credit-weighted over its letter-graded,
	 *  non-audit courses; null when nothing there carries a grade */
	slotTgpa(year: number, trim: TrimNum): number | null {
		const items: { points: number; credits: number }[] = [];
		for (const code of this.slotCourses(year, trim)) {
			const g = this.grades[code];
			if (this.isAudit(code) || !isGradeLetter(g)) continue;
			items.push({ points: GRADE_POINTS[g], credits: byCode(code).credits });
		}
		return weightedGpa(items);
	}

	/** GPA across a whole year's letter-graded, non-audit courses; null when
	 *  none of that year's courses are graded */
	yearGpa(year: number): number | null {
		const items: { points: number; credits: number }[] = [];
		for (const trim of TRIMS) {
			for (const code of this.slotCourses(year, trim)) {
				const g = this.grades[code];
				if (this.isAudit(code) || !isGradeLetter(g)) continue;
				items.push({ points: GRADE_POINTS[g], credits: byCode(code).credits });
			}
		}
		return weightedGpa(items);
	}

	// ── the drop laws: core-only slots, trimester offering, eligible years, prereq order ──
	canDrop(code: string, year: number, trim: TrimNum): boolean {
		if (this.breaks[slotKey(year, trim)]) return false; // on a break, nothing goes in
		if (byCode(code).pendingCredits && byCode(code).credits === 0) return false;
		// year-1 t1/t2: any foundation course drops anywhere here, always,
		// the max-4 rule is soft (the hints police it), nothing else applies
		if (this.coreOnly(year, trim)) return isCore(code);
		const course = byCode(code);
		// no term info → allow anywhere
		if (course.offered.length && !course.offered.includes(trim)) return false;
		// a 300-level course must not light up a year-2 slot (a fifth year
		// is open to whatever a fourth year is)
		if (course.eligibleYears.length && !course.eligibleYears.includes(Math.min(year, 4))) return false;
		// placed prereqs must stay strictly earlier (unplaced ones only warn);
		// a substitute (Proofs&Ideas ⇄ Discrete Maths ⇄ Maths Foundations)
		// placed earlier satisfies it too
		const order = year * 10 + trim;
		for (const pre of course.prereqs) {
			const subs = hasCode(pre) ? satisfiedBy(pre) : [];
			const ats = this.placed.filter((p) => p.code === pre || subs.includes(p.code));
			if (ats.length && !ats.some((at) => at.year * 10 + at.trim < order)) return false;
		}
		return true;
	}

	// ── actions ──
	/** Canvas imports are additive: existing placements, grades and audits stay put. */
	/** each group's courses into its own slot, in one change; a course already
	 *  placed (or placed by an earlier group) keeps where it is */
	importCanvasCourses(groups: { codes: string[]; year: number; trim: TrimNum }[]) {
		let placements = this.placements;
		const added: { code: string; year: number; trim: TrimNum }[] = [];
		for (const { codes, year, trim } of groups) {
			if (!this.years.includes(year) || !TRIMS.includes(trim)) continue;
			const accepted = codes
				.filter(
					(code) =>
						hasCode(code) &&
						!(byCode(code).pendingCredits && byCode(code).credits === 0) &&
						(!this.coreOnly(year, trim) || isCore(code))
				)
				.map((code) => byCode(code).code);
			const result = mergeCanvasCourses(placements, accepted, slotKey(year, trim));
			placements = result.placements;
			for (const code of result.added) added.push({ code, year, trim });
		}
		if (added.length) {
			quietRedraw();
			this.#touch();
			this.placements = placements;
		}
		return added;
	}

	/** put a course in a slot, at position `at` among the slot's other
	 *  courses (where it was dropped between them), or on the end */
	place(code: string, year: number, trim: TrimNum, at?: number) {
		if (isAttemptId(code)) return; // a failed attempt is a record, not something to move
		const off = this.breaks[slotKey(year, trim)];
		if (off) {
			this.#setFlash(
				`${this.trimName(year, trim)} is marked as ${BREAK_KINDS[off.kind].label === 'away' ? 'a term away' : `a ${BREAK_KINDS[off.kind].label}`}, open it to take that off first`
			);
			return;
		}
		if (byCode(code).pendingCredits && byCode(code).credits === 0) {
			this.#setFlash('Credit value needs confirmation in admin before this course can count toward your plan.');
			return;
		}
		if (this.coreOnly(year, trim) && !isCore(code)) {
			// a bounced drop is not an edit, stay where we are
			this.#setFlash(`${this.trimName(1, trim)} takes foundation (KCCS) courses only`);
			return;
		}
		this.#touch();
		// a 5th foundation course IS taken (so t1⇄t2 shuffles and retake
		// planning stay fluid even when both slots are full), the hints
		// flag the over-max slot until it's resolved
		if (this.coreOnly(year, trim) && this.slotCourses(year, trim).filter((c) => c !== code).length >= Y1_CORE_MAX) {
			this.#setFlash(`${this.trimName(1, trim)} is over the ${Y1_CORE_MAX}-course max now, move one out`);
		}
		// a slot the course isn't offered in (or open to) still takes the
		// drop, the hints call it out instead of the drop bouncing
		this.remove(code); // moving = remove from wherever it was first
		const key = slotKey(year, trim);
		const list = [...(this.placements[key] ?? [])];
		list.splice(at ?? list.length, 0, code);
		this.placements[key] = list;
	}

	remove(code: string) {
		// already a no-op when place() passed the gate on the way in
		this.#touch();
		for (const key of Object.keys(this.placements)) {
			if (this.placements[key].includes(code)) {
				this.placements[key] = this.placements[key].filter((c) => c !== code);
				if (this.placements[key].length === 0) delete this.placements[key];
			}
		}
		delete this.zoomPos[code]; // off the plan → its canvas spot is forgotten
		if (isAttemptId(code)) {
			// a failed attempt taken off the board takes its U with it
			const { [code]: _u, ...rest } = this.grades;
			this.grades = rest;
		}
	}

	clearSlot(year: number, trim: TrimNum) {
		this.#touch();
		delete this.placements[slotKey(year, trim)];
	}

	/** one more year on the grid, up to a fifth */
	addYear() {
		if (this.years.length < this.maxYears) this.yearCount = this.years.length + 1;
	}

	/** take the last year off the grid, and every course on it off the plan,
	 *  so nothing is left placed in a year that can't be seen */
	removeYear() {
		if (!this.canRemoveYear) return;
		const year = this.years.length;
		const codes = TRIMS.flatMap((t) => this.placements[slotKey(year, t)] ?? []);
		if (codes.length) this.#touch();
		for (const t of TRIMS) delete this.placements[slotKey(year, t)];
		for (const code of codes) delete this.zoomPos[code];
		if (this.zoom?.year === year) this.zoom = null;
		this.yearCount = year - 1;
	}

	/** the trailing years past the degree's length that hold no course */
	#dropEmptyYears() {
		let last = this.years.length;
		while (last > this.minYears && TRIMS.every((t) => !this.placements[slotKey(last, t)]?.length)) last--;
		this.yearCount = last;
	}

	/** wipe everything back to the freshly-seeded recommended plan */
	reset() {
		this.trimNaming = 'year';
		this.breaks = {};
		this.now = null;
		this.audited = [];
		this.grades = {};
		this.showCodes = true;
		this.showTitles = false;
		this.creditTargetMode = 'minimum';
		this.selected = null;
		this.zoom = null;
		this.zoomPos = {}; // nothing is where the student put it any more
		this.targetLoad = TRIM_NORMAL_MAX;
		this.yearCount = 4;
		this.waived = []; // waived rules were about courses that are now gone
		// start over = the fresh-visit state exactly: the recommended path on
		// the grid, untouched, so picking a different degree re-lays it out
		this.touched = false;
		this.seedRecommended();
	}

	/** Every mutating action passes through here. There is one plan and it is
	 *  always editable, this only records that the student has made it theirs,
	 *  which is what stops a later programme change from re-laying it out. */
	#touch() {
		this.touched = true;
	}

	/** A sidebar programme control changed. Every surface answers at once, the
	 *  catalogue re-sorts and re-filters, every chip recolours, so the motion
	 *  is damped for this render (see quietRedraw) instead of a few hundred
	 *  cards flying.
	 *
	 *  A plan nobody has edited yet is still the example it arrived as, so it
	 *  re-lays itself out for the new degree, a first visit never shows
	 *  someone else's courses. Once the student has changed anything, the grid
	 *  never moves: every course stays exactly where it is, and the new
	 *  degree's recommendation shows underneath as dashed ghosts in the slots
	 *  it would use. The board's footer then offers the bulk moves, add the
	 *  required courses, take every suggestion, drop the courses that no
	 *  longer count, so the student decides what changes. */
	programmeChanged() {
		quietRedraw();
		this.ensureDistinctPicks();
		// switching to 4 years brings year 4 back; switching to 3 takes off the
		// years past the third that hold nothing, one with courses stays, so
		// nothing placed there is hidden or lost
		if (this.yearCount < this.minYears) this.yearCount = this.minYears;
		if (!this.touched) this.seedRecommended();
		if (!this.fourYear) this.#dropEmptyYears();
		const missing = this.missingRequiredCodes.length;
		const strays = this.otherPlacedCodes.length;
		if (missing || strays)
			this.#setFlash(
				[
					missing && `${missing} required course${missing === 1 ? '' : 's'} to add`,
					strays && `${strays} no longer count${strays === 1 ? 's' : ''}`
				]
					.filter(Boolean)
					.join(' · ') + ', see the buttons under the grid'
			);
	}

	// what each later role may pick: a subject already claimed by an earlier
	// role drops out of the later roles' lists (cs major → no cs minor)
	major2Opts = $derived(MAJOR_SUBJECTS.filter((s) => s.id !== this.picks.major1));
	// the open minor (free courses, no declared subject) leads the minor list
	minorOpts = $derived([OPEN_MINOR, ...PROGRAMME_SUBJECTS.filter((s) => s.id !== this.picks.major1)]);
	// the minor only blocks a concentration subject when a minor is in play
	concOpts = $derived(
		PROGRAMME_SUBJECTS.filter(
			(s) => s.id !== this.picks.major1 && (this.structure !== 'major-minor-conc' || s.id !== this.picks.minor)
		)
	);

	/** no two active roles may point at the same subject, after a pick or
	 *  structure change, later roles bump off a collision (minor = cs when
	 *  the major just became cs → the minor moves to the first free subject) */
	ensureDistinctPicks() {
		const active: (keyof typeof this.picks)[] = ['major1'];
		if (this.structure === 'double-major') active.push('major2');
		if (this.structure === 'major-minor' || this.structure === 'major-minor-conc') active.push('minor');
		if (this.structure === 'major-minor-conc' || this.structure === 'major-conc') active.push('conc');
		const taken = new Set<string>();
		for (const k of active) {
			const pool = k === 'major1' || k === 'major2' ? MAJOR_SUBJECTS : PROGRAMME_SUBJECTS;
			if (taken.has(this.picks[k])) {
				const free = pool.find((s) => !taken.has(s.id));
				if (free) this.picks[k] = free.id;
			}
			taken.add(this.picks[k]);
		}
	}

	/**
	 * Fill the grid with the department order for the chosen programmes:
	 * the department's published pathway where one exists, otherwise the
	 * required courses scheduled into the earliest slot that satisfies
	 * offering, year eligibility, prereq order and the 20-credit load.
	 * Replaces whatever is on the grid, called when the programme changes.
	 */
	seedRecommended() {
		quietRedraw(); // every chip is about to change at once, fade, don't fly
		this.placements = Object.fromEntries(Object.entries(this.recommended).map(([key, codes]) => [key, [...codes]]));
	}

	/**
	 * The department's recommended path for the CURRENT programme, as a pure
	 * function of it: the published pathway where one exists, otherwise the
	 * required courses scheduled into the earliest slot that satisfies
	 * offering, year eligibility, prereq order and the 20-credit load.
	 *
	 * Derived, not stored, because it is not a second plan the student can get
	 * lost in, it is what the app would suggest, recomputed whenever the
	 * degree changes, and shown as ghosts in the slots it would use.
	 */
	recommended: Record<SlotKey, string[]> = $derived.by(() => {
		const placements: Record<SlotKey, string[]> = {};
		const pos = new Map<string, number>(); // code -> year*10+trim
		const load = (y: number, t: TrimNum) =>
			(placements[slotKey(y, t)] ?? []).reduce((s, c) => s + byCode(c).credits, 0);
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
			for (const y of this.seedYears) {
				for (const t of TRIMS) {
					// year-1 t1/t2 are reserved for the foundation core (seeded below)
					if (this.coreOnly(y, t)) continue;
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
		const coreSlots: { y: number; t: TrimNum }[] = this.seedYears.flatMap((y) =>
			TRIMS.map((t) => ({ y, t: t as TrimNum }))
		);
		const cores = [...CORE_COURSES].sort(
			(a, b) => (a.offered.length || TRIMS.length) - (b.offered.length || TRIMS.length)
		);
		for (const course of cores) {
			for (const { y, t } of coreSlots) {
				if (course.eligibleYears.length && !course.eligibleYears.includes(y)) continue;
				if (course.offered.length && !course.offered.includes(t)) continue;
				if (this.coreOnly(y, t)) {
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
			this.programmes.flatMap((prog) =>
				requiredSetFor(prog.subject, prog.role, this.fourYear, this.isDouble, this.batchStartYear)
			)
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
		for (const prog of this.programmes) {
			for (const { year, trim, code } of recommendedFor(
				prog.subject,
				prog.role,
				this.fourYear,
				this.isDouble,
				this.batchStartYear
			)) {
				if (pos.has(code) || !requiredUnion.has(code)) continue;
				// the published grid itself is not always feasible (it lists
				// MATH427 alongside its prerequisite MATH303), never place a
				// course at or before a prerequisite already on the grid
				const after = Math.max(0, ...byCode(code).prereqs.map((p) => pos.get(p) ?? 0));
				if (this.seedYears.includes(year) && !this.coreOnly(year, trim) && year * 10 + trim > after) {
					put(code, year, trim);
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
				if (!hasCode(pre) || remaining.has(pre) || !reachableIn(pre, this.fourYear)) continue;
				if (subs(pre).some((s) => remaining.has(s))) continue; // a substitute already covers it
				// only pull in a prereq from one of the student's OWN departments.
				// A cross-department prereq (the computer-science courses behind a
				// data-science requirement, biology's BIOS201 behind an env-studies
				// course) isn't on the programme's list, seeding it buries the plan
				// in green 'other' support courses. The prereq LAW still flags the
				// ordering if the student chooses to add it.
				if (!byCode(pre).subjects.some((subj) => this.selectedSubjects.includes(subj))) continue;
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

		return placements;
	});

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
	recommendedElectives: Record<SlotKey, number> = $derived.by(() => {
		const SLOT_CREDITS = 4; // the ordinary course size the placeholders stand for
		const out: Record<SlotKey, number> = {};
		const placed = Object.values(this.recommended)
			.flat()
			.reduce((sum, code) => sum + byCode(code).credits, 0);
		let left = this.degreeTotal - placed;
		if (left < SLOT_CREDITS) return out;

		const slots: SlotKey[] = [];
		for (const year of this.seedYears) {
			for (const trim of TRIMS) {
				if (this.coreOnly(year, trim)) continue;
				slots.push(slotKey(year, trim));
			}
		}
		const load = (key: SlotKey) =>
			(this.recommended[key] ?? []).reduce((sum, code) => sum + byCode(code).credits, 0) +
			(out[key] ?? 0) * SLOT_CREDITS;

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
	});

	/** how many elective placeholders the path carries */
	recommendedElectiveCount = $derived(Object.values(this.recommendedElectives).reduce((sum, n) => sum + n, 0));

	/** The elective credits the degree actually leaves open, quoted rather
	 *  than the box count, because a remainder that isn't a whole number of
	 *  4-credit courses (a history major + physics minor leaves 2 spare) would
	 *  otherwise be rounded away in the one place the figure matters. */
	recommendedElectiveCredits = $derived(
		Math.max(
			0,
			this.degreeTotal -
				Object.values(this.recommended)
					.flat()
					.reduce((sum, code) => sum + byCode(code).credits, 0)
		)
	);

	/** electives the reference plan suggests for one cell */
	electivesFor(year: number, trim: TrimNum): number {
		return this.recommendedElectives[slotKey(year, trim)] ?? 0;
	}

	// ── the suggestion layer ──
	// Where your plan and the recommendation differ, in the recommendation's
	// own slots. A course you have placed somewhere ELSE is not suggested, you
	// have made your call about it, and neither is one an interchangeable
	// substitute already covers (Discrete Maths standing in for Proofs).
	suggestions: Record<SlotKey, string[]> = $derived.by(() => {
		const out: Record<SlotKey, string[]> = {};
		for (const [key, codes] of Object.entries(this.recommended)) {
			if (this.breaks[key]) continue; // nothing is suggested into a break
			const open = codes.filter(
				(code) => !this.placedCodes.has(code) && !satisfiedBy(code).some((sub) => this.placedCodes.has(sub))
			);
			if (open.length) out[key] = open;
		}
		return out;
	});

	suggestedCodes = $derived(new Set(Object.values(this.suggestions).flat()));
	suggestionCount = $derived(this.suggestedCodes.size);

	/** the recommendation's ghosts for one cell */
	suggestionsFor(year: number, trim: TrimNum): string[] {
		return this.suggestions[slotKey(year, trim)] ?? [];
	}

	/** take one suggestion: it lands in the slot the recommendation put it in */
	acceptSuggestion(code: string) {
		for (const [key, codes] of Object.entries(this.suggestions)) {
			if (!codes.includes(code)) continue;
			const { year, trim } = parseSlot(key);
			this.place(code, year, trim);
			return;
		}
	}

	/** take every outstanding suggestion at once */
	acceptAllSuggestions() {
		quietRedraw(); // the board fills in one go, fade, don't fly
		this.#touch();
		const next: Record<SlotKey, string[]> = Object.fromEntries(
			Object.entries(this.placements).map(([key, codes]) => [key, [...codes]])
		);
		for (const [key, codes] of Object.entries(this.suggestions)) {
			next[key] = [...(next[key] ?? []), ...codes];
		}
		this.placements = next;
	}

	/** Throw the plan away and start from the reference plan. The one action
	 *  besides "start over" that discards work, so it is never something an
	 *  edit does by itself, the panel asks twice before calling it. Grades and
	 *  audits go with it: they were about courses that are no longer here. */
	useRecommended() {
		this.breaks = {}; // the suggested path knows nothing of them
		this.seedRecommended();
		this.zoomPos = {};
		this.audited = this.audited.filter((c) => this.placedCodes.has(c));
		this.grades = Object.fromEntries(Object.entries(this.grades).filter(([code]) => this.placedCodes.has(code)));
		this.selected = null;
		this.zoom = null;
		this.touched = true; // they chose this plan, so it is theirs now
		this.#setFlash('the suggested path is now your plan');
	}

	// ── the required courses of every chosen programme not yet on the grid ──
	// a placed substitute satisfies a requirement (MATH191 for COMP201)
	missingRequiredCodes: string[] = $derived.by(() => {
		const out = new Set(this.programmes.flatMap((_, i) => this.requiredLeftFor(i)));
		for (const c of CORE_COURSES) if (!this.placedCodes.has(c.code)) out.add(c.code);
		return [...out];
	});

	/** one programme's required courses still to place */
	requiredLeftFor(i: number): string[] {
		if (this.programmes[i].subject === 'open') return [];
		return [...this.programmeSets[i].required].filter(
			(code) =>
				hasCode(code) && !this.placedCodes.has(code) && !satisfiedBy(code).some((sub) => this.placedCodes.has(sub))
		);
	}

	/**
	 * Put every missing required course on the grid in one go. Each lands
	 * where the recommendation would put it; one the recommendation doesn't
	 * schedule goes to the earliest trimester it can legally sit in that still
	 * has room under the student's target load. Anything that fits nowhere is
	 * left off and named, rather than forced into a broken slot.
	 */
	addRequiredCourses() {
		const want = new Set(this.missingRequiredCodes);
		if (!want.size) return;
		quietRedraw();
		this.#touch();
		const next: Record<SlotKey, string[]> = Object.fromEntries(
			Object.entries(this.placements).map(([key, codes]) => [key, [...codes]])
		);
		const load = (key: SlotKey) => (next[key] ?? []).reduce((sum, c) => sum + byCode(c).credits, 0);
		const add = (key: SlotKey, code: string) => {
			next[key] = [...(next[key] ?? []), code];
			want.delete(code);
		};
		for (const [key, codes] of Object.entries(this.suggestions))
			for (const code of codes) if (want.has(code)) add(key, code);
		// what the recommendation didn't place, lowest-numbered first so a
		// prerequisite is placed before the course that needs it
		const rest = [...want].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
		const unplaced: string[] = [];
		for (const code of rest) {
			let landed = false;
			for (const year of this.years) {
				for (const trim of TRIMS) {
					const key = slotKey(year, trim);
					if (!this.canDrop(code, year, trim)) continue;
					if (!this.coreOnly(year, trim) && load(key) + byCode(code).credits > this.targetLoad) continue;
					if (this.coreOnly(year, trim) && (next[key] ?? []).length >= Y1_CORE_MAX) continue;
					add(key, code);
					landed = true;
					break;
				}
				if (landed) break;
			}
			if (!landed) unplaced.push(code);
		}
		this.placements = next;
		this.#setFlash(
			unplaced.length
				? `added the required courses, ${unplaced.length} had no room left: ${unplaced.map((c) => this.courseLabel(c)).join(', ')}`
				: 'every required course is on the plan now'
		);
	}

	/** empty the whole grid, the bottom of the "add / remove everything"
	 *  pair. Grades and audits go too: they were about courses now gone. */
	clearPlan() {
		quietRedraw();
		this.#touch();
		this.placements = {};
		this.zoomPos = {};
		this.audited = [];
		this.grades = {};
		this.selected = null;
		this.#setFlash('grid cleared, the dashed courses are the recommended path, click any to add it');
	}

	// ── clearing out the strays ──
	// Courses on the grid that count toward none of the declared programmes:
	// a different department's course that isn't in any of your required or
	// elective lists (the green 'other' chips). The foundation core is never
	// one of these, every student takes it, and neither is anything in your
	// own department, which counts as a subject elective.
	otherPlacedCodes = $derived([...this.placedCodes].filter((code) => this.courseType(code) === 'other'));

	/** drop every placed course that counts toward no chosen programme */
	removeOtherCourses() {
		const drop = new Set(this.otherPlacedCodes);
		if (!drop.size) return;
		quietRedraw(); // several chips leave at once, fade, don't fly
		this.#touch();
		const next: Record<SlotKey, string[]> = {};
		for (const [key, codes] of Object.entries(this.placements)) {
			const kept = codes.filter((c) => !drop.has(c));
			if (kept.length) next[key] = kept;
		}
		this.placements = next;
		for (const code of drop) delete this.zoomPos[code];
		this.#setFlash(`removed ${drop.size} course${drop.size === 1 ? '' : 's'} that count toward no programme`);
	}

	toggleFilter(subjectId: string) {
		if (this.filters.includes(subjectId)) {
			this.filters = this.filters.filter((f) => f !== subjectId);
			return;
		}
		// the foundation-core view is exclusive: checking kccs clears the
		// subject filters, checking any subject clears kccs, you browse
		// either the core or your programmes' departments, never a mix
		this.filters = subjectId === 'core' ? ['core'] : [...this.filters.filter((f) => f !== 'core'), subjectId];
	}

	#setFlash(msg: string) {
		this.flash = msg;
		clearTimeout(this.#flashTimer);
		this.#flashTimer = setTimeout(() => (this.flash = null), 2500);
	}

	// ── waivers ──
	// A red hint states a rule the university actually enforces, but it is
	// enforced by the registry, not by us, and students do get prerequisite
	// waivers, one-off offerings and year exemptions all the time. So every
	// warn hint carries a stable `id` and can be crossed off: the rule stops
	// counting against the plan (no red chip, no tinted cell) until the
	// student brings it back, and the waiver survives a reload.
	waiveHint(id: string) {
		if (!this.waived.includes(id)) this.waived = [...this.waived, id];
	}

	unwaiveHint(id: string) {
		this.waived = this.waived.filter((w) => w !== id);
	}

	// ── the laws → hints ──
	allHints: Hint[] = $derived.by(() => {
		// a hint names courses by code, the titles are on the grid and in the details
		const code = (c: string) => (hasCode(c) ? this.shownCode(c) : c);
		const hints: Hint[] = [];
		const pos = new Map<string, { year: number; trim: TrimNum; order: number }>();
		for (const p of this.placed) pos.set(p.code, { year: p.year, trim: p.trim, order: p.year * 10 + p.trim });

		// law 0, every trimester of the tenure must reach the minimum
		// credits (not just the one being zoomed, the default plan should
		// already own up to its thin trimesters). Year 1 is exempt: t1/t2
		// are the foundation core and t3 carries no min or max at all.
		// An empty plan is under the minimum in EVERY trimester, so these are
		// gathered into one chip instead of nine identical ones, the panel is
		// meant to be read, and a wall of the same sentence isn't.
		const thin: { year: number; trim: TrimNum; credits: number }[] = [];
		for (const year of this.years) {
			if (year === 1) continue;
			for (const trim of TRIMS) {
				const c = this.slotCredits(year, trim);
				// a year past the degree's length (year 4 on a 3-year degree, a
				// fifth year) is optional spillover, an empty trimester there
				// is normal, not an under-loaded one
				if (year > (this.fourYear ? 4 : 3) && c === 0) continue;
				if (this.breaks[slotKey(year, trim)]) continue; // a break isn't under-loaded
				if (c < TRIM_MIN) thin.push({ year, trim, credits: c });
			}
		}
		if (thin.length) {
			// a credit-count issue is a caution (yellow), not a hard error,
			// you top a light trimester up with other courses
			hints.push({
				kind: 'caution',
				text:
					thin.length === 1
						? `${this.trimName(thin[0].year, thin[0].trim)} is under the ${TRIM_MIN}-credit minimum (${thin[0].credits}/${TRIM_MIN})`
						: `${thin.length} trimesters are under the ${TRIM_MIN}-credit minimum, ${thin
								.map((t) => `${this.trimName(t.year, t.trim)} (${t.credits})`)
								.join(', ')}`,
				codes: []
			});
		}

		// law 0.5, the foundation core: all twelve KCCS courses must be on
		// the plan (year-1 t1/t2 only ever hold them, max 4 each, the drop
		// laws enforce that; a stale save could still break it, so check too)
		const missingCore = CORE_COURSES.filter((c) => !this.placedCodes.has(c.code));
		if (missingCore.length) {
			hints.push({
				kind: 'caution',
				text: `${missingCore.length} foundation course${missingCore.length === 1 ? '' : 's'} still to place: ${missingCore
					.map((c) => code(c.code))
					.join(', ')}`,
				codes: missingCore.map((c) => c.code)
			});
		} else {
			hints.push({ kind: 'good', text: 'all foundation courses are on the plan', codes: [] });
		}
		for (const trim of [1, 2] as TrimNum[]) {
			const codes = this.slotCourses(1, trim);
			const nonCore = codes.filter((c) => !isCore(c));
			if (nonCore.length) {
				hints.push({
					kind: 'warn',
					id: `core-only:1-${trim}`,
					text: `${this.trimName(1, trim)} can only hold foundation (KCCS) courses`,
					codes: nonCore
				});
			}
			if (codes.length > Y1_CORE_MAX) {
				hints.push({
					kind: 'warn',
					id: `core-max:1-${trim}`,
					text: `${this.trimName(1, trim)} can hold at most ${Y1_CORE_MAX} foundation courses (${codes.length}/${Y1_CORE_MAX})`,
					codes
				});
			}
		}

		// law 1, prerequisites must come in an earlier trimester. A placed
		// substitute (MATH191 ⇄ COMP201) satisfies the prerequisite too.
		for (const p of this.placed) {
			const course = byCode(p.code);
			for (const pre of course.prereqs) {
				const subs = hasCode(pre) ? satisfiedBy(pre) : [];
				const placedAt = [pos.get(pre), ...subs.map((s) => pos.get(s))].filter((x) => x !== undefined);
				const prePos = placedAt.length ? placedAt.reduce((a, b) => (a.order <= b.order ? a : b)) : undefined;
				// all three forms share one waiver id: a waiver is held against
				// the REQUIREMENT (COMP321's MATH191), so crossing it off stays
				// crossed off however the student then shuffles the two courses
				const id = `prereq:${p.code}:${pre}`;
				if (!prePos) {
					hints.push({
						kind: 'warn',
						id,
						text: `${code(p.code)} needs ${code(pre)} first${subs.length ? ` (or ${subs.map((sub) => code(sub)).join(' / ')})` : ''}`,
						codes: [p.code, pre]
					});
				} else if (prePos.order === p.year * 10 + p.trim) {
					hints.push({
						kind: 'warn',
						id,
						text: `${code(pre)} before ${code(p.code)}, both are in ${this.trimName(p.year, p.trim)}`,
						codes: [p.code, pre]
					});
				} else if (prePos.order > p.year * 10 + p.trim) {
					hints.push({ kind: 'warn', id, text: `${code(pre)} must come before ${code(p.code)}`, codes: [p.code, pre] });
				}
			}
		}

		// law 1.5, a course should only be placed in a year it's actually
		// open to (from the CSVs' Year 1-4 columns). This is what used to
		// silently let e.g. a 300+ level course sit in a first-year slot.
		for (const p of this.placed) {
			const course = byCode(p.code);
			if (course.eligibleYears.length && !course.eligibleYears.includes(Math.min(p.year, 4))) {
				hints.push({
					kind: 'warn',
					id: `year:${p.code}:y${p.year}`,
					text: `${code(p.code)} is for year ${course.eligibleYears.join('/')}, not year ${p.year}`,
					codes: [p.code]
				});
			}
		}

		// law 1.6, a drop into a trimester the course has never run in is
		// allowed (the grid takes it), but it must be called out
		for (const p of this.placed) {
			const course = byCode(p.code);
			if (course.offered.length && !course.offered.includes(p.trim)) {
				hints.push({
					kind: 'warn',
					// per trimester: "it runs in t2 this year" is a claim about t2,
					// and must not quietly cover a later move into t3
					id: `offered:${p.code}:t${p.trim}`,
					text: `${code(p.code)} doesn't run in ${this.trimName(p.year, p.trim)}, it runs in ${offeredIn(course.offered, this.trimNaming)}${this.trimNaming === 'year' ? ' that year' : ''}`,
					codes: [p.code]
				});
			}
		}

		// law 2, substitute courses are interchangeable (Proofs and Ideas,
		// Discrete Mathematics, Mathematical Foundations of Data Science)
		for (const p of this.placed) {
			const course = byCode(p.code);
			for (const otherCode of course.substitutes ?? []) {
				const other = byCode(otherCode);
				if (pos.has(other.code)) {
					// both placed, redundant, not wrong. Emit once per pair
					// (the lower code speaks) so a 3-way group isn't noisy.
					if (p.code < other.code) {
						hints.push({
							kind: 'info',
							text: `${code(p.code)} and ${code(other.code)} are interchangeable, you only need one`,
							codes: [p.code, other.code]
						});
					}
				} else if (this.courseType(other.code) === 'required') {
					hints.push({
						kind: 'info',
						text: `you can switch ${code(p.code)} for ${code(other.code)}`,
						codes: [p.code, other.code]
					});
				}
			}
		}

		// law 2.5, the maths department teaches the full version of a couple of
		// courses another department also teaches applied ("Introduction to
		// Linear Algebra" is required for a computer-science major, but a maths
		// student has already done the real thing). Doing the maths one clears
		// both; doing the applied one does NOT clear the maths requirement, so
		// the hint has to name the direction rather than call them equivalent.
		// Only shown when the student is actually doing both departments.
		const covers = MATHS_COVERS.filter(({ maths, applied }) => {
			if (!hasCode(maths) || !hasCode(applied)) return false;
			if (!this.selectedSubjects.includes('mathematics')) return false;
			// the department that asks for the applied version is on the plan
			return byCode(applied).subjects.some((s) => this.selectedSubjects.includes(s));
		});
		if (covers.length) {
			const pairs = covers.map(({ maths, applied }) => `${code(maths)} covers ${code(applied)}`);
			hints.push({
				kind: 'info',
				text: `you are doing maths alongside a department that teaches its own applied version, take the maths course and you do not need the applied one: ${pairs.join('; ')}. It does not work the other way round.`,
				codes: covers.flatMap(({ maths, applied }) => [maths, applied])
			});
		}

		// law 2.6, the programme's own required courses that aren't on the grid
		// yet. Law 0.5 does this for the foundation core; without the same for
		// each programme a student can sit on "required 0/40" with nothing
		// telling them WHICH courses are missing.
		for (let i = 0; i < this.programmes.length; i++) {
			const prog = this.programmes[i];
			if (prog.subject === 'open') continue;
			const missing = [...this.programmeSets[i].required]
				.filter((code) => hasCode(code) && !this.placedCodes.has(code))
				// a placed substitute already satisfies it (MATH191 for COMP201)
				.filter((code) => !satisfiedBy(code).some((s) => this.placedCodes.has(s)))
				.sort();
			if (!missing.length) continue;
			const label = subjectById(prog.subject).label;
			const shown = missing.slice(0, 8);
			hints.push({
				kind: 'caution',
				text: `${label} ${prog.role}: ${missing.length} required course${missing.length === 1 ? '' : 's'} to place, ${shown.map((c) => code(c)).join(', ')}${missing.length > shown.length ? `, +${missing.length - shown.length} more` : ''}`,
				codes: missing
			});
		}

		// law 2.7, the chosen structure can't fit under the university's own
		// ceiling. Not something the student can fix by moving courses around,
		// so it's said once, up front, rather than as a per-trimester nag.
		const structureCap = this.fourYear ? MAX_TOTAL_4YR : MAX_TOTAL_3YR;
		if (this.degreeTotal > structureCap) {
			hints.push({
				kind: 'caution',
				text: `this combination asks for ${this.degreeTotal} credits but the ${this.fourYear ? 'four' : 'three'}-year ceiling is ${structureCap}, the programmes overlap in practice, so talk to your mentor about which courses count for both`,
				codes: []
			});
		}

		// law 3, trimester credit caps: TRIM_STANDARD_MAX (18) normally, up to
		// TRIM_HARD_MAX (20) at most twice in the whole tenure (year 1 exempt,
		// same as the minimum)
		const heavy: { year: number; trim: TrimNum; credits: number }[] = [];
		for (const year of this.years) {
			if (year === 1) continue;
			for (const trim of TRIMS) {
				const credits = this.slotCredits(year, trim);
				if (credits > TRIM_HARD_MAX) {
					hints.push({
						kind: 'caution',
						text: `${this.trimName(year, trim)} is over the ${TRIM_HARD_MAX}-credit cap (${credits}/${TRIM_HARD_MAX})`,
						codes: this.slotCourses(year, trim)
					});
				} else if (credits > TRIM_STANDARD_MAX) {
					heavy.push({ year, trim, credits });
				}
			}
		}
		if (heavy.length > HEAVY_TRIMS_ALLOWED) {
			hints.push({
				kind: 'caution',
				text: `only ${HEAVY_TRIMS_ALLOWED} trimesters in your whole tenure may go over ${TRIM_STANDARD_MAX} credits; you have ${heavy.length}`,
				codes: heavy.flatMap((h) => this.slotCourses(h.year, h.trim))
			});
		} else {
			for (const h of heavy) {
				hints.push({
					kind: 'info',
					text: `${this.trimName(h.year, h.trim)} is a heavy trimester (${h.credits}/${TRIM_HARD_MAX}), ${HEAVY_TRIMS_ALLOWED} allowed`,
					codes: []
				});
			}
		}

		// law 4, audits are limited (only the ones the student marked), and
		// the drop form excludes KCCS / 391 / 490 / 491 and any course that
		// isn't 2 or 4 credits from being audited at all
		const badAudits = this.audited.filter((code) => !canAudit(code));
		if (badAudits.length) {
			hints.push({
				kind: 'warn',
				id: `audit-ineligible:${[...badAudits].sort().join(',')}`,
				text: `${badAudits.map((c) => code(c)).join(', ')} can't be audited, only 2- or 4-credit courses, never KCCS/391/490/491`,
				codes: badAudits
			});
		}
		const audits = this.placed.filter((p) => this.audited.includes(p.code));
		if (audits.length > AUDIT_LIMIT) {
			hints.push({
				kind: 'warn',
				id: 'audit-limit',
				text: `too many audits, only ${AUDIT_LIMIT} allowed`,
				codes: audits.map((a) => a.code)
			});
		} else if (audits.length === AUDIT_LIMIT) {
			hints.push({ kind: 'info', text: 'you are out of audits', codes: [] });
		} else {
			const left = AUDIT_LIMIT - audits.length;
			hints.push({ kind: 'good', text: `${left} audit${left === 1 ? '' : 's'} remaining`, codes: [] });
		}

		// law 5, degree credit total, and the drop form's hard ceiling on
		// extra credits (128 for a 3-year tenure, 176 for a 4-year one)
		const tenureCap = this.fourYear ? MAX_TOTAL_4YR : MAX_TOTAL_3YR;
		if (this.totalPlacedCredits > tenureCap) {
			hints.push({
				kind: 'warn',
				id: 'credit-ceiling',
				text: `total credits exceed the ${tenureCap}-credit ceiling for the ${this.fourYear ? 'four' : 'three'}-year programme (${this.totalPlacedCredits}/${tenureCap})`,
				codes: []
			});
		} else if (this.totalPlacedCredits > this.creditMinimum) {
			hints.push({
				kind: 'caution',
				text: `you will exceed the required total credits (${this.totalPlacedCredits}/${this.creditMinimum})`,
				codes: []
			});
		}

		// ── grade-view hints (from the Examinations & Assessment Manual) ──
		if (this.gradeMode) {
			const mark = (code: string) => this.grades[code];
			const graded = [...this.placedCodes].filter((c) => !this.isAudit(c));
			const label = (codes: string[]) => codes.map((c) => code(c)).join(', ');

			// failing: a U scores 0 and blocks graduation until cleared. The failed
			// attempt stays on the grid; the course is free to place again
			const uCodes = this.failedAttempts.map((a) => a.id);
			if (uCodes.length)
				hints.push({
					kind: 'warn',
					id: `grade-u:${[...uCodes].sort().join(',')}`,
					text: `${label(uCodes)}: U (fail), counts as 0 for now; place the course again from the catalogue, or take a supplementary exam and re-grade it here, and the new grade replaces the U.`,
					codes: uCodes
				});

			// incompletes revert to the computed grade if left unfinished
			const iCodes = graded.filter((c) => mark(c) === 'I');
			if (iCodes.length)
				hints.push({
					kind: 'caution',
					text: `${label(iCodes)}: Incomplete, submit pending work within six weeks or it defaults to the computed grade.`,
					codes: iCodes
				});

			// a D or E can be raised via an improvement exam
			const deCodes = graded.filter((c) => mark(c) === 'D' || mark(c) === 'E');
			if (deCodes.length)
				hints.push({
					kind: 'info',
					text: `${label(deCodes)}: a D/E can be raised with an improvement exam (up to ${this.fourYear ? 4 : 3} across the degree).`,
					codes: deCodes
				});

			// the 5.5 CGPA graduation floor, with how far off it is
			if (this.cgpa !== null && this.cgpa < GRAD_MIN_CGPA) {
				const rec = recovery(GRAD_MIN_CGPA, this.earnedPoints, this.gradedCredits, this.gradableCredits);
				const left = Math.max(0, this.gradableCredits - this.gradedCredits);
				if (rec.kind === 'reachable')
					hints.push({
						kind: 'caution',
						text: `CGPA ${this.cgpa.toFixed(2)} is below the 5.5 graduation floor, average at least ${rec.needed.toFixed(2)} over your remaining ${left} credits to recover.`,
						codes: []
					});
				else
					hints.push({
						kind: 'warn',
						id: 'cgpa-floor',
						text:
							rec.kind === 'impossible'
								? `CGPA ${this.cgpa.toFixed(2)} is below the 5.5 graduation floor and can't reach it on this plan, clear a U or add credits.`
								: `CGPA ${this.cgpa.toFixed(2)} is below the 5.5 graduation floor.`,
						codes: []
					});
			}

			// Dean's Merit List, the grade condition (the list itself is the top 10%)
			if (this.gradedCredits > 0) {
				if (uCodes.length || iCodes.length)
					hints.push({
						kind: 'info',
						text: `an I or U grade makes you ineligible for the Dean's Merit List this year.`,
						codes: []
					});
				else
					hints.push({
						kind: 'good',
						text: `no I or U grades, you meet the Dean's Merit List grade condition (the list is the cohort's top 10%).`,
						codes: []
					});
			}
		}

		// transcript-only courses: fine to take, but say plainly that they
		// won't move any programme's tally
		for (const p of this.placed) {
			if (!isTranscriptOnly(p.code)) continue;
			hints.push({
				kind: 'info',
				text: `${code(p.code)} shows on your transcript but counts toward no programme`,
				codes: [p.code]
			});
		}

		return hints;
	});

	/** what the panel and the grid answer to: every hint the student has not
	 *  crossed off */
	hints: Hint[] = $derived(this.allHints.filter((h) => !h.id || !this.waived.includes(h.id)));

	/** the crossed-off hints that STILL apply, a waived rule the student has
	 *  since fixed simply drops out of the list (its id stays waived, so
	 *  breaking the same rule again is still crossed off) */
	waivedHints: Hint[] = $derived(this.allHints.filter((h) => h.id && this.waived.includes(h.id)));

	/** codes named in any hint → bold on the grid */
	flaggedCodes = $derived(new Set(this.hints.flatMap((h) => h.codes)));
	/** the worst hint naming each course, the shape its chip's marker takes.
	 *  'good' notes never mark a chip: the required dot is already a circle. */
	flagKinds = $derived.by(() => {
		const rank = { warn: 0, caution: 1, info: 2, good: 3 };
		const out = new Map<string, Hint['kind']>();
		for (const h of this.hints) {
			if (h.kind === 'good') continue;
			for (const code of h.codes) {
				const was = out.get(code);
				if (!was || rank[h.kind] < rank[was]) out.set(code, h.kind);
			}
		}
		return out;
	});
	/** codes named in a WARN hint → their cell gets tinted */
	warnCodes = $derived(new Set(this.hints.filter((h) => h.kind === 'warn').flatMap((h) => h.codes)));

	slotHasProblem(year: number, trim: TrimNum): boolean {
		return this.slotCourses(year, trim).some((code) => this.warnCodes.has(code));
	}

	// ── which programme each placed course counts toward ──
	/** Each placed course is claimed by ONE programme (unless /admin shares its
	 *  credits), so a cross-listed course taken for one programme doesn't also
	 *  fill another's tally. The stats count with it, and a chip wears the
	 *  colour of the programme it counts for. */
	claims: Map<string, number[]> = $derived.by(() => {
		const counts = (c: Course, i: number): boolean => {
			if (isTranscriptOnly(c.code)) return false;
			const prog = this.programmes[i];
			if (prog.subject === 'open') return !isCore(c.code);
			const s = this.programmeSets[i];
			// is the course named in this programme's scraped required / choice /
			// elective lists for the exact variant?
			const inLists = c.codes.some((x) => s.requiredAll.has(x) || s.pick.has(x) || s.elective.has(x));
			// a minor counts ONLY the courses its scraped structure names, not
			// every course in the department, so cross-listed or extra
			// department courses don't inflate its credits
			if (prog.role === 'minor') return inLists;
			return c.subjects.includes(prog.subject) || inLists;
		};
		// …unless /admin has set the course (or the whole site) to share its
		// credits: then it counts toward EVERY declared programme it satisfies.
		// The open minor still only takes what no declared programme did.
		//
		// A course counted once goes where it is needed: first to a programme
		// that requires it (or has it in a 'choose N' pool), then to the first
		// that still has credits to fill, and only when every one is full to the
		// first that takes it, so a cross-listed elective doesn't vanish into
		// a major that is already complete while the minor still needs it.
		const claimedBy = new Map<string, number[]>();
		const room = this.programmes.map((prog) =>
			creditsFor(prog.subject, prog.role, this.fourYear, this.isDouble, this.batchStartYear)
		);
		const requires = (c: Course, i: number) => {
			const sets = this.programmeSets[i];
			return c.codes.some((x) => sets.requiredAll.has(x) || sets.pick.has(x));
		};
		const claim = (c: Course, i: number) => {
			claimedBy.set(c.code, [...(claimedBy.get(c.code) ?? []), i]);
			room[i] -= c.credits;
		};
		const courses = this.placed.map((p) => byCode(p.code));
		// required courses first, so an elective never takes a programme's room
		// from the course it actually demands; then the courses only one
		// programme takes, so a cross-listed one that could count for either
		// fills whichever still has room
		const takersOf = (c: Course) => this.programmes.filter((prog, i) => prog.subject !== 'open' && counts(c, i)).length;
		const ordered = [
			...courses.filter((c) => this.programmes.some((_, i) => requires(c, i))),
			...courses
				.filter((c) => !this.programmes.some((_, i) => requires(c, i)))
				.sort((a, b) => takersOf(a) - takersOf(b))
		];
		for (const c of ordered) {
			const takers = this.programmes.map((_, i) => i).filter((i) => counts(c, i));
			const declared = takers.filter((i) => this.programmes[i].subject !== 'open');
			if ((c.share ?? CREDIT_SHARE_DEFAULT) === 'all' && declared.length) {
				for (const i of declared) claim(c, i);
				continue;
			}
			const pick =
				declared.find((i) => requires(c, i)) ??
				declared.find((i) => room[i] > 0) ??
				takers.find((i) => this.programmes[i].subject === 'open' && room[i] > 0) ??
				declared[0] ??
				takers[0];
			if (pick !== undefined) claim(c, pick);
		}
		return claimedBy;
	});

	// ── programme stats for the hints panel ──
	stats: ProgrammeStat[] = $derived.by(() => {
		const claimedBy = this.claims;
		return this.programmes.map((prog, i) => {
			const total = creditsFor(prog.subject, prog.role, this.fourYear, this.isDouble, this.batchStartYear);
			const sets = this.programmeSets[i];
			// only the courses this programme has claimed (see above)
			const mine = this.placed.filter((p) => claimedBy.get(p.code)?.includes(i)).map((p) => byCode(p.code));
			const placedCredits = mine.reduce((s, c) => s + c.credits, 0);
			// the open minor has no course list of its own, its claimed courses
			// are whatever isn't foundation core and no declared programme took
			if (prog.subject === 'open') {
				return {
					role: prog.role,
					subject: prog.subject,
					label: 'open minor',
					totalCredits: total,
					creditsLeft: Math.max(0, total - placedCredits),
					requiredDone: 0,
					requiredNeeded: 0,
					electiveDone: Math.min(total, placedCredits),
					electiveNeeded: total,
					requiredLeft: []
				};
			}
			// everything that satisfies the required structure, the fixed
			// core closed over prereqs (incl. a cross-department prereq that
			// fills the credit budget, like BIOS201 for env studies) plus the
			// choice pools. requiredAll (not required) so those support courses
			// still count toward the degree's required credits.
			const structure = new Set([...sets.requiredAll, ...sets.pick]);
			// what the degree *demands* comes from the site's own credit table
			// when stated, the course list overstates it when it's choice
			// pools (history: pick 3 of 5 methodology courses)
			const requiredNeeded =
				requiredCreditsFor(prog.subject, prog.role, this.fourYear, this.isDouble, this.batchStartYear) ??
				creditsOfCodes(requiredSetFor(prog.subject, prog.role, this.fourYear, this.isDouble, this.batchStartYear));
			const requiredDone = Math.min(
				requiredNeeded,
				mine.filter((c) => c.codes.some((x) => structure.has(x))).reduce((s, c) => s + c.credits, 0)
			);
			return {
				role: prog.role,
				subject: prog.subject,
				label: subjectById(prog.subject).label,
				totalCredits: total,
				creditsLeft: Math.max(0, total - placedCredits),
				requiredDone,
				requiredNeeded,
				electiveDone: Math.min(Math.max(0, total - requiredNeeded), Math.max(0, placedCredits - requiredDone)),
				electiveNeeded: Math.max(0, total - requiredNeeded),
				requiredLeft: this.requiredLeftFor(i)
			};
		});
	});

	// ── choice pools per programme (history's "any three of…" groups) ──
	// the website's 'choose N from' groups the seeded required core can't make
	// for the student, shown in the sidebar so the choices are visible
	// Each pool also says what its picks count toward, the programme's
	// required credits (most pools), its electives, or either (literature's
	// "from the required courses … and the elective courses"), and how many
	// of it the plan already holds.
	choices = $derived.by(() =>
		this.programmes
			.map((prog, i) => {
				const sets = this.programmeSets[i];
				const countsAs = (code: string | null): 'required' | 'elective' | null => {
					if (!code || !hasCode(code)) return null;
					const codes = byCode(code).codes;
					if (codes.some((x) => sets.requiredAll.has(x) || sets.pick.has(x))) return 'required';
					if (codes.some((x) => sets.elective.has(x))) return 'elective';
					return null;
				};
				const groups = choiceGroupsFor(prog.subject, prog.role, this.fourYear, this.isDouble, this.batchStartYear).map(
					(group) => {
						const kinds = new Set(group.courses.map((c) => countsAs(c.code)).filter((k) => k !== null));
						if (/elective/i.test(group.rule)) kinds.add('elective');
						const counts =
							kinds.has('elective') && kinds.has('required')
								? 'required or elective'
								: kinds.has('elective')
									? 'elective'
									: 'required'; // a pick pool fills required credits unless shown otherwise
						// how many of the pool are already on the plan, or satisfied by an
						// interchangeable course
						const placed = (code: string) =>
							this.placedCodes.has(code) || satisfiedBy(code).some((sub) => this.placedCodes.has(sub));
						const chosen = group.courses.filter((c) => c.code && hasCode(c.code) && placed(byCode(c.code).code)).length;
						return { ...group, rule: group.rule.replace(/[\s:.]+$/, ''), counts, chosen };
					}
				);
				return { role: prog.role, label: subjectById(prog.subject).label, groups };
			})
			.filter((p) => p.groups.length)
	);

	// ── catalogue (filtered + sorted) ──
	catalogueSubject = $state('');
	catalogue: Course[] = $derived(
		selectCatalogue({
			search: this.search,
			filters: this.filters,
			selectedSubjects: this.selectedSubjects,
			subject: this.catalogueSubject,
			trim: this.zoom?.trim,
			reveal: this.catalogueReveal?.code,
			courseType: (code) => this.courseType(code)
		})
	);
}

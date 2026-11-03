// what the board's parts share beyond the plan itself: which view layer is
// up and what it's showing, and which board windows are open. one instance
// per board, handed down by context so the bar, the strip and the grid stay
// in step without threading props through every cell and chip.
import { createContext } from 'svelte';
import { planEnd, prereqChain, whatIfVerdict } from '$lib/planner/boardViews';
import { slotOrder } from '$lib/planner/calendar';
import type { BoardView, Plan } from '$lib/planner/plan.svelte';
import type { TrimNum } from '$lib/types';
import { GridDrag } from './grid/drag.svelte';

const GRADE_HINT_KEY = 'kcal-grade-hint-seen';

export class BoardState {
	readonly plan: Plan;
	readonly drag: GridDrag;

	/** prerequisites view: the course whose chain is drawn */
	chainRoot = $state<string | null>(null);
	creditsOpen = $state(false);
	/** the grades window; a year's GPA capsule opens it on just that year */
	grades = $state<{ open: boolean; year?: number }>({ open: false });
	/** grade view changes what the whole board means, so its first visit says so */
	gradeHint = $state(false);
	/** a year added just now drops into place; the ones already there don't */
	freshYear = $state<number | null>(null);

	chain = $derived.by(() => {
		const { plan, chainRoot } = this;
		return plan.view === 'prereqs' && chainRoot && plan.placedCodes.has(chainRoot)
			? prereqChain(plan, chainRoot)
			: null;
	});
	verdict = $derived.by(() => (this.plan.view === 'whatif' && this.plan.whatIf ? whatIfVerdict(this.plan) : null));
	// a break, a suspension or a retake can push graduation past the degree's
	// own last year
	gradYear = $derived.by(() => Math.max(this.plan.minYears, planEnd(this.plan).end?.year ?? this.plan.minYears));
	hereAt = $derived.by(() => slotOrder(this.plan.here.year, this.plan.here.trim));

	constructor(plan: Plan) {
		this.plan = plan;
		this.drag = new GridDrag(plan);
	}

	setView(view: BoardView) {
		const plan = this.plan;
		plan.view = view;
		// what-if starts from the plan as it is, every time
		if (view === 'whatif') plan.startWhatIf();
		// prerequisites opens on the course already open, if it's on the grid
		this.chainRoot =
			view === 'prereqs' && plan.selected && plan.placedCodes.has(plan.selected.code) ? plan.selected.code : null;
		this.gradeHint = view === 'grades' && !seen(GRADE_HINT_KEY);
	}

	dismissGradeHint() {
		this.gradeHint = false;
		remember(GRADE_HINT_KEY);
	}

	openGrades(year?: number) {
		this.grades = { open: true, year };
	}

	/** what-if: the courses the tried degree still needs, drawn where they'd fit */
	neededIn(year: number, trim: TrimNum) {
		return this.verdict?.needed.filter((n) => n.at?.year === year && n.at.trim === trim) ?? [];
	}

	addYear() {
		this.plan.addYear();
		this.freshYear = this.plan.years.length;
	}
}

export const [useBoard, provideBoard] = createContext<BoardState>();

function seen(key: string) {
	try {
		return !!localStorage.getItem(key);
	} catch {
		return false;
	}
}

function remember(key: string) {
	try {
		localStorage.setItem(key, '1');
	} catch {
		// the hint just shows again next visit
	}
}

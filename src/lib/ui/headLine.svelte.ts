// whether the small line under each board heading shows: the months under
// t1 t2 t3, the academic year under y1 y2. one click on any of them hides or
// shows them all. a per-viewer preference, so it lives in this browser only,
// not in the plan.
const KEY = 'kcal.headLine';

class HeadLine {
	// the server can't see the saved choice, so every page starts shown and
	// restore() swaps the saved one in once the page has hydrated
	shown = $state(true);
	#restored = false;

	restore() {
		if (this.#restored) return;
		this.#restored = true;
		try {
			this.shown = localStorage.getItem(KEY) !== 'hidden';
		} catch {
			// storage blocked → shown
		}
	}

	toggle() {
		this.shown = !this.shown;
		try {
			localStorage.setItem(KEY, this.shown ? 'shown' : 'hidden');
		} catch {
			// not remembered, still switched
		}
	}
}

export const headLine = new HeadLine();

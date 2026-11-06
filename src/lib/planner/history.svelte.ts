// undo and redo over whole planning states, kept as strings, so one step puts
// back exactly what was there however many courses it moved.
const LIMIT = 100;

export class PlanHistory {
	canUndo = $state(false);
	canRedo = $state(false);
	#past: string[] = [];
	#future: string[] = [];
	#present = '';
	#travelling = false;
	#recording = false;

	/** after every change: a new state pushes the last one */
	record(state: string) {
		// the change an undo/redo itself made is never a new step
		const travelled = this.#travelling;
		this.#travelling = false;
		if (state === this.#present) return;
		if (this.#recording && !travelled && this.#present) {
			this.#past.push(this.#present);
			if (this.#past.length > LIMIT) this.#past.shift();
			this.#future = [];
		}
		this.#present = state;
		this.#sync();
	}

	/** start recording once the page is up: the restore and first-render
	 *  normalisation of a saved plan aren't steps anyone could undo */
	start(state: string) {
		this.#present = state;
		this.#past = [];
		this.#future = [];
		this.#recording = true;
		this.#sync();
	}

	/** the state to go back to, if any */
	undo(): string | undefined {
		const previous = this.#past.pop();
		if (previous === undefined) return undefined;
		this.#future.push(this.#present);
		return this.#arrive(previous);
	}

	/** the state to go forward to, if any */
	redo(): string | undefined {
		const next = this.#future.pop();
		if (next === undefined) return undefined;
		this.#past.push(this.#present);
		return this.#arrive(next);
	}

	#arrive(state: string) {
		this.#travelling = true;
		this.#present = state;
		this.#sync();
		return state;
	}

	#sync() {
		this.canUndo = this.#past.length > 0;
		this.canRedo = this.#future.length > 0;
	}
}

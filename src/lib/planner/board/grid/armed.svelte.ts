// a destructive button that asks twice: the first press arms it and says
// what will happen, a second within a few seconds does it. used where a slip
// would throw away work (emptying the grid, dropping a year with courses).
const DISARM_MS = 3500;

export function armed(action: () => void) {
	let on = $state(false);
	let timer: ReturnType<typeof setTimeout>;
	return {
		get armed() {
			return on;
		},
		press() {
			clearTimeout(timer);
			if (on) {
				on = false;
				action();
				return;
			}
			on = true;
			timer = setTimeout(() => (on = false), DISARM_MS);
		}
	};
}

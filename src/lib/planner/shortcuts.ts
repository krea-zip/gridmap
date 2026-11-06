// The planner's keyboard: Esc puts the sidebar away; ⌘Z / Ctrl+Z undoes a
// planning step and ⇧⌘Z / Ctrl+Y redoes it, except while typing in a field,
// where the browser's own undo belongs.
import type { Plan } from './plan.svelte';

export function plannerKeys(plan: Plan) {
	return (e: KeyboardEvent) => {
		if (e.key === 'Escape' && plan.railOpen) plan.railOpen = false;
		if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
		if ((e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]')) return;
		const key = e.key.toLowerCase();
		if (key === 'z' && !e.shiftKey) {
			e.preventDefault();
			plan.undo();
		} else if ((key === 'z' && e.shiftKey) || key === 'y') {
			e.preventDefault();
			plan.redo();
		}
	};
}

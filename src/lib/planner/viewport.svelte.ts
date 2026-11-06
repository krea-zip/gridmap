// Which planner layout the window calls for. Keep the queries in
// $lib/ui/layout aligned with the responsive mixins in styles/_mixins.scss.
import { MediaQuery } from 'svelte/reactivity';
import { COMPACT_LAYOUT_QUERY, RAIL_OVERLAY_QUERY } from '$lib/ui/layout';

class Viewport {
	#phone = new MediaQuery(COMPACT_LAYOUT_QUERY, false);
	#railOverlay = new MediaQuery(RAIL_OVERLAY_QUERY, false);

	/** the column layout (laptops and tablets), not the phone's tabs */
	get desktop() {
		return !this.#phone.current;
	}
	/** the sidebar folds to a strip and slides in from the left */
	get railSlide() {
		return this.desktop && this.#railOverlay.current;
	}
}

export const viewport = new Viewport();

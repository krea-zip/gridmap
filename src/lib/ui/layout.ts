// Keep these queries aligned with the responsive mixins in styles/_mixins.scss.

/** phones: one panel at a time, behind tabs */
export const COMPACT_LAYOUT_QUERY = '(max-width: 767px)';

/** Tablets and laptops under 1500px keep the desktop columns, but the course
 *  details slide in over the board instead of taking a column, which would
 *  leave the board too narrow for a trimester's courses side by side. */
export const DETAILS_OVERLAY_QUERY = '(max-width: 1499px)';

/** narrower still (an iPad held upright), the sidebar slides in from the left too */
export const RAIL_OVERLAY_QUERY = '(max-width: 1099px)';

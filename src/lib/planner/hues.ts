// a programme's colour is its subject's hue, the same on every plan. but
// several subjects sit close together on the wheel (chemistry and computer
// science, biology and economics, physics and data science), so on a plan
// that has two of them they read as one. here the later programme moves to
// the nearest hue that stands clear of the others; a plan without a clash
// keeps every subject's own colour.

/** degrees two programmes' hues must be apart to read as different */
export const MIN_GAP = 40;
// the palette's own arc (115° to 340°): past it lie the yellows that read
// as khaki at kcal's chip lightness, and the KCCS blush
const ARC = [112, 345];

const gap = (a: number, b: number) => {
	const d = Math.abs(a - b) % 360;
	return Math.min(d, 360 - d);
};
const wrap = (h: number) => ((h % 360) + 360) % 360;

/** each subject's hue on this plan, in the order its programmes are listed */
export function distinctHues(subjects: string[], hueOf: (subject: string) => number | undefined): Map<string, number> {
	const out = new Map<string, number>();
	for (const subject of subjects) {
		const base = hueOf(subject);
		if (base === undefined || out.has(subject)) continue;
		const taken = [...out.values()];
		const spread = (h: number) => Math.min(360, ...taken.map((t) => gap(h, t)));
		let best = base;
		// nearest first, alternating either side of the subject's own hue
		for (let step = 0; step <= 180 && spread(best) < MIN_GAP; step += 5)
			for (const h of [wrap(base + step), wrap(base - step)]) {
				if (step && (h < ARC[0] || h > ARC[1])) continue;
				if (spread(h) > spread(best)) best = h;
				if (spread(best) >= MIN_GAP) break;
			}
		out.set(subject, best);
	}
	return out;
}

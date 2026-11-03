// newest first. add an entry here with each release, one plain line each
export type Update = { date: string; text: string };

export const updates: Update[] = [
	{
		date: '3 nov 2026',
		text: 'course text now follows each hue, programmes get distinct colours, and there is a colours page'
	},
	{ date: '2 nov 2026', text: 'the welcome questions start empty and fill in as you answer' },
	{ date: '1 nov 2026', text: 'the academic office pages now edit one shared draft' }
];

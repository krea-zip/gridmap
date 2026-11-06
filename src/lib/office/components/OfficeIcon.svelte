<script lang="ts">
	let { name, size = 20 }: { name: string; size?: number } = $props();
	const paths: Record<string, string> = {
		home: 'M3 10 12 3l9 7v11h-7v-7h-4v7H3Z',
		book: 'M12 5C8 2 5 3 3 4v16c3-2 6-2 9 0 3-2 6-2 9 0V4c-2-1-5-2-9 1Zm0 0v15',
		calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2-3v6m10-6v6M3 11h18',
		people:
			'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 0a4 4 0 0 1 0 8',
		grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
		degree: 'm2 9 10-5 10 5-10 5Zm4 2v6c4 3 8 3 12 0v-6m4-2v8',
		layers: 'm3 7 9-4 9 4-9 4Zm0 5 9 4 9-4M3 17l9 4 9-4',
		sliders: 'M4 3v7m0 4v7M12 3v13m0 4v1M20 3v1m0 4v13M1 10h6m2 6h6m2-12h6',
		link: 'm10 13 4-4m-5 7-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 0 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
		branch: 'M6 3v12a4 4 0 0 0 4 4h8M6 7h12m-3-3 3 3-3 3m0 6 3 3-3 3',
		publish: 'm5 12 4 4L19 6M3 3h18v18H3',
		upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
		globe: 'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z',
		settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6',
		history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l4 2',
		search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
		arrow: 'M5 12h14m-5-5 5 5-5 5',
		menu: 'M4 6h16M4 12h16M4 18h16',
		close: 'm6 6 12 12M6 18 18 6',
		check: 'm5 12 4 4L19 6',
		warning: 'm12 3 10 18H2Zm0 5v5m0 4v1',
		external: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.65"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"><path d={paths[name] ?? paths.grid} /></svg
>

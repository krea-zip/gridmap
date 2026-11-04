import { test, expect, type Page } from '@playwright/test';

const sample = {
	version: 1,
	touched: true,
	showCodes: true,
	showTitles: true,
	structure: 'major-minor',
	picks: { major1: 'computer science', minor: 'mathematics' },
	filters: ['mathematics'],
	placements: {
		'1-1': ['KCCS102', 'KCCS101', 'KCCS103'],
		'1-2': ['KCCS122', 'KCCS123', 'KCCS124', 'KCCS131'],
		'1-3': ['KCCS132', 'KCCS133', 'KCCS134'],
		'2-1': ['MATH230', 'COMP204', 'COMP201'],
		'2-3': ['COMP217', 'MATH203'],
		'3-2': ['KCCS190', 'COMP205', 'COMP312', 'COMP313'],
		'3-3': ['KCCS121', 'COMP321', 'COMP308'],
		'4-2': ['MATH202']
	}
};

test.beforeEach(async ({ page }) => {
	await page.addInitScript((plan) => {
		localStorage.setItem('kcal-intro-seen', '1');
		if (!localStorage.getItem('kcal-plan')) localStorage.setItem('kcal-plan', JSON.stringify(plan));
	}, sample);
});

async function ready(page: Page) {
	await page.goto('/');
	await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
	await page.evaluate(() => document.fonts.ready);
}

async function settledScreenshot(page: Page, path: string) {
	await page.evaluate(async () => {
		await Promise.all(
			document
				.getAnimations()
				.filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
				.map((animation) => animation.finished.catch(() => {}))
		);
	});
	await page.screenshot({ path });
}

test('wide grid, compact catalogue, and selecting a planned course', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.setViewportSize({ width: 1920, height: 1080 });
	await ready(page);
	const measures = await page.evaluate(() => {
		const grid = document.querySelector('.overview')!;
		const bounds = grid.getBoundingClientRect();
		const css = getComputedStyle(grid);
		return {
			width: bounds.width - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight),
			catalogue: document.querySelector('[data-panel="catalogue"]')!.getBoundingClientRect().width
		};
	});
	expect(measures.width).toBeLessThan(1200);
	expect(measures.catalogue).toBeGreaterThan(300);
	await settledScreenshot(page, '/tmp/kcal-ui-desktop.png');

	await page.getByRole('searchbox').fill('MATH202');
	const card = page.locator('[data-course="MATH202"] .card.placed');
	expect((await card.boundingBox())!.height).toBeLessThan(65);
	await card.locator('.placed-open').click();
	const selected = page.locator('.overview .chip[data-code="MATH202"]');
	await expect(selected).toHaveClass(/selected/);
	await expect(selected).not.toHaveClass(/faded/);
	await expect(page.locator('.overview .chip[data-code="COMP204"]')).toHaveClass(/faded/);
	await expect(selected).toBeInViewport();
	await expect(page.locator('[data-panel="details"] .d-code')).toHaveText('MATH202');
	await card.locator('.placed-open').click();
	await expect(page.locator('[data-panel="details"]')).toBeVisible();
	await expect(selected).not.toHaveClass(/faded/);
	await page.getByRole('button', { name: 'close course details' }).click();
	await expect(page.locator('.overview .chip.faded')).toHaveCount(0);
	await page.getByRole('searchbox').fill('MATH061');
	await expect(page.locator('.catalogue .card .title')).toBeVisible();
	expect((await page.locator('.catalogue .card').boundingBox())!.width).toBeGreaterThan(250);
	expect(errors).toEqual([]);
});

test('details pin persists, makes room, and falls back on smaller screens', async ({ page }) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	await ready(page);
	await page.locator('.chip[data-code="MATH203"] .open').click();
	await page.getByRole('button', { name: 'pin course details', exact: true }).click();
	await expect(page.locator('.app')).toHaveClass(/details-docked/);
	const board = await page.locator('.board').boundingBox();
	const details = await page.locator('[data-panel="details"]').boundingBox();
	expect(board!.x + board!.width).toBeLessThanOrEqual(details!.x + 1);
	// The board and catalogue remain interactive while the panel is pinned.
	await page.getByRole('searchbox').fill('MATH201');
	await page.locator('[data-course="MATH201"] button.card').click();
	await page.getByLabel('trimester to put MATH201 in').selectOption('2-2');
	await page.getByRole('button', { name: 'add to plan', exact: true }).click();
	await expect(page.locator('.chip[data-code="MATH201"]')).toBeVisible();
	await settledScreenshot(page, '/tmp/kcal-ui-pinned.png');
	await page.reload();
	await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
	await page.locator('.chip[data-code="MATH201"] .open').click();
	await expect(page.locator('.app')).toHaveClass(/details-docked/);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await expect(page.locator('.app')).not.toHaveClass(/details-docked/);
	await expect(page.locator('[data-panel="details"]')).toBeVisible();
	await expect(page.getByRole('button', { name: 'pin course details', exact: true })).toHaveCount(0);
	await page.setViewportSize({ width: 1920, height: 1080 });
	await expect(page.locator('.app')).toHaveClass(/details-docked/);
	await page.getByRole('button', { name: 'unpin course details', exact: true }).click();
	await expect(page.locator('.app')).not.toHaveClass(/details-docked/);
	await page.keyboard.press('Escape');
	await expect(page.locator('[data-panel="details"]')).not.toBeVisible();
});

test('resizing the catalogue preserves room for the board and drag placement', async ({ page }) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	await ready(page);
	await page.locator('.chip[data-code="MATH203"] .open').click();
	await page.getByRole('button', { name: 'pin course details', exact: true }).click();
	const splitter = page.getByRole('separator', { name: 'resize the catalogue' });
	await splitter.focus();
	for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
	await expect(page.locator('.app')).not.toHaveClass(/details-docked/);
	await expect(page.locator('[data-panel="details"]')).toBeVisible();
	await page.getByRole('button', { name: 'close course details' }).click();
	await splitter.dblclick();
	await page.getByRole('searchbox').fill('MATH201');
	await page
		.locator('[data-course="MATH201"] button.card')
		.dragTo(page.locator('.overview .cell[data-year="2"][data-trim="2"]'));
	await expect(page.locator('.overview .cell[data-year="2"][data-trim="2"] .chip[data-code="MATH201"]')).toBeVisible();
});

test('display disclosure and plan menu preserve labels, highlights and undo', async ({ page }) => {
	await ready(page);
	const display = page.getByRole('button', { name: 'display' });
	await expect(page.getByRole('button', { name: 'titles', exact: true })).toHaveCount(0);
	await display.click();
	await page.getByRole('button', { name: 'titles', exact: true }).click();
	await expect(page.locator('.overview .chip.titled')).toHaveCount(0);
	await page.getByRole('button', { name: 'titles', exact: true }).click();
	await page.getByRole('button', { name: 'required (filled)', exact: true }).click();
	await expect(page.locator('.overview .chip[data-code="KCCS101"]')).toHaveClass(/faded/);
	await page.keyboard.press('Escape');
	await expect(display).toBeFocused();
	await expect(page.locator('#colour-key')).toHaveCount(0);
	await expect(page.locator('.overview .chip.faded')).toHaveCount(0);
});

test('issue headings highlight courses, with advisories folded underneath', async ({ page }) => {
	await ready(page);
	const advisories = page.getByRole('button', { name: /^advisories/ });
	await expect(advisories).toHaveAttribute('aria-expanded', 'false');
	await expect(page.locator('#hint-advisories')).toHaveCount(0);
	const heading = page.getByRole('button', { name: /prerequisites first/ });
	await heading.click();
	await expect(heading).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator('.overview .chip[data-code="COMP313"]')).not.toHaveClass(/faded/);
	await expect(page.locator('.overview .chip[data-code="KCCS101"]')).toHaveClass(/faded/);
	await heading.click();
	await expect(page.locator('.overview .chip.faded')).toHaveCount(0);
	await advisories.click();
	await expect(page.locator('#hint-advisories')).toBeVisible();
});

for (const width of [320, 390, 767, 820, 1180, 1440, 1920]) {
	test(`panels and display menu fit at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 1000 });
		if (width === 1920)
			await page.addInitScript(() => {
				localStorage.setItem('kcal-settings', JSON.stringify({ theme: 'dark', textSize: 'huge' }));
			});
		await ready(page);
		if (width < 768) await page.getByRole('navigation').getByRole('button', { name: 'your plan', exact: true }).click();
		await page.getByRole('button', { name: 'display' }).click();
		const pop = await page.locator('#colour-key').boundingBox();
		expect(pop!.x).toBeGreaterThanOrEqual(0);
		expect(pop!.x + pop!.width).toBeLessThanOrEqual(width + 1);
		await page.keyboard.press('Escape');
		const overflow = await page.evaluate(() =>
			[document.documentElement, ...document.querySelectorAll<HTMLElement>('.rail, .board, [data-panel="catalogue"]')]
				.filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
				.map((el) => ({ name: el.className, overflow: el.scrollWidth - el.clientWidth }))
		);
		for (const panel of overflow) expect(panel.overflow, panel.name).toBeLessThanOrEqual(1);
		if ([390, 1440, 1920].includes(width)) await settledScreenshot(page, `/tmp/kcal-ui-${width}.png`);
	});
}

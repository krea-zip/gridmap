import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('kcal-intro-seen', '1');
		localStorage.setItem('kcal-plan', JSON.stringify({ version: 1, placements: {}, touched: true }));
	});
});

test('desktop degree changes and course details stay usable', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
	const toggle = page.getByRole('button', { name: '4yup' });
	const before = await toggle.getAttribute('aria-pressed');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
	await page.getByRole('searchbox').fill('MATH201');
	await page.locator('[data-course="MATH201"] button.card').click();
	const details = page.locator('[data-panel="details"]');
	await expect(details.getByRole('heading', { name: 'your plan' })).toBeVisible();
	await details.getByRole('button', { name: /offered/ }).click();
	await expect(details.locator('#d-runs')).toBeVisible();
	await page.screenshot({ path: '/tmp/kcal-desktop-polish.png' });
});

test('the catalogue sort row stays clear and trimester backgrounds stay neutral', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
	await page.getByRole('searchbox').fill('MATH201');
	await expect(page.locator('.result-count')).toContainText('1/');
	await expect(page.getByRole('combobox', { name: 'sort courses' })).toBeVisible();
	const backgrounds = await page
		.locator('.overview .cell')
		.evaluateAll((cells) => cells.map((cell) => getComputedStyle(cell).backgroundColor));
	expect(new Set(backgrounds).size).toBe(1);
	await page.locator('[data-course="MATH201"] button.card').click();
	await page.getByLabel('trimester to put MATH201 in').selectOption('2-1');
	await page.getByRole('button', { name: 'add to plan', exact: true }).click();
	const after = await page
		.locator('.overview .cell')
		.evaluateAll((cells) => cells.map((cell) => getComputedStyle(cell).backgroundColor));
	expect(new Set(after).size).toBe(1);
});

test('changed readouts animate briefly and respect reduced motion', async ({ page }) => {
	await page.addInitScript(() => {
		const animate = Element.prototype.animate;
		(window as typeof window & { softAnimations: number }).softAnimations = 0;
		Element.prototype.animate = function (...args) {
			if (this.matches('.d-head, .d-meta, .result-count'))
				(window as typeof window & { softAnimations: number }).softAnimations++;
			return animate.apply(this, args);
		};
	});
	await page.goto('/');
	await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
	await page.getByRole('searchbox').fill('MATH201');
	await expect
		.poll(() => page.evaluate(() => (window as typeof window & { softAnimations: number }).softAnimations))
		.toBeGreaterThan(0);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.waitForTimeout(200);
	const before = await page.evaluate(() => (window as typeof window & { softAnimations: number }).softAnimations);
	await page.getByRole('searchbox').fill('no-such-course');
	await expect(page.locator('.result-count')).toContainText('0/');
	await page.waitForTimeout(200);
	expect(await page.evaluate(() => (window as typeof window & { softAnimations: number }).softAnimations)).toBe(before);
});

test('the board and settings use the same selected control colour', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
	await page.getByRole('button', { name: 'display', exact: true }).click();
	const board = page.locator('#colour-key .keys button.active').first();
	await expect(board).toBeVisible();
	const boardColour = await board.evaluate((element) => getComputedStyle(element).backgroundColor);
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'settings', exact: true }).click();
	const settings = page.getByRole('dialog', { name: 'settings' });
	const settingsColour = await settings
		.locator('.seg button.active')
		.first()
		.evaluate((element) => getComputedStyle(element).backgroundColor);
	expect(settingsColour).toBe(boardColour);
	await settings.getByRole('button', { name: 'dark', exact: true }).click();
	await expect(settings.locator('.seg button.active').first()).toHaveCSS('background-color', 'rgb(199, 143, 174)');
	const darkSettings = await settings
		.locator('.seg button.active')
		.first()
		.evaluate((element) => getComputedStyle(element).backgroundColor);
	await settings.getByRole('button', { name: 'close', exact: true }).click();
	await page.getByRole('button', { name: 'display', exact: true }).click();
	const darkBoard = await page
		.locator('#colour-key .keys button.active')
		.first()
		.evaluate((element) => getComputedStyle(element).backgroundColor);
	expect(darkBoard).toBe(darkSettings);
});

test('changing board views reveals and dismisses the view description', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
	await page.getByRole('button', { name: /view: plan/ }).click();
	await page.getByRole('radio', { name: /will it run/ }).click();
	await expect(page.getByRole('region', { name: 'will it run? view' })).toBeVisible();
	await page.getByRole('button', { name: /view: will it run/ }).click();
	await page.getByRole('radio', { name: /plan arrange your courses/ }).click();
	await expect(page.getByRole('region', { name: 'will it run? view' })).toHaveCount(0);
});

test('desktop guide labels avoid each other and year headings', async ({ page }) => {
	await page.setViewportSize({ width: 1366, height: 768 });
	await page.goto('/');
	await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
	await page.getByRole('button', { name: "what's what" }).click();
	await expect(page.locator('.note').first()).toBeVisible();
	await page.waitForTimeout(400);
	const collisions = await page.evaluate(() => {
		const boxes = (selector: string) =>
			[...document.querySelectorAll(selector)]
				.map((el) => el.getBoundingClientRect())
				.filter((r) => r.right > 0 && r.bottom > 0);
		const notes = boxes('.note');
		const years = boxes('.overview .year-head');
		const overlaps = (a: DOMRect, b: DOMRect) =>
			a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
		return notes.some((a, i) => notes.slice(i + 1).some((b) => overlaps(a, b)) || years.some((b) => overlaps(a, b)));
	});
	expect(collisions).toBe(false);
});

test('public pages show clean faculty and batch labels', async ({ page }) => {
	await page.goto('/lecturers');
	await expect(page.locator('body')).not.toContainText('&amp;');
	await page.goto('/programmes');
	await expect(page.locator('body')).not.toContainText(/(\d{4})–\1 batches/);
});

for (const [width, height] of [
	[1280, 720],
	[1366, 768],
	[1536, 864]
]) {
	test(`planner panels fit a ${width} × ${height} laptop viewport`, async ({ page }) => {
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
		const overflow = await page
			.locator('.rail, .board, [data-panel="catalogue"]')
			.evaluateAll((panels) => panels.map((panel) => panel.scrollWidth - panel.clientWidth));
		for (const amount of overflow) expect(amount).toBeLessThanOrEqual(1);
		await page.getByRole('button', { name: 'display' }).click();
		const menu = await page.locator('#colour-key').boundingBox();
		expect(menu!.x).toBeGreaterThanOrEqual(0);
		expect(menu!.x + menu!.width).toBeLessThanOrEqual(width + 1);
	});
}

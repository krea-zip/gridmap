import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page, major = 'chemistry', minor: string | null = 'computer science', batch = 2023) {
	await page.goto('/');
	const dialog = page.getByRole('dialog', { name: 'welcome to kcal' });
	await expect(dialog.locator('[data-next]')).toBeDisabled();
	await dialog.getByRole('button', { name: String(batch), exact: true }).click();
	await dialog.locator('[data-next]').click();
	await expect(dialog.locator('.slot')).toHaveCount(1);
	await dialog.locator('.pill', { hasText: major }).click();
	await expect(dialog.locator('[data-next]')).toBeEnabled();
	await expect(dialog.locator('.slot.active')).toContainText(major);
	await expect(dialog.getByRole('button', { name: '+ second major', exact: true })).toBeVisible();
	if (minor) {
		await dialog.getByRole('button', { name: '+ minor', exact: true }).click();
		await expect(dialog.locator('[data-next]')).toBeDisabled();
		await dialog.locator('.pill', { hasText: minor }).click();
	}
	await dialog.locator('[data-next]').click();
	await expect(dialog.locator('.suggestion-grid .cell')).toHaveCount(12);
	return dialog;
}

test('start with one major and add another programme only when requested', async ({ page }) => {
	await page.goto('/');
	const dialog = page.getByRole('dialog', { name: 'welcome to kcal' });
	await dialog.getByRole('button', { name: '2023', exact: true }).click();
	await dialog.getByRole('button', { name: 'next', exact: true }).click();
	await expect(dialog.locator('.slot')).toHaveCount(1);
	await expect(dialog.locator('.add')).toHaveCount(0);
	await dialog.locator('.pill', { hasText: 'computer science' }).click();
	const continueButton = dialog.getByRole('button', { name: 'see my suggested plan' });
	await expect(continueButton).toBeEnabled();
	await expect(dialog.locator('.add')).toHaveText(['+ minor', '+ concentration', '+ second major']);
	await dialog.getByRole('button', { name: '+ second major', exact: true }).click();
	await expect(dialog.locator('.slot')).toHaveCount(2);
	await expect(dialog.locator('.slot.active')).toContainText('second major');
	await expect(continueButton).toBeDisabled();
	await dialog.locator('.pill', { hasText: 'mathematics' }).click();
	await expect(continueButton).toBeEnabled();
	await expect(dialog.locator('.slot.active')).toContainText('mathematics');
	await dialog.screenshot({ path: test.info().outputPath('second-major.png') });
	await dialog.getByRole('button', { name: 'no second major', exact: true }).click();
	await dialog.getByRole('button', { name: '+ concentration', exact: true }).click();
	await expect(continueButton).toBeDisabled();
	await dialog.locator('.pill', { hasText: 'chemistry' }).click();
	await expect(continueButton).toBeEnabled();
	await dialog.getByRole('button', { name: 'no concentration', exact: true }).click();
	await expect(dialog.locator('.slot')).toHaveCount(1);
	await expect(dialog.locator('.slot')).toContainText('computer science');
	await dialog.screenshot({ path: test.info().outputPath('first-major.png') });
	await continueButton.click();
	await expect(dialog.getByRole('heading', { name: 'your suggested plan' })).toBeVisible();
});

test('miniature components respond to actions and preserve the real suggested plan', async ({ page }) => {
	test.setTimeout(120_000);
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	const dialog = await setup(page);
	const original = await page.evaluate(() => JSON.parse(localStorage.getItem('kcal-plan')!).placements);
	await expect(dialog.locator('.suggestion-grid .head, .suggestion-grid .year')).toHaveCount(0);
	await dialog.screenshot({ path: test.info().outputPath('suggested-grid.png') });
	await dialog.locator('[data-next]').click();
	const component = dialog.getByRole('combobox', { name: 'demo component' });
	await expect(component).toHaveValue('progress');
	await expect(dialog.locator('.gentle, .tip, .lesson-lead')).toHaveCount(0);
	const before = await dialog.locator('[data-total]').innerText();
	await dialog.getByRole('button', { name: 'add example course' }).click();
	await expect(dialog.locator('[data-total]')).not.toHaveText(before);
	await dialog.locator('.programme').first().click();
	await expect(dialog.locator('.breakdown')).toBeVisible();
	await dialog.screenshot({ path: test.info().outputPath('mini-progress.png') });

	await component.selectOption('board');
	await expect(dialog.locator('.miniature-plan .mini-cell')).toHaveCount(12);
	await expect(dialog.locator('.miniature-plan')).toHaveAttribute('data-cols', '3');
	await expect(dialog.locator('.miniature-plan')).toHaveAttribute('data-rows', '4');
	const pool = dialog.locator('.course-pool .mini-course');
	const code = await pool.getAttribute('data-code');
	await pool.click();
	await dialog.locator('.miniature-plan .mini-place').first().click();
	await expect(dialog.locator(`.miniature-plan .mini-course[data-code="${code}"]`)).toHaveAttribute('data-code', code!);
	await dialog.screenshot({ path: test.info().outputPath('mini-board.png') });
	const from = await dialog
		.locator(`.miniature-plan .mini-cell:has([data-code="${code}"])`)
		.evaluate((el) => ({ year: (el as HTMLElement).dataset.year, trim: (el as HTMLElement).dataset.trim }));
	await dialog.locator(`.miniature-plan .mini-course[data-code="${code}"]`).click();
	const other = dialog
		.locator(`.miniature-plan .mini-cell.fits:not([data-year="${from.year}"][data-trim="${from.trim}"])`)
		.first();
	if (await other.count()) await dialog.locator(`.miniature-plan .mini-course[data-code="${code}"]`).dragTo(other);
	await dialog.locator(`.miniature-plan .course-piece:has([data-code="${code}"]) .chip-remove`).click();
	await expect(dialog.locator('.course-pool .mini-course')).toBeVisible();

	await component.selectOption('labels');
	await dialog.getByRole('button', { name: 'titles', exact: true }).click();
	await expect(dialog.locator('.miniature-plan .course-title')).toHaveCount(0);
	await dialog.getByRole('button', { name: 'titles', exact: true }).click();
	await dialog.getByRole('button', { name: 'codes', exact: true }).click();
	await expect(dialog.locator('.miniature-plan .mini-course b')).toHaveCount(0);
	await dialog.screenshot({ path: test.info().outputPath('mini-labels.png') });

	await component.selectOption('terms');
	await dialog.getByRole('button', { name: 't11', exact: true }).click();
	await expect(dialog.locator('.mini-number')).toHaveCount(12);
	await expect(dialog.locator('.mini-number').last()).toHaveText('t12');
	const t1 = dialog.getByRole('button', { name: 'filter catalogue by t1', exact: true });
	await t1.click();
	await expect(t1).toHaveAttribute('aria-pressed', 'true');
	await t1.click();
	await expect(t1).toHaveAttribute('aria-pressed', 'false');

	await component.selectOption('catalogue');
	await dialog.getByRole('group', { name: 'subjects', exact: true }).getByRole('button').first().click();
	await dialog.getByRole('searchbox', { name: 'search practice catalogue' }).fill('CHEM');
	await dialog.getByRole('button', { name: 'advanced filters' }).click();
	await dialog
		.getByRole('group', { name: 'credits', exact: true })
		.getByRole('button', { name: '4', exact: true })
		.click();
	await dialog.getByRole('button', { name: 'clear', exact: true }).click();
	await dialog.locator('.catalogue-results .mini-course').first().click();
	const takeOff = dialog.getByRole('button', { name: 'take off plan', exact: true });
	if (await takeOff.count()) await takeOff.click();
	await dialog.getByRole('button', { name: /^\+ add to / }).click();
	await expect(dialog.getByRole('button', { name: 'take off plan', exact: true })).toBeVisible();
	await dialog.screenshot({ path: test.info().outputPath('mini-catalogue.png') });

	await component.selectOption('hints');
	await dialog.getByRole('button', { name: 'prerequisites first' }).click();
	await expect(dialog.locator('.miniature-plan .mini-course.lit')).toBeVisible();
	await dialog.getByRole('checkbox', { name: 'show problems' }).click();
	await expect(dialog.getByRole('button', { name: 'prerequisites first' })).toHaveCount(0);
	await dialog.getByRole('checkbox', { name: 'show problems' }).click();
	await dialog.getByRole('button', { name: /advisories/ }).click();
	await dialog.screenshot({ path: test.info().outputPath('mini-hints.png') });

	await component.selectOption('display');
	await expect(dialog.locator('.miniature-plan .mini-course[data-type="required"]').first()).toBeVisible();
	await expect(dialog.locator('.miniature-plan .mini-course[data-type="elective"]').first()).toBeVisible();
	const requiredColours = await dialog
		.locator('.miniature-plan .mini-course[data-type="required"]')
		.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
	expect(new Set(requiredColours).size).toBeGreaterThanOrEqual(2);
	await dialog.getByRole('button', { name: 'display', exact: false }).click();
	await dialog.getByRole('button', { name: 'required (filled)', exact: true }).click();
	await expect(dialog.locator('.miniature-plan .mini-course.lit').first()).toBeVisible();
	await dialog.getByRole('button', { name: 'elective (outlined)', exact: true }).click();
	await dialog.screenshot({ path: test.info().outputPath('mini-colours.png') });

	await component.selectOption('details');
	await dialog.locator('.details-scene > .course-piece .mini-course').click();
	await dialog.getByLabel('trimester', { exact: true }).selectOption('4-2');
	await dialog.getByRole('button', { name: 'move', exact: true }).click();
	await dialog.getByRole('button', { name: 'remove', exact: true }).click();
	await expect(dialog.getByRole('button', { name: 'remove', exact: true })).toBeDisabled();

	await component.selectOption('record');
	await dialog.getByRole('checkbox', { name: /audit this course/ }).check();
	await expect(dialog.locator('.credit-result')).toHaveText('0 cr');
	await dialog.getByRole('checkbox', { name: /audit this course/ }).uncheck();
	await dialog.getByRole('radio', { name: 'failed', exact: true }).check();
	await expect(dialog.locator('.credit-result')).toHaveText('0 cr');
	await dialog.getByRole('radio', { name: 'not failed', exact: true }).check();
	await expect(dialog.locator('.credit-result')).not.toHaveText('0 cr');

	await component.selectOption('about');
	await expect(dialog.locator('.suggested-term').first()).toBeVisible();
	await dialog.locator('.suggested-term').first().click();
	await expect(dialog.locator('.prerequisites .pre-row').first().locator('.missing')).toHaveCount(0);
	await dialog.locator('summary', { hasText: 'leads to' }).click();
	await dialog.screenshot({ path: test.info().outputPath('mini-course-links.png') });
	await dialog.locator('summary', { hasText: 'about the course' }).click();
	await expect(dialog.locator('.description')).toBeVisible();
	await dialog.locator('summary', { hasText: 'about the course' }).click();
	await dialog.locator('.related-list button').first().click();
	await expect(dialog.getByRole('button', { name: /back to/ })).toBeVisible();

	await component.selectOption('faculty');
	await dialog.getByRole('button', { name: 'Contact & teaching', exact: true }).first().click();
	await expect(dialog.locator('.d-taught-list').first()).toBeVisible();
	await dialog.getByRole('button', { name: 'Hide details', exact: true }).first().click();
	await dialog.locator('[data-next]').click();
	await expect(dialog).toHaveCount(0);
	expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kcal-plan')!).placements)).toEqual(original);
	expect(errors).toEqual([]);
});

test('choices use the selected major and connect a pick to the miniature plan', async ({ page }) => {
	const dialog = await setup(page, 'history', null);
	await dialog.locator('[data-next]').click();
	await dialog.getByRole('combobox', { name: 'demo component' }).selectOption('choices');
	await expect(dialog.locator('.choice-pool')).toContainText('history');
	await dialog.locator('.choice-pool .mini-course').first().click();
	await dialog.getByRole('button', { name: '+ add to plan', exact: true }).click();
	await expect(dialog.locator('.choice-dots i.on')).toHaveCount(1);
	await dialog.screenshot({ path: test.info().outputPath('mini-choices.png') });
});

test('each miniature fits a phone and majors without choices skip that step', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const dialog = await setup(page, 'chemistry', 'computer science', 2026);
	await dialog.locator('[data-next]').click();
	const component = dialog.getByRole('combobox', { name: 'demo component' });
	await expect(component.locator('option[value="choices"]')).toHaveCount(0);
	for (const id of [
		'progress',
		'board',
		'labels',
		'terms',
		'catalogue',
		'hints',
		'display',
		'details',
		'record',
		'about',
		'faculty'
	]) {
		await component.selectOption(id);
		const bounds = await dialog.evaluate((el) => ({ width: el.scrollWidth, client: el.clientWidth }));
		expect(bounds.width, id).toBeLessThanOrEqual(bounds.client + 1);
		await expect(dialog.locator('.miniature-plan .mini-cell')).toHaveCount(12);
		if (id === 'progress') await dialog.screenshot({ path: test.info().outputPath('phone-progress.png') });
		if (id === 'display') await dialog.screenshot({ path: test.info().outputPath('phone-colours.png') });
	}
});

test('a three-year degree uses a miniature 3 by 3 plan', async ({ page }) => {
	await page.goto('/');
	const dialog = page.getByRole('dialog', { name: 'welcome to kcal' });
	await dialog.getByRole('button', { name: '2024', exact: true }).click();
	await dialog.getByRole('button', { name: '3 years', exact: true }).click();
	await dialog.locator('[data-next]').click();
	await dialog.locator('.pill', { hasText: 'mathematics' }).click();
	await dialog.locator('[data-next]').click();
	await dialog.locator('[data-next]').click();
	await expect(dialog.locator('.miniature-plan')).toHaveAttribute('data-rows', '3');
	await expect(dialog.locator('.miniature-plan .mini-cell')).toHaveCount(9);
	await dialog.screenshot({ path: test.info().outputPath('mini-3-by-3.png') });
});

test('the ? key brings the labels back, and a click anywhere or escape puts them away', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('kcal-intro-seen', '1');
	});
	await page.goto('/');
	await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
	const help = page.getByRole('button', { name: "what's what" });
	await help.click();
	await expect(page.locator('.note').first()).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('.note')).toHaveCount(0);
	await help.click();
	await expect(page.locator('.note').first()).toBeVisible();
	await page.mouse.click(900, 500);
	await expect(page.locator('.note')).toHaveCount(0);
});

test('?welcome replays the welcome and leaves the saved plan alone', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('kcal-intro-seen', '1');
		if (!localStorage.getItem('kcal-plan'))
			localStorage.setItem(
				'kcal-plan',
				JSON.stringify({ version: 1, placements: { '2-1': ['MATH201'] }, touched: true })
			);
	});
	await page.goto('/?welcome');
	const dialog = page.getByRole('dialog', { name: 'welcome to kcal' });
	await expect(dialog).toBeVisible();
	expect(page.url()).not.toContain('welcome');
	const saved = await page.evaluate(() => localStorage.getItem('kcal-plan'));

	await dialog.getByRole('button', { name: '2023', exact: true }).click();
	await dialog.getByRole('button', { name: 'next' }).click();
	await dialog.locator('.pill', { hasText: 'biology' }).click();
	await dialog.getByRole('button', { name: 'skip' }).click();
	await expect(page.getByText('nothing here is saved')).toBeVisible();
	expect(await page.evaluate(() => localStorage.getItem('kcal-plan'))).toBe(saved);

	await page.reload();
	await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
	await expect(dialog).toHaveCount(0);
	await expect(page.locator('.overview .chip[data-code="MATH201"]')).toBeVisible();
	await expect(page.getByText('nothing here is saved')).toHaveCount(0);
});

test('skipping before answering still leaves a plan, and no labels', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('dialog', { name: 'welcome to kcal' }).getByRole('button', { name: 'skip' }).click();
	await expect(page.locator('.overview .chip').first()).toBeVisible();
	await expect(page.locator('.note')).toHaveCount(0);
});

test('back keeps the answers, and removing the minor makes it a single major', async ({ page }) => {
	await page.goto('/');
	const dialog = page.getByRole('dialog', { name: 'welcome to kcal' });
	await dialog.getByRole('button', { name: '2026', exact: true }).click();
	await dialog.getByRole('button', { name: 'next' }).click();
	await dialog.locator('.pill', { hasText: 'mathematics' }).click();
	await dialog.getByRole('button', { name: '+ minor', exact: true }).click();
	await dialog.getByRole('button', { name: 'no minor' }).click();
	await dialog.getByRole('button', { name: 'back', exact: true }).click();
	await expect(dialog.getByRole('button', { name: '2026', exact: true })).toHaveAttribute('aria-pressed', 'true');
	await dialog.getByRole('button', { name: 'next' }).click();
	await expect(dialog.locator('.slot')).toHaveCount(1);
	await expect(dialog.locator('.slot')).toContainText('mathematics');
	await expect(dialog.getByRole('button', { name: '+ second major' })).toBeVisible();
});

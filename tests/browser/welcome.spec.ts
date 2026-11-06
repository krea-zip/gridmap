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

test('the tour uses real controls, explains their meaning and preserves the plan', async ({ page }) => {
	test.setTimeout(60_000);
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	const dialog = await setup(page);
	const original = await page.evaluate(() => localStorage.getItem('kcal-plan'));
	await dialog.locator('[data-next]').click();
	const component = dialog.getByRole('combobox', { name: 'demo component' });
	await expect(component).toHaveValue('terms');
	await expect(dialog.locator('.task')).toHaveCount(0);
	await expect(dialog.locator('.lesson-context')).toContainText('y2 t3');
	const numbering = dialog.locator('.term-demo .name').last();
	await expect(numbering).toHaveText('t3');
	await numbering.click();
	await expect(numbering).toHaveText('t6');
	await expect(dialog.locator('.caption')).toContainText('t6');
	await numbering.click();
	await expect(numbering).toHaveText('t3');

	await component.selectOption('display');
	await expect(dialog.locator('.lesson-context')).toContainText('a dot means required');
	await expect(dialog.locator('.lesson-context')).toContainText('left edge means elective');
	await expect(dialog.locator('.blocks')).toHaveText('');
	await dialog.getByRole('button', { name: 'display', exact: false }).click();
	await expect(dialog.getByRole('group', { name: 'course labels', exact: true })).toBeVisible();
	await dialog.getByRole('button', { name: 'titles', exact: true }).click();
	await expect(dialog.getByRole('button', { name: 'titles', exact: true })).toHaveAttribute('aria-pressed', 'true');
	await dialog.getByRole('button', { name: 'required (filled)', exact: true }).click();
	await expect(dialog.locator('.blocks .lit').first()).toBeVisible();
	await dialog.screenshot({ path: test.info().outputPath('simple-display.png') });

	await component.selectOption('board');
	const cells = dialog.locator('.tour-demo .overview .cell');
	await expect(cells).toHaveCount(12);
	await dialog.locator('.tour-demo .chip .open').first().click();
	await expect(dialog.locator('.course-demo .d-title')).toBeVisible();
	await dialog.getByRole('button', { name: 'close course details', exact: true }).click();
	await cells.last().click();
	await expect(dialog.getByRole('button', { name: '← back', exact: true })).toBeVisible();
	await dialog.getByRole('button', { name: '← back', exact: true }).click();
	await expect(cells).toHaveCount(12);

	await component.selectOption('catalogue');
	await dialog.getByRole('searchbox', { name: 'search courses or lecturers' }).fill('CHEM');
	await dialog.locator('[data-course-card]').first().click();
	await expect(dialog.locator('.course-demo .d-title')).toBeVisible();

	await component.selectOption('progress');
	await dialog.locator('.rail-demo .toggle').first().click();
	await expect(dialog.locator('.rail-demo .detail')).toBeVisible();

	await component.selectOption('hints');
	await expect(dialog.locator('.tour-demo [data-tour="hints"]')).toBeVisible();

	await component.selectOption('details');
	await dialog.getByRole('combobox', { name: /^trimester to put/ }).selectOption('2-3');
	const place = dialog.getByRole('button', { name: 'add to plan', exact: true });
	if (await place.count()) await place.click();
	else await dialog.getByRole('button', { name: 'move', exact: true }).click();
	await expect(dialog.getByRole('button', { name: 'remove', exact: true })).toBeVisible();
	await dialog.locator('summary', { hasText: 'audit & result' }).click();
	await dialog.getByRole('checkbox', { name: /Audit this course/ }).check();
	await dialog.getByRole('button', { name: 'remove', exact: true }).click();
	await expect(dialog.getByRole('button', { name: 'add to plan', exact: true })).toBeVisible();

	await component.selectOption('views');
	const exampleCode = await dialog.locator('.tour-demo .chip').first().getAttribute('data-code');
	await dialog.locator('.tour-demo .chip .x').first().click();
	await dialog.getByRole('button', { name: 'undo', exact: true }).click();
	await expect(dialog.locator(`.tour-demo .chip[data-code="${exampleCode}"]`)).toBeVisible();
	await dialog.getByRole('button', { name: /view: plan/ }).click();
	await dialog.getByRole('radio', { name: /grades/ }).click();
	await expect(dialog.getByRole('button', { name: /view: grades/ })).toBeVisible();
	await expect(dialog.getByRole('button', { name: 'enter grades', exact: true })).toBeVisible();

	await component.selectOption('tools');
	await expect(dialog.getByText('settings ⚙', { exact: true })).toBeVisible();
	await dialog.getByRole('button', { name: 'start planning', exact: true }).click();
	await expect(dialog).toHaveCount(0);
	expect(await page.evaluate(() => localStorage.getItem('kcal-plan'))).toEqual(original);
	expect(errors).toEqual([]);
});

test('the simplified tour fits a phone and places explanations above controls', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const dialog = await setup(page, 'chemistry', 'computer science', 2026);
	await dialog.locator('[data-next]').click();
	const component = dialog.getByRole('combobox', { name: 'demo component' });
	for (const id of ['terms', 'display', 'board', 'catalogue', 'progress', 'hints', 'details', 'views', 'tools']) {
		await component.selectOption(id);
		const bounds = await dialog.evaluate((el) => ({ width: el.scrollWidth, client: el.clientWidth }));
		expect(bounds.width, id).toBeLessThanOrEqual(bounds.client + 1);
		if (id !== 'tools') {
			await expect(dialog.locator('.lesson-context p')).toHaveCount(2);
			const order = await dialog.evaluate(
				(el) =>
					!!(
						el.querySelector('.lesson-context')!.compareDocumentPosition(el.querySelector('.tour-demo')!) &
						Node.DOCUMENT_POSITION_FOLLOWING
					)
			);
			expect(order, id).toBe(true);
		}
		if (id === 'terms') {
			await dialog.locator('.term-demo .name').last().click();
			await expect(dialog.locator('.term-demo .name').last()).toHaveText('t6');
			await dialog.screenshot({ path: test.info().outputPath('phone-terms.png') });
		}
		if (id === 'display') {
			await dialog.getByRole('button', { name: 'display', exact: false }).click();
			await dialog.screenshot({ path: test.info().outputPath('phone-display.png') });
		}
	}
	await dialog.getByRole('button', { name: 'start planning', exact: true }).click();
	await expect(dialog).toHaveCount(0);
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

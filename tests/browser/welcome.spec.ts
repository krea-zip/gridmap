import { test, expect } from '@playwright/test';

test('a first visit: batch, degree, suggested plan, then a go at the current year', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/');
	const dialog = page.getByRole('dialog', { name: 'welcome to kcal' });
	const next = dialog.getByRole('button', { name: 'next' });
	await expect(next).toBeDisabled();
	await dialog.getByRole('button', { name: '2023', exact: true }).click();
	await next.click();

	const done = dialog.getByRole('button', { name: 'see my suggested plan' });
	await expect(done).toBeDisabled();
	await dialog.locator('.pill', { hasText: 'mathematics' }).click();
	await expect(done).toBeDisabled(); // the minor is still open
	await dialog.locator('.pill', { hasText: 'physics' }).click();
	await done.click();

	await expect(dialog.getByText('aug to oct')).toBeVisible();
	await expect(dialog.getByText('23 to 24')).toBeVisible();
	await dialog.getByRole('button', { name: 'try it out' }).click();

	// 2023's current year is its fourth: only that row, in its own numbers
	await expect(dialog.locator('.head.year b')).toHaveText('y4');
	await expect(dialog.locator('.cell')).toHaveCount(3);
	await expect(dialog.locator('.ghost')).toBeVisible(); // the demo plays on its own
	await expect(dialog.locator('.ghost')).toHaveCount(0, { timeout: 6000 });

	const chip = dialog.locator('.pool .chip').first();
	const code = await chip.getAttribute('data-chip');
	await chip.hover();
	await chip.dragTo(dialog.locator('.cell.fits').first());
	await expect(dialog.locator('.cell .chip', { hasText: code! })).toBeVisible();

	// the same key as the board's, and it changes what a course shows
	await expect(dialog.locator('.cell .chip span').first()).toHaveCount(0);
	await dialog.getByRole('button', { name: 'titles' }).click();
	await expect(dialog.locator('.cell .chip span').first()).toBeVisible();

	await dialog.getByRole('button', { name: 't11', exact: true }).click();
	await expect(dialog.locator('.head').first()).toContainText('t10');
	await dialog.getByRole('button', { name: 'start planning' }).click();

	await expect(dialog).toHaveCount(0);
	await expect(page.locator(`.overview .chip[data-code="${code}"]`)).toBeVisible();
	const notes = page.locator('.note');
	await expect(notes.filter({ hasText: 'toggle if planning a 3-year degree' })).toBeVisible();
	await page.getByRole('button', { name: 'got it' }).click();
	await expect(notes).toHaveCount(0);
	await expect(page.locator('#colour-key')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('a first year practises in the next year with room', async ({ page }) => {
	await page.goto('/');
	const dialog = page.getByRole('dialog', { name: 'welcome to kcal' });
	await dialog.getByRole('button', { name: '2026', exact: true }).click();
	await dialog.getByRole('button', { name: 'next' }).click();
	await dialog.locator('.pill', { hasText: 'computer science' }).click();
	await dialog.locator('.pill', { hasText: 'mathematics' }).click();
	await dialog.getByRole('button', { name: 'see my suggested plan' }).click();
	await dialog.getByRole('button', { name: 'try it out' }).click();
	await expect(dialog.locator('.head.year b')).toHaveText('y2');
	await expect(dialog.getByText('this is your next year')).toBeVisible();
	await expect(dialog.locator('.pool .chip').nth(4)).toBeVisible();
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
	await dialog.getByRole('button', { name: 'no minor' }).click();
	await dialog.getByRole('button', { name: 'back', exact: true }).click();
	await expect(dialog.getByRole('button', { name: '2026', exact: true })).toHaveAttribute('aria-pressed', 'true');
	await dialog.getByRole('button', { name: 'next' }).click();
	await expect(dialog.locator('.slot')).toHaveCount(1);
	await expect(dialog.locator('.slot')).toContainText('mathematics');
	await expect(dialog.getByRole('button', { name: '+ second major' })).toBeVisible();
});

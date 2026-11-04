import { test, expect, type Page } from '@playwright/test';

const draft = {
	version: 1,
	placements: { '2-1': ['MATH201'], '2-2': ['MATH202'] },
	picks: { major1: 'mathematics', minor: 'physics' },
	touched: true,
	grades: { MATH201: 'A' }
};
const board = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('kcal-plan') ?? '{}'));
const shareId = '00000000-0000-4000-8000-000000000001';
const shared = {
	version: 1,
	placements: { '3-1': ['COMP201'] },
	picks: { major1: 'computer-science' },
	fourYear: true
};
const signedIn = { configured: true, user: { id: 'student-1', email: 'student@krea.ac.in' }, eligible: true };

async function seed(page: Page) {
	await page.addInitScript((draft) => {
		localStorage.setItem('kcal-intro-seen', '1');
		if (!localStorage.getItem('kcal-plan')) localStorage.setItem('kcal-plan', JSON.stringify(draft));
	}, draft);
}

test('guests keep their draft and can export a private PDF, with no sign-in on offer', async ({ page }) => {
	await seed(page);
	await page.goto('/');
	await page.getByRole('button', { name: 'settings', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Log in with Google' })).toHaveCount(0);
	await page.screenshot({ path: '/tmp/kcal-account-settings.png' });
	await expect(page.getByRole('button', { name: 'Create share link' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Save this plan', exact: true })).toHaveCount(0);
	const popupPromise = page.waitForEvent('popup');
	await page.getByRole('button', { name: 'Save as PDF', exact: true }).click();
	const popup = await popupPromise;
	await expect(popup.getByRole('heading', { name: 'Study plan' })).toBeVisible();
	await expect(popup.locator('body')).toContainText('MATH201');
	await expect(popup.locator('body')).not.toContainText('@krea.ac.in');
	await expect(popup.locator('body')).not.toContainText('grades');
	await popup.close();
	expect((await board(page)).grades.MATH201).toBe('A');
});

test('OAuth return preserves the draft, supports private saves and revocable links', async ({ page }) => {
	await seed(page);
	let plans: unknown[] = [];
	let links: unknown[] = [];
	await page.route('**/api/account', (route) => route.fulfill({ json: signedIn }));
	await page.route('**/api/plans', async (route) => {
		if (route.request().method() === 'POST') {
			const body = route.request().postDataJSON();
			const entry = { id: 'saved-1', user_id: 'student-1', ...body, revision: 1, updated_at: new Date().toISOString() };
			plans = [entry];
			await route.fulfill({ status: 201, json: entry });
		} else await route.fulfill({ json: plans });
	});
	await page.route('**/api/shares', async (route) => {
		if (route.request().method() === 'POST') {
			const entry = { id: shareId, name: 'Shared plan', created_at: new Date().toISOString() };
			links = [entry];
			await route.fulfill({ status: 201, json: entry });
		} else if (route.request().method() === 'DELETE') {
			links = [];
			await route.fulfill({ json: { ok: true } });
		} else await route.fulfill({ json: links });
	});
	await page.goto('/?account=welcome');
	const settings = page.getByRole('dialog', { name: 'settings' });
	await expect(settings).toBeVisible();
	expect((await board(page)).placements).toEqual(draft.placements);
	await settings.getByLabel('Plan name', { exact: true }).fill('Plan A');
	await settings.getByRole('button', { name: 'Save this plan', exact: true }).click();
	await expect(settings).toContainText('Saved privately');
	await settings.getByRole('button', { name: 'Create share link' }).click();
	await expect(settings.getByRole('textbox', { name: 'Share link' })).toHaveValue(new RegExp(`share=${shareId}`));
	await settings.getByRole('button', { name: 'Disable link' }).click();
	await settings.getByRole('button', { name: 'Confirm disable' }).click();
	await expect(settings).toContainText('Link disabled');
	await settings.getByRole('button', { name: 'Refresh', exact: true }).click();
	await expect(settings.getByText('Plan A', { exact: true })).toBeVisible();
	expect((await board(page)).grades.MATH201).toBe('A');
});

test('shared links show a read-only guest preview and never replace the receiver draft', async ({ page }) => {
	await seed(page);
	await page.route(`**/api/shares/${shareId}`, (route) => route.fulfill({ json: { snapshot: shared } }));
	await page.goto(`/?share=${shareId}`);
	const dialog = page.getByRole('dialog', { name: 'a shared plan' });
	await expect(dialog).toContainText('read-only snapshot');
	await expect(dialog).toContainText('COMP201');
	await expect(dialog.getByRole('button', { name: 'Copy to my plans' })).toHaveCount(0);
	expect((await board(page)).placements).toEqual(draft.placements);
});

test('Krea members can copy a shared snapshot to saved plans without replacing their working draft', async ({
	page
}) => {
	await seed(page);
	await page.route('**/api/account', (route) => route.fulfill({ json: signedIn }));
	await page.route(`**/api/shares/${shareId}`, (route) => route.fulfill({ json: { snapshot: shared } }));
	let copied: unknown;
	await page.route('**/api/plans', async (route) => {
		copied = route.request().postDataJSON();
		await route.fulfill({ status: 201, json: { id: 'copy' } });
	});
	await page.goto(`/?share=${shareId}`);
	await page.getByRole('button', { name: 'Copy to my plans' }).click();
	await expect(page.getByRole('button', { name: 'Copied to your saved plans' })).toBeVisible();
	expect(copied).toEqual({ name: 'Copy of shared plan', snapshot: shared });
	expect((await board(page)).placements).toEqual(draft.placements);
});

test.skip('wrong Google accounts get an account-switch action; failed callbacks preserve drafts', async ({ page }) => {
	await seed(page);
	await page.route('**/api/account', (route) =>
		route.fulfill({ json: { ...signedIn, user: { id: 'other', email: 'other@gmail.com' }, eligible: false } })
	);
	await page.goto('/?account=error');
	await expect(page.getByRole('button', { name: 'Use another account' })).toBeVisible();
	await expect(page.getByRole('dialog', { name: 'settings' })).toContainText('cancelled or could not finish');
	await expect(page.getByRole('button', { name: 'Save this plan', exact: true })).toHaveCount(0);
	expect((await board(page)).placements).toEqual(draft.placements);
});

test('damaged and revoked links explain the error without changing the board', async ({ page }) => {
	await seed(page);
	await page.goto('/#plan=not-a-real-plan');
	await expect(page.getByRole('dialog', { name: 'a shared plan' })).toContainText('incomplete or damaged');
	await page.route(`**/api/shares/${shareId}`, (route) =>
		route.fulfill({ status: 404, json: { message: 'This link is unavailable or has been disabled.' } })
	);
	await page.goto(`/?share=${shareId}`);
	await expect(page.getByRole('dialog', { name: 'a shared plan' })).toContainText('unavailable or has been disabled');
	expect((await board(page)).placements).toEqual(draft.placements);
});

test('filters fit narrow screens, toggle explicitly and reset together', async ({ page }) => {
	await seed(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.getByRole('button', { name: 'advanced filters' }).click();
	const quick = page.getByRole('group', { name: 'planning filters' });
	await quick.getByRole('button', { name: 'needed', exact: true }).click();
	await expect(quick.getByRole('button', { name: 'needed', exact: true })).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('button', { name: 'clear', exact: true }).click();
	await expect(quick.getByRole('button', { name: 'needed', exact: true })).toHaveAttribute('aria-pressed', 'false');
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: '/tmp/kcal-filters-mobile.png' });
});

test('returning from sign-in reopens the shared link without replacing the saved draft', async ({ page }) => {
	await seed(page);
	await page.addInitScript((id) => sessionStorage.setItem('kcal-auth-return', '/?share=' + id), shareId);
	await page.route('**/api/account', (route) => route.fulfill({ json: signedIn }));
	await page.route(`**/api/shares/${shareId}`, (route) => route.fulfill({ json: { snapshot: shared } }));
	await page.goto('/?account=welcome');
	await expect(page.getByRole('dialog', { name: 'a shared plan' })).toContainText('COMP201');
	await expect(page.getByRole('dialog', { name: 'settings' })).toHaveCount(0);
	expect((await board(page)).placements).toEqual(draft.placements);
});

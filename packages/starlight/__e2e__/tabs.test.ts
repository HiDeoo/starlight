import { expect, testFactory, type Locator } from './test-utils';

const test = await testFactory('./fixtures/basics/');

test('syncs tabs with a click event', async ({ page, starlight }) => {
	await starlight.goto('/tabs');

	const tabs = page.locator('starlight-tabs');
	const pkgTabsA = tabs.nth(0);
	const pkgTabsB = tabs.nth(2);

	// Select the pnpm tab in the first set of synced tabs.
	await pkgTabsA.getByRole('tab').filter({ hasText: 'pnpm' }).click();

	await expectSelectedTab(pkgTabsA, 'pnpm', 'pnpm command');
	await expectSelectedTab(pkgTabsB, 'pnpm', 'another pnpm command');

	// Select the yarn tab in the second set of synced tabs.
	await pkgTabsB.getByRole('tab').filter({ hasText: 'yarn' }).click();

	await expectSelectedTab(pkgTabsB, 'yarn', 'another yarn command');
	await expectSelectedTab(pkgTabsA, 'yarn', 'yarn command');
});

test('syncs tabs with a keyboard event', async ({ page, starlight }) => {
	await starlight.goto('/tabs');

	const tabs = page.locator('starlight-tabs');
	const pkgTabsA = tabs.nth(0);
	const pkgTabsB = tabs.nth(2);

	// Select the pnpm tab in the first set of synced tabs with the keyboard.
	await pkgTabsA.getByRole('tab', { selected: true }).press('ArrowRight');

	await expectSelectedTab(pkgTabsA, 'pnpm', 'pnpm command');
	await expectSelectedTab(pkgTabsB, 'pnpm', 'another pnpm command');

	// Select back the npm tab in the second set of synced tabs with the keyboard.
	const selectedTabB = pkgTabsB.getByRole('tab', { selected: true });
	await selectedTabB.press('ArrowRight');
	await selectedTabB.press('ArrowLeft');
	await selectedTabB.press('ArrowLeft');

	await expectSelectedTab(pkgTabsA, 'npm', 'npm command');
	await expectSelectedTab(pkgTabsB, 'npm', 'another npm command');
});

test('syncs only tabs using the same sync key', async ({ page, starlight }) => {
	await starlight.goto('/tabs');

	const tabs = page.locator('starlight-tabs');
	const pkgTabsA = tabs.nth(0);
	const unsyncedTabs = tabs.nth(1);
	const styleTabs = tabs.nth(3);

	// Select the pnpm tab in the set of tabs synced with the 'pkg' key.
	await pkgTabsA.getByRole('tab').filter({ hasText: 'pnpm' }).click();

	await expectSelectedTab(unsyncedTabs, 'one', 'tab 1');
	await expectSelectedTab(styleTabs, 'css', 'css code');
});

test('supports synced tabs with different tab items', async ({ page, starlight }) => {
	await starlight.goto('/tabs');

	const tabs = page.locator('starlight-tabs');
	const pkgTabsA = tabs.nth(0);
	const pkgTabsB = tabs.nth(2); // This set contains an extra tab item.

	// Select the bun tab in the second set of synced tabs.
	await pkgTabsB.getByRole('tab').filter({ hasText: 'bun' }).click();

	await expectSelectedTab(pkgTabsA, 'npm', 'npm command');
	await expectSelectedTab(pkgTabsB, 'bun', 'another bun command');
});

test('persists the focus when syncing tabs', async ({ page, starlight }) => {
	await starlight.goto('/tabs');

	const pkgTabsA = page.locator('starlight-tabs').nth(0);

	// Focus the selected tab in the set of tabs synced with the 'pkg' key.
	await pkgTabsA.getByRole('tab', { selected: true }).focus();
	// Select the pnpm tab in the set of tabs synced with the 'pkg' key using the keyboard.
	await page.keyboard.press('ArrowRight');

	expect(
		await pkgTabsA
			.getByRole('tab', { selected: true })
			.evaluate((node) => document.activeElement === node)
	).toBe(true);
});

test('preserves tabs position when alternating between tabs with different content heights', async ({
	page,
	starlight,
}) => {
	await starlight.goto('/tabs-variable-height');

	const tabs = page.locator('starlight-tabs').nth(1);
	const selectedTab = tabs.getByRole('tab', { selected: true });

	// Scroll to the second set of synced tabs and focus the selected tab.
	await tabs.scrollIntoViewIfNeeded();
	await selectedTab.focus();

	// Get the bounding box of the tabs.
	const initialBoundingBox = await tabs.boundingBox();

	// Select the second tab which has a different height.
	await selectedTab.press('ArrowRight');

	// Ensure the tabs vertical position is exactly the same after selecting the second tab.
	// Note that a small difference could be the result of the base line-height having a fractional part which can cause a
	// sub-pixel difference in some browsers like Chrome or Firefox.
	expect((await tabs.boundingBox())?.y).toBe(initialBoundingBox?.y);
});

test('syncs tabs with the same sync key if they do not consistenly use icons', async ({
	page,
	starlight,
}) => {
	await starlight.goto('/tabs');

	const tabs = page.locator('starlight-tabs');
	const pkgTabsA = tabs.nth(0); // This set does not use icons for tab items.
	const pkgTabsB = tabs.nth(4); // This set uses icons for tab items.

	// Select the pnpm tab in the first set of synced tabs.
	await pkgTabsA.getByRole('tab').filter({ hasText: 'pnpm' }).click();

	await expectSelectedTab(pkgTabsA, 'pnpm', 'pnpm command');
	await expectSelectedTab(pkgTabsB, 'pnpm', 'another pnpm command');

	// Select the yarn tab in the second set of synced tabs.
	await pkgTabsB.getByRole('tab').filter({ hasText: 'yarn' }).click();

	await expectSelectedTab(pkgTabsB, 'yarn', 'another yarn command');
	await expectSelectedTab(pkgTabsA, 'yarn', 'yarn command');
});

test('restores tabs only for synced tabs with a persisted state', async ({ page, starlight }) => {
	await starlight.goto('/tabs');

	const tabs = page.locator('starlight-tabs');
	const pkgTabsA = tabs.nth(0);
	const pkgTabsB = tabs.nth(2);
	const pkgTabsC = tabs.nth(4);
	const unsyncedTabs = tabs.nth(1);
	const styleTabs = tabs.nth(3);

	// Select the pnpm tab in the set of tabs synced with the 'pkg' key.
	await pkgTabsA.getByRole('tab').filter({ hasText: 'pnpm' }).click();

	await expectSelectedTab(pkgTabsA, 'pnpm', 'pnpm command');
	await expectSelectedTab(pkgTabsB, 'pnpm', 'another pnpm command');
	await expectSelectedTab(pkgTabsC, 'pnpm', 'another pnpm command');

	page.reload();

	// The synced tabs with a persisted state should be restored.
	await expectSelectedTab(pkgTabsA, 'pnpm', 'pnpm command');
	await expectSelectedTab(pkgTabsB, 'pnpm', 'another pnpm command');
	await expectSelectedTab(pkgTabsC, 'pnpm', 'another pnpm command');

	// Other tabs should not be affected.
	await expectSelectedTab(unsyncedTabs, 'one', 'tab 1');
	await expectSelectedTab(styleTabs, 'css', 'css code');
});

test('restores tabs for a single set of synced tabs with a persisted state', async ({
	page,
	starlight,
}) => {
	await starlight.goto('/tabs');

	const tabs = page.locator('starlight-tabs');
	const styleTabs = tabs.nth(3);

	// Select the tailwind tab in the set of tabs synced with the 'style' key.
	await styleTabs.getByRole('tab').filter({ hasText: 'tailwind' }).click();

	await expectSelectedTab(styleTabs, 'tailwind', 'tailwind code');

	page.reload();

	// The synced tabs with a persisted state should be restored.
	await expectSelectedTab(styleTabs, 'tailwind', 'tailwind code');
});

test('includes the `<starlight-tabs-restore>` element only for synced tabs', async ({
	page,
	starlight,
}) => {
	await starlight.goto('/tabs');

	// The page includes 5 sets of tabs.
	await expect(page.locator('starlight-tabs')).toHaveCount(5);
	// Only 4 sets of tabs are synced.
	await expect(page.locator('starlight-tabs-restore')).toHaveCount(4);
});

test('includes the synced tabs restore script only when needed and at most once', async ({
	page,
	starlight,
}) => {
	const syncedTabsRestoreScriptRegex = /customElements\.define\('starlight-tabs-restore',/g;

	await starlight.goto('/tabs');

	// The page includes at least one set of synced tabs.
	expect((await page.content()).match(syncedTabsRestoreScriptRegex)?.length).toBe(1);

	await starlight.goto('/tabs-unsynced');

	// The page includes no set of synced tabs.
	expect((await page.content()).match(syncedTabsRestoreScriptRegex)).toBeNull();
});

test('gracefully handles invalid persisted state for synced tabs', async ({ page, starlight }) => {
	await starlight.goto('/tabs');

	const tabs = page.locator('starlight-tabs');
	const pkgTabsA = tabs.nth(0);

	// Select the pnpm tab in the set of tabs synced with the 'pkg' key.
	await pkgTabsA.getByRole('tab').filter({ hasText: 'pnpm' }).click();

	await expectSelectedTab(pkgTabsA, 'pnpm', 'pnpm command');

	// Replace the persisted state with a new invalid value.
	await page.evaluate(
		(value) => localStorage.setItem('starlight-synced-tabs', value),
		'invalid-value'
	);

	page.reload();

	// The synced tabs should not be restored due to the invalid persisted state.
	await expectSelectedTab(pkgTabsA, 'npm', 'npm command');

	// Select the pnpm tab in the set of tabs synced with the 'pkg' key.
	await pkgTabsA.getByRole('tab').filter({ hasText: 'pnpm' }).click();

	await expectSelectedTab(pkgTabsA, 'pnpm', 'pnpm command');

	// The synced tabs should be restored with the new valid persisted state.
	expect(await page.evaluate(() => localStorage.getItem('starlight-synced-tabs'))).toBe(
		'{"pkg":"pnpm"}'
	);
});

async function expectSelectedTab(tabs: Locator, label: string, panel: string) {
	expect((await tabs.getByRole('tab', { selected: true }).textContent())?.trim()).toBe(label);
	expect((await tabs.getByRole('tabpanel').textContent())?.trim()).toBe(panel);
}

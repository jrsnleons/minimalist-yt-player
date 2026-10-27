import { test, expect, TRACKS } from './helpers/test';

const TABS = ['Home', 'Search', 'Library', 'Stats'] as const;

test.describe('shell and navigation', () => {
  test('main navigation switches views and marks the current one', async ({ app, page }) => {
    await app.open();

    // Only one "Main" navigation is visible at a time: sidebar on desktop, tab bar on phones.
    await expect(app.nav).toHaveCount(1);
    await expect(app.nav.getByRole('button')).toHaveText(TABS.map((t) => new RegExp(t)));

    for (const tab of TABS) {
      await app.goTo(tab);
      await expect(page.getByRole('heading', { level: 1, name: tab })).toBeVisible();
      for (const other of TABS.filter((t) => t !== tab)) {
        await expect(app.nav.getByRole('button', { name: other })).not.toHaveAttribute('aria-current', 'page');
      }
    }
  });

  test('shows the sidebar on desktop and the tab bar on phones', async ({ app, page }) => {
    await app.open();
    await expect(page.getByRole('complementary', { name: 'Library sidebar' })).toBeVisible({ visible: !app.isMobile });
  });

  for (const tab of TABS) {
    test(`${tab} view has no horizontal scroll`, async ({ app, page }) => {
      await app.open({ tracks: TRACKS });
      await app.goTo(tab);
      await expect(page.getByRole('heading', { level: 1, name: tab })).toBeVisible();

      const overflow = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // Any element wider than the viewport that is not inside its own scroller.
        wide: [...document.querySelectorAll<HTMLElement>('main *')]
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !el.closest('[class*="overflow-x"]'))
          .slice(0, 3)
          .map((el) => el.tagName + '.' + el.className.toString().slice(0, 60)),
      }));
      expect(overflow.page, 'document scrolls horizontally').toBeLessThanOrEqual(0);
      expect(overflow.wide, 'elements extend past the viewport').toEqual([]);
    });
  }
});

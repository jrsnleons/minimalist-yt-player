import { test, expect, LIBRARY, TRACKS } from './helpers/test';

test.describe('focus management', () => {
  test(
    'Focus Mode / Now Playing sheet traps focus and returns it on Escape',
    { tag: '@mobile' },
    async ({ app, page }) => {
      await app.open(LIBRARY);
      await app.playRoadMix();

      // Desktop: "Focus mode" button in the playback bar. Phones: the mini player opens the Now Playing sheet.
      const opener = app.isMobile
        ? page.getByRole('button', { name: /^Open player:/ })
        : page.getByRole('button', { name: 'Focus mode' });
      await opener.focus();
      await page.keyboard.press('Enter');

      const sheet = page.getByRole('dialog', { name: app.isMobile ? 'Now playing' : 'Focus mode' });
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText(TRACKS[0].title);
      await expect(sheet).toBeFocused();

      // Tab cycles inside the dialog and never reaches the page behind it.
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press('Tab');
        const inside = await sheet.evaluate((el) => el.contains(document.activeElement));
        expect(inside, `focus escaped after ${i + 1} Tab presses`).toBe(true);
      }
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Shift+Tab');
        const inside = await sheet.evaluate((el) => el.contains(document.activeElement));
        expect(inside, `focus escaped after ${i + 1} Shift+Tab presses`).toBe(true);
      }

      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      await expect(opener).toBeFocused();
    }
  );

  test('command palette opens with Ctrl+K and closes with one Escape', async ({ app, page }) => {
    await app.open();
    const palette = page.getByRole('dialog', { name: 'Search and commands' });
    await expect(palette).toBeHidden();

    await page.keyboard.press('Control+k');
    await expect(palette).toBeVisible();
    await expect(palette.getByRole('combobox', { name: 'Search' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();

    // And it can be reopened (not stuck in a toggled state).
    await page.keyboard.press('Control+k');
    await expect(palette).toBeVisible();
    await page.keyboard.press('Control+k');
    await expect(palette).toBeHidden();
  });

  test('command palette returns focus to the opener', async ({ app, page }) => {
    await app.open();
    const opener = page.getByRole('complementary', { name: 'Library sidebar' }).getByRole('button', { name: /^Search/ }).first();
    await opener.focus();
    await page.keyboard.press('Enter');
    const palette = page.getByRole('dialog', { name: 'Search and commands' });
    await expect(palette).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
    await expect(opener).toBeFocused();
  });
});

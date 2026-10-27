import { test, expect, LIBRARY, TRACKS } from './helpers/test';

// Keys come from lib/shortcuts.ts. Desktop only: phones have no physical keyboard.

test.describe('keyboard shortcuts', () => {
  test.beforeEach(async ({ app }) => {
    await app.open(LIBRARY);
    await app.playRoadMix();
    await app.blurFocus();
  });

  test('Space toggles play and pause', async ({ app, page }) => {
    await expect(app.playPause).toHaveAccessibleName('Pause');
    await page.keyboard.press('Space');
    await expect(app.playPause).toHaveAccessibleName('Play');
    await page.keyboard.press('k');
    await expect(app.playPause).toHaveAccessibleName('Pause');
  });

  test('N and P move to the next and previous track', async ({ app, page }) => {
    await page.keyboard.press('n');
    await app.expectNowPlaying(TRACKS[1]);
    await page.keyboard.press('n');
    await app.expectNowPlaying(TRACKS[2]);
    await page.keyboard.press('p');
    await app.expectNowPlaying(TRACKS[1]);
  });

  test('S toggles shuffle and R cycles repeat', async ({ page }) => {
    const bar = page.locator('footer[aria-label="Playback"]');
    const shuffle = bar.getByRole('button', { name: 'Shuffle' });
    await expect(shuffle).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('s');
    await expect(shuffle).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('s');
    await expect(shuffle).toHaveAttribute('aria-pressed', 'false');

    // off -> all -> one -> off
    await expect(bar.getByRole('button', { name: 'Repeat', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('r');
    await expect(bar.getByRole('button', { name: 'Repeat all' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('r');
    await expect(bar.getByRole('button', { name: 'Repeat one' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('r');
    await expect(bar.getByRole('button', { name: 'Repeat', exact: true })).toHaveAttribute('aria-pressed', 'false');
  });

  test('? opens the shortcuts dialog and Escape closes it', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    await expect(dialog).toBeHidden();
    await page.keyboard.press('?');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Play / Pause')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Space on a focused button activates that button, not playback', async ({ app, page }) => {
    const shuffle = page.locator('footer[aria-label="Playback"]').getByRole('button', { name: 'Shuffle' });
    await shuffle.focus();
    await expect(shuffle).toBeFocused();
    await page.keyboard.press('Space');

    await expect(shuffle).toHaveAttribute('aria-pressed', 'true');
    // Playback did not toggle.
    await expect(app.playPause).toHaveAccessibleName('Pause');
  });

  test('single-key shortcuts are ignored while typing in a field', async ({ app, page }) => {
    await app.goTo('Search');
    const box = page.getByRole('textbox', { name: 'Search' });
    await box.click();
    await page.keyboard.type('n p s r ');
    await expect(box).toHaveValue('n p s r ');
    await app.expectNowPlaying(TRACKS[0]);
    await expect(app.playPause).toHaveAccessibleName('Pause');
  });
});

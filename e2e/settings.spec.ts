import { test, expect, LIBRARY, TRACKS, waitForHydration } from './helpers/test';
import { readStore } from './helpers/seed';
import type { Page } from '@playwright/test';
import type { UserPreferences } from '../db/schema';

async function openSettings(page: Page) {
  // One "Settings" button is visible at a time: the sidebar's on desktop, the header's on phones.
  const opener = page.getByRole('button', { name: 'Settings' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function savedPreference(page: Page, key: string) {
  const rows = await readStore<UserPreferences>(page, 'preferences');
  return rows.find((r) => r.key === key)?.value;
}

test.describe('settings', () => {
  test('switches toggle from the keyboard and persist after reload', { tag: '@mobile' }, async ({ app, page }) => {
    await app.open();
    let dialog = await openSettings(page);

    const normalize = dialog.getByRole('switch', { name: 'Normalize Volume' });
    const restore = dialog.getByRole('switch', { name: 'Restore Last Session' });
    await expect(normalize).toHaveAttribute('aria-checked', 'true');
    await expect(restore).toHaveAttribute('aria-checked', 'true');

    await normalize.focus();
    await page.keyboard.press('Space');
    await expect(normalize).toHaveAttribute('aria-checked', 'false');
    await restore.focus();
    await page.keyboard.press('Enter');
    await expect(restore).toHaveAttribute('aria-checked', 'false');

    // Written to IndexedDB, then still off after a full reload.
    await expect.poll(() => savedPreference(page, 'normalizeVolume')).toBe(false);
    await expect.poll(() => savedPreference(page, 'sessionRestoreEnabled')).toBe(false);

    await page.reload();
    await waitForHydration(page);
    dialog = await openSettings(page);
    await expect(dialog.getByRole('switch', { name: 'Normalize Volume' })).toHaveAttribute('aria-checked', 'false');
    await expect(dialog.getByRole('switch', { name: 'Restore Last Session' })).toHaveAttribute('aria-checked', 'false');

    // Escape closes the dialog.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Restore Last Session brings back the queue after reload, and off does not', async ({ app, page }) => {
    await app.open(LIBRARY);
    await app.playRoadMix();
    await expect.poll(() => savedPreference(page, 'last_session')).toBeTruthy();

    await page.reload();
    await waitForHydration(page);
    await app.expectNowPlaying(TRACKS[0]);
    await expect(page.getByRole('status').filter({ hasText: 'Restored previous listening session' })).toBeVisible();
    // Restored paused, never auto-playing.
    await expect(app.playPause).toHaveAccessibleName('Play');

    // Turn it off: the saved session is dropped and a reload starts empty.
    const dialog = await openSettings(page);
    await dialog.getByRole('switch', { name: 'Restore Last Session' }).click();
    await expect.poll(() => savedPreference(page, 'last_session')).toBeUndefined();
    await page.keyboard.press('Escape');

    await page.reload();
    await waitForHydration(page);
    await expect(page.locator('footer[aria-label="Playback"]')).toContainText('Nothing playing');
  });
});

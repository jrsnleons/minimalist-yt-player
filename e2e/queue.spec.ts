import { test, expect, LIBRARY, SEARCH, TRACKS } from './helpers/test';
import type { Page } from '@playwright/test';

// The Up Next queue lives in the Now Playing panel, which is desktop-only.

const queueTable = (page: Page) => page.getByRole('table', { name: 'Up Next queue' });
const queueTitles = async (page: Page) =>
  (await queueTable(page).getByRole('button', { name: /^Play .* by .*/ }).evaluateAll((els) =>
    els.map((el) => (el.getAttribute('aria-label') ?? '').replace(/^Play (.*) by .*$/, '$1'))
  ));

test.describe('queue', () => {
  test.beforeEach(async ({ app }) => {
    await app.open(LIBRARY);
    await app.playRoadMix();
  });

  test('adds a search result to the queue from the context menu', async ({ app, page }) => {
    const song = SEARCH.tracks[0];
    await app.goTo('Search');
    await page.getByRole('textbox', { name: 'Search' }).fill('delta marsh');

    const main = page.getByRole('main', { name: 'Main content' });
    await main.getByRole('button', { name: `More options for ${song.title}` }).click();
    const menu = page.getByRole('menu', { name: `Actions for ${song.title}` });
    await expect(menu).toBeVisible();
    // Focus lands on the first item and arrow keys move through the menu.
    await expect(menu.getByRole('menuitem', { name: 'Play Now' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem', { name: 'Add to Queue' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('status').filter({ hasText: 'Added to queue' })).toBeVisible();
    expect(await queueTitles(page)).toEqual([...TRACKS.map((t) => t.title), song.title]);
  });

  test('reorders the queue with the keyboard', async ({ page }) => {
    const grip = page.getByRole('button', { name: `Reorder ${TRACKS[0].title}` });
    await grip.focus();
    // dnd-kit announces each step in a live region; wait for it so keys are not sent mid-transition.
    const announcement = page.locator('[id^="DndLiveRegion"]');
    await page.keyboard.press('Space'); // pick up
    await expect(announcement).toContainText(`moved over droppable area ${TRACKS[0].id}-0`);
    await page.keyboard.press('ArrowDown');
    await expect(announcement).toContainText(`moved over droppable area ${TRACKS[1].id}-1`);
    await page.keyboard.press('Space'); // drop
    await expect(announcement).toContainText('was dropped');

    await expect.poll(() => queueTitles(page)).toEqual([
      TRACKS[1].title,
      TRACKS[0].title,
      ...TRACKS.slice(2).map((t) => t.title),
    ]);
  });

  test('removing a song can be undone', async ({ page }) => {
    const victim = TRACKS[3];
    await queueTable(page).getByRole('button', { name: `More options for ${victim.title}` }).click();
    await page.getByRole('menuitem', { name: 'Remove from Queue' }).click();

    const toast = page.getByRole('status').filter({ hasText: `Removed "${victim.title}" from queue` });
    await expect(toast).toBeVisible();
    expect(await queueTitles(page)).toEqual(TRACKS.filter((t) => t !== victim).map((t) => t.title));

    await toast.getByRole('button', { name: 'Undo' }).click();
    expect(await queueTitles(page)).toEqual(TRACKS.map((t) => t.title));
  });

  test('clearing asks first, defaults to Cancel, and can be undone', async ({ app, page }) => {
    const panel = page.getByRole('complementary', { name: 'Now playing' });
    await panel.getByRole('button', { name: 'Clear', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Clear Queue' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

    // Escape cancels and keeps the queue.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(await queueTitles(page)).toHaveLength(TRACKS.length);

    // Cancel does too.
    await panel.getByRole('button', { name: 'Clear', exact: true }).click();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect(await queueTitles(page)).toHaveLength(TRACKS.length);

    // Confirm.
    await panel.getByRole('button', { name: 'Clear', exact: true }).click();
    await dialog.getByRole('button', { name: 'Clear Queue', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(panel.getByText('Nothing queued')).toBeVisible();
    await expect(app.playPause).toBeDisabled();

    const toast = page.getByRole('status').filter({ hasText: 'Queue cleared' });
    await toast.getByRole('button', { name: 'Undo' }).click();
    expect(await queueTitles(page)).toEqual(TRACKS.map((t) => t.title));
    await app.expectNowPlaying(TRACKS[0]);
  });
});

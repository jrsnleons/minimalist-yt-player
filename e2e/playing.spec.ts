import { test, expect, SEARCH, LIBRARY, TRACKS } from './helpers/test';

// The YouTube player script is blocked in tests, so playback state here comes from the store:
// the assertions cover what the UI shows (title, button labels), not audio output.

test.describe('playing a track', () => {
  test('a track row is a focusable button that starts playback on Enter', { tag: '@mobile' }, async ({ app, page }) => {
    await app.open();
    await app.goTo('Search');

    await page.getByRole('textbox', { name: 'Search' }).fill('delta marsh');
    const [first] = SEARCH.tracks;
    const row = page.getByRole('main', { name: 'Main content' }).getByRole('button', { name: `Play ${first.title} by ${first.artist}` });
    await expect(row).toBeVisible();

    // Nothing is playing yet.
    if (app.isMobile) await expect(page.getByRole('region', { name: 'Mini player' })).toHaveCount(0);
    else await expect(app.playPause).toBeDisabled();

    await row.focus();
    await expect(row).toBeFocused();
    await page.keyboard.press('Enter');

    await app.expectNowPlaying(first);
    await expect(row).toHaveAttribute('aria-current', 'true');
    await expect(app.playPause).toHaveAccessibleName('Pause');

    await app.playPause.click();
    await expect(app.playPause).toHaveAccessibleName('Play');
    await app.playPause.click();
    await expect(app.playPause).toHaveAccessibleName('Pause');
  });

  test('clicking a Home playlist plays it from the first track', { tag: '@mobile' }, async ({ app, page }) => {
    await app.open(LIBRARY);
    await app.playRoadMix();
    await expect(app.playPause).toHaveAccessibleName('Pause');
    await expect(page.getByRole('status').filter({ hasText: 'Playing "Road Mix"' })).toBeVisible();
    await app.expectNowPlaying(TRACKS[0]);
  });
});

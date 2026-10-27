import { test, expect, TRACKS } from './helpers/test';
import type { PlayRecord } from '../db/schema';

const [DRIVE, LANTERNS, ORBIT, STATIC, SIGNAL, LIGHTS] = TRACKS;

const SECOND = 1000;
const DAY = 24 * 60 * 60 * SECOND;

/** n plays a few seconds apart, ending a moment ago so they land in the current week. */
function plays(trackId: string, n: number, offset = 5 * SECOND): PlayRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    trackId,
    playedAt: Date.now() - offset - i * SECOND,
    msListened: 180 * SECOND,
  }));
}

test.describe('stats', () => {
  test('ranks top songs and artists, and the range toggle widens the window', { tag: '@mobile' }, async ({ app, page }) => {
    await app.open({
      tracks: TRACKS,
      plays: [
        ...plays(DRIVE.id, 3),
        ...plays(ORBIT.id, 2, 20 * SECOND),
        ...plays(SIGNAL.id, 1, 40 * SECOND),
        // Old plays: outside this week and this month.
        ...plays(LIGHTS.id, 2, 45 * DAY),
      ],
    });
    await app.goTo('Stats');

    const week = page.getByRole('button', { name: 'This Week' });
    await expect(week).toHaveAttribute('aria-pressed', 'true');

    const songs = page.getByRole('region', { name: 'Top Songs' });
    const artists = page.getByRole('region', { name: 'Top Artists' });

    // Ordered by play count.
    await expect(songs.getByRole('listitem')).toHaveCount(3);
    await expect(songs.getByRole('listitem').nth(0)).toContainText(DRIVE.title);
    await expect(songs.getByRole('listitem').nth(0)).toContainText('3 plays');
    await expect(songs.getByRole('listitem').nth(1)).toContainText(ORBIT.title);
    await expect(songs.getByRole('listitem').nth(2)).toContainText('1 play');
    await expect(songs).not.toContainText(LIGHTS.title);

    await expect(artists.getByRole('listitem').nth(0)).toContainText(DRIVE.artist);
    await expect(artists.getByRole('listitem').nth(0)).toContainText('3 plays');
    await expect(artists.getByRole('listitem').nth(1)).toContainText(ORBIT.artist);

    await expect(page.getByRole('term').filter({ hasText: 'Songs Played' }).locator('xpath=following-sibling::dd[1]')).toHaveText('6');
    await expect(page.getByRole('heading', { name: 'Listening by Hour' })).toBeVisible();

    // Month still excludes the 45-day-old plays; All Time includes them.
    await page.getByRole('button', { name: 'This Month' }).click();
    await expect(page.getByRole('button', { name: 'This Month' })).toHaveAttribute('aria-pressed', 'true');
    await expect(week).toHaveAttribute('aria-pressed', 'false');
    await expect(songs).not.toContainText(LIGHTS.title);

    await page.getByRole('button', { name: 'All Time' }).click();
    await expect(page.getByRole('button', { name: 'All Time' })).toHaveAttribute('aria-pressed', 'true');
    await expect(songs).toContainText(LIGHTS.title);
    await expect(artists).toContainText(LIGHTS.artist);
    await expect(page.getByRole('term').filter({ hasText: 'Songs Played' }).locator('xpath=following-sibling::dd[1]')).toHaveText('8');
  });

  test('says so when the selected range has no plays', async ({ app, page }) => {
    await app.open({ tracks: TRACKS, plays: plays(STATIC.id, 2, 60 * DAY) });
    await app.goTo('Stats');
    await expect(page.getByText('No plays this week')).toBeVisible();
    await page.getByRole('button', { name: 'All Time' }).click();
    await expect(page.getByRole('region', { name: 'Top Songs' })).toContainText(STATIC.title);
  });

  test('shows an empty state with no plays', { tag: '@mobile' }, async ({ app, page }) => {
    await app.open({ tracks: [LANTERNS] });
    await app.goTo('Stats');
    await expect(page.getByText('No listening data yet', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Top Songs' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Find Something to Play' })).toBeVisible();
  });
});

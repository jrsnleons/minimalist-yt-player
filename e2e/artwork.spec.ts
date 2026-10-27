import { test, expect, TRACKS } from './helpers/test';

const [DRIVE, LANTERNS] = TRACKS;

const history = [DRIVE, LANTERNS].map((t, i) => ({ trackId: t.id, playedAt: 1_700_000_100_000 - i, durationPlayed: 30 }));

test.describe('track artwork', () => {
  test('shows the color layer, then the image once it has loaded', { tag: '@mobile' }, async ({ app, page }) => {
    // Hold the image back long enough to observe the placeholder state.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route('https://i.ytimg.com/**', async (route) => {
      await gate;
      await route.fallback();
    });

    await app.open({ tracks: TRACKS, history });
    const card = page.getByRole('button', { name: `Play ${DRIVE.title} by ${DRIVE.artist}` }).locator('xpath=ancestor::li[1]');
    const art = card.locator('[data-artwork-state]');

    await expect(art).toHaveAttribute('data-artwork-state', 'color');
    // The color layer is a real background, not transparent.
    await expect(art).toHaveCSS('background-color', /^rgb\(/);
    await expect(art).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    release();
    await expect(art).toHaveAttribute('data-artwork-state', 'full');
    await expect(art.getByRole('img', { name: `${DRIVE.title} artwork` })).toHaveCSS('opacity', '1');
  });

  test('falls back to the monogram when the image 404s', { tag: '@mobile' }, async ({ app, page }) => {
    await page.route('https://i.ytimg.com/**', (route) => route.fulfill({ status: 404, body: 'not found' }));

    await app.open({ tracks: TRACKS, history });
    const card = page.getByRole('button', { name: `Play ${DRIVE.title} by ${DRIVE.artist}` }).locator('xpath=ancestor::li[1]');

    const fallback = card.locator(`[aria-label="${DRIVE.title} artwork"]`);
    await expect(fallback).toBeVisible();
    // Artist initial + title initial: "Neon Harbor" / "Midnight Drive" -> NM.
    await expect(fallback).toContainText('NM');
    await expect(card.locator('[data-artwork-state]')).toHaveCount(0);
    await expect(card.locator('img')).toHaveCount(0);
  });
});

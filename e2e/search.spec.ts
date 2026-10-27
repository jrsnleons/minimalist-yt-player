import { test, expect, SEARCH } from './helpers/test';

test.describe('search', () => {
  test('renders mocked songs, videos and playlists', { tag: '@mobile' }, async ({ app, page }) => {
    await app.open();
    await app.goTo('Search');
    await expect(page.getByText('Search Music', { exact: true })).toBeVisible();

    const requests: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname === '/api/search') requests.push(r.url());
    });
    await page.getByRole('textbox', { name: 'Search' }).fill('delta marsh');

    const main = page.getByRole('main', { name: 'Main content' });
    for (const song of SEARCH.tracks) {
      await expect(main.getByRole('button', { name: `Play ${song.title} by ${song.artist}` })).toBeVisible();
    }
    await expect(main.getByRole('heading', { name: 'Songs' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Videos' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Playlists' })).toBeVisible();
    await expect(main.getByRole('button', { name: `View songs in ${SEARCH.playlists[0].title}` })).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('q=delta%20marsh');

    // Filters narrow the list.
    await main.getByRole('button', { name: /^Videos/ }).click();
    await expect(main.getByRole('button', { name: /^Play Live at the Warehouse/ })).toBeVisible();
    await expect(main.getByRole('button', { name: `Play ${SEARCH.tracks[0].title} by ${SEARCH.tracks[0].artist}` })).toHaveCount(0);

    // Clearing the field returns to the prompt.
    await main.getByRole('button', { name: 'Clear search' }).click();
    await expect(page.getByText('Search Music', { exact: true })).toBeVisible();
  });

  test('shows an error with Try Again that retries the request', { tag: '@mobile' }, async ({ app, page }) => {
    let calls = 0;
    await page.route('**/api/search*', (route) => {
      calls += 1;
      if (calls === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Search unavailable"}' });
      return route.fallback();
    });

    await app.open();
    await app.goTo('Search');
    await page.getByRole('textbox', { name: 'Search' }).fill('delta marsh');

    await expect(page.getByText('Search failed', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Try Again' }).click();

    await expect(page.getByText('Search failed', { exact: true })).toBeHidden();
    await expect(
      page.getByRole('main', { name: 'Main content' }).getByRole('button', { name: `Play ${SEARCH.tracks[0].title} by ${SEARCH.tracks[0].artist}` })
    ).toBeVisible();
    expect(calls).toBe(2);
  });

  test('shows a message when nothing matches', async ({ app, page }) => {
    await page.route('**/api/search*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"results":[],"tracks":[],"videos":[],"playlists":[]}' })
    );
    await app.open();
    await app.goTo('Search');
    await page.getByRole('textbox', { name: 'Search' }).fill('zzzz');
    await expect(page.getByText('No results', { exact: true })).toBeVisible();
  });
});

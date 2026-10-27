import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect, LIBRARY, TRACKS } from './helpers/test';

// Accessibility smoke test: axe on the main views at desktop size. Serious and critical
// violations fail the test. Anything listed in KNOWN_ISSUES is matched by rule AND by the
// offending element's HTML, so a new violation of the same rule elsewhere still fails.
interface KnownIssue {
  rule: string;
  html: RegExp;
  reason: string;
}

const KNOWN_ISSUES: KnownIssue[] = [
  {
    rule: 'label-content-name-mismatch',
    // Track rows, Home cards and playlist cards: aria-label="Play {title} by {artist}" / "Open {name}" sits on a
    // button whose visible text is "{title} {artist}" / "{name} {n} songs". WCAG 2.5.3 (Label in Name) wants the
    // visible text contained in the name, so voice-control users saying the visible text may not hit the button.
    // Fixing it changes the naming scheme used by TrackRow, HomeView, SearchView, UpNext and the tests that
    // rely on it, so it is tracked here instead of changed in this PR.
    html: /aria-label="(Play|Open|View songs in) [^"]*"|after:content-\[''\]/,
    reason: 'stretched row/card buttons use a longer aria-label than their visible text',
  },
];

async function scan(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();

  const blocking = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      ...v,
      nodes: v.nodes.filter((n) => !KNOWN_ISSUES.some((k) => k.rule === v.id && k.html.test(n.html))),
    }))
    .filter((v) => v.nodes.length > 0)
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 5).map((n) => `${n.target.join(' ')}  ${n.html.slice(0, 160)}`),
    }));
  expect(blocking, 'serious or critical accessibility violations').toEqual([]);
}

test.describe('accessibility', () => {
  test.beforeEach(async ({ app }) => {
    await app.open(LIBRARY);
  });

  test('Home', async ({ app, page }) => {
    await app.goTo('Home');
    await expect(page.getByRole('button', { name: 'Play Road Mix' })).toBeVisible();
    await scan(page);
  });

  test('Home with a track playing', async ({ app, page }) => {
    await app.playRoadMix();
    await scan(page);
  });

  test('Search with results', async ({ app, page }) => {
    await app.goTo('Search');
    await page.getByRole('textbox', { name: 'Search' }).fill('delta marsh');
    await expect(page.getByRole('main').getByRole('button', { name: /^Play Copper Skyline/ })).toBeVisible();
    await scan(page);
  });

  test('Library', async ({ app, page }) => {
    await app.goTo('Library');
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
    await scan(page);
  });

  test('Library playlist detail', async ({ app, page }) => {
    await app.goTo('Library');
    await page.getByRole('main').getByText('Road Mix').first().click();
    await expect(page.getByRole('main').getByRole('button', { name: `Play ${TRACKS[0].title} by ${TRACKS[0].artist}` })).toBeVisible();
    await scan(page);
  });

  test('Stats', async ({ app, page }) => {
    await app.goTo('Stats');
    await expect(page.getByRole('heading', { level: 1, name: 'Stats' })).toBeVisible();
    await scan(page);
  });

  test('Settings dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await scan(page);
  });

  test('Keyboard shortcuts dialog', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible();
    await scan(page);
  });

  test('Command palette', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Search and commands' })).toBeVisible();
    await scan(page);
  });
});

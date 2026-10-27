import { test as base, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { Track } from '../../db/schema';
import { writeSeed, type SeedData } from './seed';

const FIXTURES = path.join(__dirname, '..', 'fixtures');
const readJson = <T>(name: string): T => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8')) as T;

/** Library tracks used for seeding. */
export const TRACKS = readJson<Track[]>('tracks.json');
/** What the mocked /api/search returns. */
export const SEARCH = readJson<{ results: Track[]; tracks: Track[]; videos: Track[]; playlists: { id: string; title: string }[] }>(
  'search.json'
);
export const RADIO = readJson<{ suggestions: Track[] }>('radio.json');
const PLAYLIST = readJson<unknown>('playlist.json');
const STREAM = readJson<unknown>('stream.json');
const ARTWORK = fs.readFileSync(path.join(FIXTURES, 'artwork.png'));

/** A saved playlist holding every library track, in order. Seed it together with `tracks: TRACKS`. */
export const ROAD_MIX = {
  id: 'pl-road-mix',
  name: 'Road Mix',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  trackIds: TRACKS.map((t) => t.id),
};

/** Library with one playlist; Home shows its "Play Road Mix" button. */
export const LIBRARY: SeedData = { tracks: TRACKS, playlists: [ROAD_MIX] };

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

function isAppHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Makes the context hermetic. Requests to the app go through (with the music APIs mocked);
 * i.ytimg.com artwork is served from a local PNG; every other external host is aborted.
 * Tests can override any of this with their own page.route(), which takes priority.
 */
export async function installNetworkMocks(context: BrowserContext): Promise<void> {
  // Skip the one-per-session "uBlock Origin" toast: it would replace toasts a test is waiting for.
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('adblockTipShown', '1');
    } catch {}
    // `next dev` overlays a floating badge that covers the bottom tab bar on phones.
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = 'nextjs-portal { display: none !important; }';
      document.head.appendChild(style);
    });
  });

  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());

    if (!isAppHost(url.hostname)) {
      if (url.hostname === 'i.ytimg.com') {
        return route.fulfill({
          status: 200,
          contentType: 'image/png',
          headers: { 'access-control-allow-origin': '*' },
          body: ARTWORK,
        });
      }
      // YouTube, googlevideo, Ably, Spotify, fonts, analytics: nothing leaves the machine.
      return route.abort('blockedbyclient');
    }

    switch (url.pathname) {
      case '/api/search':
        return route.fulfill(json(SEARCH));
      case '/api/radio':
        return route.fulfill(json(RADIO));
      case '/api/playlist':
        return route.fulfill(json(PLAYLIST));
      case '/api/stream':
        return route.fulfill(json(STREAM));
      case '/api/spotify':
      case '/api/spotify/resolve':
        return route.fulfill(json({ error: 'Spotify is not available in tests' }, 503));
      default:
        return route.fallback();
    }
  });
}

/** A fresh, mocked browser context, e.g. for the second device in the phone remote test. */
export async function newMockedContext(browser: Browser, options: Parameters<Browser['newContext']>[0] = {}) {
  const context = await browser.newContext(options);
  await installNetworkMocks(context);
  return context;
}

export const test = base.extend<{ app: AppHelpers }>({
  context: async ({ context }, use) => {
    await installNetworkMocks(context);
    await use(context);
  },
  app: async ({ page, isMobile }, use) => {
    await use(new AppHelpers(page, !!isMobile));
  },
});

export { expect };

/** True once React has attached to the app, i.e. clicks and key presses reach handlers. */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const main = document.querySelector('main');
    return !!main && Object.keys(main).some((k) => k.startsWith('__reactFiber'));
  });
  // Passive effects (window key listeners, store loading) run just after the commit: let them flush.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

export class AppHelpers {
  constructor(
    readonly page: Page,
    readonly isMobile: boolean
  ) {}

  /** Opens the app. With `seed`, writes it to IndexedDB and reloads so the app starts from that state. */
  async open(seed?: SeedData, url = '/'): Promise<void> {
    const { page } = this;
    await page.goto(url);
    await waitForHydration(page);
    if (seed) {
      await writeSeed(page, seed);
      await page.reload();
      await waitForHydration(page);
    }
  }

  /** The main navigation: sidebar on desktop, bottom tab bar on phones. */
  get nav() {
    return this.page.getByRole('navigation', { name: 'Main', includeHidden: false });
  }

  async goTo(tab: 'Home' | 'Search' | 'Library' | 'Stats'): Promise<void> {
    await this.nav.getByRole('button', { name: tab }).click();
    await expect(this.nav.getByRole('button', { name: tab })).toHaveAttribute('aria-current', 'page');
  }

  /** The transport "Play"/"Pause" button that is visible at this viewport. */
  get playPause() {
    return this.page.getByRole('button', { name: /^(Play|Pause)$/ });
  }

  /** Plays the seeded Road Mix from its first track (queue = all six tracks). Starts from Home. */
  async playRoadMix(): Promise<void> {
    await this.goTo('Home');
    await this.page.getByRole('button', { name: 'Play Road Mix' }).click();
    await this.expectNowPlaying(TRACKS[0]);
  }

  /** Moves focus to the page body so single-key shortcuts are not swallowed by a focused control. */
  async blurFocus(): Promise<void> {
    await this.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  }

  /** Starts a library track from a Home "Recent Listening" card or a list row, by title. */
  async startTrack(track: Track): Promise<void> {
    await this.page.getByRole('button', { name: `Play ${track.title} by ${track.artist}` }).first().click();
    await this.expectNowPlaying(track);
  }

  /** The visible now-playing title: PlaybackBar on desktop, mini player on phones. */
  async expectNowPlaying(track: Track): Promise<void> {
    const { page } = this;
    if (this.isMobile) {
      const mini = page.getByRole('region', { name: 'Mini player' });
      await expect(mini).toContainText(track.title);
    } else {
      await expect(page.locator('footer[aria-label="Playback"]')).toContainText(track.title);
    }
  }
}

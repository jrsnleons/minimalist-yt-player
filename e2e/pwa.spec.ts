import { test, expect, waitForHydration } from './helpers/test';

interface Manifest {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
  shortcuts?: { name: string; url: string; icons?: { src: string }[] }[];
}

test.describe('PWA', () => {
  test('manifest has a name, icons (including maskable) and shortcuts', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('json');
    const manifest = (await res.json()) as Manifest;

    expect(manifest.name).toBe('Onyx');
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');

    const purposes = manifest.icons.map((i) => i.purpose ?? 'any');
    expect(purposes).toContain('any');
    expect(purposes).toContain('maskable');
    expect(manifest.icons.some((i) => i.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === '512x512')).toBe(true);

    expect(manifest.shortcuts?.length).toBeGreaterThan(0);
    for (const shortcut of manifest.shortcuts ?? []) {
      expect(shortcut.name).toBeTruthy();
      expect(shortcut.url).toMatch(/^\//);
    }

    // Every icon the manifest points at exists.
    const urls = [...manifest.icons.map((i) => i.src), ...(manifest.shortcuts ?? []).flatMap((s) => (s.icons ?? []).map((i) => i.src))];
    for (const src of urls) {
      const icon = await request.get(src);
      expect(icon.ok(), `${src} should be served`).toBe(true);
      expect(icon.headers()['content-type']).toContain('image/');
    }
  });

  test('the page links the manifest and sets the theme color', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0b0b0e');
  });

  test.describe('service worker', () => {
    test.use({ serviceWorkers: 'allow' });
    // The worker is registered in production builds only (components/pwa/ServiceWorkerRegister.tsx).
    test.skip(process.env.PW_DEV === '1', 'service worker is not registered under `next dev`');

    test('sw.js registers and takes control of the page', async ({ page }) => {
      await page.goto('/');
      await waitForHydration(page);
      const scriptURL = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.scriptURL);
      expect(scriptURL).toMatch(/\/sw\.js$/);
    });
  });

  test('the offline fallback page is served', async ({ request }) => {
    const res = await request.get('/offline.html');
    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain('<html');
  });
});

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PW_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;
const CI = !!process.env.CI;

/**
 * PW_DEV=1 serves the app with `next dev` (no production build). Use it for quick local runs,
 * or where the production build cannot reach the network (it fetches a font for the OG image).
 * CI and the default run use a production build and `next start`.
 */
const DEV = process.env.PW_DEV === '1';

/** Only set when a machine keeps Chromium somewhere Playwright does not look. CI leaves it unset. */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : CI ? 2 : undefined,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
    // The app talks to nothing else; see e2e/helpers/test.ts.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      // Pixel 7 emulation (touch, isMobile, 412x915) on Chromium.
      use: { ...devices['Pixel 7'] },
      // Phone-size coverage is opt-in per test with the @mobile tag; the rest are keyboard/desktop flows.
      grep: /@mobile/,
    },
  ],
  webServer: {
    command: DEV ? `npx next dev -p ${PORT}` : `pnpm build && pnpm start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: DEV ? 120_000 : 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      // Force the in-memory SSE transport for Phone Remote, whatever the host environment has.
      ABLY_API_KEY: '',
    },
  },
});

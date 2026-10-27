import { devices } from '@playwright/test';
import { test, expect, LIBRARY, TRACKS, newMockedContext } from './helpers/test';

// Phone remote over the in-memory SSE relay (playwright.config.ts clears ABLY_API_KEY).
// Two browser contexts: the desktop "host" and a Pixel 7 "phone".

test.describe('phone remote', () => {
  test('pairs with the pairing link and controls the host', async ({ app, page, browser }) => {
    await app.open(LIBRARY);
    await app.playRoadMix();

    // Host: open Connect Phone and read the pairing link the QR code encodes.
    await page.getByRole('button', { name: 'Connect Phone' }).click();
    const modal = page.getByRole('dialog', { name: 'Connect Phone' });
    await expect(modal.getByText('Waiting for Phone')).toBeVisible();
    await expect(modal.getByRole('img', { name: /QR code for remote session/ })).toBeVisible();

    const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('onyx_remote_session') ?? 'null'));
    expect(session?.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(session?.token).toBeTruthy();
    const link = `${new URL(page.url()).origin}/remote/${session.code}#t=${session.token}`;

    // Phone: a separate device with its own storage.
    const phoneContext = await newMockedContext(browser, { ...devices['Pixel 7'] });
    try {
      const phone = await phoneContext.newPage();
      await phone.goto(link);

      await expect(phone.getByRole('heading', { name: 'Remote' })).toBeVisible();
      await expect(phone.getByText('Connected', { exact: true })).toBeVisible();
      await expect(phone.getByText(TRACKS[0].title, { exact: true }).first()).toBeVisible();
      await expect(modal.getByText('Phone Connected')).toBeVisible();

      // Next on the phone moves the host to the second track.
      await phone.getByRole('button', { name: 'Next' }).click();
      await app.expectNowPlaying(TRACKS[1]);
      await expect(phone.getByText(TRACKS[1].title, { exact: true }).first()).toBeVisible();

      // Pause on the phone pauses the host.
      await phone.getByRole('button', { name: 'Pause' }).click();
      await expect(app.playPause).toHaveAccessibleName('Play');

      // Ending the session on the host sends the phone back to the entry screen.
      await modal.getByRole('button', { name: 'End Session' }).click();
      await expect(phone.locator('#remote-code-error')).toContainText('The session ended');
    } finally {
      await phoneContext.close();
    }
  });

  test('rejects a wrong token', async ({ app, page, browser }) => {
    await app.open();
    await page.getByRole('button', { name: 'Connect Phone' }).click();
    await expect(page.getByRole('dialog', { name: 'Connect Phone' }).getByRole('img', { name: /QR code/ })).toBeVisible();
    const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('onyx_remote_session') ?? 'null'));

    const phoneContext = await newMockedContext(browser, { ...devices['Pixel 7'] });
    try {
      const phone = await phoneContext.newPage();
      await phone.goto(`/remote/${session.code}#t=not-the-real-token`);

      await expect(phone.locator('#remote-code-error')).toContainText('Session not found');
      await expect(phone.getByRole('heading', { name: 'Onyx Remote' })).toBeVisible();
      await expect(phone.getByText('Connected', { exact: true })).toHaveCount(0);
      // The host never saw a phone.
      await expect(page.getByRole('dialog', { name: 'Connect Phone' }).getByText('Waiting for Phone')).toBeVisible();
    } finally {
      await phoneContext.close();
    }
  });

  test('a bare code without the key asks for the full link', async ({ app, page, browser }) => {
    await app.open();
    await page.getByRole('button', { name: 'Connect Phone' }).click();
    await expect(page.getByRole('dialog', { name: 'Connect Phone' }).getByRole('img', { name: /QR code/ })).toBeVisible();
    const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('onyx_remote_session') ?? 'null'));

    const phoneContext = await newMockedContext(browser, { ...devices['Pixel 7'] });
    try {
      const phone = await phoneContext.newPage();
      await phone.goto(`/remote/${session.code}`);
      await expect(phone.locator('#remote-code-error')).toContainText('needs the full link');
    } finally {
      await phoneContext.close();
    }
  });
});

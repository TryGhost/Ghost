import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { fakeSettingsScreens, renderAdminApp } from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';

const { loading } = vi.hoisted(() => ({ loading: { screen: true } }));

// Hold each code-loading stage independently so the real shell's fallback
// remains on screen long enough to measure, regardless of network speed.
vi.mock('./load-settings', () => ({
  loadSettingsScreen: () => (loading.screen ? new Promise(() => {}) : import('./settings')),
  loadSettingsContent: () => new Promise(() => {}),
  preloadSettings: () => {},
}));

afterEach(async () => {
  await page.viewport(1280, 800);
});

async function expectCenteredSpinner() {
  const status = page.getByRole('status').filter({ hasText: 'Loading settings' });
  await expect.element(status).toBeVisible();
  const panelRect = sidebarScreen.shellMain().query()!.getBoundingClientRect();
  const spinnerRect = status.query()!.firstElementChild!.getBoundingClientRect();

  expect(panelRect.height).toBeGreaterThan(600);
  expect(spinnerRect.x + spinnerRect.width / 2).toBeCloseTo(panelRect.x + panelRect.width / 2, 0);
  expect(spinnerRect.y + spinnerRect.height / 2).toBeCloseTo(panelRect.y + panelRect.height / 2, 0);
}

describe('Settings loading', () => {
  it.each([true, false])(
    'centers the first screen load (admin7settings: %s)',
    async (admin7settings) => {
      await renderAdminApp('/settings', { labs: { admin7settings } });
      await expectCenteredSpinner();
    },
  );

  it('centers the first screen load on mobile', async () => {
    await page.viewport(390, 844);
    await renderAdminApp('/settings', { labs: { admin7settings: true } });
    await expectCenteredSpinner();
  });

  it('centers the content load after the settings navigation arrives', async () => {
    loading.screen = false;
    fakeSettingsScreens();
    await renderAdminApp('/settings', { labs: { admin7settings: true } });
    await expect.element(page.getByPlaceholder('Search settings')).toBeVisible();
    await expectCenteredSpinner();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  currentRoute,
  fakeAnalyticsOverview,
  currentUserResponse,
  fakeSettingsScreens,
  fakeTags,
  fakeTiers,
  renderAdminApp,
  settingsResponse,
  staffRole,
  tier,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { settingsScreen } from './settings.screen';

describe('Settings layout', () => {
  it('leaves immediately when the page is clean', async () => {
    fakeSettingsScreens();
    fakeAnalyticsOverview();
    await renderAdminApp('/settings');

    await settingsScreen.exitButton().click();

    await expect.poll(currentRoute).toBe('/analytics');
    await expect(settingsScreen.confirmationModal()).toHaveCount(0);
  });

  it('returns to the route that opened settings', async () => {
    fakeSettingsScreens();
    fakeTags([]);
    await renderAdminApp('/tags', { labs: { admin7settings: true } });

    await sidebarScreen.navLink('Settings').click();
    await expect.poll(currentRoute).toBe('/settings');

    await settingsScreen.exitButton().click();
    await expect.poll(currentRoute).toBe('/tags');
  });

  it('lets keyboard users reach Settings sections', async () => {
    fakeSettingsScreens();
    fakeAnalyticsOverview();
    await renderAdminApp('/settings', { labs: { admin7settings: true } });

    await expect.element(settingsScreen.search()).toHaveFocus();
    await userEvent.tab();

    await expect
      .element(page.getByRole('button', { name: 'Title & description', exact: true }))
      .toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(currentRoute).toBe('/settings/general');
    const about = page.getByRole('button', { name: 'About Ghost', exact: true });
    about.element().focus();
    await userEvent.keyboard(' ');
    await expect.poll(currentRoute).toBe('/settings/about');
  });

  it('keeps the Settings content scrollable inside the shell', async () => {
    fakeSettingsScreens();
    fakeAnalyticsOverview();
    await renderAdminApp('/settings', { labs: { admin7settings: true } });

    const scroller = () => document.getElementById('settings-scroller');
    await expect.poll(scroller).not.toBeNull();
    await expect.poll(() => scroller()!.scrollHeight - scroller()!.clientHeight).toBeGreaterThan(0);

    scroller()!.scrollTo({ top: scroller()!.scrollHeight });
    await expect.poll(() => scroller()!.scrollTop).toBeGreaterThan(0);
  });

  it('falls back to the landing route when nothing opened settings', async () => {
    fakeSettingsScreens();
    fakeAnalyticsOverview();
    await renderAdminApp('/settings', { labs: { admin7settings: true } });

    await settingsScreen.exitButton().click();
    await expect.poll(currentRoute).toBe('/analytics');
  });

  it('returns to the opening route on ESC', async () => {
    fakeSettingsScreens();
    fakeTags([]);
    await renderAdminApp('/tags', { labs: { admin7settings: true } });

    await sidebarScreen.navLink('Settings').click();
    await expect.poll(currentRoute).toBe('/settings');
    // The URL changes before Settings mounts its Escape handler.
    await expect.element(settingsScreen.titleAndDescription()).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await expect.poll(currentRoute).toBe('/tags');
  });

  it.each([false, true])(
    'can stay on or leave a dirty page with admin7settings %s',
    async (admin7settings) => {
      fakeSettingsScreens();
      fakeAnalyticsOverview();
      await renderAdminApp('/settings', { labs: { admin7settings } });

      await settingsScreen.editTitle('New Site Title');
      await settingsScreen.exitButton().click();

      await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
      await settingsScreen.confirmationAction('Stay').click();
      await expect.poll(currentRoute).toBe('/settings');
      await expect(settingsScreen.confirmationModal()).toHaveCount(0);

      await settingsScreen.exitButton().click();
      await settingsScreen.confirmationAction('Leave').click();
      await expect.poll(currentRoute).toBe('/analytics');
    },
  );

  it.each([false, true])(
    'confirms before leaving a dirty page with Escape and admin7settings %s',
    async (admin7settings) => {
      fakeSettingsScreens();
      await renderAdminApp('/settings', { labs: { admin7settings } });

      await settingsScreen.editTitle('New Site Title');
      // Opening once synchronizes the page-level dirty-state effect; Stay
      // preserves that dirty state for the Escape path under test.
      await settingsScreen.exitButton().click();
      await settingsScreen.confirmationAction('Stay').click();
      await expect(settingsScreen.confirmationModal()).toHaveCount(0);
      await userEvent.keyboard('{Escape}');

      await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
      await expect.poll(currentRoute).toBe('/settings');
    },
  );

  it('closes a modal dropdown with Escape without closing the modal', async () => {
    fakeSettingsScreens();
    fakeTiers([tier({ name: 'Supporter' })]);
    await renderAdminApp('/settings/portal/edit', {
      boot: {
        browseSettings: {
          response: settingsResponse({
            settings: {
              stripe_connect_publishable_key: 'pk_test_123',
              stripe_connect_secret_key: 'sk_test_123',
            },
          }),
        },
      },
    });

    const modal = settingsScreen.portalModal();
    await expect.element(modal).toBeVisible();
    await modal.getByLabelText('Default price at signup').click();
    await expect.element(settingsScreen.selectOptionExact('Yearly')).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await expect(settingsScreen.selectOptionExact('Yearly')).toHaveCount(0);
    await expect.element(modal).toBeVisible();
    await expect.poll(currentRoute).toBe('/settings/portal/edit');
  });
});

describe('Settings layout on mobile', () => {
  const toggleSidebar = () => page.getByRole('button', { name: 'Toggle Sidebar' });
  // On mobile these app-nav links only exist inside the sidebar sheet, not the bottom bar.
  const sheetLink = (name: string) => page.getByRole('link', { name, exact: true });

  afterEach(async () => {
    await page.viewport(1280, 800);
  });

  it('keeps search and the back button on the page', async () => {
    fakeSettingsScreens();
    fakeTags([]);
    await page.viewport(390, 844);
    await renderAdminApp('/tags', { labs: { admin7settings: true } });

    await toggleSidebar().click();
    await sheetLink('Settings').click();
    await expect.poll(currentRoute).toBe('/settings');

    await expect.element(settingsScreen.search()).toBeVisible();
    await expect.element(settingsScreen.exitButton()).toBeVisible();
    await expect(toggleSidebar()).toHaveCount(0);
    await expect.element(settingsScreen.search()).not.toHaveFocus();

    expect(settingsScreen.exitButton().element().getBoundingClientRect().left).toBe(32);
    expect(
      page.getByRole('heading', { name: 'General settings' }).element().getBoundingClientRect()
        .left,
    ).toBe(32);

    await settingsScreen.exitButton().click();
    await expect.poll(currentRoute).toBe('/tags');
  });

  it('keeps search and the back button on the page for Editors', async () => {
    fakeSettingsScreens();
    await page.viewport(390, 844);
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Editor' })];
    await renderAdminApp('/settings/staff', {
      labs: { admin7settings: true },
      boot: { browseMe: { response: me } },
    });

    await expect.element(settingsScreen.search()).toBeVisible();
    await expect.element(settingsScreen.exitButton()).toBeVisible();
    await expect(toggleSidebar()).toHaveCount(0);

    expect(settingsScreen.exitButton().element().getBoundingClientRect().left).toBeCloseTo(
      page.getByRole('heading', { name: 'Settings' }).element().getBoundingClientRect().left,
      0,
    );
  });

  it('shows every section and a no-result message for an unmatched search', async () => {
    fakeSettingsScreens();
    fakeAnalyticsOverview();
    await page.viewport(390, 844);
    await renderAdminApp('/settings', { labs: { admin7settings: true } });

    await settingsScreen.search().fill('zzzz');

    await expect.element(page.getByText('No result', { exact: true })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Title & description' })).toBeVisible();
  });

  it('keeps unsaved edits and Settings controls across mobile and desktop', async () => {
    fakeSettingsScreens();
    fakeAnalyticsOverview();
    await renderAdminApp('/settings', { labs: { admin7settings: true } });

    await settingsScreen.editTitle('Unsaved after resize');

    await page.viewport(390, 844);
    await expect.element(settingsScreen.search()).toBeVisible();
    await expect.element(settingsScreen.exitButton()).toBeVisible();

    await expect
      .element(page.getByLabelText('Site title', { exact: true }))
      .toHaveValue('Unsaved after resize');
    await page.viewport(1280, 800);
    await expect.element(settingsScreen.search()).toBeVisible();
    await expect.element(settingsScreen.exitButton()).toBeVisible();
    await expect
      .element(page.getByLabelText('Site title', { exact: true }))
      .toHaveValue('Unsaved after resize');
  });
});

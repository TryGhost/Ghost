import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  currentRoute,
  fakeAnalyticsOverview,
  fakeSettingsScreens,
  fakeTags,
  fakeTiers,
  renderAdminApp,
  settingsResponse,
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
    await expect.element(settingsScreen.search()).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await expect.poll(currentRoute).toBe('/tags');
  });

  it('can stay on or leave a dirty page from the confirmation', async () => {
    fakeSettingsScreens();
    fakeAnalyticsOverview();
    await renderAdminApp('/settings');

    await settingsScreen.editTitle('New Site Title');
    await settingsScreen.exitButton().click();

    await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
    await settingsScreen.confirmationAction('Stay').click();
    await expect.poll(currentRoute).toBe('/settings');
    await expect(settingsScreen.confirmationModal()).toHaveCount(0);

    await settingsScreen.exitButton().click();
    await settingsScreen.confirmationAction('Leave').click();
    await expect.poll(currentRoute).toBe('/analytics');
  });

  it('confirms before leaving a dirty page with Escape', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings');

    await settingsScreen.editTitle('New Site Title');
    // Opening once synchronizes the page-level dirty-state effect; Stay
    // preserves that dirty state for the Escape path under test.
    await settingsScreen.exitButton().click();
    await settingsScreen.confirmationAction('Stay').click();
    await expect(settingsScreen.confirmationModal()).toHaveCount(0);
    await userEvent.keyboard('{Escape}');

    await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
    await expect.poll(currentRoute).toBe('/settings');
  });

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

describe('Settings navigation on mobile', () => {
  const toggleSidebar = () => page.getByRole('button', { name: 'Toggle Sidebar' });
  // On mobile these app-nav links only exist inside the sidebar sheet, not the bottom bar.
  const sheetLink = (name: string) => page.getByRole('link', { name, exact: true });

  afterEach(async () => {
    await page.viewport(1280, 800);
  });

  it('shows the settings nav in the sheet and closes it after navigating', async () => {
    fakeSettingsScreens();
    fakeAnalyticsOverview();
    await page.viewport(390, 844);
    await renderAdminApp('/settings', { labs: { admin7settings: true } });

    await toggleSidebar().click();
    await expect.element(settingsScreen.navItem('Design & branding')).toBeVisible();
    // The sheet must not steal focus into search (and pop the phone keyboard).
    await expect.element(settingsScreen.search()).not.toHaveFocus();

    await settingsScreen.navItem('Design & branding').click();
    await expect.poll(currentRoute).toBe('/settings/design');
    await expect(settingsScreen.search()).toHaveCount(0);

    // Scrolling after the sheet unmounted must not touch the detached nav.
    document.getElementById('settings-scroller')?.scrollBy({ top: 400 });
    await expect.element(settingsScreen.navigation()).toBeInTheDocument();
  });

  it('keeps the settings nav after resizing between mobile and desktop', async () => {
    fakeSettingsScreens();
    fakeAnalyticsOverview();
    await renderAdminApp('/settings', { labs: { admin7settings: true } });
    await expect.element(settingsScreen.navItem('Design & branding')).toBeVisible();

    await page.viewport(390, 844);
    await toggleSidebar().click();
    await expect.element(settingsScreen.navItem('Design & branding')).toBeVisible();

    await page.viewport(1280, 800);
    await expect.element(settingsScreen.navItem('Design & branding')).toBeVisible();
  });

  it('closes the sheet when going back to the app', async () => {
    fakeSettingsScreens();
    fakeTags([]);
    await page.viewport(390, 844);
    await renderAdminApp('/tags', { labs: { admin7settings: true } });

    // On mobile the app nav, including Settings, lives in the sheet.
    await toggleSidebar().click();
    await sheetLink('Settings').click();
    await expect.poll(currentRoute).toBe('/settings');

    await toggleSidebar().click();
    await settingsScreen.exitButton().click();
    await expect.poll(currentRoute).toBe('/tags');
    await expect.element(page.getByRole('heading', { name: 'Tags' })).toBeVisible();
    await expect(sheetLink('Drafts')).toHaveCount(0);
  });
});

import { describe, expect, it, onTestFinished } from 'vitest';
import { page } from 'vitest/browser';

import {
  currentRoute,
  currentUserResponse,
  fakeSettingsScreens,
  renderAdminApp,
  type CurrentUserResponse,
  unsavedChangesGuarded,
} from '@test-utils/acceptance';
import { settingsScreen } from './settings.screen';

const GROUPED = { labs: { settingsGroupedNav: true } };

const groupFades = (group: string) =>
  document
    .querySelector(`[data-settings-group="${group}"]`)
    ?.getAnimations()
    .filter((animation) => animation.id === 'settings-group-fade').length ?? 0;

function currentUserWithRole(name: string): CurrentUserResponse {
  const response = currentUserResponse();
  const user = response.users[0];
  user.roles = [{ ...(user.roles as Array<Record<string, unknown>>)[0], name }];
  return response;
}

describe('Settings grouped navigation', () => {
  it('shows one group at a time and switches from its header', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', GROUPED);

    await expect
      .element(settingsScreen.groupHeader('General settings'))
      .toHaveAttribute('aria-expanded', 'true');
    await expect
      .element(settingsScreen.groupHeader('Site'))
      .toHaveAttribute('aria-expanded', 'false');
    await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
    await expect.element(settingsScreen.design()).not.toBeVisible();

    await settingsScreen.groupHeader('Site').click();

    await expect.poll(currentRoute).toBe('/settings/site');
    await expect
      .element(settingsScreen.groupHeader('Site'))
      .toHaveAttribute('aria-expanded', 'true');
    await expect.element(settingsScreen.design()).toBeVisible();
    await expect.element(settingsScreen.titleAndDescription()).not.toBeVisible();
  });

  it('opens the group a deep link belongs to', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings/metadata', GROUPED);

    await expect
      .element(settingsScreen.groupHeader('Search & social'))
      .toHaveAttribute('aria-expanded', 'true');
    await expect.element(settingsScreen.seoMeta()).toBeVisible();
    await expect.element(settingsScreen.titleAndDescription()).not.toBeVisible();
  });

  it('searches every group, and a group header leaves the search in place', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', GROUPED);

    await settingsScreen.search().fill('social');

    await expect.element(settingsScreen.socialAccounts()).toBeVisible();
    await expect.element(settingsScreen.titleAndDescription()).not.toBeVisible();

    await settingsScreen.groupHeader('Search & social').click();

    await expect.poll(currentRoute).toBe('/settings');
    await expect.element(settingsScreen.search()).toHaveValue('social');
    await expect.element(settingsScreen.socialAccounts()).toBeVisible();
  });

  it('only fades a group in when it opens, not when a search clears', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', GROUPED);
    await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
    await expect.poll(() => groupFades('general')).toBe(0);

    await settingsScreen.search().fill('timezone');
    await expect.element(settingsScreen.timezone()).toBeVisible();
    await settingsScreen.search().fill('');

    await expect.element(settingsScreen.design()).not.toBeVisible();
    expect(groupFades('general')).toBe(0);

    await settingsScreen.groupHeader('Site').click();
    await expect.poll(() => groupFades('site')).toBe(1);
  });

  it('asks before leaving a group with unsaved changes', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', GROUPED);

    await settingsScreen.editTitle('New Site Title');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await settingsScreen.groupHeader('Site').click();

    await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
    await settingsScreen.confirmationAction('Stay').click();
    await expect(settingsScreen.confirmationModal()).toHaveCount(0);
    await expect.poll(currentRoute).toBe('/settings');
    await expect.element(settingsScreen.titleInput()).toHaveValue('New Site Title');

    await settingsScreen.groupHeader('Site').click();
    await expect.element(settingsScreen.confirmationModal()).toBeVisible();
    await settingsScreen.confirmationAction('Leave').click();
    await expect.poll(currentRoute).toBe('/settings/site');
    await expect.element(settingsScreen.design()).toBeVisible();

    // Leaving dropped the edit
    await settingsScreen.groupHeader('General settings').click();
    await expect(settingsScreen.confirmationModal()).toHaveCount(0);
    await expect.element(settingsScreen.titleEditButton()).toBeVisible();
  });

  it('asks before going back to another group with unsaved changes', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', GROUPED);

    await settingsScreen.groupHeader('Site').click();
    await expect.poll(currentRoute).toBe('/settings/site');
    await settingsScreen.groupHeader('General settings').click();
    await expect.poll(currentRoute).toBe('/settings/general-settings');

    await settingsScreen.editTitle('New Site Title');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    history.back();

    await expect.element(settingsScreen.confirmationModal()).toBeVisible();
    await settingsScreen.confirmationAction('Stay').click();
    await expect.poll(currentRoute).toBe('/settings/general-settings');
  });

  it('moves within a group with unsaved changes without asking', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', GROUPED);

    await settingsScreen.editTitle('New Site Title');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await settingsScreen.navItem('Timezone').click();

    await expect.poll(currentRoute).toBe('/settings/timezone');
    await expect(settingsScreen.confirmationModal()).toHaveCount(0);
  });

  it('keeps editors on their staff page', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', {
      ...GROUPED,
      boot: { browseMe: { response: currentUserWithRole('Editor') } },
    });

    await expect.element(settingsScreen.users()).toBeVisible();
    await expect(settingsScreen.sidebar()).toHaveCount(0);
  });

  it('keeps the stacked page without the flag', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings');

    await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
    await expect.element(settingsScreen.design()).toBeVisible();
    await expect(settingsScreen.groupHeader('General settings')).toHaveCount(0);
    await expect(settingsScreen.sidebar().getByRole('heading', { name: 'Growth' })).toHaveCount(1);
  });

  it('keeps the stacked page on mobile, where the group navigation is unavailable', async () => {
    await page.viewport(390, 844);
    onTestFinished(() => page.viewport(1280, 800));
    fakeSettingsScreens();
    await renderAdminApp('/settings', GROUPED);

    await expect(settingsScreen.sidebar()).toHaveCount(0);
    await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
    await expect.element(settingsScreen.design()).toBeVisible();
  });

  it('does not drop dirty edits when crossing the mobile breakpoint', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', GROUPED);

    await settingsScreen.editTitle('New Site Title');
    await expect.poll(unsavedChangesGuarded).toBe(true);

    await page.viewport(390, 844);
    onTestFinished(() => page.viewport(1280, 800));

    await expect.element(settingsScreen.titleInput()).toHaveValue('New Site Title');
    await expect.element(settingsScreen.design()).not.toBeVisible();

    await settingsScreen.titleCancelButton().click();
    await expect.poll(unsavedChangesGuarded).toBe(false);
    await expect.element(settingsScreen.design()).toBeVisible();
  });

  it('activates an off-group search result before it can become dirty', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings/site', GROUPED);

    await settingsScreen.search().fill('title');
    await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
    await settingsScreen.titleEditButton().click();

    await expect.poll(currentRoute).toBe('/settings/general-settings');
    await expect.element(settingsScreen.search()).toHaveValue('');
    await settingsScreen.titleInput().fill('New Site Title');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await expect.element(settingsScreen.titleAndDescription()).toBeVisible();
    await expect.element(settingsScreen.design()).not.toBeVisible();
  });
});

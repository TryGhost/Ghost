import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  currentRoute,
  currentUserResponse,
  fakeAnalyticsOverview,
  fakeSettingsScreens,
  fakeTiers,
  renderAdminApp,
  settingsResponse,
  tier,
} from '@test-utils/acceptance';
import { settingsScreen } from './settings.screen';

describe('Settings layout', () => {
  it.each([true, false])(
    'uses Admin 7 typography in Settings only when enabled (%s)',
    async (enabled) => {
      fakeSettingsScreens();
      await renderAdminApp('/settings', { labs: { admin7PageChrome: enabled } });

      await expect.element(settingsScreen.search()).toBeVisible();
      const heading = page.getByRole('heading', { name: 'General settings', exact: true }).first();
      const titleAndDescriptionEdit = settingsScreen
        .titleAndDescription()
        .getByRole('button', { name: 'Edit' });
      await expect.element(titleAndDescriptionEdit).toBeVisible();
      const elements = [
        ...page.getByRole('heading', { name: 'General settings', exact: true }).elements(),
        settingsScreen.search().element(),
        titleAndDescriptionEdit.element(),
      ];
      for (const element of elements) {
        await expect
          .poll(() => getComputedStyle(element).fontFamily.includes('Inter Admin 7'))
          .toBe(enabled);
      }
      if (enabled) {
        const headingFeatures = getComputedStyle(heading.element()).fontFeatureSettings;
        const searchFeatures = getComputedStyle(
          settingsScreen.search().element(),
        ).fontFeatureSettings;
        expect(headingFeatures).toContain('dlig');
        expect(headingFeatures).toContain('cv05');
        expect(searchFeatures).not.toContain('dlig');
        expect(searchFeatures).not.toContain('cv05');
      }
      expect(document.querySelector('.admin7') !== null).toBe(enabled);
      expect(
        getComputedStyle(document.querySelector('#root > div')!).getPropertyValue(
          '--content-width',
        ),
      ).toBe('');
      expect(getComputedStyle(document.body).fontFamily).not.toContain('Inter Admin 7');
      await expect.element(settingsScreen.sidebar()).toBeVisible();
      await expect.element(settingsScreen.exitButton()).toBeVisible();
    },
  );

  it('uses Admin 7 typography without page chrome in dark mode', async () => {
    fakeSettingsScreens();
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({ nightShift: 'dark' });
    await renderAdminApp('/settings', {
      labs: { admin7PageChrome: true },
      boot: { browseMe: { response: me } },
    });
    await expect.element(settingsScreen.search()).toBeVisible();
    await expect.poll(() => document.documentElement.classList.contains('dark')).toBe(true);
    expect(getComputedStyle(settingsScreen.search().element()).fontFamily).toContain(
      'Inter Admin 7',
    );
    expect(document.querySelector('.admin7')).not.toBeNull();
    expect(
      getComputedStyle(document.querySelector('.admin7')!).getPropertyValue('--content-width'),
    ).toBe('');
  });

  it('limits Settings typography to desktop without opting into page chrome', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', { labs: { admin7PageChrome: true } });
    await expect.element(settingsScreen.search()).toBeVisible();
    const hasNewFont = () =>
      getComputedStyle(settingsScreen.search().element()).fontFamily.includes('Inter Admin 7');
    await expect.poll(hasNewFont).toBe(true);
    try {
      await page.viewport(800, 800);
      await expect.poll(hasNewFont).toBe(false);
      expect(document.querySelector('.admin7')).toBeNull();
      await page.viewport(801, 800);
      await expect.poll(hasNewFont).toBe(true);
      expect(document.querySelector('.admin7')).not.toBeNull();
      expect(
        getComputedStyle(document.querySelector('.admin7')!).getPropertyValue('--content-width'),
      ).toBe('');
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('leaves immediately when the page is clean', async () => {
    fakeSettingsScreens();
    fakeAnalyticsOverview();
    await renderAdminApp('/settings');

    await settingsScreen.exitButton().click();

    await expect.poll(currentRoute).toBe('/analytics');
    await expect(settingsScreen.confirmationModal()).toHaveCount(0);
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
      labs: { admin7PageChrome: true },
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
    await expect
      .poll(() => getComputedStyle(modal.element()).fontFamily)
      .toContain('Inter Admin 7');
    await modal.getByLabelText('Default price at signup').click();
    await expect.element(settingsScreen.selectOptionExact('Yearly')).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await expect(settingsScreen.selectOptionExact('Yearly')).toHaveCount(0);
    await expect.element(modal).toBeVisible();
    await expect.poll(currentRoute).toBe('/settings/portal/edit');
  });
});

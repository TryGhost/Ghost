import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  currentRoute,
  fakeEditSettings,
  fakeSettingsScreens,
  renderAdminApp,
  settingsResponse,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

function withStripe(
  settings: Record<string, string | boolean | number | null> = {},
): RenderAdminAppOptions {
  return {
    boot: {
      browseSettings: {
        response: settingsResponse({
          settings: {
            ...settings,
            donations_enabled: true,
            stripe_connect_publishable_key: 'pk_test_123',
            stripe_connect_secret_key: 'sk_test_123',
            stripe_connect_display_name: 'Dummy',
            stripe_connect_account_id: 'acct_123',
          },
        }),
      },
    },
  };
}

describe('Tips and donations settings', () => {
  it('closes the currency dropdown with Escape without closing Settings', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', withStripe());

    const currency = settingsScreen.tipsAndDonations().getByRole('combobox', { name: 'Currency' });
    await currency.click();
    const search = page.getByPlaceholder('Search currencies...');
    await expect.element(search).toBeVisible();

    await userEvent.keyboard('{Escape}');

    await expect(search).toHaveCount(0);
    await expect.element(currency).toBeVisible();
    await expect.poll(currentRoute).toBe('/settings');
  });

  it('is hidden when Stripe is disabled', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings');

    await expect(settingsScreen.tipsAndDonations()).toHaveCount(0);
    await expect(settingsScreen.navItem('Tips & donations')).toHaveCount(0);
  });

  it('shows the suggested amount and shareable link when Stripe is enabled', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', withStripe());

    const section = settingsScreen.tipsAndDonations();
    await expect.element(section).toBeVisible();
    await expect.element(settingsScreen.suggestedAmount()).toHaveValue('5');
    await expect
      .element(section.getByRole('combobox', { name: 'Currency' }))
      .toHaveTextContent('USD');
    await expect
      .element(settingsScreen.donateUrl())
      .toHaveTextContent('http://test.com/#/portal/support');
    await userEvent.hover(settingsScreen.donateUrl().element());

    await expect.element(settingsScreen.previewShareableLink()).toBeVisible();
    await expect.element(settingsScreen.copyShareableLink()).toBeVisible();
  });

  it.each([
    { amount: 725, expected: '7.25', source: 'a backend number' },
    { amount: '825', expected: '8.25', source: 'a dirty local string' },
  ])('accepts a valid suggested amount from $source', async ({ amount, expected }) => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', withStripe({ donations_suggested_amount: amount }));

    await expect.element(settingsScreen.suggestedAmount()).toHaveValue(expected);
  });

  it('shows the section error boundary for malformed donation settings', async () => {
    fakeSettingsScreens();
    await renderAdminApp(
      '/settings',
      withStripe({
        donations_currency: 'ZZZ',
        donations_suggested_amount: 'not-a-number',
      }),
    );

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent(
        'An error occurred loading Tips & donations. Please refresh and try again.',
      );
    await expect(settingsScreen.tipsAndDonations()).toHaveCount(0);
    await expect(settingsScreen.suggestedAmount()).toHaveCount(0);
  });

  it('saves an updated suggested amount', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings', withStripe());

    const section = settingsScreen.tipsAndDonations();
    await settingsScreen.suggestedAmount().fill('7.25');
    await section.getByRole('button', { name: 'Save' }).click();

    await expect(settingsApi).toHaveEditedSettings([
      { key: 'donations_suggested_amount', value: '725' },
    ]);
  });

  it("blocks suggested amounts above Stripe's maximum", async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings', withStripe());

    const section = settingsScreen.tipsAndDonations();
    const amount = settingsScreen.suggestedAmount();
    await amount.fill('10000.01');
    await userEvent.tab();
    await section.getByRole('button', { name: 'Save' }).click();

    await expect.element(section).toHaveTextContent('Suggested amount cannot be more than $10000.');
    expect(settingsApi.requests).toHaveLength(0);

    await section.getByRole('button', { name: 'Cancel' }).click();
    await expect.element(amount).toHaveValue('5');
  });
});

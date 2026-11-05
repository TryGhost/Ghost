import { describe, expect, it } from 'vitest';

import {
  configResponse,
  fakeAdminEndpoint,
  fakeEditSettings,
  fakeSettingsScreens,
  fakeTiers,
  renderAdminApp,
  settingsResponse,
  tier,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

const freeTier = tier({ id: '645453f4d254799990dd0e21', name: 'Free', slug: 'free', type: 'free' });

describe('Stripe settings', () => {
  it('saves a secure key delivered by account.ghost.org without a click, and enables Portal plans', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    const settingsApi = fakeAdminEndpoint('PUT', '/settings/', ({ body }) => {
      const request = body as { settings: Array<{ key: string; value: string }> };
      const isConnectionComplete = request.settings.some(({ key }) => key === 'portal_plans');
      return settingsResponse({
        settings: {
          ...(isConnectionComplete
            ? {
                stripe_connect_display_name: 'Dummy',
                stripe_connect_livemode: false,
                stripe_connect_account_id: 'acct_123',
                stripe_connect_publishable_key: 'pk_test_123',
                stripe_connect_secret_key: 'sk_test_123',
              }
            : {}),
          ...Object.fromEntries(request.settings.map(({ key, value }) => [key, value])),
        },
      });
    });
    const tierApi = fakeAdminEndpoint('PUT', /^\/tiers\/[^/]+\/$/, ({ body }) => body);
    // A secure key is base64, so it carries characters URLs encode.
    const key = 'eyJsIjpmYWxzZX0+/=';
    await renderAdminApp(`/settings/stripe-connect?${new URLSearchParams({ secure_key: key })}`);

    expect(window.location.hash).toBe('#/settings/stripe-connect');
    const modal = settingsScreen.stripeModal();
    await expect.element(modal.getByText(/You are connected with Stripe!/)).toBeVisible();
    expect(settingsApi.requests.map((request) => request.body)).toEqual([
      { settings: [{ key: 'stripe_connect_integration_token', value: key }] },
      { settings: [{ key: 'portal_plans', value: '["free","monthly","yearly"]' }] },
    ]);
    expect(tierApi.lastRequest?.body).toMatchObject({
      tiers: [{ id: freeTier.id, monthly_price: 500, yearly_price: 5000, currency: 'USD' }],
    });
  });

  it('shows a rejected secure key as an error with the Connect button, and has no paste box', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    const settingsApi = fakeAdminEndpoint(
      'PUT',
      '/settings/',
      { errors: [{ message: 'The Stripe Connect token could not be parsed.' }] },
      { status: 400 },
    );
    await renderAdminApp('/settings/stripe-connect?secure_key=stale');

    const modal = settingsScreen.stripeModal();
    await expect
      .element(modal.getByText(/Stripe couldn’t be connected. The connection may have expired/))
      .toBeVisible();
    expect(settingsApi.requests).toHaveLength(1);
    const connectLink = modal.getByRole('link', { name: 'Connect with Stripe' });
    await expect
      .element(connectLink)
      .toHaveAttribute('href', '/ghost/api/admin/members/stripe_connect?mode=live');
    await expect.element(connectLink).not.toHaveAttribute('target');
    await modal.getByLabelText('Test mode').click();
    await expect
      .element(connectLink)
      .toHaveAttribute('href', '/ghost/api/admin/members/stripe_connect?mode=test');
    expect(modal.getByPlaceholder('Paste your secure key here').elements()).toHaveLength(0);
  });

  it('saves Stripe Direct keys', async () => {
    const config = configResponse();
    config.config.stripeDirect = true;
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings', { boot: { browseConfig: { response: config } } });

    await settingsScreen.tiers().getByRole('button', { name: 'Connect with Stripe' }).click();
    const modal = settingsScreen.stripeModal();
    await modal.getByLabelText('Publishable key').fill('pk_test_123');
    await modal.getByLabelText('Secure key').fill('sk_test_123');
    await modal.getByRole('button', { name: 'Save Stripe settings' }).click();

    await expect(modal).toHaveCount(0);
    await expect(settingsApi).toHaveEditedSettings([
      { key: 'stripe_secret_key', value: 'sk_test_123' },
      { key: 'stripe_publishable_key', value: 'pk_test_123' },
    ]);
    await expect
      .element(settingsScreen.tiers().getByText('Connected to Stripe').first())
      .toBeVisible();
  });
});

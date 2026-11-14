import { describe, expect, it } from 'vitest';

import {
  configResponse,
  currentRoute,
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

// What clicking Connect with Stripe in this tab leaves behind.
const startConnectionInThisTab = () =>
  sessionStorage.setItem('ghost-stripe-connect-started', String(Date.now()));
// The account.ghost.org flow is behind this alpha lab, and Ghost Core says
// it's in use with stripeConnectBridge.
const labs = { oauthBridge: true };
const bridgeConfig = () => {
  const response = configResponse();
  response.config.stripeConnectBridge = true;
  return { browseConfig: { response } };
};
const accountKey = btoa(JSON.stringify({ n: 'Dummy Co', i: 'acct_123', l: false, s: 'state' }));

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
    startConnectionInThisTab();
    await renderAdminApp(`/settings/stripe-connect?${new URLSearchParams({ secure_key: key })}`, {
      labs,
      boot: bridgeConfig(),
    });

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

  it('stays connected and shows the error when setting the tier prices fails', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    const settingsApi = fakeAdminEndpoint('PUT', '/settings/', ({ body }) => {
      const request = body as { settings: Array<{ key: string; value: string }> };
      return settingsResponse({
        settings: {
          stripe_connect_display_name: 'Dummy',
          stripe_connect_livemode: false,
          stripe_connect_account_id: 'acct_123',
          stripe_connect_publishable_key: 'pk_test_123',
          stripe_connect_secret_key: 'sk_test_123',
          ...Object.fromEntries(request.settings.map(({ key, value }) => [key, value])),
        },
      });
    });
    fakeAdminEndpoint(
      'PUT',
      /^\/tiers\/[^/]+\/$/,
      { errors: [{ message: 'Tier prices could not be saved.' }] },
      { status: 500 },
    );
    startConnectionInThisTab();
    await renderAdminApp(
      `/settings/stripe-connect?${new URLSearchParams({ secure_key: accountKey })}`,
      { labs, boot: bridgeConfig() },
    );

    // The toast comes first: the prices fail before Portal's plans are saved.
    await expect.element(settingsScreen.errorToast()).toBeVisible();
    const modal = settingsScreen.stripeModal();
    await expect.element(modal.getByText(/You are connected with Stripe!/)).toBeVisible();
    // Stripe shows as connected once its keys are saved; Portal's plans follow.
    await expect
      .poll(() => settingsApi.requests.map((request) => request.body), { timeout: 5000 })
      .toEqual([
        { settings: [{ key: 'stripe_connect_integration_token', value: accountKey }] },
        { settings: [{ key: 'portal_plans', value: '["free","monthly","yearly"]' }] },
      ]);
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
    startConnectionInThisTab();
    await renderAdminApp('/settings/stripe-connect?secure_key=stale', {
      labs,
      boot: bridgeConfig(),
    });

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

  it('asks before saving a secure key that this tab did not start a connection for', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    fakeAdminEndpoint('PUT', /^\/tiers\/[^/]+\/$/, ({ body }) => body);
    const settingsApi = fakeEditSettings();
    await renderAdminApp(
      `/settings/stripe-connect?${new URLSearchParams({ secure_key: accountKey })}`,
      { labs, boot: bridgeConfig() },
    );

    const modal = settingsScreen.stripeModal();
    await expect.element(modal.getByText('Connect this Stripe account?')).toBeVisible();
    await expect.element(modal.getByText('Dummy Co')).toBeVisible();
    await expect.element(modal.getByText('acct_123')).toBeVisible();
    expect(settingsApi.requests).toHaveLength(0);

    await modal.getByRole('button', { name: 'Connect this account' }).click();
    await expect
      .poll(() => settingsApi.requests, { timeout: 5000 })
      .toEqual([
        { settings: [{ key: 'stripe_connect_integration_token', value: accountKey }] },
        { settings: [{ key: 'portal_plans', value: '["free","monthly","yearly"]' }] },
      ]);
  });

  it('drops an unasked-for secure key when the admin cancels', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    const settingsApi = fakeEditSettings();
    await renderAdminApp(
      `/settings/stripe-connect?${new URLSearchParams({ secure_key: accountKey })}`,
      { labs, boot: bridgeConfig() },
    );

    const modal = settingsScreen.stripeModal();
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect.element(modal.getByRole('link', { name: 'Connect with Stripe' })).toBeVisible();
    expect(settingsApi.requests).toHaveLength(0);
  });

  it('refuses an unasked-for secure key that is not a Stripe key', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings/stripe-connect?secure_key=stale', {
      labs,
      boot: bridgeConfig(),
    });
    await expect
      .element(settingsScreen.stripeModal().getByText(/This link isn’t a Stripe connection/))
      .toBeVisible();
    expect(settingsApi.requests).toHaveLength(0);
  });

  it('forgets a secure key that arrives while Stripe is already connected', async () => {
    let connected = true;
    const stripeSettings = () => ({
      stripe_connect_display_name: connected ? 'Old Co' : null,
      stripe_connect_livemode: connected ? false : null,
      stripe_connect_account_id: connected ? 'acct_old' : null,
      stripe_connect_publishable_key: connected ? 'pk_test_old' : null,
      stripe_connect_secret_key: connected ? 'sk_test_old' : null,
    });
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    fakeAdminEndpoint('GET', /^\/settings\/(\?.*)?$/, () =>
      settingsResponse({ settings: stripeSettings() }),
    );
    fakeAdminEndpoint('GET', /^\/members\/\?/, {
      members: [],
      meta: { pagination: { page: 1, limit: 0, pages: 1, total: 0, next: null, prev: null } },
    });
    fakeAdminEndpoint('DELETE', '/settings/stripe/connect/', () => {
      connected = false;
      return new Response(null, { status: 204 });
    });
    const settingsApi = fakeEditSettings();
    startConnectionInThisTab();
    await renderAdminApp(
      `/settings/stripe-connect?${new URLSearchParams({ secure_key: accountKey })}`,
      {
        labs,
        boot: {
          ...bridgeConfig(),
          browseSettings: {
            response: () => Promise.resolve(settingsResponse({ settings: stripeSettings() })),
          },
        },
      },
    );

    const modal = settingsScreen.stripeModal();
    await expect.element(modal.getByText(/You are connected with Stripe!/)).toBeVisible();
    await modal.getByRole('button', { name: 'Disconnect' }).click();
    await settingsScreen.confirmationModal().getByRole('button', { name: 'Disconnect' }).click();
    await expect.poll(currentRoute).toBe('/settings/tiers');

    await settingsScreen.tiers().getByRole('button', { name: 'Connect with Stripe' }).click();
    await expect.element(settingsScreen.stripeModal().getByText('Getting paid')).toBeVisible();
    expect(settingsApi.requests).toHaveLength(0);
  });

  it.each([
    ['an older Ghost Core, even with the lab on', undefined],
    ['a Ghost Core with the lab off', false],
  ])('with %s, connects Stripe with a pasted secure key', async (_core, stripeConnectBridge) => {
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
    fakeAdminEndpoint('PUT', /^\/tiers\/[^/]+\/$/, ({ body }) => body);
    // An older Core leaves stripeConnectBridge out, and a newer one with the
    // lab off says false. Either way connections go to stripe.ghost.org's
    // paste page, so a key in the address is ignored.
    const response = configResponse();
    response.config.stripeConnectBridge = stripeConnectBridge;
    await renderAdminApp(
      `/settings/stripe-connect?${new URLSearchParams({ secure_key: accountKey })}`,
      {
        labs: { oauthBridge: stripeConnectBridge === undefined },
        boot: { browseConfig: { response } },
      },
    );

    const modal = settingsScreen.stripeModal();
    await modal.getByRole('button', { name: /I have a Stripe account/ }).click();
    const connectLink = modal.getByRole('link', { name: 'Connect with Stripe' });
    await expect.element(connectLink).toHaveAttribute('target', '_blank');
    expect(settingsApi.requests).toHaveLength(0);

    await modal.getByPlaceholder('Paste your secure key here').fill('token_test');
    await modal.getByRole('button', { name: 'Save Stripe settings' }).click();

    await expect.element(modal.getByText(/You are connected with Stripe!/)).toBeVisible();
    expect(settingsApi.requests.map((request) => request.body)).toEqual([
      { settings: [{ key: 'stripe_connect_integration_token', value: 'token_test' }] },
      { settings: [{ key: 'portal_plans', value: '["free","monthly","yearly"]' }] },
    ]);
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

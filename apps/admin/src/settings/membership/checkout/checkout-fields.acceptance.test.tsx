import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakeSettingsScreens,
  fakeTiers,
  renderAdminApp,
  settingsResponse,
  tier,
} from '@test-utils/acceptance';

const freeTier = tier({ id: '645453f4d254799990dd0e21', name: 'Free', slug: 'free', type: 'free' });
const paidTier = tier({ id: '645453f4d254799990dd0e22', name: 'Supporter', slug: 'supporter' });

function stripeSettings() {
  return settingsResponse({
    settings: {
      stripe_connect_display_name: 'Dummy',
      stripe_connect_livemode: false,
      stripe_connect_account_id: 'acct_123',
      stripe_connect_publishable_key: 'pk_test_123',
      stripe_connect_secret_key: 'sk_test_123',
    },
  });
}

describe('Checkout settings', () => {
  it('offers only the design on a Ghost too old to collect shipping, and saves no shipping', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, paidTier]);
    // An older Ghost says nothing about shipping, whatever the flag says.
    fakeAdminEndpoint('GET', '/stripe/checkout/config/', {
      checkout_config: [{ design: { customize: false } }],
    });
    fakeAdminEndpoint('GET', '/custom_theme_settings/', { custom_theme_settings: [] });
    fakeAdminEndpoint('GET', '/stripe/checkout/branding/', {
      checkout_branding: [{ display_name: 'Dummy', design: null }],
    });
    const saveApi = fakeAdminEndpoint('PUT', '/stripe/checkout/config/', {
      checkout_config: [{ design: { customize: false } }],
    });
    await renderAdminApp('/settings/tiers/checkout', {
      labs: { stripeCheckoutDesign: true, stripeCheckoutCollection: true },
      boot: { browseSettings: { response: stripeSettings() } },
    });

    const modal = page.getByRole('region', { name: 'Checkout' });
    const customize = modal.getByRole('switch', { name: 'Customize checkout design' });
    await expect.element(customize).toBeVisible();
    await expect(modal.getByRole('tab', { name: 'Fields' })).toHaveCount(0);

    await customize.click();
    await modal.getByRole('button', { name: 'Save' }).click();

    // The design alone: an older Ghost refuses a request with shipping in it.
    await expect
      .poll(() => saveApi.lastRequest?.body)
      .toEqual({
        checkout_config: [
          {
            // Customizing starts from Stripe's defaults, as the dashboard design can't be read.
            design: {
              customize: true,
              button_color: '#0074d4',
              background_color: '#ffffff',
              border_style: 'rounded',
              font_family: 'default',
            },
          },
        ],
      });
  });
});

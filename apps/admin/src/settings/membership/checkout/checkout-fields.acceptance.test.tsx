import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakeMemberCustomFields,
  fakeSettingsScreens,
  fakeTiers,
  renderAdminApp,
  settingsResponse,
  tier,
} from '@test-utils/acceptance';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { StripeCheckoutConfig } from '@tryghost/admin-x-framework/api/stripe-checkout-config';

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

const phoneField: MemberCustomField = {
  namespace: 'custom',
  key: 'contact_phone',
  name: 'Contact phone',
  type: 'short_text',
  status: 'active',
  access: { member: 'none' },
  created_at: '2026-10-19T00:00:00.000Z',
  updated_at: null,
};

/** The checkout settings with this config saved, and the request that saves them. */
async function openCheckoutFields(
  config: StripeCheckoutConfig,
  fields: MemberCustomField[] = [phoneField],
) {
  fakeSettingsScreens();
  fakeTiers([freeTier, paidTier]);
  fakeMemberCustomFields(fields);
  fakeAdminEndpoint('GET', '/stripe/checkout/config/', { checkout_config: [config] });
  fakeAdminEndpoint('GET', '/custom_theme_settings/', { custom_theme_settings: [] });
  fakeAdminEndpoint('GET', '/stripe/checkout/branding/', {
    checkout_branding: [{ display_name: 'Dummy', design: null }],
  });
  const saveApi = fakeAdminEndpoint('PUT', '/stripe/checkout/config/', {
    checkout_config: [config],
  });
  await renderAdminApp('/settings/tiers/checkout', {
    labs: { stripeCheckoutCollection: true, membersCustomFields: true },
    boot: { browseSettings: { response: stripeSettings() } },
  });

  const modal = page.getByRole('region', { name: 'Checkout' });
  await modal.getByRole('tab', { name: 'Fields' }).click();
  return { modal, saveApi };
}

describe('Checkout settings', () => {
  it('asks for a phone number on every paid tier, saved into the field chosen for it', async () => {
    const { modal, saveApi } = await openCheckoutFields({
      design: { customize: false },
      shipping: { collect: false },
      phone: { collect: false },
    });

    await modal.getByRole('switch', { name: 'Phone' }).click();
    await expect
      .element(modal.getByRole('figure', { name: 'Checkout preview' }).getByText('Phone'))
      .toBeVisible();

    // Nowhere to keep the number yet, so nothing is saved.
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByText('Choose a field')).toBeVisible();
    expect(saveApi.lastRequest).toBeUndefined();

    await modal.getByRole('combobox', { name: 'Save phone as' }).click();
    await page.getByRole('option', { name: 'Contact phone' }).click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect
      .poll(() => saveApi.lastRequest?.body)
      .toEqual({
        checkout_config: [
          {
            design: { customize: false },
            shipping: { collect: false },
            phone: { collect: true, custom_field_key: 'contact_phone' },
          },
        ],
      });
  });

  it('does not offer the field the recipient name is saved into, as one would overwrite the other', async () => {
    const { modal } = await openCheckoutFields(
      {
        design: { customize: false },
        shipping: {
          collect: true,
          address: { custom_field_key: 'delivery_address' },
          name: { custom_field_key: 'recipient_name' },
        },
        phone: { collect: false },
      },
      [
        phoneField,
        { ...phoneField, key: 'recipient_name', name: 'Recipient name' },
        { ...phoneField, key: 'delivery_address', name: 'Delivery address', type: 'address' },
      ],
    );

    await modal.getByRole('switch', { name: 'Phone' }).click();
    await modal.getByRole('combobox', { name: 'Save phone as' }).click();

    await expect.element(page.getByRole('option', { name: 'Contact phone' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Recipient name' })).toHaveCount(0);

    // Switching shipping off and on again brings its fields back, so it still holds the name.
    await userEvent.keyboard('{Escape}');
    await modal.getByRole('switch', { name: 'Shipping address' }).click();
    await modal.getByRole('combobox', { name: 'Save phone as' }).click();
    await expect.element(page.getByRole('option', { name: 'Contact phone' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Recipient name' })).toHaveCount(0);
  });

  it('offers no phone number on a Ghost too old to collect one, and saves none', async () => {
    // Shipping arrived before the phone number, so a Ghost can say what is saved for one only.
    const { modal, saveApi } = await openCheckoutFields({
      design: { customize: false },
      shipping: { collect: false },
    });

    await expect.element(modal.getByRole('switch', { name: 'Shipping address' })).toBeVisible();
    await expect(modal.getByRole('switch', { name: 'Phone' })).toHaveCount(0);

    await modal.getByRole('tab', { name: 'Design' }).click();
    await modal.getByRole('switch', { name: 'Customize checkout design' }).click();
    await modal.getByRole('button', { name: 'Save' }).click();

    // An older Ghost refuses a request with a phone number in it.
    await expect
      .poll(() => saveApi.lastRequest?.body)
      .toEqual({
        checkout_config: [
          {
            design: {
              customize: true,
              button_color: '#0074d4',
              background_color: '#ffffff',
              border_style: 'rounded',
              font_family: 'default',
            },
            shipping: { collect: false },
          },
        ],
      });
  });

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
      labs: { stripeCheckoutCollection: true },
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

  it('shows the chosen corner style as on, beneath its tooltip', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, paidTier]);
    fakeAdminEndpoint('GET', '/stripe/checkout/config/', {
      checkout_config: [{ design: { customize: false } }],
    });
    fakeAdminEndpoint('GET', '/custom_theme_settings/', { custom_theme_settings: [] });
    fakeAdminEndpoint('GET', '/stripe/checkout/branding/', {
      checkout_branding: [{ display_name: 'Dummy', design: null }],
    });
    await renderAdminApp('/settings/tiers/checkout', {
      boot: { browseSettings: { response: stripeSettings() } },
    });

    const modal = page.getByRole('region', { name: 'Checkout' });
    await modal.getByRole('switch', { name: 'Customize checkout design' }).click();
    const pill = modal.getByLabelText('Pill', { exact: true });

    // The toggle's styling keys off data-state, which the tooltip trigger must not replace.
    await expect
      .element(modal.getByLabelText('Rounded', { exact: true }))
      .toHaveAttribute('data-state', 'on');
    await pill.click();
    await expect.element(pill).toHaveAttribute('data-state', 'on');
  });
});

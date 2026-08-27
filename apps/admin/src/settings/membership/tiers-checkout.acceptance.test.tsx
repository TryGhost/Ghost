import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  configResponse,
  fakeAdminEndpoint,
  fakeMemberCustomFields,
  fakeSettingsScreens,
  fakeTiers,
  renderAdminApp,
  settingsResponse,
  tier,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

const freeTier = tier({ id: '645453f4d254799990dd0e21', name: 'Free', slug: 'free', type: 'free' });
const supporterTier = tier({
  id: '645453f4d254799990dd0e22',
  name: 'Basic Supporter',
  slug: 'basic-supporter',
});

const addressField = {
  key: 'shipping_address',
  name: 'Shipping Address',
  type: 'address',
  status: 'active',
  created_at: '2026-07-13T00:00:00.000Z',
  updated_at: null as string | null,
};

const nameField = {
  ...addressField,
  key: 'recipient_name',
  name: 'Recipient Name',
  type: 'short_text',
};

function stripeSettings(overrides: Parameters<typeof settingsResponse>[0] = {}) {
  return settingsResponse({
    ...overrides,
    settings: {
      stripe_connect_display_name: 'Dummy',
      stripe_connect_livemode: false,
      stripe_connect_account_id: 'acct_123',
      stripe_connect_publishable_key: 'pk_test_123',
      stripe_connect_secret_key: 'sk_test_123',
      ...overrides.settings,
    },
  });
}

// The flag lives in settings and config in lockstep, and Stripe rides along in settings.
const flagOnBoot = {
  browseConfig: { response: configResponse({ labs: { membersCustomFields: true } }) },
  browseSettings: { response: stripeSettings({ labs: { membersCustomFields: true } }) },
};

const supporterConfig = {
  tier_id: supporterTier.id,
  custom_fields: [],
  shipping: {
    collect: true as const,
    allowed_countries: ['FI', 'SE'],
    name: { custom_field_key: nameField.key },
    address: { custom_field_key: addressField.key },
  },
  tax_number: { collect: true as const },
};

/** The world most specs share: both tiers, both fields, and a declared configuration. */
function checkoutWorld(configs: object[] = []) {
  fakeSettingsScreens();
  fakeTiers([freeTier, supporterTier]);
  fakeMemberCustomFields([addressField, nameField]);
  fakeAdminEndpoint('GET', '/tiers/checkout_config/', { tiers_checkout_config: configs });
  return fakeAdminEndpoint('PUT', `/tiers/${supporterTier.id}/checkout_config/`, ({ body }) => ({
    tiers_checkout_config: [{ tier_id: supporterTier.id, custom_fields: [], ...(body as object) }],
  }));
}

async function openSupporterModal() {
  await settingsScreen.tiers().getByText(supporterTier.name, { exact: true }).click();
  const modal = settingsScreen.tierDetailModal();
  // Exact: "Save recipient name as" would otherwise match too.
  await expect.element(modal.getByLabelText('Name', { exact: true })).toBeVisible();
  return modal;
}

describe('Tier checkout collection', () => {
  it('keeps the tier modal untouched and the endpoint unqueried while the flag is off', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    const configApi = fakeAdminEndpoint('GET', '/tiers/checkout_config/', {
      tiers_checkout_config: [],
    });
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    const modal = await openSupporterModal();
    await expect(modal.getByText('Checkout', { exact: true })).toHaveCount(0);
    expect(configApi.requests).toHaveLength(0);
  });

  // The deploy-compatibility rule in apps/admin/README.md: an Admin deployed ahead of a
  // Core without this endpoint must keep existing tier editing intact.
  it('renders the tier modal without the section against a Core without the endpoint', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    // The flag also shows the Custom fields settings group, which browses the fields.
    fakeMemberCustomFields([]);
    fakeAdminEndpoint(
      'GET',
      '/tiers/checkout_config/',
      { errors: [{ type: 'NotFoundError', message: 'Resource not found error.' }] },
      { status: 404 },
    );
    await renderAdminApp('/settings', { boot: flagOnBoot });

    const modal = await openSupporterModal();
    await expect(modal.getByText('Checkout', { exact: true })).toHaveCount(0);
    await expect(modal.getByText(/could not be loaded/)).toHaveCount(0);
  });

  it("holds the section's place with an explanation when the configuration read fails", async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    fakeMemberCustomFields([]);
    fakeAdminEndpoint(
      'GET',
      '/tiers/checkout_config/',
      { errors: [{ type: 'InternalServerError', message: 'Something went wrong.' }] },
      { status: 500 },
    );
    await renderAdminApp('/settings', { boot: flagOnBoot });

    const modal = await openSupporterModal();
    await expect.element(modal.getByText(/could not be loaded/)).toBeVisible();
    await expect(modal.getByLabelText('Collect shipping address')).toHaveCount(0);
  });

  it('shows no checkout section on the free tier', async () => {
    checkoutWorld();
    await renderAdminApp('/settings', { boot: flagOnBoot });

    await settingsScreen.tiers().getByText(freeTier.name, { exact: true }).click();
    const modal = settingsScreen.tierDetailModal();
    await expect.element(modal.getByLabelText('Name')).toBeVisible();
    await expect(modal.getByText('Checkout', { exact: true })).toHaveCount(0);
  });

  it('reflects the saved configuration and writes nothing when untouched', async () => {
    const putApi = checkoutWorld([supporterConfig]);
    await renderAdminApp('/settings', { boot: flagOnBoot });

    const modal = await openSupporterModal();
    await expect.element(modal.getByLabelText('Collect shipping address')).toBeChecked();
    await expect.element(modal.getByLabelText('Ships to')).toHaveTextContent('Specific countries');
    await expect
      .element(modal.getByLabelText('Select specific countries'))
      .toHaveTextContent('Finland, Sweden');
    await expect
      .element(modal.getByLabelText('Save address as'))
      .toHaveTextContent(addressField.name);
    await expect
      .element(modal.getByLabelText('Save recipient name as'))
      .toHaveTextContent(nameField.name);
    await expect.element(modal.getByLabelText('Collect business tax ID')).toBeChecked();
    await expect.element(modal.getByLabelText('Collect phone number')).not.toBeChecked();

    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();
    expect(putApi.requests).toHaveLength(0);

    // A clean save leaves nothing unsaved: closing asks no questions.
    await modal.getByRole('button', { name: 'Close' }).click();
    await expect(settingsScreen.tierDetailModal()).toHaveCount(0);
  });

  it('validates destinations inline before anything is written', async () => {
    const putApi = checkoutWorld();
    await renderAdminApp('/settings', { boot: flagOnBoot });

    const modal = await openSupporterModal();
    await modal.getByLabelText('Collect shipping address').click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect(modal.getByText('Choose where this should be kept')).toHaveCount(2);
    expect(putApi.requests).toHaveLength(0);
  });

  it('saves the chosen collections, stating every block explicitly', async () => {
    const putApi = checkoutWorld();
    await renderAdminApp('/settings', { boot: flagOnBoot });

    const modal = await openSupporterModal();
    await modal.getByLabelText('Collect shipping address').click();
    await modal.getByLabelText('Save address as').click();
    await page.getByRole('option', { name: addressField.name }).click();
    await modal.getByLabelText('Save recipient name as').click();
    await page.getByRole('option', { name: nameField.name }).click();
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();

    const sent = (
      putApi.lastRequest?.body as {
        tiers_checkout_config: [{ shipping: { collect: boolean; allowed_countries: string[] } }];
      }
    ).tiers_checkout_config[0];
    expect(sent).toMatchObject({
      shipping: {
        collect: true,
        name: { custom_field_key: nameField.key },
        address: { custom_field_key: addressField.key },
      },
      tax_number: { collect: false },
      phone: { collect: false },
    });
    // "All countries" is written as Stripe's full list, mirrored from the server.
    expect(sent.shipping.allowed_countries).toHaveLength(238);
  });

  it('creates a destination field from inside the picker', async () => {
    let fields = [addressField];
    const created = { ...nameField, key: 'gift_recipient', name: 'Gift Recipient' };
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    fakeMemberCustomFields(() => fields);
    fakeAdminEndpoint('GET', '/tiers/checkout_config/', { tiers_checkout_config: [] });
    const createApi = fakeAdminEndpoint('POST', '/members/custom_fields/', () => {
      fields = [...fields, created];
      return { members_custom_fields: [created] };
    });
    await renderAdminApp('/settings', { boot: flagOnBoot });

    const modal = await openSupporterModal();
    await modal.getByLabelText('Collect shipping address').click();
    await modal.getByLabelText('Save recipient name as').click();
    await page.getByRole('option', { name: 'Add custom field' }).click();
    await page.getByLabelText(/New custom field/).fill(created.name);
    // Enter submits the inline form; a Save-button locator would be ambiguous with the
    // modal's own footer Save.
    await userEvent.keyboard('{Enter}');

    await expect
      .element(modal.getByLabelText('Save recipient name as'))
      .toHaveTextContent(created.name);
    expect(createApi.lastRequest?.body).toEqual({
      members_custom_fields: [{ name: created.name, type: 'short_text' }],
    });
  });

  it('asks before discarding unsaved checkout edits', async () => {
    checkoutWorld();
    await renderAdminApp('/settings', { boot: flagOnBoot });

    const modal = await openSupporterModal();
    await modal.getByLabelText('Collect phone number').click();
    await userEvent.keyboard('{Escape}');

    const confirmation = page.getByText('Are you sure you want to leave this page?');
    await expect.element(confirmation).toBeVisible();
    await page.getByRole('button', { name: 'Leave' }).click();
    await expect(settingsScreen.tierDetailModal()).toHaveCount(0);
  });
});

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
import { settingsScreen } from '@/settings/settings.screen';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

const freeTier = tier({ id: '645453f4d254799990dd0e21', name: 'Free', slug: 'free', type: 'free' });
const supporterTier = tier({
  id: '645453f4d254799990dd0e22',
  name: 'Basic Supporter',
  slug: 'basic-supporter',
});

const addressField: MemberCustomField = {
  namespace: 'custom',
  key: 'shipping_address',
  name: 'Shipping Address',
  type: 'address',
  status: 'active',
  created_at: '2026-07-13T00:00:00.000Z',
  updated_at: null,
};

const nameField: MemberCustomField = {
  ...addressField,
  key: 'recipient_name',
  name: 'Recipient Name',
  type: 'short_text',
};

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

// The harness composes the flags into settings and config; Stripe rides along in settings.
// Collection puts the card on the tier; field management adds the destination pickers.
const flagOn = {
  labs: { stripeCheckoutCollection: true, membersCustomFields: true },
  boot: { browseSettings: { response: stripeSettings() } },
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
    await renderAdminApp('/settings', flagOn);

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
    await renderAdminApp('/settings', flagOn);

    const modal = await openSupporterModal();
    await expect.element(modal.getByText(/could not be loaded/)).toBeVisible();
    await expect(modal.getByLabelText('Collect shipping address')).toHaveCount(0);
  });

  it('shows no checkout section on the free tier', async () => {
    checkoutWorld();
    await renderAdminApp('/settings', flagOn);

    await settingsScreen.tiers().getByText(freeTier.name, { exact: true }).click();
    const modal = settingsScreen.tierDetailModal();
    await expect.element(modal.getByLabelText('Name')).toBeVisible();
    await expect(modal.getByText('Checkout', { exact: true })).toHaveCount(0);
  });

  it('reflects the saved configuration and writes nothing when untouched', async () => {
    const putApi = checkoutWorld([supporterConfig]);
    await renderAdminApp('/settings', flagOn);

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

  // The other half of the sentinel: a tier that delivers everywhere carries no list, and
  // has to read back as "All countries" rather than as a restriction to nothing.
  it('reads a configuration with no countries as delivering everywhere', async () => {
    const everywhere = { ...supporterConfig.shipping };
    delete (everywhere as { allowed_countries?: string[] }).allowed_countries;
    checkoutWorld([{ ...supporterConfig, shipping: everywhere }]);
    await renderAdminApp('/settings', flagOn);

    const modal = await openSupporterModal();
    await expect.element(modal.getByLabelText('Collect shipping address')).toBeChecked();
    await expect.element(modal.getByLabelText('Ships to')).toHaveTextContent('All countries');
    await expect(modal.getByLabelText('Select specific countries')).toHaveCount(0);
  });

  it('validates destinations inline before anything is written', async () => {
    const putApi = checkoutWorld();
    await renderAdminApp('/settings', flagOn);

    const modal = await openSupporterModal();
    await modal.getByLabelText('Collect shipping address').click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect(modal.getByText('Choose where this should be kept')).toHaveCount(2);
    expect(putApi.requests).toHaveLength(0);
  });

  it('saves the chosen collections, stating every block explicitly', async () => {
    const putApi = checkoutWorld();
    await renderAdminApp('/settings', flagOn);

    const modal = await openSupporterModal();
    await modal.getByLabelText('Collect shipping address').click();
    await modal.getByLabelText('Save address as').click();
    await page.getByRole('option', { name: addressField.name }).click();
    await modal.getByLabelText('Save recipient name as').click();
    await page.getByRole('option', { name: nameField.name }).click();
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();
    await expect.poll(() => putApi.requests.length).toBe(1);

    const sent = (putApi.lastRequest?.body as { tiers_checkout_config: [Record<string, unknown>] })
      .tiers_checkout_config[0];
    expect(sent).toMatchObject({
      shipping: {
        collect: true,
        name: { custom_field_key: nameField.key },
        address: { custom_field_key: addressField.key },
      },
      tax_number: { collect: false },
      phone: { collect: false },
    });
    // "All countries" is written as no list at all. Sending every country instead would
    // save today's set as a restriction, and quietly exclude whatever is added next.
    expect(sent.shipping).not.toHaveProperty('allowed_countries');
  });

  // A destination can stop being usable between the picker offering it and the save
  // reaching the server. Only the server sees that, so its refusal has to land on the
  // picker it names, carrying the server's own words rather than a guess restated here.
  it('shows a refused destination against the picker that named it', async () => {
    const refusal = 'An archived custom field cannot receive collected data. Restore it first.';
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    fakeMemberCustomFields([addressField, nameField]);
    fakeAdminEndpoint('GET', '/tiers/checkout_config/', { tiers_checkout_config: [] });
    fakeAdminEndpoint(
      'PUT',
      `/tiers/${supporterTier.id}/checkout_config/`,
      {
        errors: [
          {
            message: 'Validation error',
            context: refusal,
            type: 'ValidationError',
            property: 'checkout.shipping_address.custom_field_key',
          },
        ],
      },
      { status: 422 },
    );
    await renderAdminApp('/settings', flagOn);

    const modal = await openSupporterModal();
    await modal.getByLabelText('Collect shipping address').click();
    await modal.getByLabelText('Save address as').click();
    await page.getByRole('option', { name: addressField.name }).click();
    await modal.getByLabelText('Save recipient name as').click();
    await page.getByRole('option', { name: nameField.name }).click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect.element(modal.getByText(refusal)).toBeVisible();
    // On the picker the server blamed, and only that one.
    await expect
      .element(modal.getByLabelText('Save address as'))
      .toHaveAttribute('aria-invalid', 'true');
    await expect
      .element(modal.getByLabelText('Save recipient name as'))
      .not.toHaveAttribute('aria-invalid');
  });

  it('creates a destination field from inside the picker', async () => {
    let fields = [addressField];
    const created = { ...nameField, key: 'gift_recipient', name: 'Gift Recipient' };
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    fakeMemberCustomFields(() => fields);
    fakeAdminEndpoint('GET', '/tiers/checkout_config/', { tiers_checkout_config: [] });
    const createApi = fakeAdminEndpoint('POST', '/members/metafields/custom/', () => {
      fields = [...fields, created];
      return { members_metafields: [created] };
    });
    await renderAdminApp('/settings', flagOn);

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
      members_metafields: [{ name: created.name, type: 'short_text' }],
    });
  });

  it('collects checkout settings while creating a tier, in one Save', async () => {
    const createdTier = tier({
      id: '645453f4d254799990dd0e99',
      name: 'Print Edition',
      slug: 'print-edition',
      monthly_price: 800,
      yearly_price: 8000,
    });
    let saved = false;
    fakeSettingsScreens();
    fakeTiers(() => (saved ? [freeTier, supporterTier, createdTier] : [freeTier, supporterTier]));
    fakeMemberCustomFields([addressField, nameField]);
    fakeAdminEndpoint('GET', '/tiers/checkout_config/', { tiers_checkout_config: [] });
    const createApi = fakeAdminEndpoint('POST', '/tiers/', () => {
      saved = true;
      return { tiers: [createdTier] };
    });
    const putApi = fakeAdminEndpoint(
      'PUT',
      `/tiers/${createdTier.id}/checkout_config/`,
      ({ body }) => ({
        tiers_checkout_config: [
          { tier_id: createdTier.id, custom_fields: [], ...(body as object) },
        ],
      }),
    );
    await renderAdminApp('/settings', flagOn);

    await settingsScreen.tiers().getByRole('button', { name: 'Add tier' }).click();
    const modal = settingsScreen.tierDetailModal();
    await modal.getByLabelText('Name', { exact: true }).fill(createdTier.name);
    await modal.getByLabelText('Monthly price').fill('8');
    await modal.getByLabelText('Yearly price').fill('80');

    // The checkout card is present during creation, under the same conditions as prices.
    await modal.getByLabelText('Collect shipping address').click();
    await modal.getByLabelText('Save address as').click();
    await page.getByRole('option', { name: addressField.name }).click();
    await modal.getByLabelText('Save recipient name as').click();
    await page.getByRole('option', { name: nameField.name }).click();

    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();

    expect(createApi.lastRequest?.body).toMatchObject({ tiers: [{ name: createdTier.name }] });
    // The checkout write is chained after the tier's, so "Saved" — which the tier's own
    // save flips — is reached before it lands. Wait for the write itself.
    await expect.poll(() => putApi.requests.length).toBe(1);
    const sent = (
      putApi.lastRequest?.body as { tiers_checkout_config: [{ shipping: { collect: boolean } }] }
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

    // The one Save covered both writes: closing asks no questions.
    await modal.getByRole('button', { name: 'Close' }).click();
    await expect(settingsScreen.tierDetailModal()).toHaveCount(0);
  });

  it('closes without confirmation after saving checkout edits', async () => {
    const putApi = checkoutWorld();
    await renderAdminApp('/settings', flagOn);

    const modal = await openSupporterModal();
    await modal.getByLabelText('Collect business tax ID').click();
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();
    // "Saved" is the tier save's signal; the checkout write is chained after it.
    await expect.poll(() => putApi.requests.length).toBe(1);

    await modal.getByRole('button', { name: 'Close' }).click();
    await expect(settingsScreen.tierDetailModal()).toHaveCount(0);
  });

  it('asks before discarding unsaved checkout edits', async () => {
    checkoutWorld();
    await renderAdminApp('/settings', flagOn);

    const modal = await openSupporterModal();
    await modal.getByLabelText('Collect phone number').click();
    await userEvent.keyboard('{Escape}');

    const confirmation = page.getByText('Are you sure you want to leave this page?');
    await expect.element(confirmation).toBeVisible();
    await page.getByRole('button', { name: 'Leave' }).click();
    await expect(settingsScreen.tierDetailModal()).toHaveCount(0);
  });

  describe('without field management', () => {
    const collectionOnly = {
      labs: { stripeCheckoutCollection: true, membersCustomFields: false },
      boot: { browseSettings: { response: stripeSettings() } },
    };

    it('shows the toggles and no destination pickers', async () => {
      checkoutWorld();
      await renderAdminApp('/settings', collectionOnly);

      const modal = await openSupporterModal();
      await expect.element(modal.getByLabelText('Collect shipping address')).toBeVisible();
      await modal.getByLabelText('Collect shipping address').click();
      await expect(modal.getByLabelText('Save address as')).toHaveCount(0);
      await expect(modal.getByLabelText('Save recipient name as')).toHaveCount(0);
    });

    it('saves the port default keys, with nothing to validate', async () => {
      const putApi = checkoutWorld();
      await renderAdminApp('/settings', collectionOnly);

      const modal = await openSupporterModal();
      await expect.element(modal.getByLabelText('Collect shipping address')).not.toBeChecked();

      await modal.getByLabelText('Collect shipping address').click();
      await modal.getByRole('button', { name: 'Save' }).click();
      await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();

      // "Saved" is the tier save's signal; the checkout write is chained after it.
      await expect.poll(() => putApi.requests.length).toBe(1);
      expect(
        (putApi.lastRequest?.body as { tiers_checkout_config: [Record<string, unknown>] })
          .tiers_checkout_config[0],
      ).toMatchObject({
        shipping: {
          collect: true,
          name: { custom_field_key: 'shipping_name' },
          address: { custom_field_key: 'shipping_address' },
        },
      });
    });

    it('keeps a binding that was already chosen', async () => {
      const putApi = checkoutWorld([supporterConfig]);
      await renderAdminApp('/settings', collectionOnly);

      const modal = await openSupporterModal();
      await expect.element(modal.getByLabelText('Collect shipping address')).toBeChecked();

      await modal.getByLabelText('Collect phone number').click();
      await modal.getByRole('button', { name: 'Save' }).click();
      await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();

      // "Saved" is the tier save's signal; the checkout write is chained after it.
      await expect.poll(() => putApi.requests.length).toBe(1);
      expect(
        (putApi.lastRequest?.body as { tiers_checkout_config: [Record<string, unknown>] })
          .tiers_checkout_config[0],
      ).toMatchObject({
        shipping: {
          collect: true,
          name: { custom_field_key: nameField.key },
          address: { custom_field_key: addressField.key },
        },
      });
    });
  });
});

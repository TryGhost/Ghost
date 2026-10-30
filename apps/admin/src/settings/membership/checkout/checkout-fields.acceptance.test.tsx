import { describe, expect, it, onTestFinished } from 'vitest';
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
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { StripeCheckoutConfig } from '@tryghost/admin-x-framework/api/stripe-checkout-config';
import { CUSTOM_NAMESPACE, KeySchema } from '@tryghost/metafield-types/identity';
import { COLLECTED_PARTS, type CollectedPart } from '@tryghost/checkout';

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
  namespace: CUSTOM_NAMESPACE,
  key: KeySchema.parse('contact_phone'),
  name: 'Contact phone',
  type: 'short_text',
  status: 'active',
  access: { member: 'none' },
  created_at: '2026-10-19T00:00:00.000Z',
  updated_at: null,
};

type HostSettings = ReturnType<typeof configResponse>['config']['hostSettings'];

/** The checkout settings with this config saved, and the request that saves them. */
async function openCheckoutFields(
  config: StripeCheckoutConfig,
  fields: Parameters<typeof fakeMemberCustomFields>[0] = [phoneField],
  labs: Record<string, boolean> = {},
  hostSettings?: HostSettings,
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
  const allLabs = {
    stripeCheckoutDesign: true,
    stripeCheckoutCollection: true,
    membersCustomFields: true,
    ...labs,
  };
  const siteConfig = configResponse({ labs: allLabs });
  if (hostSettings) {
    siteConfig.config.hostSettings = hostSettings;
  }
  await renderAdminApp('/settings/tiers/checkout', {
    labs: allLabs,
    boot: {
      browseSettings: { response: stripeSettings() },
      browseConfig: { response: siteConfig },
    },
  });

  const modal = page.getByRole('region', { name: 'Checkout' });
  await modal.getByRole('tab', { name: 'Fields' }).click();
  return { modal, saveApi };
}

/** How each part shows in the Fields tab and the sketch. */
const PARTS: { [Part in CollectedPart]: { label: string; sketched: string } } = {
  shipping: { label: 'Shipping address', sketched: 'Shipping address' },
  phone: { label: 'Phone', sketched: 'Phone' },
  tax_number: { label: 'Tax ID or VAT', sketched: "I'm purchasing as a business" },
};

/** The config a Ghost reporting these parts gives while it collects nothing. */
const collectingNothing = (parts: readonly CollectedPart[]): StripeCheckoutConfig => ({
  design: { customize: false },
  ...Object.fromEntries(parts.map((part) => [part, { collect: false }])),
});

describe('Checkout settings', () => {
  describe.each(COLLECTED_PARTS)('%s', (part) => {
    const { label, sketched } = PARTS[part];

    it('shows in the sketch once switched on', async () => {
      const { modal } = await openCheckoutFields(collectingNothing(COLLECTED_PARTS));
      const sketch = modal.getByRole('figure', { name: 'Checkout preview' });

      await expect(sketch.getByText(sketched, { exact: true })).toHaveCount(0);
      await modal.getByRole('switch', { name: label, exact: true }).click();
      await expect.element(sketch.getByText(sketched, { exact: true })).toBeVisible();
    });

    it('is collected for paid tiers only, as a free tier has no checkout', async () => {
      const { modal } = await openCheckoutFields(collectingNothing(COLLECTED_PARTS));

      await modal.getByRole('switch', { name: label, exact: true }).click();
      await modal
        .getByRole('group', { name: label, exact: true })
        .getByRole('combobox', { name: 'Collect for' })
        .click();

      await expect.element(page.getByRole('option', { name: 'Supporter' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Free' })).toHaveCount(0);
    });

    it("is neither offered nor saved while Ghost doesn't report it", async () => {
      const olderConfig = collectingNothing(COLLECTED_PARTS.filter((other) => other !== part));
      const { modal, saveApi } = await openCheckoutFields(olderConfig);

      await expect
        .element(modal.getByRole('tab', { name: 'Fields', selected: true }))
        .toBeVisible();
      await expect(modal.getByRole('switch', { name: label, exact: true })).toHaveCount(0);

      await modal.getByRole('tab', { name: 'Design' }).click();
      await modal.getByRole('switch', { name: 'Customize checkout design' }).click();
      await modal.getByRole('button', { name: 'Save' }).click();

      // An older Ghost refuses a request with a setting it doesn't know.
      await expect
        .poll(() => saveApi.lastRequest?.body)
        .toEqual({
          checkout_config: [
            {
              ...olderConfig,
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

  // A site keeps its Stripe connection when the host switches its custom fields off, so it
  // can still reach these settings. Its fields read as archived, and the server refuses a new
  // one with the host's sentence.
  it('says why a site whose host switched custom fields off cannot add one', async () => {
    fakeAdminEndpoint(
      'POST',
      '/members/metafields/custom/',
      {
        errors: [
          {
            message: 'Host Limit error, cannot save members_metafield.',
            context: 'Custom fields are available on the Publisher plan and above.',
            type: 'HostLimitError',
          },
        ],
      },
      { status: 403 },
    );
    const { modal } = await openCheckoutFields(
      { design: { customize: false }, shipping: { collect: false }, phone: { collect: false } },
      [{ ...phoneField, status: 'archived' }],
      {},
      { limits: { limitCustomFields: { disabled: true } } },
    );

    await modal.getByRole('switch', { name: 'Phone' }).click();
    await modal.getByRole('combobox', { name: 'Save phone as' }).click();
    await page.getByRole('option', { name: 'Add custom field' }).click();
    await userEvent.fill(
      page.getByRole('textbox', { name: 'New custom field for Save phone as' }),
      'Phone',
    );
    const form = page.getByRole('dialog').filter({ hasText: 'New custom field' });
    await form.getByRole('button', { name: 'Save' }).click();

    await expect
      .element(form.getByText('Custom fields are available on the Publisher plan and above.'))
      .toBeVisible();
    await expect.element(form.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  // Each save gets its own answer: the last attempt's refusal goes as the next save starts, rather
  // than sitting under "Saving" or beside the new answer.
  it('shows only the latest refusal when a new field is saved again', async () => {
    fakeAdminEndpoint(
      'POST',
      '/members/metafields/custom/',
      { errors: [{ message: 'Internal server error', type: 'InternalServerError' }] },
      { status: 500 },
    );
    const { modal } = await openCheckoutFields({
      design: { customize: false },
      shipping: { collect: false },
      phone: { collect: false },
    });

    await modal.getByRole('switch', { name: 'Phone' }).click();
    await modal.getByRole('combobox', { name: 'Save phone as' }).click();
    await page.getByRole('option', { name: 'Add custom field' }).click();
    await userEvent.fill(
      page.getByRole('textbox', { name: 'New custom field for Save phone as' }),
      'Contact phone',
    );
    const form = page.getByRole('dialog').filter({ hasText: 'New custom field' });
    await form.getByRole('button', { name: 'Save' }).click();
    // Any refusal will do, so the test doesn't depend on the server's wording.
    await expect.element(form.getByRole('alert')).toBeVisible();

    let finishSaving = () => {};
    const saving = new Promise<void>((resolve) => {
      finishSaving = resolve;
    });
    // Released however the test ends, as a save left in flight would fail the tests after it.
    onTestFinished(() => finishSaving());
    fakeAdminEndpoint(
      'POST',
      '/members/metafields/custom/',
      async () => {
        await saving;
        return {
          errors: [
            {
              message: 'Validation error, cannot save members_metafield.',
              context: 'A custom field with this name already exists.',
              type: 'ValidationError',
              property: 'name',
            },
          ],
        };
      },
      { status: 422 },
    );
    await form.getByRole('button', { name: 'Save' }).click();
    await expect.element(form.getByRole('button', { name: 'Saving' })).toBeDisabled();
    await expect.element(form.getByRole('alert')).not.toBeInTheDocument();

    finishSaving();
    await expect
      .element(form.getByText('A custom field with this name already exists.'))
      .toBeVisible();
    expect(form.getByRole('alert').all()).toHaveLength(1);
  });

  // Like the CSV import's, a new field's form stays open until its save settles, as its Cancel
  // does. Put away any other way, the save would choose the field over whatever was picked since.
  it("keeps a new field's form open until it has saved, then chooses the field", async () => {
    const workPhone = { ...phoneField, key: KeySchema.parse('work_phone'), name: 'Work phone' };
    const fields = [phoneField];
    let finishSaving = () => {};
    const saving = new Promise<void>((resolve) => {
      finishSaving = resolve;
    });
    // Released however the test ends, as a save left in flight would fail the tests after it.
    onTestFinished(() => finishSaving());
    fakeAdminEndpoint('POST', '/members/metafields/custom/', async () => {
      await saving;
      fields.push(workPhone);
      return { members_metafields: [workPhone] };
    });
    const { modal } = await openCheckoutFields(
      { design: { customize: false }, shipping: { collect: false }, phone: { collect: false } },
      () => fields,
    );
    await modal.getByRole('switch', { name: 'Phone' }).click();
    const picker = modal.getByRole('combobox', { name: 'Save phone as' });
    // Found before the dropdown opens, which hides the rest of the page from role queries.
    const elsewhere = modal.getByRole('tab', { name: 'Fields' }).element();

    await picker.click();
    await page.getByRole('option', { name: 'Add custom field' }).click();
    const name = page.getByRole('textbox', { name: 'New custom field for Save phone as' });
    await userEvent.fill(name, 'Work phone');
    // Escape straight after Enter as well as later, as the form can be left the moment it saves.
    await userEvent.keyboard('{Enter}{Escape}');
    const form = page.getByRole('dialog').filter({ hasText: 'New custom field' });
    await expect.element(form.getByRole('button', { name: 'Saving' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await page.elementLocator(elsewhere).click({ force: true });
    await expect.element(name).toBeVisible();

    finishSaving();
    await expect.element(picker).toHaveTextContent('Work phone');
  });

  it('previews on paid tiers only, as a free tier has no checkout', async () => {
    const { modal } = await openCheckoutFields({
      design: { customize: false },
      shipping: { collect: false },
      phone: { collect: false },
    });

    await modal.getByRole('button', { name: 'Preview in Stripe' }).click();

    await expect.element(page.getByRole('menuitem', { name: 'Supporter' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Free' })).toHaveCount(0);
  });

  it('previews only settings that could be saved, showing what is missing on the Fields tab', async () => {
    const previewApi = fakeAdminEndpoint('POST', '/stripe/checkout/preview/', {
      checkout_preview: [{ url: 'https://checkout.stripe.com/c/pay/cs_test_123' }],
    });
    const { modal } = await openCheckoutFields({
      design: { customize: false },
      shipping: { collect: false },
      phone: { collect: false },
    });

    await modal.getByRole('switch', { name: 'Phone' }).click();
    await modal.getByRole('tab', { name: 'Design' }).click();
    await modal.getByRole('button', { name: 'Preview in Stripe' }).click();
    await page.getByRole('menuitem', { name: 'Supporter' }).click();

    await expect.element(modal.getByRole('tab', { name: 'Fields', selected: true })).toBeVisible();
    await expect.element(modal.getByText('Choose a field')).toBeVisible();
    expect(previewApi.requests).toHaveLength(0);
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
        { ...phoneField, key: KeySchema.parse('recipient_name'), name: 'Recipient name' },
        {
          ...phoneField,
          key: KeySchema.parse('delivery_address'),
          name: 'Delivery address',
          type: 'address',
        },
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

  // No setting's name opens its dropdown, and clicking away from an open dropdown only closes it,
  // so a click aimed between the close-set rows never acts on another one.
  describe('with every setting showing', () => {
    async function openEverySetting() {
      return openCheckoutFields(
        {
          design: { customize: false },
          shipping: {
            collect: true,
            allowed_countries: ['GB'],
            address: { custom_field_key: 'delivery_address' },
            name: { custom_field_key: 'recipient_name' },
          },
          phone: { collect: true, custom_field_key: 'contact_phone' },
        },
        [
          phoneField,
          { ...phoneField, key: KeySchema.parse('recipient_name'), name: 'Recipient name' },
          {
            ...phoneField,
            key: KeySchema.parse('delivery_address'),
            name: 'Delivery address',
            type: 'address',
          },
        ],
      );
    }

    it("opens a setting's dropdown from the dropdown only, never from its name", async () => {
      const { modal } = await openEverySetting();

      for (const setting of [
        'Collect for',
        'Ships to',
        'Countries',
        'Save address as',
        'Save name as',
        'Save phone as',
      ]) {
        await expect.element(modal.getByText(setting, { exact: true }).first()).toBeVisible();
        const names = modal.getByText(setting, { exact: true }).all();
        const controls = modal.getByRole('combobox', { name: setting }).all();
        expect(names.length).toBeGreaterThan(0);
        expect(controls).toHaveLength(names.length);
        for (const [index, name] of names.entries()) {
          await name.click();
          await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
          await controls[index].click();
          await expect.element(page.getByRole('listbox')).toBeVisible();
          await userEvent.keyboard('{Escape}');
          await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
        }
      }
    });

    // Clicking away from an open dropdown only closes it, so the click can't switch on or off
    // the part whose name it lands on.
    it('closes an open dropdown without acting on what the click lands on', async () => {
      const { modal } = await openEverySetting();
      const shipping = modal.getByRole('switch', { name: 'Shipping address' });
      // Found before a dropdown opens, which hides the rest of the page from role queries.
      const shippingName = modal
        .getByRole('group', { name: 'Shipping address' })
        .getByText('Shipping address', { exact: true })
        .element();

      // Both kinds of picker: the tiers a part is collected for, and the field it's saved into.
      for (const picker of ['Collect for', 'Save name as']) {
        await modal.getByRole('combobox', { name: picker }).first().click();
        await expect.element(page.getByRole('listbox')).toBeVisible();
        await page.elementLocator(shippingName).click({ force: true });

        await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
        await expect.element(shipping).toBeChecked();
      }
    });
  });

  it('lets business buyers give a tax ID on every paid tier, with no field to choose', async () => {
    const { modal, saveApi } = await openCheckoutFields({
      design: { customize: false },
      shipping: { collect: false },
      phone: { collect: false },
      tax_number: { collect: false },
    });

    await modal.getByRole('switch', { name: 'Tax ID or VAT' }).click();
    await expect
      .element(
        modal
          .getByRole('figure', { name: 'Checkout preview' })
          .getByText("I'm purchasing as a business"),
      )
      .toBeVisible();
    // Stripe keeps the tax ID, so the tiers are all there is to choose.
    const taxId = modal.getByRole('group', { name: 'Tax ID or VAT' });
    await expect.element(taxId.getByRole('combobox', { name: 'Collect for' })).toBeVisible();
    await expect(taxId.getByRole('combobox')).toHaveCount(1);

    await modal.getByRole('button', { name: 'Save' }).click();
    await expect
      .poll(() => saveApi.lastRequest?.body)
      .toEqual({
        checkout_config: [
          {
            design: { customize: false },
            shipping: { collect: false },
            phone: { collect: false },
            tax_number: { collect: true },
          },
        ],
      });
  });

  it('shows a tax ID offered on every checkout while automatic tax is on', async () => {
    const { modal } = await openCheckoutFields(
      {
        design: { customize: false },
        shipping: { collect: false },
        phone: { collect: false },
        tax_number: { collect: false },
      },
      [phoneField],
      { stripeAutomaticTax: true },
    );

    await expect
      .element(
        modal
          .getByRole('figure', { name: 'Checkout preview' })
          .getByText("I'm purchasing as a business"),
      )
      .toBeVisible();
    await expect
      .element(modal.getByText('Stripe Automatic Tax already asks for it on every checkout'))
      .toBeVisible();
  });

  it('saves no tax ID setting that no tier offers', async () => {
    const { modal, saveApi } = await openCheckoutFields({
      design: { customize: false },
      shipping: { collect: false },
      phone: { collect: false },
      tax_number: { collect: true },
    });

    await modal
      .getByRole('group', { name: 'Tax ID or VAT' })
      .getByRole('combobox', { name: 'Collect for' })
      .click();
    await page.getByRole('option', { name: 'Supporter' }).click();
    await userEvent.keyboard('{Escape}');
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect.element(modal.getByText('Choose at least one tier')).toBeVisible();
    expect(saveApi.lastRequest).toBeUndefined();
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
      labs: { stripeCheckoutDesign: true },
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

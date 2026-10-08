import {
  CheckoutSettingsModal,
  MemberDetailsPage,
  MembersListPage,
  SettingsPage,
} from '@/admin-pages';
import { createPaidPortalTier, expect, startPaidSignupViaPortal, test } from '@/helpers/playwright';
import type { Page } from '@playwright/test';
import type { StripeTestService } from '@/helpers/services/stripe';

async function openCheckoutFields(page: Page): Promise<CheckoutSettingsModal> {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();
  const checkout = new CheckoutSettingsModal(page);
  await checkout.open();
  await checkout.openFieldsTab();
  return checkout;
}

async function paidTier(page: Page, stripe: StripeTestService, name: string): Promise<string> {
  const tier = await createPaidPortalTier(
    page.request,
    { name: `${name} ${Date.now()}`, currency: 'usd', monthly_price: 500, yearly_price: 5000 },
    { stripe },
  );
  return tier.name;
}

/** What Ghost asked Stripe to collect on the checkout a member was most recently sent to. */
function latestShippingRequest(stripe: StripeTestService) {
  const session = stripe.getCheckoutSessions().at(-1);
  if (!session) {
    throw new Error('No checkout session was created');
  }
  return session.request.shipping_address_collection;
}

test.describe('Ghost Admin - Checkout fields', () => {
  test.use({
    stripeEnabled: true,
    labs: { stripeCheckoutDesign: true, stripeCheckoutCollection: true, membersCustomFields: true },
  });

  test('shipping address - a member gives one at checkout, and it lands on their record', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!, 'Print Edition');

    const checkout = await openCheckoutFields(page);
    await checkout.collectShipping({
      countries: ['United Kingdom'],
      addressField: { create: 'Delivery address' },
      nameField: { create: 'Recipient' },
    });
    await expect(checkout.previewShipping).toBeVisible();
    await checkout.save();
    await checkout.close();

    const { name } = await startPaidSignupViaPortal(page, { tierName });
    expect(latestShippingRequest(stripe!)).toEqual({ allowed_countries: ['GB'] });

    await stripe!.completeLatestSubscriptionCheckout({
      name,
      collected: {
        shipping: {
          name: 'Ada Lovelace',
          line1: '12 Ada Street',
          city: 'London',
          postal_code: 'N1 9GU',
          country: 'GB',
        },
      },
    });

    const membersPage = new MembersListPage(page);
    await membersPage.goto();
    await membersPage.getMemberLinkByName(name).click();
    const memberPage = new MemberDetailsPage(page);
    await expect(memberPage.customFieldRow('Delivery address')).toHaveAccessibleName(
      /12 Ada Street, London, N1 9GU/,
    );
    await expect(memberPage.customFieldRow('Recipient')).toHaveAccessibleName(
      'Edit Recipient: Ada Lovelace',
    );
  });

  test('specific tiers - only their checkouts ask for an address', async ({ page, stripe }) => {
    const shipped = await paidTier(page, stripe!, 'Print Edition');
    const digital = await paidTier(page, stripe!, 'Digital');

    const checkout = await openCheckoutFields(page);
    await checkout.collectShipping({
      tiers: [shipped],
      addressField: { create: 'Delivery address' },
      nameField: { create: 'Recipient' },
    });
    await expect(checkout.previewShippingTag(shipped)).toBeVisible();
    await checkout.save();
    await checkout.close();

    await startPaidSignupViaPortal(page, { tierName: digital });
    expect(latestShippingRequest(stripe!)).toBeUndefined();

    await startPaidSignupViaPortal(page, { tierName: shipped });
    expect(latestShippingRequest(stripe!)?.allowed_countries.length).toBeGreaterThan(1);
  });

  test('preview in Stripe - asks for an address as the unsaved settings say', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!, 'Print Edition');

    const checkout = await openCheckoutFields(page);
    await checkout.shippingSwitch.setChecked(true);
    const tab = await checkout.previewInStripe(tierName);
    await tab.close();

    expect(latestShippingRequest(stripe!)?.allowed_countries.length).toBeGreaterThan(1);
    await expect(checkout.saveButton).toBeVisible();
  });

  test('saved - shown again when the settings are opened later', async ({ page }) => {
    let checkout = await openCheckoutFields(page);
    await checkout.collectShipping({
      addressField: { create: 'Delivery address' },
      nameField: { create: 'Recipient' },
    });
    await checkout.save();
    await checkout.close();

    checkout = await openCheckoutFields(page);
    await expect(checkout.shippingSwitch).toBeChecked();
    await expect(checkout.addressFieldPicker).toHaveText('Delivery address');
    await expect(checkout.nameFieldPicker).toHaveText('Recipient');
  });

  test('incomplete - saving says which fields are missing, and saves nothing', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!, 'Print Edition');

    const checkout = await openCheckoutFields(page);
    await checkout.shippingSwitch.setChecked(true);
    await checkout.designTab.click();
    await checkout.saveButton.click();

    await expect(checkout.fieldError('Choose a field')).toHaveCount(2);
    await expect(checkout.shippingSwitch).toBeVisible();

    await startPaidSignupViaPortal(page, { tierName });
    expect(latestShippingRequest(stripe!)).toBeUndefined();
  });
});

test.describe('Ghost Admin - Checkout fields without the collection flag', () => {
  test.use({ stripeEnabled: true, labs: { stripeCheckoutDesign: true } });

  test('labs flag off - only the design is offered, without tabs', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    const checkout = new CheckoutSettingsModal(page);
    await checkout.open();

    await expect(checkout.customizeDesignSwitch).toBeVisible();
    await expect(checkout.fieldsTab).toHaveCount(0);
  });
});

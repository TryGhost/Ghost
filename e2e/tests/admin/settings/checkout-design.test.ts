import { type CheckoutCorners, CheckoutSettingsModal, SettingsPage } from '@/admin-pages';
import { FakeStripeCheckoutPage, HomePage } from '@/helpers/pages';
import { SettingsService } from '@/helpers/services/settings/settings-service';
import { createPaidPortalTier, expect, startPaidSignupViaPortal, test } from '@/helpers/playwright';
import type { Page } from '@playwright/test';
import type { StripeTestService } from '@/helpers/services/stripe';

interface Design {
  background: string;
  accent: string;
  corners: CheckoutCorners;
  font: string;
}

const DESIGN: Design = {
  background: '#f5efe6',
  accent: '#c2410c',
  corners: 'Pill',
  font: 'Roboto Slab',
};

// The same design as Stripe receives it in a checkout's `branding_settings`.
const SENT_TO_STRIPE = {
  background_color: '#f5efe6',
  button_color: '#c2410c',
  border_style: 'pill',
  font_family: 'roboto_slab',
};

async function openCheckoutSettings(page: Page): Promise<CheckoutSettingsModal> {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();
  const checkout = new CheckoutSettingsModal(page);
  await checkout.open();
  return checkout;
}

async function saveDesign(page: Page, design: Design): Promise<void> {
  const checkout = await openCheckoutSettings(page);
  await checkout.setCustomDesign(true);
  await checkout.setBackgroundColor(design.background);
  await checkout.setAccentColor(design.accent);
  await checkout.chooseCorners(design.corners);
  await checkout.chooseFont(design.font);
  await checkout.save();
  await checkout.close();
}

async function paidTier(page: Page, stripe: StripeTestService): Promise<string> {
  const tier = await createPaidPortalTier(
    page.request,
    {
      name: `Checkout Tier ${Date.now()}`,
      currency: 'usd',
      monthly_price: 500,
      yearly_price: 5000,
    },
    { stripe },
  );
  return tier.name;
}

/** The design Ghost sent with the checkout a member was most recently sent to. */
function latestCheckoutDesign(stripe: StripeTestService) {
  const session = stripe.getCheckoutSessions().at(-1);
  if (!session) {
    throw new Error('No checkout session was created');
  }
  return session.request.branding_settings;
}

test.describe('Ghost Admin - Checkout design', () => {
  test.use({ stripeEnabled: true, labs: { stripeCheckoutDesign: true } });

  test('customized design - a member signing up for a paid tier checks out in it', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!);

    await saveDesign(page, DESIGN);
    await startPaidSignupViaPortal(page, { tierName });

    expect(latestCheckoutDesign(stripe!)).toEqual(SENT_TO_STRIPE);
  });

  test('customized design - a donation checks out in it too', async ({ page, stripe }) => {
    await saveDesign(page, DESIGN);

    const homePage = new HomePage(page);
    await homePage.gotoPortalSupport();
    await new FakeStripeCheckoutPage(page).waitUntilLoaded();

    expect(latestCheckoutDesign(stripe!)).toEqual(SENT_TO_STRIPE);
  });

  test('no design saved - checkouts keep the design from the Stripe dashboard', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!);

    const checkout = await openCheckoutSettings(page);
    await expect(checkout.customizeDesignSwitch).not.toBeChecked();
    await checkout.close();

    await startPaidSignupViaPortal(page, { tierName });

    expect(latestCheckoutDesign(stripe!)).toBeUndefined();
  });

  test('saved design - shown again when the settings are opened later', async ({ page }) => {
    await saveDesign(page, DESIGN);

    await page.reload();
    const checkout = await openCheckoutSettings(page);

    await expect(checkout.customizeDesignSwitch).toBeChecked();
    await expect(checkout.corners(DESIGN.corners)).toBeChecked();
    await expect(checkout.fontSelect).toHaveText(DESIGN.font);
    await checkout.accentColorButton.click();
    await expect(checkout.hexColorInput).toHaveValue(new RegExp(DESIGN.accent, 'i'));
  });

  test('design switched off - checkouts go back to the Stripe dashboard design', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!);
    await saveDesign(page, DESIGN);

    const checkout = await openCheckoutSettings(page);
    await checkout.setCustomDesign(false);
    await expect(checkout.cornersGroup).toBeHidden();
    await checkout.save();
    await checkout.close();

    await startPaidSignupViaPortal(page, { tierName });
    expect(latestCheckoutDesign(stripe!)).toBeUndefined();

    const reopened = await openCheckoutSettings(page);
    await expect(reopened.customizeDesignSwitch).not.toBeChecked();
  });

  test('unsaved changes - leaving without saving keeps the saved design', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!);
    await saveDesign(page, DESIGN);

    const checkout = await openCheckoutSettings(page);
    await checkout.chooseCorners('Squared');
    await checkout.chooseFont('Lora');
    await checkout.closeAndLeave();

    await startPaidSignupViaPortal(page, { tierName });
    expect(latestCheckoutDesign(stripe!)).toEqual(SENT_TO_STRIPE);
  });

  test('unsaved changes - staying keeps the edits, which can then be saved', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!);

    const checkout = await openCheckoutSettings(page);
    await checkout.setCustomDesign(true);
    await checkout.chooseCorners('Squared');
    await checkout.closeAndStay();

    await expect(checkout.modal).toBeVisible();
    await expect(checkout.corners('Squared')).toBeChecked();
    await checkout.save();
    await checkout.close();

    await startPaidSignupViaPortal(page, { tierName });
    expect(latestCheckoutDesign(stripe!)).toMatchObject({ border_style: 'rectangular' });
  });

  test('keyboard shortcut - saves the design without the Save button', async ({ page, stripe }) => {
    const tierName = await paidTier(page, stripe!);

    const checkout = await openCheckoutSettings(page);
    await checkout.setCustomDesign(true);
    await checkout.chooseCorners('Pill');
    await checkout.saveWithKeyboardShortcut();
    await checkout.close();

    await startPaidSignupViaPortal(page, { tierName });
    expect(latestCheckoutDesign(stripe!)).toMatchObject({ border_style: 'pill' });
  });

  test('site accent swatch - the checkout button takes the site accent color', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!);
    await new SettingsService(page.request).updateSettings([
      { key: 'accent_color', value: '#2F6F4E' },
    ]);
    await page.reload();

    const checkout = await openCheckoutSettings(page);
    await checkout.setCustomDesign(true);
    await checkout.chooseAccentSwatch('Site accent');
    await checkout.save();
    await checkout.close();

    await startPaidSignupViaPortal(page, { tierName });
    expect(latestCheckoutDesign(stripe!)).toMatchObject({ button_color: '#2f6f4e' });
  });

  test('preview - follows the design while it is edited, before it is saved', async ({ page }) => {
    const checkout = await openCheckoutSettings(page);

    // Stripe's own default accent color, while the design isn't customized.
    await expect(checkout.previewPayButton).toHaveCSS('background-color', 'rgb(0, 116, 212)');

    await checkout.setCustomDesign(true);
    await checkout.setAccentColor(DESIGN.accent);
    await expect(checkout.previewPayButton).toHaveCSS('background-color', 'rgb(194, 65, 12)');

    await checkout.chooseCorners('Squared');
    await expect(checkout.previewPayButton).toHaveCSS('border-radius', '0px');

    await checkout.setCustomDesign(false);
    await expect(checkout.previewPayButton).toHaveCSS('background-color', 'rgb(0, 116, 212)');
  });
});

test.describe('Ghost Admin - Checkout design preview in Stripe', () => {
  test.use({ stripeEnabled: true, labs: { stripeCheckoutDesign: true } });

  test('unsaved design - the preview shows it, and nothing is saved', async ({ page, stripe }) => {
    const tierName = await paidTier(page, stripe!);

    const checkout = await openCheckoutSettings(page);
    await checkout.setCustomDesign(true);
    await checkout.chooseCorners('Pill');
    await checkout.chooseFont('Lora');
    const tab = await checkout.previewInStripe(tierName);

    expect(latestCheckoutDesign(stripe!)).toMatchObject({
      border_style: 'pill',
      font_family: 'lora',
    });
    await tab.close();
    await checkout.closeAndLeave();

    await startPaidSignupViaPortal(page, { tierName });
    expect(latestCheckoutDesign(stripe!)).toBeUndefined();
  });

  test('design switched off before saving - the preview shows the Stripe dashboard design', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!);
    await saveDesign(page, DESIGN);

    const checkout = await openCheckoutSettings(page);
    await checkout.setCustomDesign(false);
    await checkout.previewInStripe(tierName);

    expect(latestCheckoutDesign(stripe!)).toBeUndefined();
  });

  test('pop-ups blocked - the publisher is told, and no checkout is created', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!);
    // A browser blocking the new tab is only reachable by making window.open refuse it.
    await page.addInitScript(() => {
      window.open = () => null;
    });
    await page.reload();

    const checkout = await openCheckoutSettings(page);
    await checkout.previewInStripeButton.click();
    await checkout.previewTierOption(tierName).click();

    await expect(page.getByText('Your browser blocked the preview')).toBeVisible();
    expect(stripe!.getCheckoutSessions()).toHaveLength(0);
  });

  test('preview menu - offers each paid tier, and not the free one', async ({ page, stripe }) => {
    const tierName = await paidTier(page, stripe!);

    const checkout = await openCheckoutSettings(page);
    await checkout.previewInStripeButton.click();

    await expect(checkout.previewTierOption(tierName)).toBeVisible();
    await expect(checkout.previewTierOption('Free')).toHaveCount(0);
  });
});

test.describe('Ghost Admin - Checkout design on a small screen', () => {
  test.use({
    stripeEnabled: true,
    labs: { stripeCheckoutDesign: true },
    viewport: { width: 390, height: 844 },
  });

  test('phone-sized screen - the design can still be customized and saved', async ({
    page,
    stripe,
  }) => {
    const tierName = await paidTier(page, stripe!);

    await saveDesign(page, DESIGN);

    // The member can be on any screen; the site's theme hides its Subscribe link on phones.
    await page.setViewportSize({ width: 1280, height: 800 });
    await startPaidSignupViaPortal(page, { tierName });

    expect(latestCheckoutDesign(stripe!)).toEqual(SENT_TO_STRIPE);
  });
});

test.describe('Ghost Admin - Checkout design without its labs flag', () => {
  test.use({ stripeEnabled: true });

  test('labs flag off - checkout settings cannot be opened', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    const checkout = new CheckoutSettingsModal(page);

    await expect(page.getByRole('button', { name: 'Connected to Stripe' })).toBeVisible();
    await expect(checkout.openButton).toHaveCount(0);

    await page.goto('/ghost/#/settings/tiers/checkout');
    await expect(page).toHaveURL(/#\/settings\/tiers$/);
    await expect(checkout.modal).toHaveCount(0);
  });
});

test.describe('Ghost Admin - Checkout design without Stripe', () => {
  test.use({ labs: { stripeCheckoutDesign: true } });

  test('Stripe not connected - checkout settings are not offered', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(page.getByRole('button', { name: 'Connect with Stripe' })).toBeVisible();
    await expect(new CheckoutSettingsModal(page).openButton).toHaveCount(0);
  });

  test('Stripe not connected - the settings offer no preview in Stripe', async ({ page }) => {
    await page.goto('/ghost/#/settings/tiers/checkout');
    const checkout = new CheckoutSettingsModal(page);
    await checkout.modal.waitFor({ state: 'visible' });

    await expect(checkout.customizeDesignSwitch).toBeVisible();
    await expect(checkout.previewInStripeButton).toHaveCount(0);
  });
});

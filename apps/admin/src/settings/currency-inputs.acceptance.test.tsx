import { describe, expect, it, vi } from 'vitest';
import { type Locator, userEvent } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakeOffers,
  fakeSettingsScreens,
  fakeTiers,
  offer,
  renderAdminApp,
  settingsResponse,
  tier,
} from '@test-utils/acceptance';
import { offersScreen } from '@/settings/offers.screen';
import { settingsScreen } from '@/settings/settings.screen';

const freeTier = tier({ id: '645453f4d254799990dd0e21', name: 'Free', slug: 'free', type: 'free' });
const bronzeTier = tier({
  id: '645453f4d254799990dd0e22',
  name: 'Bronze',
  slug: 'bronze',
  monthly_price: 550,
  yearly_price: 5500,
});

function stripeSettings(settings: Record<string, string | boolean | number | null> = {}) {
  return settingsResponse({
    settings: {
      ...settings,
      stripe_connect_display_name: 'Dummy',
      stripe_connect_livemode: false,
      stripe_connect_account_id: 'acct_123',
      stripe_connect_publishable_key: 'pk_test_123',
      stripe_connect_secret_key: 'sk_test_123',
    },
  });
}

type SettingValues = Record<string, string | boolean | number | null>;
type SettingsPutBody = { settings: { key: string; value: SettingValues[string] }[] };

/**
 * Serves settings with Stripe connected and echoes every PUT on top of them.
 * `fakeEditSettings` echoes onto the default fixture, which drops the Stripe
 * keys after the first save and hides Stripe-only fields mid-test.
 */
function fakeStripeSettings(initial: SettingValues) {
  const stored: SettingValues = { ...initial };
  const saveApi = fakeAdminEndpoint('PUT', '/settings/', ({ body }) => {
    for (const { key, value } of (body as SettingsPutBody).settings) {
      stored[key] = value;
    }
    return stripeSettings(stored);
  });
  return { boot: { browseSettings: { response: stripeSettings(stored) } }, saveApi };
}

const valueOf = (input: Locator) => (input.element() as HTMLInputElement).value;

/**
 * Selects whatever the field holds, then types `text` one real keystroke at a
 * time and blurs it. Returns the field's value when first shown, after every
 * keystroke, and after blur.
 */
async function typeIntoCurrencyField(input: Locator, text: string) {
  await expect.element(input).toBeVisible();
  const values = [valueOf(input)];
  await input.tripleClick();
  for (const key of text) {
    await userEvent.keyboard(key);
    values.push(valueOf(input));
  }
  await userEvent.tab();
  values.push(valueOf(input));
  return values;
}

describe('Currency inputs keep the trailing zero', () => {
  it('tier monthly price', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, bronzeTier]);
    const editApi = fakeAdminEndpoint('PUT', `/tiers/${bronzeTier.id}/`, {
      tiers: [{ ...bronzeTier, monthly_price: 990 }],
    });
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    await expect.element(settingsScreen.tiers()).toHaveTextContent('$5.50/month');
    await settingsScreen.tiers().getByText('Bronze', { exact: true }).click();
    const modal = settingsScreen.tierDetailModal();
    const input = modal.getByLabelText('Monthly price');

    const values = await typeIntoCurrencyField(input, '9.90');
    expect(values).toEqual(['5.50', '9', '9.', '9.9', '9.90', '9.90']);
    await expect.element(modal.getByTestId('tier-preview')).toHaveTextContent('$9.90/month');

    await settingsScreen.modalSaveButton(modal).click();
    await expect
      .poll(() => editApi.lastRequest?.body)
      .toMatchObject({
        tiers: [{ monthly_price: 990 }],
      });
  });

  it('tier yearly price', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, bronzeTier]);
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    await settingsScreen.tiers().getByText('Bronze', { exact: true }).click();
    const modal = settingsScreen.tierDetailModal();
    const values = await typeIntoCurrencyField(modal.getByLabelText('Yearly price'), '55.50');
    expect(values).toEqual(['55', '5', '55', '55.', '55.5', '55.50', '55.50']);
    await modal.getByTestId('tier-preview').getByRole('button', { name: 'Yearly' }).click();
    await expect.element(modal.getByTestId('tier-preview')).toHaveTextContent('$55.50/year');
  });

  it('tier yearly price typed with a thousands comma', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, bronzeTier]);
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    await settingsScreen.tiers().getByText('Bronze', { exact: true }).click();
    const modal = settingsScreen.tierDetailModal();
    const values = await typeIntoCurrencyField(modal.getByLabelText('Yearly price'), '1,000');
    // The test browser's locale writes decimals with a dot, so the comma groups thousands
    expect(values).toEqual(['55', '1', '1', '10', '100', '1000', '1000']);
    await modal.getByTestId('tier-preview').getByRole('button', { name: 'Yearly' }).click();
    await expect.element(modal.getByTestId('tier-preview')).toHaveTextContent('$1,000/year');
  });

  it('new tier monthly price', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, bronzeTier]);
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    await settingsScreen.tiers().getByRole('button', { name: 'Add tier' }).click();
    const modal = settingsScreen.tierDetailModal();
    const values = await typeIntoCurrencyField(modal.getByLabelText('Monthly price'), '5.50');
    expect(values).toEqual(['', '5', '5.', '5.5', '5.50', '5.50']);
    await expect.element(modal.getByTestId('tier-preview')).toHaveTextContent('$5.50/month');
  });

  it('tips & donations suggested amount', async () => {
    fakeSettingsScreens();
    const { boot, saveApi } = fakeStripeSettings({
      donations_enabled: true,
      donations_suggested_amount: 550,
    });
    await renderAdminApp('/settings', { boot });

    const input = settingsScreen.suggestedAmount();
    const values = await typeIntoCurrencyField(input, '7.50');
    expect(values).toEqual(['5.50', '7', '7.', '7.5', '7.50', '7.50']);

    await settingsScreen.tipsAndDonations().getByRole('button', { name: 'Save' }).click();
    await expect
      .poll(() => (saveApi.lastRequest?.body as SettingsPutBody | undefined)?.settings)
      .toContainEqual({ key: 'donations_suggested_amount', value: '750' });
  });

  it('agent payments price per post', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, bronzeTier]);
    const { boot, saveApi } = fakeStripeSettings({
      machine_payments_enabled: true,
      machine_payments_amount: 550,
      machine_payments_currency: 'USD',
    });
    await renderAdminApp('/settings', { labs: { machinePayments: true }, boot });

    const input = settingsScreen.tiers().getByLabelText('Price per post');
    const values = await typeIntoCurrencyField(input, '7.50');
    expect(values).toEqual(['5.50', '7', '7.', '7.5', '7.50', '7.50']);
    await expect
      .poll(() => (saveApi.lastRequest?.body as SettingsPutBody | undefined)?.settings)
      .toContainEqual({ key: 'machine_payments_amount', value: 750 });
  });

  it('new offer fixed amount', async () => {
    fakeSettingsScreens();
    fakeTiers([bronzeTier]);
    fakeOffers([]);
    const created = offer({
      id: '6487ea6464fca78ec2fff600',
      name: 'Small discount',
      code: 'small-discount',
      display_title: 'Small discount',
      type: 'fixed',
      amount: 150,
      currency: 'USD',
      tier: { id: bronzeTier.id, name: bronzeTier.name },
    });
    const addApi = fakeAdminEndpoint('POST', '/offers/', { offers: [created] });
    fakeAdminEndpoint('GET', `/offers/${created.id}/`, { offers: [created] });
    await renderAdminApp('/settings/offers/new', {
      boot: { browseSettings: { response: stripeSettings() } },
    });

    const sidebar = offersScreen.addSidebar();
    await sidebar.getByPlaceholder('Black Friday', { exact: true }).fill('Small discount');
    await sidebar.getByLabelText('Amount type').click();
    await offersScreen.selectOption('USD').click();
    const values = await typeIntoCurrencyField(sidebar.getByLabelText('Amount off'), '1.50');
    expect(values).toEqual(['', '1', '1.', '1.5', '1.50', '1.50']);

    await offersScreen.publishButton().click();
    await expect
      .poll(() => addApi.lastRequest?.body)
      .toMatchObject({ offers: [{ type: 'fixed', amount: 150 }] });
    // The success modal's share text carries the formatted discount.
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    await offersScreen.successModal().getByRole('button', { name: 'Share on X' }).click();
    expect(open.mock.calls[0]?.[0]).toContain(encodeURIComponent('1.50 USD discount'));
    open.mockRestore();
  });

  it('offers list prices', async () => {
    fakeSettingsScreens();
    fakeTiers([bronzeTier]);
    fakeOffers([
      offer({
        name: 'Small discount',
        code: 'small-discount',
        display_title: 'Small discount',
        type: 'fixed',
        amount: 150,
        currency: 'USD',
        duration: 'once',
        tier: { id: bronzeTier.id, name: bronzeTier.name },
      }),
    ]);
    await renderAdminApp('/settings/offers/edit', {
      boot: { browseSettings: { response: stripeSettings() } },
    });

    const modal = offersScreen.listModal();
    await expect.element(modal).toHaveTextContent('1.50 USD off');
    await expect.element(modal).toHaveTextContent(/\$4 \$5\.50/);
  });
});

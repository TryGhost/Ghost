import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

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
const supporterTier = tier({
  id: '645453f4d254799990dd0e22',
  name: 'Basic Supporter',
  slug: 'basic-supporter',
  benefits: ['Simple benefit'],
});

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

function withoutSettings(keys: string[]) {
  const response = stripeSettings({ labs: { machinePayments: true } });
  response.settings = response.settings.filter(({ key }) => !keys.includes(key));
  return response;
}

function stripeLimitConfig() {
  const config = configResponse();
  config.config.hostSettings = {
    limits: {
      limitStripeConnect: {
        disabled: true,
        error: "Your current plan doesn't support Stripe Connect.",
      },
    },
  };
  return config;
}

describe('Tier settings', () => {
  it('validates and creates a paid tier in the visible list', async () => {
    const created = tier({
      id: 'new-tier',
      name: 'Plus tier',
      slug: 'plus-tier',
      monthly_price: 800,
      yearly_price: 8000,
    });
    let saved = false;
    fakeSettingsScreens();
    fakeTiers(() => (saved ? [freeTier, supporterTier, created] : [freeTier, supporterTier]));
    const createApi = fakeAdminEndpoint('POST', '/tiers/', () => {
      saved = true;
      return { tiers: [created] };
    });
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    await settingsScreen.tiers().getByRole('button', { name: 'Add tier' }).click();
    const modal = settingsScreen.tierDetailModal();
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByText('Enter a name for the tier')).toBeVisible();
    await expect(modal.getByText('Amount must be at least $1')).toHaveCount(2);

    await modal.getByLabelText('Name').fill(created.name);
    await modal.getByLabelText('Monthly price').fill('8');
    await modal.getByLabelText('Yearly price').fill('80');
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();
    await modal.getByRole('button', { name: 'Close' }).click();

    await expect
      .element(settingsScreen.tiers().getByText(created.name, { exact: true }))
      .toBeVisible();
    expect(createApi.lastRequest?.body).toMatchObject({
      tiers: [{ name: created.name, monthly_price: 800, yearly_price: 8000, trial_days: null }],
    });
  });

  it('validates, previews, and updates a paid tier', async () => {
    const updated = {
      ...supporterTier,
      name: 'Supporter updated',
      description: 'Supporter description',
      monthly_price: 1001,
      yearly_price: 10000,
      trial_days: 7,
      benefits: ['Simple benefit', 'New benefit'],
    };
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    const editApi = fakeAdminEndpoint('PUT', `/tiers/${supporterTier.id}/`, { tiers: [updated] });
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    await settingsScreen.tiers().getByText(supporterTier.name, { exact: true }).click();
    const modal = settingsScreen.tierDetailModal();
    const preview = modal.getByTestId('tier-preview');
    await expect.element(preview).toHaveTextContent('$5/month');
    await expect.element(preview).toHaveTextContent('Simple benefit');

    await modal.getByLabelText('Name').fill('');
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByText('Enter a name for the tier')).toBeVisible();
    await modal.getByLabelText('Name').fill(updated.name);
    await modal.getByLabelText('Description').fill(updated.description);
    await modal.getByLabelText('Monthly price').fill('10.01');
    await modal.getByLabelText('Yearly price').fill('100');
    await modal.getByLabelText('Add a free trial').click();
    await modal.getByLabelText('Trial days').fill('7');
    await modal.getByLabelText('New benefit').fill('New benefit');
    await modal.getByRole('button', { name: 'Add' }).click();
    await expect.element(preview).toHaveTextContent('$10.01/month');
    await expect.element(preview).toHaveTextContent('New benefit');
    await preview.getByRole('button', { name: 'Yearly' }).click();
    await expect.element(preview).toHaveTextContent('$100/year');
    await expect.element(preview).toHaveTextContent('17% discount');

    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();
    await modal.getByRole('button', { name: 'Close' }).click();
    await expect
      .element(settingsScreen.tiers().getByText(updated.name, { exact: true }))
      .toBeVisible();
    expect(editApi.lastRequest?.body).toMatchObject({ tiers: [updated] });
  });

  it('updates the free tier', async () => {
    const updated = {
      ...freeTier,
      description: 'Free tier description',
      welcome_page_url: '/welcome-page/',
      benefits: ['First benefit', 'Second benefit'],
    };
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    const editApi = fakeAdminEndpoint('PUT', `/tiers/${freeTier.id}/`, { tiers: [updated] });
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    await settingsScreen.tiers().getByText(freeTier.name, { exact: true }).click();
    const modal = settingsScreen.tierDetailModal();
    await modal.getByLabelText('Description').fill(updated.description);
    await modal.getByLabelText('Welcome page').fill('welcome-page');
    await modal.getByLabelText('New benefit').fill('First benefit');
    await modal.getByRole('button', { name: 'Add' }).click();
    await modal.getByLabelText('New benefit').fill('Second benefit');
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();

    expect(editApi.lastRequest?.body).toMatchObject({
      tiers: [
        {
          id: freeTier.id,
          description: updated.description,
          welcome_page_url: updated.welcome_page_url,
          benefits: updated.benefits,
        },
      ],
    });
  });

  it('keeps the benefit editor focused and visible when adding with the button or Enter', async () => {
    const scrollingTier = {
      ...supporterTier,
      benefits: Array.from({ length: 12 }, (_, index) => `Benefit ${index + 1}`),
    };
    fakeSettingsScreens();
    fakeTiers([freeTier, scrollingTier]);
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    await settingsScreen.tiers().getByText(scrollingTier.name, { exact: true }).click();
    const modal = settingsScreen.tierDetailModal();
    await expect.element(modal).toBeVisible();
    const modalElement = modal.element() as HTMLElement;
    const newBenefit = modal.getByLabelText('New benefit');
    const addBenefit = modal.getByRole('button', { name: 'Add benefit' });
    const pageScrollTop = document.scrollingElement?.scrollTop ?? 0;
    const scrollBy = vi.spyOn(modalElement, 'scrollBy');

    // Empty benefits are ignored without moving either scroll container.
    await addBenefit.click();
    expect(scrollBy).not.toHaveBeenCalled();

    const reducedMotion = vi
      .spyOn(window, 'matchMedia')
      .mockReturnValue({ matches: true } as MediaQueryList);
    await newBenefit.fill('Added with button');
    await addBenefit.click();
    await expect.element(newBenefit).toHaveFocus();
    await expect.poll(() => scrollBy.mock.calls.length).toBe(1);
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }));

    reducedMotion.mockRestore();
    await newBenefit.fill('Added with Enter');
    await userEvent.keyboard('{Enter}');
    await expect.element(newBenefit).toHaveFocus();
    await expect.poll(() => scrollBy.mock.calls.length).toBe(2);
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'smooth' }));

    await expect
      .poll(() => {
        const inputRect = newBenefit.element().getBoundingClientRect();
        const modalRect = modalElement.getBoundingClientRect();
        return inputRect.top >= modalRect.top && inputRect.bottom <= modalRect.bottom;
      })
      .toBe(true);
    expect(document.scrollingElement?.scrollTop ?? 0).toBe(pageScrollTop);
    expect(
      Array.from(
        modalElement.querySelectorAll<HTMLInputElement>('input[aria-label="Benefit"]'),
      ).map((input) => input.value),
    ).toEqual(expect.arrayContaining(['Added with button', 'Added with Enter']));
  });

  it('moves a tier between the Active and Archived tabs when archived and reactivated', async () => {
    let currentSupporter = supporterTier;
    fakeSettingsScreens();
    fakeTiers(() => [freeTier, currentSupporter]);
    const editApi = fakeAdminEndpoint('PUT', `/tiers/${supporterTier.id}/`, ({ body }) => {
      currentSupporter = (body as { tiers: [typeof supporterTier] }).tiers[0];
      return { tiers: [currentSupporter] };
    });
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    const section = settingsScreen.tiers();
    const tierName = section.getByText(supporterTier.name, { exact: true });
    await tierName.click();
    const modal = settingsScreen.tierDetailModal();
    await modal.getByRole('button', { name: 'Archive tier' }).click();
    await settingsScreen.confirmationModal().getByRole('button', { name: 'Archive' }).click();
    await expect
      .poll(
        () =>
          (editApi.lastRequest?.body as { tiers: [{ active: boolean }] } | undefined)?.tiers[0]
            .active,
      )
      .toBe(false);
    // The success toast overlays the modal's left footer button; dismiss it.
    await settingsScreen.successToast().getByRole('button').click();
    await expect(settingsScreen.successToast()).toHaveCount(0);
    await modal.getByRole('button', { name: 'Close' }).click();

    await expect(tierName).toHaveCount(0);
    await section.getByRole('tab', { name: 'Archived' }).click();
    await expect.element(tierName).toBeVisible();

    await tierName.click();
    await modal.getByRole('button', { name: 'Reactivate tier' }).click();
    await settingsScreen.confirmationModal().getByRole('button', { name: 'Reactivate' }).click();
    await expect
      .poll(
        () =>
          (editApi.lastRequest?.body as { tiers: [{ active: boolean }] } | undefined)?.tiers[0]
            .active,
      )
      .toBe(true);
    await settingsScreen.successToast().getByRole('button').click();
    await expect(settingsScreen.successToast()).toHaveCount(0);
    await modal.getByRole('button', { name: 'Close' }).click();

    await expect(tierName).toHaveCount(0);
    await section.getByRole('tab', { name: 'Active' }).click();
    await expect.element(tierName).toBeVisible();
    expect(editApi.requests).toHaveLength(2);
  });

  it('shows a hidden paid tier as unchecked in portal signup options and saves enabling it', async () => {
    const hidden = { ...supporterTier, visibility: 'none' as const };
    fakeSettingsScreens();
    fakeTiers([freeTier, hidden]);
    fakeEditSettings();
    const tierApi = fakeAdminEndpoint('PUT', `/tiers/${hidden.id}/`, ({ body }) => body);
    await renderAdminApp('/settings', { boot: { browseSettings: { response: stripeSettings() } } });

    await settingsScreen.portal().getByRole('button', { name: 'Customize' }).click();
    const modal = settingsScreen.portalModal();
    const checkbox = modal.getByLabelText(hidden.name);
    await expect.element(checkbox).toBeVisible();
    await expect.element(checkbox).not.toBeChecked();

    await checkbox.click();
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();
    expect(tierApi.lastRequest?.body).toMatchObject({
      tiers: [{ id: hidden.id, visibility: 'public' }],
    });
  });

  it('blocks Stripe connection when the plan limit applies', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    await renderAdminApp('/settings', {
      boot: { browseConfig: { response: stripeLimitConfig() } },
    });

    await settingsScreen.tiers().getByRole('button', { name: 'Connect with Stripe' }).click();
    await expect
      .element(settingsScreen.limitModal())
      .toHaveTextContent("Your current plan doesn't support Stripe Connect");
    await expect(settingsScreen.stripeModal()).toHaveCount(0);
    await settingsScreen.limitModal().getByRole('button', { name: 'Upgrade' }).click();
    expect(JSON.parse(document.body.dataset.externalNavigate!)).toMatchObject({ route: '/pro' });
  });

  it('allows an already-connected site to manage Stripe despite the plan limit', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    await renderAdminApp('/settings', {
      boot: {
        browseConfig: { response: stripeLimitConfig() },
        browseSettings: { response: stripeSettings() },
      },
    });

    await settingsScreen
      .tiers()
      .getByRole('button', { name: 'Connected to Stripe' })
      .first()
      .click();
    await expect(settingsScreen.limitModal()).toHaveCount(0);
    await expect.element(settingsScreen.stripeModal()).toBeVisible();
  });

  it('shows agent payment controls when the lab is on and the backend has deployed them', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    await renderAdminApp('/settings', {
      labs: { machinePayments: true },
      boot: { browseSettings: { response: stripeSettings({ labs: { machinePayments: true } }) } },
    });

    await expect
      .element(settingsScreen.tiers().getByText('Accept payments from AI agents'))
      .toBeVisible();
    await expect
      .element(settingsScreen.tiers().getByTestId('machine-payments-toggle'))
      .toBeVisible();
  });

  it('hides agent payment controls when the backend has not deployed them', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    await renderAdminApp('/settings', {
      labs: { machinePayments: true },
      boot: { browseSettings: { response: withoutSettings(['machine_payments_enabled']) } },
    });

    await expect(settingsScreen.tiers().getByText('Accept payments from AI agents')).toHaveCount(0);
    await expect(settingsScreen.tiers().getByTestId('machine-payments-toggle')).toHaveCount(0);
  });

  it('blocks direct access to Stripe connection when the plan limit applies', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier, supporterTier]);
    await renderAdminApp('/settings/stripe-connect', {
      boot: { browseConfig: { response: stripeLimitConfig() } },
    });

    await expect
      .element(settingsScreen.limitModal())
      .toHaveTextContent("Your current plan doesn't support Stripe Connect");
    await expect(settingsScreen.stripeModal()).toHaveCount(0);
    await settingsScreen.limitModal().getByRole('button', { name: 'Upgrade' }).click();
    expect(JSON.parse(document.body.dataset.externalNavigate!)).toMatchObject({ route: '/pro' });
  });
});

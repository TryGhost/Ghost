import { describe, expect, it } from 'vitest';

import {
  fakeAdminEndpoint,
  fakeEditSettings,
  fakeSettingsScreens,
  fakeTiers,
  renderAdminApp,
  settingsResponse,
  tier,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

const freeTier = tier({
  id: '645453f4d254799990dd0e21',
  name: 'Free',
  slug: 'free',
  type: 'free',
});

async function openPortal() {
  await settingsScreen.portal().getByRole('button', { name: 'Customize' }).click();
  await expect.element(settingsScreen.portalModal()).toBeVisible();
  return settingsScreen.portalModal();
}

function getPreviewParam(preview: HTMLIFrameElement, key: string) {
  const hashQuery = new URL(preview.src).hash.split('?')[1];
  return new URLSearchParams(hashQuery).get(key);
}

describe('Portal settings', () => {
  it('saves signup display and free-tier options', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    const tierApi = fakeAdminEndpoint('PUT', `/tiers/${freeTier.id}/`, ({ body }) => body);
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings');

    const modal = await openPortal();
    const displayName = modal.getByLabelText('Display name in signup form');
    const freeTierCheckbox = modal.getByTestId('free-tier-checkbox');
    await expect.element(displayName).toBeChecked();
    await expect.element(freeTierCheckbox).toBeChecked();
    await displayName.click();
    await freeTierCheckbox.click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();
    expect(tierApi.lastRequest?.body).toMatchObject({
      tiers: [{ id: freeTier.id, visibility: 'none' }],
    });
    await expect(settingsApi).toHaveEditedSettings([
      { key: 'portal_name', value: false },
      { key: 'portal_plans', value: '["monthly","yearly"]' },
    ]);
  });

  it('saves the independent signup and account gift promotion settings', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings');

    const modal = await openPortal();
    const preview = modal.getByTestId('portal-preview');
    const signupGiftPromotion = modal.getByLabelText('Display option to purchase gift');
    await expect.element(signupGiftPromotion).toBeChecked();
    await expect
      .poll(() => getPreviewParam(preview.element() as HTMLIFrameElement, 'signupGiftPromotion'))
      .toBe('true');
    await signupGiftPromotion.click();
    await expect
      .poll(() => getPreviewParam(preview.element() as HTMLIFrameElement, 'signupGiftPromotion'))
      .toBe('false');

    await modal.getByRole('tab', { name: 'Account page' }).last().click();
    const accountGiftPromotion = modal.getByLabelText('Display option to purchase gift');
    await expect.element(accountGiftPromotion).toBeChecked();
    await expect
      .poll(() => getPreviewParam(preview.element() as HTMLIFrameElement, 'accountGiftPromotion'))
      .toBe('true');
    await accountGiftPromotion.click();
    await expect
      .poll(() => getPreviewParam(preview.element() as HTMLIFrameElement, 'accountGiftPromotion'))
      .toBe('false');
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();
    await expect(settingsApi).toHaveEditedSettings([
      { key: 'portal_signup_gift_promotion', value: false },
      { key: 'portal_account_gift_promotion', value: false },
    ]);
  });

  it('hides the gift options and gift link on invite-only sites', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    const settings = settingsResponse({ settings: { members_signup_access: 'invite' } });
    await renderAdminApp('/settings', { boot: { browseSettings: { response: settings } } });

    const modal = await openPortal();
    await expect.element(modal.getByText('Available tiers')).toBeVisible();
    await expect(modal.getByLabelText('Display option to purchase gift')).toHaveCount(0);

    await modal.getByRole('tab', { name: 'Account page' }).last().click();
    await expect.element(modal.getByLabelText('Support email address')).toBeVisible();
    await expect(modal.getByLabelText('Display option to purchase gift')).toHaveCount(0);

    await modal.getByRole('tab', { name: 'Links' }).click();
    await expect.element(modal.getByText('Sign up', { exact: true })).toBeVisible();
    await expect(modal.getByText('Gift subscriptions', { exact: true })).toHaveCount(0);
  });

  it('lists the gift link on sites that take payments', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings');

    const modal = await openPortal();
    await modal.getByRole('tab', { name: 'Links' }).click();
    await expect.element(modal.getByText('Gift subscriptions', { exact: true })).toBeVisible();
  });

  it('shows the free tier option when Stripe is disconnected', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    await renderAdminApp('/settings');

    const modal = await openPortal();
    const freeTierCheckbox = modal.getByTestId('free-tier-checkbox');
    await expect.element(freeTierCheckbox).toBeVisible();
    await expect.element(freeTierCheckbox).toBeChecked();
    await expect.element(modal.getByText('Free', { exact: true })).toBeVisible();
  });

  it('hides the free-tier option for paid-only signup', async () => {
    fakeSettingsScreens();
    fakeTiers([freeTier]);
    const settings = settingsResponse({ settings: { members_signup_access: 'paid' } });
    await renderAdminApp('/settings', { boot: { browseSettings: { response: settings } } });

    const modal = await openPortal();
    await expect(modal.getByTestId('free-tier-checkbox')).toHaveCount(0);
  });

  it('explains why Portal is disabled when subscription access is set to nobody', async () => {
    fakeSettingsScreens();
    const settings = settingsResponse({ settings: { members_signup_access: 'none' } });
    await renderAdminApp('/settings', { boot: { browseSettings: { response: settings } } });

    const portal = settingsScreen.portal();
    await expect.element(portal.getByRole('button', { name: 'Customize' })).toBeDisabled();
    await expect.element(portal.getByText(/is set to ‘Nobody’/)).toBeVisible();
    await expect.element(portal.getByRole('button', { name: 'Subscription access' })).toBeVisible();
  });

  it('saves Look & Feel settings', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings');

    const modal = await openPortal();
    await modal.getByRole('tab', { name: 'Look & feel' }).click();
    await modal
      .getByRole('textbox', { name: 'Signup button text' })
      .fill('become a member of something epic');
    await modal.getByRole('switch').click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();
    await expect(settingsApi).toHaveEditedSettings([
      { key: 'portal_button', value: false },
      { key: 'portal_button_signup_text', value: 'become a member of something epic' },
    ]);
  });

  it('keeps the preview and settings tabs synchronized', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings');

    const modal = await openPortal();
    const previewAccountTab = modal.getByRole('tab', { name: 'Account page' }).first();
    const settingsAccountTab = modal.getByRole('tab', { name: 'Account page' }).last();
    const linksTab = modal.getByRole('tab', { name: 'Links' });
    const lookAndFeelTab = modal.getByRole('tab', { name: 'Look & feel' });
    const signupTab = modal.getByRole('tab', { name: 'Signup', exact: true });
    const signupOptionsTab = modal.getByRole('tab', { name: 'Signup options' });

    await previewAccountTab.click();
    await expect.element(settingsAccountTab).toHaveAttribute('data-state', 'active');

    await linksTab.click();
    await expect.element(settingsAccountTab).toHaveAttribute('data-state', 'active');

    await lookAndFeelTab.click();
    await expect.element(signupTab).toHaveAttribute('data-state', 'active');

    await signupOptionsTab.click();
    await expect.element(signupTab).toHaveAttribute('data-state', 'active');
  });

  it('validates and saves the support email address', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings');

    const modal = await openPortal();
    await modal.getByRole('tab', { name: 'Account page' }).last().click();
    const supportEmail = modal.getByLabelText('Support email address');
    await supportEmail.fill('not-an-email');
    supportEmail.element().blur();
    await expect.element(modal.getByText('Enter a valid email address')).toBeVisible();

    await supportEmail.fill('hello@world.com');
    await modal.getByRole('tab', { name: 'Signup options' }).click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect.element(modal.getByRole('button', { name: 'Saved' })).toBeVisible();
    await expect(settingsApi).toHaveEditedSettings([
      { key: 'members_support_address', value: 'hello@world.com' },
    ]);
  });
});

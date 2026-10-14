import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  fakeAdminEndpoint,
  fakeAutomations,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';
import type {
  AutomationDetail,
  PaidSubscriptionChangedTriggerOptions,
} from '@tryghost/admin-x-framework/api/automations';
import { detail, setup } from './run-history.test-utils';

const labs = { automations: true, automationsPerTier: true, automationsLifecycleTriggers: true };
const button = (name: string) => page.getByRole('button', { name, exact: true });
const combobox = (name: string) => page.getByRole('combobox', { name, exact: true });
const option = (name: string) => page.getByRole('option', { name, exact: true });
const card = () => page.getByRole('article', { name: 'Paid subscription changed', exact: true });
const tiers = [
  { id: 'bronze', name: 'Bronze', type: 'paid', active: true },
  { id: 'silver', name: 'Silver', type: 'paid', active: true },
  { id: 'gold', name: 'Gold', type: 'paid', active: true },
  { id: 'free', name: 'Free', type: 'free', active: true },
];
const stripeBoot = {
  browseSettings: {
    response: settingsResponse({
      settings: { stripe_secret_key: 'sk_test', stripe_publishable_key: 'pk_test' },
    }),
  },
};

const selectOption = async (select: string, name: string) => {
  await combobox(select).click();
  await option(name).click();
};
const pickTier = async (picker: string, name: string) => {
  await combobox(picker).click();
  await option(name).click();
  await userEvent.keyboard('{Escape}');
};

const serve = (triggerOptions: PaidSubscriptionChangedTriggerOptions) => {
  setup();
  const automation = {
    ...detail('first'),
    trigger_type: 'paid_subscription_changed',
    trigger_options: triggerOptions,
    trigger_tier_scope: null,
    trigger_tier_ids: null,
  } as AutomationDetail;
  fakeAdminEndpoint('GET', '/automations/first/', { automations: [automation] });
  fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers });
  return fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
    automations: [
      {
        ...automation,
        ...(body as { automations: Partial<AutomationDetail>[] }).automations[0],
      },
    ],
  }));
};
const savedAutomation = (save: ReturnType<typeof serve>) =>
  (save.requests[0].body as { automations: Record<string, unknown>[] }).automations[0];

describe('Paid subscription changed trigger', () => {
  it('is only offered when the labs flag is enabled', async () => {
    fakeAutomations([]);
    fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers });
    await renderAdminApp('/automations/new', {
      labs: { ...labs, automationsLifecycleTriggers: false },
      boot: stripeBoot,
    });
    await expect.element(page.getByText('Select a trigger', { exact: true })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /^Paid subscription started/ }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /^Paid subscription changed/ }))
      .not.toBeInTheDocument();
  });

  it('creates an automation for members who move into specific tiers', async () => {
    fakeAutomations([]);
    fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers });
    const create = fakeAdminEndpoint('POST', '/automations/', ({ body }) => ({
      automations: [
        {
          ...detail('created'),
          ...(body as { automations: AutomationDetail[] }).automations[0],
          id: 'created',
        },
      ],
    }));
    await renderAdminApp('/automations/new', { labs, boot: stripeBoot });
    await page.getByRole('button', { name: /^Paid subscription changed/ }).click();
    await button('Hide automation sidebar').click();

    await expect.element(card()).toBeVisible();
    await expect.element(combobox('From')).toHaveTextContent('Any paid tier');
    await expect.element(combobox('To')).toHaveTextContent('Specific tiers');

    await button('Add step').click();
    await page.getByTestId('step-picker').getByRole('button', { name: /^Wait/ }).click();
    await button('Save').click();
    await expect
      .element(page.getByText('Select at least one tier to change to.', { exact: true }))
      .toBeVisible();
    expect(create.requests).toHaveLength(0);

    await pickTier('To tiers', 'Silver');
    await pickTier('To tiers', 'Gold');
    await expect
      .element(page.getByText('Select at least one tier to change to.', { exact: true }))
      .not.toBeInTheDocument();
    await button('Save').click();
    await expect.poll(() => create.requests.length).toBe(1);
    const created = (create.requests[0].body as { automations: Record<string, unknown>[] })
      .automations[0];
    expect(created).toMatchObject({
      trigger_type: 'paid_subscription_changed',
      trigger_options: {
        from: { type: 'any_paid_tier' },
        to: { type: 'specific_tiers', tier_ids: ['silver', 'gold'] },
      },
    });
    expect(created).not.toHaveProperty('trigger_tier_scope');
    expect(created).not.toHaveProperty('trigger_tier_ids');
  });

  it('does not offer tiers chosen in "From" as "To" tiers, and vice versa', async () => {
    serve({
      from: { type: 'specific_tiers', tier_ids: ['bronze'] },
      to: { type: 'specific_tiers', tier_ids: ['gold'] },
    });
    await renderAdminApp('/automations/first', { labs });
    await expect.element(card()).toHaveTextContent('Bronze');
    await expect.element(card()).toHaveTextContent('Gold');

    await combobox('To tiers').click();
    await expect.element(option('Silver')).toBeVisible();
    await expect.element(option('Bronze')).not.toBeInTheDocument();
    await expect.element(option('Free')).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await combobox('From tiers').click();
    await expect.element(option('Silver')).toBeVisible();
    await expect.element(option('Gold')).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  });

  it('saves "From" and "To" changes', async () => {
    const save = serve({
      from: { type: 'any_paid_tier' },
      to: { type: 'specific_tiers', tier_ids: ['gold'] },
    });
    await renderAdminApp('/automations/first', { labs });
    await expect.element(combobox('To tiers')).toBeVisible();

    await selectOption('From', 'Specific tiers');
    await selectOption('To', 'Canceled auto-renew');
    await expect.element(combobox('To tiers')).not.toBeInTheDocument();
    await button('Save').click();
    await expect
      .element(page.getByText('Select at least one tier to change from.', { exact: true }))
      .toBeVisible();
    expect(save.requests).toHaveLength(0);

    await pickTier('From tiers', 'Silver');
    await selectOption('To', 'Downgraded to free');
    await button('Save').click();
    await expect.poll(() => save.requests.length).toBe(1);
    expect(savedAutomation(save)).toMatchObject({
      trigger_type: 'paid_subscription_changed',
      trigger_options: {
        from: { type: 'specific_tiers', tier_ids: ['silver'] },
        to: { type: 'downgraded_to_free' },
      },
    });
    await expect.element(button('Save')).toBeDisabled();
  });
});

import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  fakeAdminEndpoint,
  fakeAutomations,
  currentRoute,
  unsavedChangesGuarded,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';

import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { detail } from './run-history.test-utils';

const button = (name: string) => page.getByRole('button', { name, exact: true });
const option = (name: string) => page.getByRole('option', { name, exact: true });
const from = () => page.getByRole('combobox', { name: 'From', exact: true });
const to = () => page.getByRole('combobox', { name: 'To', exact: true });
const triggerCard = () =>
  page.getByRole('article', { name: 'Paid subscription changed', exact: true });

const labs = { automations: true, automationsLifecycleTriggers: true };
const start = async (featureFlags: Record<string, boolean>, supported = true) => {
  if (supported) {
    fakeAdminEndpoint('GET', '/automations/', {
      automations: [],
      meta: { supported_trigger_types: ['membership_started', 'paid_subscription_changed'] },
    });
  } else {
    fakeAutomations([]);
  }
  fakeAdminEndpoint('GET', /\/tiers\/\?/, {
    tiers: [
      { id: 'bronze', name: 'Bronze', type: 'paid', active: true },
      { id: 'silver', name: 'Silver', type: 'paid', active: true },
      { id: 'gold', name: 'Gold', type: 'paid', active: true },
      { id: 'legacy', name: 'Legacy', type: 'paid', active: false },
      { id: 'free', name: 'Free', type: 'free', active: true },
    ],
  });
  const create = fakeAdminEndpoint('POST', '/automations/', ({ body }) => ({
    automations: [
      {
        ...detail('created'),
        ...(body as { automations: AutomationDetail[] }).automations[0],
        id: 'created',
      },
    ],
  }));
  await renderAdminApp('/automations/new', {
    labs: featureFlags,
    boot: {
      browseSettings: {
        response: settingsResponse({
          settings: { stripe_secret_key: 'sk_test', stripe_publishable_key: 'pk_test' },
        }),
      },
    },
  });
  await expect.element(page.getByText('Select a trigger', { exact: true })).toBeVisible();
  return create;
};

const pickTrigger = () => page.getByRole('button', { name: /^Paid subscription changed/ }).click();

const choose = async (field: () => ReturnType<typeof from>, name: string) => {
  await field().click();
  await option(name).click();
  await userEvent.keyboard('{Escape}');
};

describe('Paid subscription changed trigger', () => {
  it('is offered only with the lifecycle triggers flag', async () => {
    await start({ automations: true });

    await expect
      .element(page.getByRole('button', { name: /^Paid subscription started/ }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /^Paid subscription changed/ }))
      .not.toBeInTheDocument();
  });

  it('asks where a member moves from and to', async () => {
    await start({ automations: true, automationsLifecycleTriggers: true });
    await pickTrigger();

    await expect.element(triggerCard()).toBeVisible();
    await expect.element(from()).toHaveAttribute('placeholder', 'Select tiers...');
    await expect.element(to()).toHaveAttribute('placeholder', 'Select tiers...');

    // Active paid tiers only, under the standalone option.
    await from().click();
    await expect
      .poll(() =>
        page
          .getByRole('option')
          .elements()
          .map((row) => row.textContent),
      )
      .toEqual(['Any paid tier', 'Bronze', 'Silver', 'Gold']);
    await option('Bronze').click();
    await userEvent.keyboard('{Escape}');

    // A tier can't be both where a member starts and where they move to.
    await to().click();
    await expect
      .poll(() =>
        page
          .getByRole('option')
          .elements()
          .map((row) => row.textContent),
      )
      .toEqual(['Free', 'Silver', 'Gold']);
    await option('Free').click();
    await expect
      .element(triggerCard())
      .toHaveTextContent(
        'Members start this automation when their subscription expires, not when they cancel.',
      );
  });

  it('drops a To tier when it is chosen as a From tier', async () => {
    await start({ automations: true, automationsLifecycleTriggers: true });
    await pickTrigger();
    await choose(to, 'Gold');
    await expect.element(button('Remove Gold')).toBeVisible();

    await choose(from, 'Gold');

    await expect.element(triggerCard().getByRole('button', { name: 'Remove Gold' })).toBeVisible();
    await expect.element(to()).toHaveAttribute('placeholder', 'Select tiers...');
  });

  it('asks for both fields before saving', async () => {
    const create = await start({ automations: true, automationsLifecycleTriggers: true });
    await pickTrigger();
    await choose(from, 'Any paid tier');

    await button('Save').click();

    await expect.element(triggerCard()).toHaveTextContent('Select at least one tier.');
    await expect.element(to()).toHaveAttribute('aria-invalid', 'true');
    await expect.element(from()).toHaveAttribute('aria-invalid', 'false');
    expect(create.requests).toHaveLength(0);
  });

  it('saves multiple From tiers, then edits and publishes the saved draft', async () => {
    const create = await start(labs);
    const edit = fakeAdminEndpoint('PUT', '/automations/created/', ({ body }) => ({
      automations: [
        { ...detail('created'), ...(body as { automations: AutomationDetail[] }).automations[0] },
      ],
    }));
    await pickTrigger();
    await choose(from, 'Bronze');
    await choose(from, 'Silver');
    await choose(to, 'Gold');
    await button('Save').click();
    await expect.poll(currentRoute).toBe('/automations/created');
    expect(create.requests[0].body).toMatchObject({
      automations: [
        {
          trigger_type: 'paid_subscription_changed',
          trigger_tier_scope: null,
          trigger_tier_ids: null,
          subscription_transition: { from: ['bronze', 'silver'], to: ['gold'] },
        },
      ],
    });
    await expect.element(button('Save')).toBeDisabled();
    await expect.poll(unsavedChangesGuarded).toBe(false);

    await choose(from, 'Any paid tier');
    await choose(to, 'Free');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await button('Save').click();
    await expect.poll(() => edit.requests.length).toBe(1);
    expect(edit.requests[0].body).toMatchObject({
      automations: [
        {
          subscription_transition: { from: 'any_paid', to: 'downgraded_to_free' },
        },
      ],
    });
    await expect.element(button('Save')).toBeDisabled();
    await button('Add step').click();
    await page.getByTestId('step-picker').getByRole('button', { name: /^Wait/ }).click();
    await button('Publish').click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Publish', exact: true })
      .click();
    await expect.poll(() => edit.requests.length).toBe(2);
    expect(edit.requests[1].body).toMatchObject({
      automations: [
        {
          status: 'active',
          trigger_type: 'paid_subscription_changed',
          subscription_transition: { from: 'any_paid', to: 'downgraded_to_free' },
        },
      ],
    });
  });

  it('hides the new trigger on older backends while signup creation still works', async () => {
    const create = await start(labs, false);
    await expect
      .element(page.getByRole('button', { name: /^Paid subscription changed/ }))
      .not.toBeInTheDocument();
    await page.getByRole('button', { name: /^Paid subscription started/ }).click();
    await button('Save').click();
    await expect.poll(() => create.requests.length).toBe(1);
    const sent = (create.requests[0].body as { automations: AutomationDetail[] }).automations[0];
    expect(sent.trigger_tier_scope).toBe('all_paid');
    expect(sent).not.toHaveProperty('trigger_type');
    expect(sent).not.toHaveProperty('subscription_transition');
  });

  it('opens saved selections, retains archived tiers and tracks changes that are reverted', async () => {
    const saved: AutomationDetail = {
      ...detail('saved'),
      trigger_type: 'paid_subscription_changed',
      trigger_tier_scope: null,
      trigger_tier_ids: null,
      subscription_transition: { from: ['legacy'], to: ['gold'] },
    };
    fakeAdminEndpoint('GET', '/automations/saved/', { automations: [saved] });
    fakeAdminEndpoint('GET', /\/tiers\/\?/, {
      tiers: [
        { id: 'legacy', name: 'Legacy', type: 'paid', active: false },
        { id: 'gold', name: 'Gold', type: 'paid', active: true },
      ],
    });
    const edit = fakeAdminEndpoint('PUT', '/automations/saved/', ({ body }) => ({
      automations: [{ ...saved, ...(body as { automations: AutomationDetail[] }).automations[0] }],
    }));
    await renderAdminApp('/automations/saved', { labs });
    await expect.element(button('Remove Legacy (archived)')).toBeVisible();
    await expect.element(button('Remove Gold')).toBeVisible();
    await expect.element(button('Save')).toBeDisabled();
    await choose(from, 'Any paid tier');
    await expect.element(button('Save')).toBeEnabled();
    await choose(from, 'Legacy (archived)');
    await expect.element(button('Save')).toBeDisabled();
    await choose(to, 'Free');
    await button('Save').click();
    await expect.poll(() => edit.requests.length).toBe(1);
    expect(edit.requests[0].body).toMatchObject({
      automations: [
        {
          subscription_transition: { from: ['legacy'], to: 'downgraded_to_free' },
        },
      ],
    });
  });

  it('opens an unconfigured transition draft without treating it as signup', async () => {
    fakeAdminEndpoint('GET', '/automations/empty/', {
      automations: [
        {
          ...detail('empty'),
          trigger_type: 'paid_subscription_changed',
          trigger_tier_scope: null,
          trigger_tier_ids: null,
          subscription_transition: null,
        },
      ],
    });
    fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers: [] });
    await renderAdminApp('/automations/empty', { labs });
    await expect.element(triggerCard()).toBeVisible();
    await expect.element(from()).toHaveAttribute('placeholder', 'Select tiers...');
    await expect.element(to()).toHaveAttribute('placeholder', 'Select tiers...');
    await expect.element(button('Save')).toBeDisabled();
  });
});

import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  automation,
  currentRoute,
  fakeAdminEndpoint,
  fakeAutomations,
  fakeLabels,
  label,
  renderAdminApp,
  settingsResponse,
  type BrowseQuery,
} from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { detail, setup } from './run-history.test-utils';

const labs = { automations: true, automationsPerTier: true };
const button = (name: string) => page.getByRole('button', { name, exact: true });
const picker = () => page.getByRole('combobox', { name: 'Labels', exact: true });
const card = () => page.getByRole('article', { name: 'Label added', exact: true });
const stripe = {
  browseSettings: {
    response: settingsResponse({
      settings: { stripe_secret_key: 'sk_test', stripe_publishable_key: 'pk_test' },
    }),
  },
};
const labels = [
  label({ id: 'label-vip', name: 'VIP', slug: 'vip' }),
  label({ id: 'label-beta', name: 'Beta', slug: 'beta' }),
];
// The fake never interprets NQL; answer the ID lookup for saved labels with those that exist.
const serveLabels = () =>
  fakeLabels(({ filter }: BrowseQuery) => {
    const ids = filter?.match(/^id:\[(.*)\]$/)?.[1]?.split(',');
    return ids ? labels.filter((item) => ids.includes(item.id)) : labels;
  });
// Backends that support trigger types return `trigger_type` on every listed automation.
const serveList = (supportsTriggerTypes: boolean) =>
  fakeAutomations([
    supportsTriggerTypes
      ? Object.assign(automation({ name: 'Welcome' }), { trigger_type: 'membership_started' })
      : automation({ name: 'Welcome' }),
  ]);
const serveCreation = () =>
  fakeAdminEndpoint('POST', '/automations/', ({ body }) => ({
    automations: [
      {
        ...detail('created'),
        ...(body as { automations: AutomationDetail[] }).automations[0],
        id: 'created',
      },
    ],
  }));
const addWait = async () => {
  await button('Add step').click();
  await page.getByTestId('step-picker').getByRole('button', { name: /^Wait/ }).click();
};
const pickLabel = async (name: string) => {
  await picker().click();
  await page.getByRole('option', { name, exact: true }).click();
  await userEvent.keyboard('{Escape}');
};
const sentAutomation = (request: { body: unknown }) =>
  (request.body as { automations: Record<string, unknown>[] }).automations[0];

describe('Automation label trigger', () => {
  it('creates a label automation without Stripe, requiring at least one label', async () => {
    serveList(true);
    serveLabels();
    const create = serveCreation();
    await renderAdminApp('/automations/new', { labs });

    await expect.element(page.getByText('Select a trigger', { exact: true })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /^Free member signed up/ }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /^Paid subscription started/ }))
      .not.toBeInTheDocument();
    await page.getByRole('button', { name: /^Label added/ }).click();

    await expect.element(card()).toBeVisible();
    await expect
      .element(
        card().getByText(
          'Triggered when any of these labels is added to a member. Checked every 15 minutes.',
        ),
      )
      .toBeVisible();
    await addWait();
    await button('Save').click();
    await expect
      .element(page.getByText('Select at least one label.', { exact: true }))
      .toBeVisible();
    expect(create.requests).toHaveLength(0);

    await userEvent.keyboard('{Escape}');
    await pickLabel('VIP');
    await expect
      .element(page.getByText('Select at least one label.', { exact: true }))
      .not.toBeInTheDocument();
    await pickLabel('Beta');
    await expect.element(card()).toHaveTextContent(/VIP.*Beta/);

    await button('Save').click();
    await expect.poll(currentRoute).toBe('/automations/created');
    expect(create.requests).toHaveLength(1);
    expect(sentAutomation(create.requests[0])).toMatchObject({
      trigger_type: 'label_added',
      trigger_label_ids: ['label-vip', 'label-beta'],
      trigger_tier_scope: null,
      trigger_tier_ids: null,
      status: 'inactive',
    });
    await expect.element(button('Save')).toBeDisabled();
  });

  it('types membership triggers for backends that support trigger types', async () => {
    serveList(true);
    fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers: [] });
    const create = serveCreation();
    await renderAdminApp('/automations/new', { labs, boot: stripe });
    for (const name of ['Free member signed up', 'Paid subscription started', 'Label added']) {
      await expect
        .element(page.getByRole('button', { name: new RegExp(`^${name}`) }))
        .toBeVisible();
    }
    await page.getByRole('button', { name: /^Paid subscription started/ }).click();
    await addWait();
    await button('Save').click();
    await expect.poll(() => create.requests.length).toBe(1);
    expect(sentAutomation(create.requests[0])).toMatchObject({
      trigger_type: 'membership_started',
      trigger_label_ids: null,
      trigger_tier_scope: 'all_paid',
      trigger_tier_ids: null,
    });
  });

  it('offers no label trigger and sends no trigger type to older backends', async () => {
    serveList(false);
    fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers: [] });
    const create = serveCreation();
    await renderAdminApp('/automations/new', { labs, boot: stripe });
    await expect.element(page.getByText('Select a trigger', { exact: true })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /^Paid subscription started/ }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /^Label added/ }))
      .not.toBeInTheDocument();
    await page.getByRole('button', { name: /^Free member signed up/ }).click();
    await addWait();
    await button('Save').click();
    await expect.poll(() => create.requests.length).toBe(1);
    const sent = sentAutomation(create.requests[0]);
    expect(sent).toMatchObject({ trigger_tier_scope: 'free', trigger_tier_ids: null });
    expect(sent).not.toHaveProperty('trigger_type');
    expect(sent).not.toHaveProperty('trigger_label_ids');
  });

  it('skips the picker for older backends without Stripe', async () => {
    serveList(false);
    const create = serveCreation();
    await renderAdminApp('/automations/new', { labs });
    await expect.element(button('Save')).toBeEnabled();
    await expect
      .element(page.getByText('Select a trigger', { exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('article', { name: 'Free member signed up', exact: true }))
      .toBeVisible();
    await button('Save').click();
    await expect.poll(() => create.requests.length).toBe(1);
    expect(sentAutomation(create.requests[0])).not.toHaveProperty('trigger_type');
  });

  it.each(['Save', 'Publish'])(
    'shows a saved label automation and persists label changes on %s',
    async (action) => {
      setup();
      const saved: AutomationDetail = {
        ...detail('first'),
        trigger_type: 'label_added',
        trigger_label_ids: ['label-deleted', 'label-vip'],
        trigger_tier_scope: null,
        trigger_tier_ids: null,
      };
      fakeAdminEndpoint('GET', '/automations/first/', { automations: [saved] });
      const labelRequests = serveLabels();
      const save = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
        automations: [{ ...saved, ...sentAutomation({ body }) }],
      }));
      await renderAdminApp('/automations/first', { labs: { automations: true } });

      await expect.element(page.getByRole('heading', { name: 'Label added' })).toBeVisible();
      await expect.element(card()).toHaveTextContent(/Unavailable label.*VIP/);
      await expect.element(button('Save')).toBeDisabled();
      // Saved labels are read by ID; the full list waits until the picker is opened.
      expect(labelRequests.requests.map((request) => request.filter)).toEqual([
        'id:[label-deleted,label-vip]',
      ]);

      await card()
        .getByRole('button', { name: /Remove Unavailable label/ })
        .click();
      await expect.element(card()).not.toHaveTextContent('Unavailable label');
      await button(action).click();
      if (action === 'Publish') {
        await page
          .getByRole('alertdialog')
          .getByRole('button', { name: 'Publish', exact: true })
          .click();
      }
      await expect.poll(() => save.requests.length).toBe(1);
      expect(sentAutomation(save.requests[0])).toEqual({
        name: saved.name,
        description: saved.description,
        trigger_type: 'label_added',
        trigger_label_ids: ['label-vip'],
        trigger_tier_scope: null,
        trigger_tier_ids: null,
        status: action === 'Publish' ? 'active' : 'inactive',
        actions: saved.actions,
        edges: [],
      });
    },
  );

  it('blocks saving a saved label automation once its labels are removed', async () => {
    setup();
    fakeAdminEndpoint('GET', '/automations/first/', {
      automations: [
        {
          ...detail('first'),
          trigger_type: 'label_added',
          trigger_label_ids: ['label-vip'],
          trigger_tier_scope: null,
          trigger_tier_ids: null,
        } satisfies AutomationDetail,
      ],
    });
    serveLabels();
    const save = fakeAdminEndpoint('PUT', '/automations/first/', { automations: [] });
    await renderAdminApp('/automations/first', { labs: { automations: true } });
    await expect.element(card()).toHaveTextContent('VIP');
    await card()
      .getByRole('button', { name: /Remove VIP/ })
      .click();
    await button('Save').click();
    await expect
      .element(page.getByText('Select at least one label.', { exact: true }))
      .toBeVisible();
    expect(save.requests).toHaveLength(0);
  });
});

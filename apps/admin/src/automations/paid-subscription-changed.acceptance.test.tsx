import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type {
  AutomationDetail,
  AutomationTriggerRule,
} from '@tryghost/admin-x-framework/api/automations';
import { detail } from './run-history.test-utils';
import {
  fakeAdminEndpoint,
  fakeAutomations,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';

const button = (name: string) => page.getByRole('button', { name, exact: true });
const option = (name: string) => page.getByRole('option', { name, exact: true });
const from = () => page.getByRole('combobox', { name: 'From', exact: true });
const to = () => page.getByRole('combobox', { name: 'To', exact: true });
const triggerCard = () =>
  page.getByRole('article', { name: 'Paid subscription changed', exact: true });

const bronzeFrom = {
  trigger_type: 'paid_subscription_changed',
  scope: 'specific_paid_tier',
  product_id: 'bronze',
  direction: 'from',
} as const;
const goldTo = { ...bronzeFrom, product_id: 'gold', direction: 'to' } as const;
const anyPaidFrom = { ...bronzeFrom, scope: 'any_paid_tier', product_id: null } as const;
const freeTo = { ...goldTo, scope: 'free', product_id: null } as const;

const lifecycleFlags = { labs: { automations: true, automationsLifecycleTriggers: true } };
const automationFromRequest = (body: unknown) =>
  (body as { automations: AutomationDetail[] }).automations[0];
const createdAutomation = (body: unknown): AutomationDetail => ({
  ...detail('created'),
  ...automationFromRequest(body),
  id: 'created',
});

const serveTiers = () => {
  fakeAdminEndpoint('GET', /\/tiers\/\?/, {
    tiers: [
      { id: 'bronze', name: 'Bronze', type: 'paid', active: true },
      { id: 'gold', name: 'Gold', type: 'paid', active: true },
      { id: 'silver', name: 'Silver', type: 'paid', active: true },
      { id: 'legacy', name: 'Legacy', type: 'paid', active: false },
      { id: 'free', name: 'Free', type: 'free', active: true },
    ],
  });
};

const start = async (labs: Record<string, boolean> = lifecycleFlags.labs) => {
  fakeAutomations([]);
  serveTiers();
  const create = fakeAdminEndpoint('POST', '/automations/', ({ body }) => ({
    automations: [createdAutomation(body)],
  }));
  await renderAdminApp('/automations/new', {
    labs,
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

const choose = async (field: 'From' | 'To', name: string) => {
  await page.getByRole('combobox', { name: field, exact: true }).click();
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
    await start();
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
      .toEqual(['Any paid tier', 'Bronze', 'Gold', 'Silver']);
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
      .toEqual(['Free', 'Gold', 'Silver']);
    await option('Free').click();
    await expect
      .element(triggerCard())
      .toHaveTextContent(
        "Starts when a canceled subscription expires and the member's status changes to free.",
      );
  });

  it('drops a To tier when it is chosen as a From tier', async () => {
    await start();
    await pickTrigger();
    await choose('To', 'Gold');
    await expect.element(button('Remove Gold')).toBeVisible();

    await choose('From', 'Gold');

    await expect.element(triggerCard().getByRole('button', { name: 'Remove Gold' })).toBeVisible();
    await expect.element(to()).toHaveAttribute('placeholder', 'Select tiers...');
  });

  it.each([
    { missing: 'both sides', fromName: null, toName: null },
    { missing: 'From', fromName: null, toName: 'Gold' },
    { missing: 'To', fromName: 'Any paid tier', toName: null },
  ])('blocks saving with $missing unanswered', async ({ fromName, toName }) => {
    const create = await start();
    await pickTrigger();
    if (fromName) {
      await choose('From', fromName);
    }
    if (toName) {
      await choose('To', toName);
    }
    await button('Save').click();
    await expect
      .element(triggerCard().getByRole('alert'))
      .toHaveTextContent('Select at least one tier.');
    await expect.element(from()).toHaveAttribute('aria-invalid', String(!fromName));
    await expect.element(to()).toHaveAttribute('aria-invalid', String(!toName));
    expect(create.requests).toHaveLength(0);
  });

  it.each([
    {
      fromNames: ['Bronze', 'Silver'],
      toNames: ['Gold'],
      expectedRules: [bronzeFrom, { ...bronzeFrom, product_id: 'silver' }, goldTo],
      stopDescription: 'Members stop early if they unsubscribe or leave the Gold tier.',
    },
    {
      fromNames: ['Bronze'],
      toNames: ['Gold', 'Silver'],
      expectedRules: [bronzeFrom, goldTo, { ...goldTo, product_id: 'silver' }],
      stopDescription: 'Members stop early if they unsubscribe or leave the Silver or Gold tiers.',
    },
    {
      fromNames: ['Any paid tier'],
      toNames: ['Free'],
      expectedRules: [anyPaidFrom, freeTo],
      stopDescription: 'Members stop early if they unsubscribe or start a paid subscription.',
    },
    {
      fromNames: ['Bronze'],
      toNames: ['Free'],
      expectedRules: [bronzeFrom, freeTo],
      stopDescription: 'Members stop early if they unsubscribe or start a paid subscription.',
    },
  ])(
    'saves $fromNames → $toNames as directional rules and reopens them',
    async ({ fromNames, toNames, expectedRules, stopDescription }) => {
      const create = await start();
      await pickTrigger();
      for (const name of fromNames) {
        await choose('From', name);
      }
      for (const name of toNames) {
        await choose('To', name);
      }
      await button('Save').click();
      await expect.poll(() => create.requests.length).toBe(1);
      await expect.element(button('Save')).toBeDisabled();
      const saved = createdAutomation(create.requests[0].body);
      expect(saved.trigger_rules).toEqual(
        expect.arrayContaining<AutomationTriggerRule>(expectedRules),
      );
      expect(saved.trigger_rules).toHaveLength(expectedRules.length);
      expect(create.requests[0].body).not.toHaveProperty('automations.0.trigger_tier_scope');
      // Reenter through the list to prove saved rules reconstruct the picker, without local creation state.
      fakeAutomations([{ ...saved, slug: '' }]);
      fakeAdminEndpoint('GET', '/automations/created/', {
        automations: [{ ...saved, trigger_rules: [...saved.trigger_rules].reverse() }],
      });
      await page.getByRole('link', { name: 'Back to automations' }).click();
      await page.getByRole('link', { name: saved.name, exact: true }).click();
      await expect.element(triggerCard()).toBeVisible();
      for (const [field, names] of [
        ['From', fromNames],
        ['To', toNames],
      ] as const) {
        await page.getByRole('combobox', { name: field, exact: true }).click();
        const list = page.getByRole('listbox', { name: field, exact: true });
        await expect
          .poll(() =>
            list
              .getByRole('option', { selected: true })
              .elements()
              .map((row) => row.textContent)
              .sort(),
          )
          .toEqual([...names].sort());
        await userEvent.keyboard('{Escape}');
      }
      await expect.element(button('Save')).toBeDisabled();
      await button('Show automation sidebar').click();
      await expect.element(page.getByText(stopDescription, { exact: true })).toBeVisible();
    },
  );

  it('clears the dirty state when the same tiers are restored in a different rule order', async () => {
    serveTiers();
    const saved = {
      ...detail('existing'),
      trigger_rules: [goldTo, { ...bronzeFrom, product_id: 'silver' }, bronzeFrom],
    };
    fakeAdminEndpoint('GET', '/automations/existing/', { automations: [saved] });
    await renderAdminApp('/automations/existing', lifecycleFlags);
    await expect.element(button('Save')).toBeDisabled();

    await button('Remove Bronze').click();
    await expect.element(button('Save')).toBeEnabled();
    await choose('From', 'Bronze');

    await expect.element(button('Save')).toBeDisabled();
  });

  it('retains the loaded trigger type when all tiers are cleared and selected again', async () => {
    serveTiers();
    const saved = {
      ...detail('existing'),
      trigger_rules: [bronzeFrom, goldTo],
    } satisfies AutomationDetail;
    fakeAutomations([{ ...saved, slug: '' }]);
    fakeAdminEndpoint('GET', '/automations/existing/', { automations: [saved] });
    const edit = fakeAdminEndpoint('PUT', '/automations/existing/', ({ body }) => ({
      automations: [{ ...saved, ...automationFromRequest(body) }],
    }));
    await renderAdminApp('/automations/existing', lifecycleFlags);
    await button('Remove Bronze').click();
    await button('Remove Gold').click();
    await expect.element(triggerCard()).toBeVisible();
    await expect.element(from()).toHaveAttribute('placeholder', 'Select tiers...');
    await expect.element(to()).toHaveAttribute('placeholder', 'Select tiers...');
    await button('Save').click();
    await expect.element(triggerCard()).toHaveTextContent('Select at least one tier.');
    expect(edit.requests).toHaveLength(0);
    await choose('From', 'Any paid tier');
    await choose('To', 'Free');
    await expect.element(triggerCard().getByRole('alert')).not.toBeInTheDocument();
    await button('Save').click();
    await expect.poll(() => edit.requests.length).toBe(1);
    expect(edit.requests[0].body).toMatchObject({
      automations: [
        {
          trigger_rules: [anyPaidFrom, freeTo],
        },
      ],
    });
    await expect.element(button('Save')).toBeDisabled();
  });

  it('publishes a trigger-only change to an active automation', async () => {
    serveTiers();
    const saved: AutomationDetail = {
      ...detail('existing'),
      status: 'active',
      trigger_rules: [anyPaidFrom, goldTo],
    };
    fakeAdminEndpoint('GET', '/automations/existing/', { automations: [saved] });
    const edit = fakeAdminEndpoint('PUT', '/automations/existing/', ({ body }) => ({
      automations: [{ ...saved, ...automationFromRequest(body) }],
    }));
    await renderAdminApp('/automations/existing', lifecycleFlags);
    await expect.element(button('Published')).toBeDisabled();
    await choose('To', 'Free');
    await button('Publish changes').click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Publish changes', exact: true })
      .click();
    await expect.poll(() => edit.requests.length).toBe(1);
    expect(edit.requests[0].body).toMatchObject({
      automations: [
        {
          status: 'active',
          trigger_rules: [anyPaidFrom, freeTo],
          actions: saved.actions,
          edges: saved.edges,
        },
      ],
    });
    await expect.element(button('Published')).toBeDisabled();
  });

  it('keeps selections after an API failure and retries the same rules', async () => {
    await start();
    const failed = fakeAdminEndpoint(
      'POST',
      '/automations/',
      new Response(
        JSON.stringify({ errors: [{ message: 'Cannot save', type: 'ValidationError' }] }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    await pickTrigger();
    await choose('From', 'Bronze');
    await choose('To', 'Gold');
    await button('Save').click();
    await expect.element(page.getByText('Automation couldn’t be saved')).toBeVisible();
    await expect.element(button('Remove Bronze')).toBeVisible();
    await expect.element(button('Remove Gold')).toBeVisible();
    const retry = fakeAdminEndpoint('POST', '/automations/', ({ body }) => ({
      automations: [createdAutomation(body)],
    }));
    await button('Retry').click();
    await expect.poll(() => retry.requests.length).toBe(1);
    expect(retry.requests[0].body).toEqual(failed.requests[0].body);
    await expect.element(triggerCard()).toHaveTextContent('Bronze');
    await expect.element(triggerCard()).toHaveTextContent('Gold');
    await expect.element(button('Save')).toBeDisabled();
  });

  it('preserves archived and unavailable saved tiers while editing', async () => {
    const rules: AutomationTriggerRule[] = [
      { ...bronzeFrom, product_id: 'legacy' },
      { ...goldTo, product_id: 'missing' },
    ];
    const saved = { ...detail('existing'), trigger_rules: rules };
    fakeAdminEndpoint('GET', '/automations/existing/', { automations: [saved] });
    fakeAdminEndpoint('GET', /\/tiers\/\?/, {
      tiers: [
        { id: 'legacy', name: 'Legacy', type: 'paid', active: false },
        { id: 'unused', name: 'Unused', type: 'paid', active: false },
        { id: 'gold', name: 'Gold', type: 'paid', active: true },
      ],
    });
    const edit = fakeAdminEndpoint('PUT', '/automations/existing/', ({ body }) => ({
      automations: [{ ...saved, ...automationFromRequest(body) }],
    }));
    await renderAdminApp('/automations/existing', lifecycleFlags);
    await expect.element(button('Remove Legacy (archived)')).toBeVisible();
    await expect.element(button('Remove Unavailable tier')).toBeVisible();
    await from().click();
    await expect.element(option('Unused (archived)')).not.toBeInTheDocument();
    await expect.element(option('Unavailable tier')).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await to().click();
    await expect.element(option('Unavailable tier')).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await choose('To', 'Gold');
    await expect.element(button('Remove Unavailable tier')).toBeVisible();
    await button('Remove Unavailable tier').click();
    await button('Save').click();
    await expect.poll(() => edit.requests.length).toBe(1);
    expect(edit.requests[0].body).toMatchObject({
      automations: [{ trigger_rules: [rules[0], { ...rules[1], product_id: 'gold' }] }],
    });
  });

  it('preserves saved selections while tiers load, fail, and recover on retry', async () => {
    const saved = { ...detail('existing'), trigger_rules: [bronzeFrom, goldTo] };
    fakeAdminEndpoint('GET', '/automations/existing/', { automations: [saved] });
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint('GET', /\/tiers\/\?/, async () => {
      await pending;
      return new Response(
        JSON.stringify({ errors: [{ message: 'Cannot load tiers', type: 'ValidationError' }] }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      );
    });
    try {
      await renderAdminApp('/automations/existing', lifecycleFlags);
      await expect(button('Remove Loading tier...')).toHaveCount(2);
      await from().click();
      await expect.element(page.getByText('Loading tiers...', { exact: true })).toBeVisible();
    } finally {
      finish();
    }
    await expect.element(page.getByText('Could not load tiers.', { exact: true })).toBeVisible();
    await expect(button('Remove Unavailable tier')).toHaveCount(2);
    await expect.element(button('Save')).toBeDisabled();

    serveTiers();
    await button('Retry').click();

    await expect.element(button('Remove Bronze')).toBeVisible();
    await expect.element(button('Remove Gold')).toBeVisible();
    await expect.element(option('Unavailable tier')).not.toBeInTheDocument();
    await expect.element(button('Save')).toBeDisabled();
  });
});

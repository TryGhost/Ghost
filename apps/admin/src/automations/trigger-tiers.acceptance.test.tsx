import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import type {
  AutomationDetail,
  AutomationTrigger,
} from '@tryghost/admin-x-framework/api/automations';
import { detail, setup } from './run-history.test-utils';

const flags = { labs: { automations: true } };
const picker = () => page.getByRole('button', { name: 'Choose tiers', exact: true });
const serve = (
  overrides: Partial<Omit<AutomationDetail, keyof AutomationTrigger>> &
    (AutomationTrigger | { trigger_tier_scope?: never; trigger_tier_ids?: never }) = {},
) => {
  setup();
  const automation: AutomationDetail = {
    ...detail('first'),
    slug: 'member-welcome-email-paid',
    trigger_tier_scope: 'all_paid',
    trigger_tier_ids: null,
    ...overrides,
  };
  fakeAdminEndpoint('GET', '/automations/first/', { automations: [automation] });
  fakeAdminEndpoint('GET', /\/tiers\/\?/, {
    tiers: [
      { id: 'bronze', name: 'Bronze', type: 'paid', active: true },
      { id: 'gold', name: 'Gold', type: 'paid', active: true },
      { id: 'archived', name: 'Legacy', type: 'paid', active: false },
      { id: 'unused', name: 'Unused', type: 'paid', active: false },
      { id: 'free', name: 'Free', type: 'free', active: true },
    ],
  });
  const save = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
    automations: [
      { ...automation, ...(body as { automations: Partial<AutomationDetail>[] }).automations[0] },
    ],
  }));
  return save;
};
const selectBronze = async () => {
  await picker().click();
  await page.getByRole('radio', { name: 'Select paid tiers', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Bronze', exact: true }).click();
  await userEvent.keyboard('{Escape}');
};

describe('Automation trigger tiers', () => {
  it('shows and saves tiers beyond the first 100 returned by Core', async () => {
    const save = serve({
      trigger_tier_scope: 'selected_paid',
      trigger_tier_ids: ['tier-100'],
    });
    fakeAdminEndpoint('GET', /\/tiers\/\?/, {
      tiers: Array.from({ length: 102 }, (_, index) => ({
        id: `tier-${index}`,
        name: `Tier ${index}`,
        type: 'paid',
        active: true,
      })),
      meta: {
        pagination: { page: 1, pages: 1, limit: 102, total: 102, prev: null, next: null },
      },
    });
    await renderAdminApp('/automations/first', flags);
    await expect.element(picker()).toHaveTextContent('Tier 100');
    await picker().click();
    await expect
      .element(page.getByRole('checkbox', { name: 'Tier 100', exact: true }))
      .toBeChecked();
    await page.getByRole('checkbox', { name: 'Tier 101', exact: true }).click();
    await userEvent.keyboard('{Escape}');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    expect(
      (save.requests[0].body as { automations: AutomationDetail[] }).automations[0],
    ).toMatchObject({
      trigger_tier_scope: 'selected_paid',
      trigger_tier_ids: ['tier-100', 'tier-101'],
    });
  });

  it('dismisses on outside clicks while preserving selection and focus', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    const options = page.getByRole('radio', { name: 'Select paid tiers', exact: true });
    await picker().click();
    await options.click();
    await page.getByRole('checkbox', { name: 'Bronze', exact: true }).click();
    await expect.element(options).toBeVisible();

    await page
      .getByRole('region', { name: 'Editing canvas' })
      .click({ position: { x: 20, y: 20 } });
    await expect.element(options).not.toBeInTheDocument();
    await expect.element(picker()).toHaveTextContent('Bronze');

    await picker().click();
    await expect.element(page.getByRole('checkbox', { name: 'Bronze', exact: true })).toBeChecked();
    await page.getByRole('heading', { name: 'Paid subscription starts' }).click();
    await expect.element(options).not.toBeInTheDocument();

    await picker().click();
    const wait = page.getByRole('textbox', { name: 'Wait for' });
    await wait.click();
    await expect.element(options).not.toBeInTheDocument();
    await expect.element(wait).toHaveFocus();

    await picker().click();
    await picker().click();
    await expect.element(options).not.toBeInTheDocument();
    await picker().click();
    await userEvent.keyboard('{Escape}');
    await expect.element(options).not.toBeInTheDocument();
    await expect.element(picker()).toHaveFocus();
    expect(save.requests).toHaveLength(0);
  });

  it.each(['Save', 'Publish', 'Publish changes', 'Turn off'])(
    'persists selected tiers only when explicitly confirming %s',
    async (action) => {
      const save = serve({
        status: ['Publish changes', 'Turn off'].includes(action) ? 'active' : 'inactive',
      });
      await renderAdminApp('/automations/first', flags);
      await expect
        .element(page.getByRole('heading', { name: 'Paid subscription starts' }))
        .toBeVisible();
      await expect.element(picker()).toHaveTextContent('Any paid tier');
      await selectBronze();
      await expect.element(picker()).toHaveTextContent('Bronze');
      expect(save.requests).toHaveLength(0);
      await page.getByRole('button', { name: action, exact: true }).click();
      if (action !== 'Save') {
        expect(save.requests).toHaveLength(0);
        await page
          .getByRole('alertdialog')
          .getByRole('button', { name: action, exact: true })
          .click();
      }
      await expect.poll(() => save.requests.length).toBe(1);
      expect((save.requests[0].body as { automations: AutomationDetail[] }).automations[0]).toEqual(
        {
          name: detail('first').name,
          description: detail('first').description,
          trigger_tier_scope: 'selected_paid',
          trigger_tier_ids: ['bronze'],
          status: ['Publish', 'Publish changes'].includes(action) ? 'active' : 'inactive',
          actions: detail('first').actions,
          edges: [],
        },
      );
      await expect.element(picker()).toHaveTextContent('Bronze');
      await expect
        .element(
          page.getByRole('button', {
            name: action === 'Publish' || action === 'Publish changes' ? 'Published' : 'Save',
            exact: true,
          }),
        )
        .toBeDisabled();
    },
  );

  it.each(['Save', 'Publish', 'Publish changes', 'Turn off'])(
    'blocks %s with no selected tiers',
    async (action) => {
      const save = serve({
        status: ['Publish changes', 'Turn off'].includes(action) ? 'active' : 'inactive',
      });
      await renderAdminApp('/automations/first', flags);
      await picker().click();
      await page.getByRole('radio', { name: 'Select paid tiers', exact: true }).click();
      await userEvent.keyboard('{Escape}');
      await page.getByRole('button', { name: action, exact: true }).click();
      await expect
        .element(page.getByText('Select at least one paid tier.', { exact: true }))
        .toBeVisible();
      expect(save.requests).toHaveLength(0);
      await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      await picker().click();
      await page.getByRole('checkbox', { name: 'Gold', exact: true }).click();
      await userEvent.keyboard('{Escape}');
      await expect
        .element(page.getByText('Select at least one paid tier.', { exact: true }))
        .not.toBeInTheDocument();
    },
  );

  it('shows previously selected archived tiers until their removal is saved', async () => {
    const save = serve({
      trigger_tier_scope: 'selected_paid',
      trigger_tier_ids: ['archived', 'bronze'],
    });
    await renderAdminApp('/automations/first', flags);
    await expect.element(picker()).toHaveTextContent('Legacy (archived), Bronze');
    await picker().click();
    const archived = page.getByRole('checkbox', { name: 'Legacy (archived)', exact: true });
    const bronze = page.getByRole('checkbox', { name: 'Bronze', exact: true });
    const gold = page.getByRole('checkbox', { name: 'Gold', exact: true });
    await expect.element(archived).toBeChecked();
    await expect.element(bronze).toBeChecked();
    await expect
      .element(page.getByRole('checkbox', { name: 'Unused (archived)' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('checkbox', { name: 'Free', exact: true }))
      .not.toBeInTheDocument();
    await gold.click();
    await userEvent.keyboard('{Escape}');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    expect(
      (save.requests[0].body as { automations: AutomationDetail[] }).automations[0],
    ).toMatchObject({
      trigger_tier_scope: 'selected_paid',
      trigger_tier_ids: ['archived', 'bronze', 'gold'],
    });
    await expect.element(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await picker().click();
    await expect.element(archived).toBeChecked();
    await archived.click();
    await expect.element(archived).toBeVisible();
    await expect.element(archived).not.toBeChecked();
    expect(save.requests).toHaveLength(1);
    await archived.click();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await picker().click();
    await archived.click();
    await userEvent.keyboard('{Escape}');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(2);
    expect(
      (save.requests[1].body as { automations: AutomationDetail[] }).automations[0],
    ).toMatchObject({
      trigger_tier_scope: 'selected_paid',
      trigger_tier_ids: ['bronze', 'gold'],
    });
    await expect.element(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await picker().click();
    await expect.element(archived).not.toBeInTheDocument();
    await expect.element(bronze).toBeChecked();
    await expect.element(gold).toBeChecked();
  });

  it('clears tier IDs when saving Any paid tier', async () => {
    const save = serve({ trigger_tier_scope: 'selected_paid', trigger_tier_ids: ['bronze'] });
    await renderAdminApp('/automations/first', flags);
    await picker().click();
    await page.getByRole('radio', { name: 'Any paid tier', exact: true }).click();
    await userEvent.keyboard('{Escape}');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    expect(
      (save.requests[0].body as { automations: AutomationDetail[] }).automations[0],
    ).toMatchObject({
      trigger_tier_scope: 'all_paid',
      trigger_tier_ids: null,
    });
  });

  it('guards navigation with unsaved tier changes', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    await selectBronze();
    await page.getByRole('link', { name: 'Back to automations' }).click();
    await expect.element(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Stay', exact: true }).click();
    await expect.element(picker()).toHaveTextContent('Bronze');
    expect(save.requests).toHaveLength(0);
  });

  it('shows the free description without controls', async () => {
    serve({
      trigger_tier_scope: 'free',
      trigger_tier_ids: null,
      slug: 'member-welcome-email-free',
    });
    await renderAdminApp('/automations/first', flags);
    await expect
      .element(page.getByText('Triggered when someone signs up as a free member.'))
      .toBeVisible();
    await expect.element(picker()).not.toBeInTheDocument();
  });
});

import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  automation,
  currentRoute,
  fakeAdminEndpoint,
  fakeAutomations,
  renderAdminApp,
  settingsResponse,
  unsavedChangesGuarded,
} from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { detail } from './run-history.test-utils';
import { performanceBoot } from './run-list.test-utils';

const labs = { automations: true };
const button = (name: string) => page.getByRole('button', { name, exact: true });
const addWait = async () => {
  await button('Add step').click();
  await page.getByTestId('step-picker').getByRole('button', { name: /^Wait/ }).click();
};
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

const nameField = () => page.getByRole('textbox', { name: 'Automation name', exact: true });

describe('New automation', () => {
  it('creates a free draft locally, warns before leaving, then adds and edits without remounting', async () => {
    fakeAutomations([
      automation({ name: 'New Automation' }),
      automation({ name: 'New Automation (3)' }),
    ]);
    const create = serveCreation();
    const edit = fakeAdminEndpoint('PUT', '/automations/created/', ({ body }) => ({
      automations: [
        { ...detail('created'), ...(body as { automations: AutomationDetail[] }).automations[0] },
      ],
    }));
    await renderAdminApp('/automations', { labs });
    await button('New automation').click();
    await expect.element(nameField()).toHaveValue('New Automation (2)');
    await expect.element(button('Save')).toBeEnabled();
    await expect
      .element(page.getByText('Select a trigger', { exact: true }))
      .not.toBeInTheDocument();
    await expect.element(button('Show automation sidebar')).toBeVisible();
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await page.getByRole('link', { name: 'Back to automations' }).click();
    await expect.element(page.getByRole('alertdialog')).toBeVisible();
    await button('Stay').click();
    expect(create.requests).toHaveLength(0);
    await addWait();
    const input = page.getByRole('textbox', { name: 'Wait for', exact: true });
    await input.fill('2');
    const originalInput = input.element();
    await button('Save').click();
    await expect.poll(currentRoute).toBe('/automations/created');
    await expect.element(button('Save')).toBeDisabled();
    expect(input.element()).toBe(originalInput);
    await expect.element(button('Show automation sidebar')).toBeVisible();
    expect(create.requests).toHaveLength(1);
    expect(create.requests[0].body).toMatchObject({
      automations: [
        {
          name: 'New Automation (2)',
          trigger_rules: [
            { trigger_type: 'free_signup', scope: null, product_id: null, direction: null },
          ],
          status: 'inactive',
          actions: [{ type: 'wait' }],
        },
      ],
    });
    await input.fill('3');
    await button('Save').click();
    await expect.poll(() => edit.requests.length).toBe(1);
    expect(create.requests).toHaveLength(1);
  });

  it('saves a new automation without actions while keeping publish disabled', async () => {
    fakeAutomations([]);
    const create = serveCreation();
    await renderAdminApp('/automations/new', { labs });

    await expect.element(button('Save')).toBeEnabled();
    await expect.element(button('Publish')).toBeDisabled();

    await button('Save').click();

    await expect.poll(currentRoute).toBe('/automations/created');
    await expect.element(button('Save')).toBeDisabled();
    await expect.element(button('Publish')).toBeDisabled();
    expect(create.requests).toHaveLength(1);
    expect(create.requests[0].body).toMatchObject({
      automations: [{ status: 'inactive', actions: [], edges: [] }],
    });
  });

  it('starts a fresh creation session when navigating from the saved route to new', async () => {
    fakeAutomations([]);
    const create = serveCreation();
    const edit = fakeAdminEndpoint('PUT', '/automations/created/', {
      automations: [detail('created')],
    });
    await renderAdminApp('/automations/new', { labs });
    await addWait();
    await act(async () => {
      await button('Save').click();
      await expect.poll(currentRoute).toBe('/automations/created');
    });
    await expect.element(button('Save')).toBeDisabled();
    await expect.poll(unsavedChangesGuarded).toBe(false);

    window.location.hash = '#/automations/new';
    await expect
      .element(page.getByRole('textbox', { name: 'Wait for', exact: true }))
      .not.toBeInTheDocument();
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await addWait();
    await button('Save').click();
    await expect.poll(() => create.requests.length).toBe(2);
    expect(edit.requests).toHaveLength(0);
  });

  it('loads the saved automation when returning after visiting another automation', async () => {
    fakeAutomations([]);
    serveCreation();
    const read = fakeAdminEndpoint('GET', '/automations/created/', {
      automations: [{ ...detail('created'), name: 'Saved automation' }],
    });
    fakeAdminEndpoint('GET', '/automations/other/', {
      automations: [{ ...detail('other'), name: 'Other automation' }],
    });
    await renderAdminApp('/automations/new', { labs });
    await addWait();
    await act(async () => {
      await button('Save').click();
      await expect.poll(currentRoute).toBe('/automations/created');
    });
    await expect.element(button('Save')).toBeDisabled();
    await expect.poll(unsavedChangesGuarded).toBe(false);

    window.location.hash = '#/automations/other';
    await expect.element(nameField()).toHaveValue('Other automation');
    window.history.back();
    await expect.element(nameField()).toHaveValue('Saved automation');
    expect(read.requests).toHaveLength(1);
    await expect.poll(unsavedChangesGuarded).toBe(false);
  });

  it('waits for refreshed Stripe settings before creating a draft and preserves edits during later refreshes', async () => {
    fakeAutomations([]);
    fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers: [] });
    const create = serveCreation();
    const { queryClient } = await renderAdminApp('/automations', { labs });
    await expect.element(button('New automation')).toBeEnabled();

    let finishSettings!: (response: ReturnType<typeof settingsResponse>) => void;
    const settings = fakeAdminEndpoint(
      'GET',
      /\/settings\/\?group=/,
      () =>
        new Promise<ReturnType<typeof settingsResponse>>((resolve) => {
          finishSettings = resolve;
        }),
    );
    const refresh = queryClient.invalidateQueries({ queryKey: ['SettingsResponseType'] });
    await expect.poll(() => settings.requests.length).toBe(1);
    try {
      await act(async () => {
        await button('New automation').click();
        await expect.poll(currentRoute).toBe('/automations/new');
      });
      await expect.element(button('Add step')).not.toBeInTheDocument();
      await expect
        .element(page.getByText('Select a trigger', { exact: true }))
        .not.toBeInTheDocument();
    } finally {
      finishSettings(
        settingsResponse({
          labs,
          settings: {
            stripe_secret_key: 'sk_test',
            stripe_publishable_key: 'pk_test',
          },
        }),
      );
      await refresh;
    }
    await page.getByRole('button', { name: /^Paid subscription started/ }).click();
    await addWait();
    const input = page.getByRole('textbox', { name: 'Wait for', exact: true });
    await input.fill('3');
    const originalInput = input.element();

    const laterRefresh = queryClient.invalidateQueries({ queryKey: ['SettingsResponseType'] });
    await expect.poll(() => settings.requests.length).toBe(2);
    try {
      await expect.element(input).toHaveValue('3');
      expect(input.element()).toBe(originalInput);
    } finally {
      finishSettings(settingsResponse({ labs }));
      await laterRefresh;
    }
    expect(input.element()).toBe(originalInput);
    await button('Save').click();
    await expect.poll(() => create.requests.length).toBe(1);
    expect(create.requests[0].body).toMatchObject({
      automations: [
        {
          trigger_rules: [
            {
              trigger_type: 'paid_subscription_started',
              scope: 'any_paid_tier',
              product_id: null,
              direction: null,
            },
          ],
          actions: [{ data: { wait_hours: 72 } }],
        },
      ],
    });
  });

  it('publishes a new automation with one POST', async () => {
    fakeAutomations([]);
    const create = serveCreation();
    await renderAdminApp('/automations/new', { labs });
    await addWait();
    await button('Publish').click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Publish', exact: true })
      .click();
    await expect.poll(currentRoute).toBe('/automations/created');
    await expect.element(button('Published')).toBeVisible();
    expect(create.requests).toHaveLength(1);
    expect(create.requests[0].body).toMatchObject({
      automations: [{ status: 'active', actions: [{ type: 'wait' }] }],
    });
  });

  it('keeps the draft after a failed create and retries the POST', async () => {
    fakeAutomations([]);
    let fail = true;
    const create = fakeAdminEndpoint('POST', '/automations/', ({ body }) =>
      fail
        ? new Response(JSON.stringify({ errors: [{ message: 'Creation failed' }] }), {
            status: 422,
          })
        : {
            automations: [
              {
                ...detail('created'),
                ...(body as { automations: AutomationDetail[] }).automations[0],
                id: 'created',
              },
            ],
          },
    );
    await renderAdminApp('/automations/new', { labs });
    await addWait();
    await button('Save').click();
    await expect.element(button('Retry')).toBeVisible();
    expect(currentRoute()).toBe('/automations/new');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    fail = false;
    await button('Retry').click();
    await expect.poll(currentRoute).toBe('/automations/created');
    expect(create.requests).toHaveLength(2);
  });

  it('disables email preview until the automation has been saved', async () => {
    fakeAutomations([]);
    serveCreation();
    fakeAdminEndpoint('GET', '/automated_emails/', { automated_emails: [] });
    fakeAdminEndpoint('GET', '/newsletters/?filter=status%3Aactive&limit=1', { newsletters: [] });
    fakeAdminEndpoint('GET', '/offers/', { offers: [] });
    fakeAdminEndpoint(
      'GET',
      '/posts/?filter=status%3Apublished&fields=id%2Curl%2Ctitle%2Cvisibility%2Cpublished_at&order=published_at+desc&limit=5',
      { posts: [] },
    );
    await renderAdminApp('/automations/new', { labs });
    await button('Add step').click();
    await page
      .getByTestId('step-picker')
      .getByRole('button', { name: /^Email/ })
      .click();
    await button('Edit email content').click();
    const dialog = page.getByRole('dialog', { name: 'Edit email', exact: true });
    await expect.element(dialog.getByRole('tab', { name: 'Preview' })).toBeDisabled();
    await expect
      .element(dialog.getByRole('tab', { name: 'Preview' }))
      .toHaveAttribute('title', 'Save automation to preview or send a test');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    await button('Save').click();
    await expect.poll(currentRoute).toBe('/automations/created');
    await button('Edit email content').click();
    await expect.element(dialog.getByRole('tab', { name: 'Preview' })).toBeEnabled();
  });

  it('plays the header entrance once, not again after a trigger is picked', async () => {
    fakeAutomations([]);
    fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers: [] });
    const entering = () => document.querySelectorAll('header.screen-enter-from-top').length;
    await renderAdminApp('/automations', {
      labs,
      boot: {
        browseSettings: {
          response: settingsResponse({
            settings: { stripe_secret_key: 'sk_test', stripe_publishable_key: 'pk_test' },
          }),
        },
      },
    });
    await button('New automation').click();
    await expect.element(page.getByText('Select a trigger', { exact: true })).toBeVisible();
    expect(entering()).toBe(1);
    await page.getByRole('button', { name: /^Free member signed up/ }).click();
    await expect.element(button('Show automation sidebar')).toBeVisible();
    expect(entering()).toBe(0);
  });

  it('opens the editor with the trigger where the picker card was', async () => {
    fakeAutomations([]);
    fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers: [] });
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
    const heading = page.getByText('Select a trigger', { exact: true });
    await expect.element(heading).toBeVisible();
    const card = heading.element().parentElement as HTMLElement;
    const pickerTop = card.getBoundingClientRect().top;
    const region = card.parentElement?.parentElement as HTMLElement;
    const regionTop = region.getBoundingClientRect().top;
    // Slightly above centre, not pinned under the header.
    expect(pickerTop - regionTop).toBeGreaterThan(48);
    await page.getByRole('button', { name: /^Free member signed up/ }).click();
    const trigger = () =>
      document.querySelector<HTMLElement>('.react-flow__node[data-id="__trigger__"]');
    await expect.poll(() => trigger()?.getBoundingClientRect().top).toBeCloseTo(pickerTop, 0);
  });

  it('draws the connector and brings the exit card in once a trigger is picked', async () => {
    fakeAutomations([]);
    fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers: [] });
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
    await page.getByRole('button', { name: /^Free member signed up/ }).click();
    const lines = () => [...document.querySelectorAll<SVGPathElement>('.react-flow__edge-path')];
    await expect.poll(() => lines().length).toBe(1);
    expect(lines()[0].style.strokeDasharray).not.toBe('');
    await expect.poll(() => lines()[0].style.strokeDashoffset).toBe('0');
    const exit = page.getByLabelText('Exit automation');
    await expect.poll(() => getComputedStyle(exit.element()).opacity).toBe('1');
    await expect.element(button('Add step')).toBeVisible();
    // Only the flow that first appears: a step added afterwards arrives as usual.
    await new Promise((resolve) => {
      setTimeout(resolve, 600);
    });
    await addWait();
    await expect.poll(() => lines().length).toBe(2);
    expect(lines().every((line) => line.style.strokeDasharray === '')).toBe(true);
  });

  it('offers Performance before the first save, without loading anything', async () => {
    fakeAutomations([]);
    const stats = fakeAdminEndpoint('GET', /\/automations\/[^/]*\/performance-stats\//, {});
    const runs = fakeAdminEndpoint('GET', /\/automations\/[^/]*\/runs\//, {});
    // Without Stripe there's no trigger to pick: the draft starts as a free one.
    await renderAdminApp('/automations/new', { labs, boot: performanceBoot });
    await button('Show automation sidebar').click();
    await expect
      .element(page.getByRole('tab', { name: 'Settings' }))
      .toHaveAttribute('data-state', 'active');
    await page.getByRole('tab', { name: 'Performance' }).click();
    await expect
      .element(page.getByRole('region', { name: 'Total runs' }))
      .toHaveTextContent('Total runs loaded: 0.');
    const counts = page.getByRole('region', { name: 'Automation status counts' });
    for (const label of ['In progress', 'Completed', 'Stopped']) {
      await expect
        .element(counts.getByRole('button', { name: label, exact: true }))
        .toHaveTextContent('0');
    }
    await expect
      .element(page.getByRole('status').filter({ hasText: 'No members yet' }))
      .toHaveTextContent("Once someone starts your automation, they'll show here");
    await expect.element(button('Search members')).not.toBeInTheDocument();
    expect(stats.requests).toHaveLength(0);
    expect(runs.requests).toHaveLength(0);
  });

  for (const { title, rule } of [
    {
      title: 'Free member signed up',
      rule: { trigger_type: 'free_signup', scope: null, product_id: null, direction: null },
    },
    {
      title: 'Paid subscription started',
      rule: {
        trigger_type: 'paid_subscription_started',
        scope: 'any_paid_tier',
        product_id: null,
        direction: null,
      },
    },
  ] as const) {
    it(`selects ${title} with Stripe connected`, async () => {
      fakeAutomations([]);
      fakeAdminEndpoint('GET', /\/tiers\/\?/, { tiers: [] });
      const create = serveCreation();
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
      await expect.element(button('Hide automation sidebar')).not.toBeInTheDocument();
      await page.getByRole('button', { name: new RegExp(`^${title}`) }).click();
      if (rule.trigger_type === 'paid_subscription_started') {
        await expect
          .element(page.getByText('Triggered when a new or free member starts:', { exact: true }))
          .toBeVisible();
      }
      await expect.element(button('Show automation sidebar')).toBeVisible();
      await button('Show automation sidebar').click();
      await expect
        .element(page.getByRole('tab', { name: 'Settings' }))
        .toHaveAttribute('data-state', 'active');
      await expect
        .element(page.getByRole('textbox', { name: 'Automation name', exact: true }))
        .toBeVisible();
      await button('Hide automation sidebar').click();
      await expect.element(button('Save')).toBeEnabled();
      expect(create.requests).toHaveLength(0);
      await addWait();
      await button('Save').click();
      await expect.poll(() => create.requests.length).toBe(1);
      await expect.element(button('Show automation sidebar')).toBeVisible();
      expect(create.requests[0].body).toMatchObject({
        automations: [
          {
            trigger_rules: [rule],
          },
        ],
      });
    });
  }
});

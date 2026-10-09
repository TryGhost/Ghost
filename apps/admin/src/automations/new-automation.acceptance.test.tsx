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

const labs = { automations: true, automationsPerTier: true };
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

describe('New automation', () => {
  it('creates a free draft locally, warns before leaving, then adds and edits without remounting', async () => {
    fakeAutomations([
      automation({ name: 'New Automation' }),
      automation({ name: 'New Automation 3' }),
    ]);
    const create = serveCreation();
    const edit = fakeAdminEndpoint('PUT', '/automations/created/', ({ body }) => ({
      automations: [
        { ...detail('created'), ...(body as { automations: AutomationDetail[] }).automations[0] },
      ],
    }));
    await renderAdminApp('/automations', { labs });
    await button('New automation').click();
    await expect.element(page.getByText('New Automation 2', { exact: true })).toBeVisible();
    await expect.element(button('Save')).toBeDisabled();
    await expect
      .element(page.getByText('Select a trigger', { exact: true }))
      .not.toBeInTheDocument();
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
    expect(create.requests).toHaveLength(1);
    expect(create.requests[0].body).toMatchObject({
      automations: [
        {
          name: 'New Automation 2',
          trigger_tier_scope: 'free',
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
    await expect.element(page.getByText('Other automation', { exact: true })).toBeVisible();
    window.history.back();
    await expect.element(page.getByText('Saved automation', { exact: true })).toBeVisible();
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
    await page.getByRole('button', { name: /^Paid subscription starts/ }).click();
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
      automations: [{ trigger_tier_scope: 'all_paid', actions: [{ data: { wait_hours: 72 } }] }],
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

  it('does not offer creation when its flag is off', async () => {
    fakeAutomations([]);
    await renderAdminApp('/automations/new', { labs: { automations: true } });
    await expect.poll(currentRoute).toBe('/automations');
    await expect.element(page.getByRole('heading', { name: 'Automations' })).toBeVisible();
    await expect.element(button('New automation')).not.toBeInTheDocument();
  });

  for (const [title, scope] of [
    ['Member signs up', 'free'],
    ['Paid subscription starts', 'all_paid'],
  ] as const) {
    it(`selects ${scope} with Stripe connected`, async () => {
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
      await page.getByRole('button', { name: new RegExp(`^${title}`) }).click();
      await expect.element(button('Save')).toBeDisabled();
      expect(create.requests).toHaveLength(0);
      await addWait();
      await button('Save').click();
      await expect.poll(() => create.requests.length).toBe(1);
      expect(create.requests[0].body).toMatchObject({
        automations: [{ trigger_tier_scope: scope, trigger_tier_ids: null }],
      });
    });
  }
});

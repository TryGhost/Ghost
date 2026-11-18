import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { HttpResponse } from 'msw';
import {
  automation,
  browseResponse,
  fakeAdminEndpoint,
  fakeAutomations,
  fakeLabelAutomations,
  fakeMembers,
  label,
  member,
  renderAdminApp,
} from '@test-utils/acceptance';
import { deferred } from '@/utils/deferred';
import { membersScreen } from './members.screen';

const flags = { automations: true, automationsLeadMagnets: true };
const dialog = () => page.getByRole('dialog');
const button = (name: string) => dialog().getByRole('button', { name, exact: true });
const bulkResult = { meta: { stats: { successful: 2, unsuccessful: 0 } } };

function setup() {
  const vip = label({ name: 'VIP' });
  const guide = label({ name: 'Guide' });
  const unrelated = label({ name: 'Other' });
  fakeMembers(member.many(2), { labels: [vip, guide, unrelated] });
  const first = automation({ name: 'VIP welcome', status: 'active' });
  const second = automation({ name: 'VIP follow-up', status: 'active' });
  const third = automation({ name: 'Guide delivery', status: 'active' });
  const inactive = automation({ name: 'Inactive', status: 'inactive' });
  fakeLabelAutomations([
    { automation: first, label: vip },
    { automation: second, label: vip },
    { automation: third, label: guide },
  ]);
  fakeAutomations([first, second, third, inactive]);
  const bulk = fakeAdminEndpoint('PUT', /^\/members\/bulk\/\?/, bulkResult);
  return { vip, guide, unrelated, first, bulk };
}

async function openPicker() {
  await membersScreen.openActionsMenu();
  await membersScreen.menuItem(/Add label/).click();
}

async function pick(names: string[]) {
  await dialog().getByRole('combobox').click();
  for (const name of names) {
    await dialog()
      .getByRole('option', { name: new RegExp(`^${name}(?:\\s|$)`) })
      .click();
  }
  await dialog().getByRole('heading').click();
}

describe('Bulk label automation confirmation', () => {
  it.each([
    {
      names: ['VIP'],
      action: 'Add label',
      title: 'Add label to 1 member?',
      copy: 'Adding VIP also starts the VIP welcome and VIP follow-up automations for this member.',
    },
    {
      names: ['VIP', 'Guide'],
      action: 'Add 2 labels',
      title: 'Add labels to 1 member?',
      copy: 'Adding these labels also starts 3 automations for this member.',
    },
  ])('describes a single member in "$title"', async ({ names, action, title, copy }) => {
    const { vip, guide, bulk } = setup();
    fakeMembers([member()], { labels: [vip, guide] });
    await renderAdminApp('/members', { labs: flags });
    await openPicker();
    await pick(names);
    await expect.element(button(action)).toBeEnabled();
    await button(action).click();
    await expect.element(dialog().getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect.element(dialog()).toHaveTextContent(copy);
    expect(bulk.requests).toHaveLength(0);
  });

  it('confirms multiple automations for one label, preserves Back selections, and resets on reopen', async () => {
    const { bulk } = setup();
    await renderAdminApp('/members', { labs: flags });
    await openPicker();
    await pick(['VIP']);
    await expect.element(button('Add label')).toBeEnabled();
    await button('Add label').click();
    await expect
      .element(dialog().getByRole('heading', { name: 'Add label to 2 members?', exact: true }))
      .toBeVisible();
    await expect
      .element(dialog())
      .toHaveTextContent(
        'Adding VIP also starts the VIP welcome and VIP follow-up automations for these members.',
      );
    await expect.element(dialog()).not.toHaveTextContent('Inactive');
    expect(bulk.requests).toHaveLength(0);
    await button('Back').click();
    await expect.element(button('Remove VIP')).toBeVisible();
    await button('Cancel').click();
    await expect.element(dialog()).not.toBeInTheDocument();
    await openPicker();
    await expect.element(button('Add label')).toBeDisabled();
    await pick(['VIP']);
    await expect.element(button('Add label')).toBeEnabled();
    await button('Add label').click();
    await expect.element(button('Back')).toBeVisible();
    await button('Add label').click();
    await expect.poll(() => bulk.requests.length).toBe(1);
    await expect.element(dialog()).not.toBeInTheDocument();
  });

  it('maps multiple affected labels and submits all selected labels once, with pending controls disabled', async () => {
    const { vip, guide, unrelated } = setup();
    const submissions = [deferred<void>(), deferred<void>(), deferred<void>()];
    let next = 0;
    const bulk = fakeAdminEndpoint('PUT', /^\/members\/bulk\/\?/, async () => {
      const submission = submissions[next];
      next += 1;
      await submission.promise;
      return bulkResult;
    });
    await renderAdminApp('/members', { labs: flags });
    await openPicker();
    await pick(['VIP', 'Guide', 'Other']);
    await expect.element(button('Add 3 labels')).toBeEnabled();
    await button('Add 3 labels').click();
    await expect
      .element(dialog().getByRole('heading', { name: 'Add labels to 2 members?', exact: true }))
      .toBeVisible();
    await expect
      .element(dialog())
      .toHaveTextContent('Adding these labels also starts 3 automations for these members.');
    await expect.element(dialog()).toHaveTextContent('Add VIP');
    await expect.element(dialog()).toHaveTextContent('Starts VIP welcome');
    await expect.element(dialog()).toHaveTextContent('Add Guide');
    await expect.element(dialog()).toHaveTextContent('Starts Guide delivery');
    expect(bulk.requests).toHaveLength(0);
    await button('Add 3 labels').click();
    await expect.element(button('Add 3 labels')).toBeDisabled();
    await expect.element(button('Back')).toBeDisabled();
    await expect.poll(() => bulk.requests.length).toBe(1);
    for (const [index, submission] of submissions.entries()) {
      await expect.poll(() => bulk.requests.length).toBe(index + 1);
      await expect.element(button('Add 3 labels')).toBeDisabled();
      await expect.element(button('Back')).toBeDisabled();
      submission.resolve();
    }
    await expect.element(dialog()).not.toBeInTheDocument();
    expect(bulk.requests.map(({ body }) => body)).toEqual(
      [vip, guide, unrelated].map(({ id }) => ({
        bulk: { action: 'addLabel', meta: { label: { id } } },
      })),
    );
  });

  it('adds unrelated labels directly without a confirmation', async () => {
    const { bulk } = setup();
    await renderAdminApp('/members', { labs: flags });
    await openPicker();
    await pick(['Other']);
    await expect.element(button('Add label')).toBeEnabled();
    await button('Add label').click();
    await expect.element(dialog()).not.toBeInTheDocument();
    expect(bulk.requests).toHaveLength(1);
  });

  it('retains the confirmation after a failed bulk update and allows retry', async () => {
    setup();
    const failed = fakeAdminEndpoint(
      'PUT',
      /^\/members\/bulk\/\?/,
      {
        errors: [{ message: 'Unavailable' }],
      },
      { status: 422 },
    );
    await renderAdminApp('/members', { labs: flags });
    await openPicker();
    await pick(['VIP']);
    await expect.element(button('Add label')).toBeEnabled();
    await button('Add label').click();
    await button('Add label').click();
    await expect.poll(() => failed.requests.length).toBe(1);
    await expect.element(page.getByText('Failed to add label', { exact: true })).toBeVisible();
    await expect.element(button('Add label')).toBeEnabled();
    const retried = fakeAdminEndpoint('PUT', /^\/members\/bulk\/\?/, bulkResult);
    await button('Add label').click();
    await expect.element(dialog()).not.toBeInTheDocument();
    expect(retried.requests).toHaveLength(1);
  });

  it('blocks bulk labels when the automation browse endpoint returns 404', async () => {
    const { bulk } = setup();
    fakeAdminEndpoint(
      'GET',
      '/automations/',
      { errors: [{ message: 'Not found' }] },
      { status: 404 },
    );
    await renderAdminApp('/members', { labs: flags });
    await openPicker();
    await pick(['VIP']);
    await expect.element(button('Add label')).toBeEnabled();
    await button('Add label').click();
    await expect.element(page.getByText('Not found', { exact: true })).toBeVisible();
    await expect.element(button('Add label')).toBeEnabled();
    expect(bulk.requests).toHaveLength(0);
  });

  it('blocks additions during lookup, reports failures, and retries without losing selections', async () => {
    const { first, bulk } = setup();
    const response = deferred<Response>();
    fakeAdminEndpoint('GET', `/automations/${first.id}/`, () => response.promise);
    await renderAdminApp('/members', { labs: flags });
    await openPicker();
    await pick(['VIP']);
    await expect.element(button('Add label')).toBeDisabled();
    response.resolve(HttpResponse.json({ errors: [{ message: 'Unavailable' }] }, { status: 422 }));
    await expect.element(button('Add label')).toBeEnabled();
    await button('Add label').click();
    await expect.element(page.getByText('Unavailable', { exact: true })).toBeVisible();
    expect(bulk.requests).toHaveLength(0);
    // The successful retry below returns a non-label trigger, so only VIP follow-up remains.
    fakeAdminEndpoint('GET', `/automations/${first.id}/`, {
      automations: [{ ...first, trigger_rules: [{ trigger_type: 'free_signup' }] }],
    });
    await expect.element(button('Add label')).toBeEnabled();
    await button('Add label').click();
    await expect
      .element(dialog())
      .toHaveTextContent('Adding VIP also starts the VIP follow-up automation for these members.');
    expect(bulk.requests).toHaveLength(0);
  });

  it.each([999, 1000])(
    'shows the processing delay message at the confirmed cutoff with %i members',
    async (total) => {
      setup();
      fakeAdminEndpoint('GET', /^\/members\/\?/, {
        ...browseResponse('members', member.many(2)),
        meta: { pagination: { total, page: 1, pages: 1, limit: 50, next: null, prev: null } },
      });
      await renderAdminApp('/members', { labs: flags });
      await openPicker();
      await pick(['VIP']);
      await expect.element(button('Add label')).toBeEnabled();
      await button('Add label').click();
      const caveat = dialog().getByText(/With this many members, it can take longer to process/);
      if (total >= 1000) {
        await expect.element(caveat).toBeVisible();
      } else {
        await expect.element(caveat).not.toBeInTheDocument();
      }
    },
  );
});

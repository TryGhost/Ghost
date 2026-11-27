import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { HttpResponse } from 'msw';
import {
  automation,
  fakeAdminEndpoint,
  fakeLabelAutomations,
  fakeMembers,
  label,
  member,
  renderAdminApp,
} from '@test-utils/acceptance';
import { deferred } from '@/utils/deferred';
import { memberDetailScreen as detail } from './member-detail.screen';

const flags = { automations: true, automationsLeadMagnets: true };
const dialog = () => page.getByRole('dialog', { name: 'Save changes?' });
const confirm = () => dialog().getByRole('button', { name: 'Save', exact: true });

function setup() {
  const vip = label({ name: 'VIP' });
  const guide = label({ name: 'Guide' });
  const unrelated = label({ name: 'Unrelated' });
  const m = member({ name: 'Ada', labels: [] });
  fakeMembers([m], { labels: [vip, guide, unrelated] });
  fakeAdminEndpoint('GET', `/members/${m.id}/?include=tiers`, () => ({ members: [m] }));
  fakeAdminEndpoint('GET', /^\/members\/events\//, {
    events: [],
    meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
  });
  const first = automation({ name: 'VIP welcome', status: 'active' });
  const second = automation({ name: 'VIP follow-up', status: 'active' });
  const third = automation({ name: 'Guide delivery', status: 'active' });
  fakeLabelAutomations([
    { automation: first, label: vip },
    { automation: second, label: vip },
    { automation: third, label: guide },
  ]);
  const enrollments = fakeAdminEndpoint('GET', `/members/${m.id}/automation-enrollments/`, {
    automation_enrollments: [],
  });
  const save = fakeAdminEndpoint('PUT', new RegExp(`^/members/${m.id}/(?:\\?|$)`), ({ body }) => {
    Object.assign(m, (body as { members: object[] }).members[0]);
    return { members: [m] };
  });
  return { m, vip, guide, first, second, third, save, enrollments };
}

async function pick(name: string) {
  const field = page.getByTestId('member-labels-field');
  await field.getByRole('combobox').click();
  await field.getByRole('option', { name: new RegExp(`^${name}\\s`) }).click();
  await detail.nameInput().click();
}

async function requestSave() {
  await expect.element(detail.saveButton()).toBeEnabled();
  await detail.saveButton().click();
}

describe('Member label automation confirmation', () => {
  it('keeps the draft on Cancel and saves all profile fields once after confirming', async () => {
    const { m, save, vip } = setup();
    await renderAdminApp(`/members/${m.id}`, { labs: flags });
    await detail.nameInput().fill('Ada updated');
    await page.getByLabelText('Note', { exact: false }).fill('Keep this note');
    await pick('VIP');
    await requestSave();
    await expect
      .element(dialog())
      .toHaveTextContent(
        'Adding VIP also starts the VIP welcome and VIP follow-up automations for this member.',
      );
    expect(save.requests).toHaveLength(0);
    await dialog().getByRole('button', { name: 'Cancel' }).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(detail.nameInput()).toHaveValue('Ada updated');
    await expect.element(page.getByRole('button', { name: 'Remove VIP' })).toBeVisible();
    await requestSave();
    const pending = deferred<void>();
    const update = fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/members/${m.id}/(?:\\?|$)`),
      async ({ body }) => {
        await pending.promise;
        return { members: [{ ...m, ...(body as { members: object[] }).members[0] }] };
      },
    );
    await confirm().click();
    await expect
      .element(dialog().getByRole('button', { name: 'Save', exact: true }))
      .toBeDisabled();
    await expect.element(dialog().getByRole('button', { name: 'Cancel' })).toBeDisabled();
    pending.resolve();
    await expect.element(dialog()).not.toBeInTheDocument();
    expect(update.requests).toHaveLength(1);
    expect(update.lastRequest?.body).toMatchObject({
      members: [
        { name: 'Ada updated', note: 'Keep this note', labels: [{ name: 'VIP', slug: vip.slug }] },
      ],
    });
  });

  it('maps multiple labels while excluding automations the member has already entered', async () => {
    const { m, first } = setup();
    fakeAdminEndpoint('GET', `/members/${m.id}/automation-enrollments/`, {
      automation_enrollments: [{ automation_id: first.id }],
    });
    await renderAdminApp(`/members/${m.id}`, { labs: flags });
    await pick('VIP');
    await pick('Guide');
    await requestSave();
    await expect
      .element(dialog())
      .toHaveTextContent('Saving also starts 2 automations for this member.');
    await expect.element(dialog()).toHaveTextContent('Starts VIP follow-up');
    await expect.element(dialog()).toHaveTextContent('Starts Guide delivery');
    await expect.element(dialog()).toHaveTextContent('Add VIP');
    await expect.element(dialog()).toHaveTextContent('Add Guide');
    await expect.element(dialog()).not.toHaveTextContent('VIP welcome');
  });

  it('saved directly when every matching automation had already been entered', async () => {
    const { m, first, second, save } = setup();
    fakeAdminEndpoint('GET', `/members/${m.id}/automation-enrollments/`, {
      automation_enrollments: [{ automation_id: first.id }, { automation_id: second.id }],
    });
    await renderAdminApp(`/members/${m.id}`, { labs: flags });
    await pick('VIP');
    await requestSave();
    await expect.poll(() => save.requests.length).toBe(1);
    await expect.element(dialog()).not.toBeInTheDocument();
  });

  it('saves unchanged and removed labels directly without looking up automations', async () => {
    const { m, vip, save, enrollments } = setup();
    m.labels = [vip];
    await renderAdminApp(`/members/${m.id}`, { labs: flags });
    await detail.nameInput().fill('Updated');
    await requestSave();
    await expect.poll(() => save.requests.length).toBe(1);
    await expect.element(page.getByRole('button', { name: 'Remove VIP' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove VIP' }).click();
    await requestSave();
    await expect.poll(() => save.requests.length).toBe(2);
    expect(enrollments.requests).toHaveLength(0);
    await expect.element(dialog()).not.toBeInTheDocument();
  });

  it('saves unrelated labels directly', async () => {
    const { m, save, enrollments } = setup();
    await renderAdminApp(`/members/${m.id}`, { labs: flags });
    await pick('Unrelated');
    await requestSave();
    await expect.poll(() => save.requests.length).toBe(1);
    expect(enrollments.requests).toHaveLength(0);
    await expect.element(dialog()).not.toBeInTheDocument();
  });

  it('retains confirmation and draft after a failed save, then retries', async () => {
    const { m } = setup();
    const save = fakeAdminEndpoint('PUT', new RegExp(`^/members/${m.id}/(?:\\?|$)`), () =>
      HttpResponse.json({ errors: [{ message: 'Unavailable' }] }, { status: 500 }),
    );
    await renderAdminApp(`/members/${m.id}`, { labs: flags });
    await pick('Guide');
    await requestSave();
    await confirm().click();
    await expect
      .element(dialog().getByRole('button', { name: 'Retry', exact: true }))
      .toBeEnabled();
    expect(save.requests).toHaveLength(1);
    const retry = fakeAdminEndpoint('PUT', new RegExp(`^/members/${m.id}/(?:\\?|$)`), {
      members: [m],
    });
    await dialog().getByRole('button', { name: 'Retry', exact: true }).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    expect(retry.requests).toHaveLength(1);
  });

  it.each(['request failure', 'invalid response'])(
    'blocks saving after an enrollment %s and recovers on retry',
    async (scenario) => {
      const { m, save } = setup();
      fakeAdminEndpoint('GET', `/members/${m.id}/automation-enrollments/`, () =>
        scenario === 'request failure'
          ? HttpResponse.json({}, { status: 500 })
          : { automation_enrollments: [{ automation_id: 42 }] },
      );
      await renderAdminApp(`/members/${m.id}`, { labs: flags });
      await pick('VIP');
      await expect.element(detail.saveButton()).toBeEnabled();
      await requestSave();
      await expect.element(page.getByText(/Something went wrong/)).toBeVisible();
      expect(save.requests).toHaveLength(0);
      fakeAdminEndpoint('GET', `/members/${m.id}/automation-enrollments/`, {
        automation_enrollments: [],
      });
      await requestSave();
      await expect.element(dialog()).toBeVisible();
    },
  );

  it('preserves direct saving until the new enrollment endpoint has rolled out to Core', async () => {
    const { m, save } = setup();
    fakeAdminEndpoint('GET', `/members/${m.id}/automation-enrollments/`, () =>
      HttpResponse.json({}, { status: 404 }),
    );
    await renderAdminApp(`/members/${m.id}`, { labs: flags });
    await pick('VIP');
    await requestSave();
    await expect.poll(() => save.requests.length).toBe(1);
    await expect.element(dialog()).not.toBeInTheDocument();
  });
});

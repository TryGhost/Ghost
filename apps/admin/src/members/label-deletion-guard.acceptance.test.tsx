import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { HttpResponse } from 'msw';
import {
  automation,
  currentRoute,
  fakeAdminEndpoint,
  fakeAutomations,
  fakeMembers,
  label,
  member,
  renderAdminApp,
} from '@test-utils/acceptance';
import { deferred } from '@/utils/deferred';
import { detail } from '@/automations/run-history.test-utils';
import { membersScreen } from './members.screen';
import { importMembersScreen as imports } from './import-members.screen';

const labs = { automations: true, automationsLeadMagnets: true };
const warning = () => page.getByRole('alertdialog', { name: "Can't delete label" });
const button = (name: string) => page.getByRole('button', { name, exact: true });

function setup() {
  const vip = label({ name: 'VIP' });
  const guide = label({ name: 'Guide' });
  const other = label({ name: 'Other' });
  const m = member({ name: 'Ada', labels: [vip] });
  fakeMembers([m], { labels: [vip, guide, other] });
  fakeAdminEndpoint('GET', `/members/${m.id}/?include=tiers`, { members: [m] });
  fakeAdminEndpoint('GET', /^\/members\/events\//, {
    events: [],
    meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
  });
  const active = automation({ name: 'VIP welcome', status: 'active' });
  const inactive = automation({ name: 'Guide delivery', status: 'inactive' });
  const archived = automation({ name: 'Archived VIP', status: 'archived' });
  fakeAutomations([active, inactive, archived]);
  const activeDetail = {
    ...detail(active.id),
    ...active,
    trigger_rules: [
      {
        trigger_type: 'label_added',
        label_id: vip.id,
        scope: null,
        product_id: null,
        direction: null,
      },
    ],
  };
  fakeAdminEndpoint('GET', `/automations/${active.id}/`, { automations: [activeDetail] });
  fakeAdminEndpoint('GET', `/labels/${vip.id}/`, { labels: [vip] });
  const browse = fakeAdminEndpoint('GET', '/automations/', {
    automations: [active, inactive, archived],
  });
  const remove = fakeAdminEndpoint('DELETE', `/labels/${vip.id}/`, {});
  const edit = fakeAdminEndpoint('PUT', `/labels/${vip.id}/`, ({ body }) => ({
    labels: [{ ...vip, ...(body as { labels: Partial<typeof vip>[] }).labels[0] }],
  }));
  return { m, vip, guide, other, active, inactive, archived, activeDetail, browse, remove, edit };
}

async function editLabel(name: string) {
  await page.getByRole('button', { name: `Edit label ${name}`, exact: true }).click();
}

async function requestDelete() {
  await button('Delete').click();
}

async function openProfile(id: string) {
  const rendered = await renderAdminApp(`/members/${id}`, { labs });
  await page.getByTestId('member-labels-field').getByRole('combobox').click();
  return rendered;
}

async function openFilter() {
  await renderAdminApp('/members', { labs });
  await membersScreen.addMultiselectFilter('Label', ['Other']);
  await membersScreen.openMultiselectValue('Other');
}

describe('Label deletion automation guard', () => {
  it('keeps the warning and focus while its trigger references refresh', async () => {
    const { m, active, activeDetail, remove } = setup();
    const { queryClient } = await openProfile(m.id);
    await editLabel('VIP');
    await requestDelete();
    const close = warning().getByRole('button', { name: 'Close', exact: true });
    await expect.element(close).toBeVisible();
    close.element().focus();

    const response = deferred<Response>();
    const refresh = fakeAdminEndpoint('GET', `/automations/${active.id}/`, () => response.promise);
    const checking = queryClient.invalidateQueries({ queryKey: ['AutomationsResponseType'] });
    await expect.poll(() => refresh.requests.length).toBe(1);
    await expect.element(warning()).toBeVisible();
    await expect.element(close).toHaveFocus();
    response.resolve(HttpResponse.json({ automations: [activeDetail] }));
    await checking;
    await expect.element(close).toHaveFocus();
    expect(remove.requests).toHaveLength(0);
  });

  it('checks only Delete, explains the active trigger, and keeps rename edits and the profile picker usable on Close', async () => {
    const { m, browse, remove, edit } = setup();
    await openProfile(m.id);
    await editLabel('VIP');
    const input = page.getByTestId('member-labels-field').getByRole('textbox');
    await input.fill('Renamed VIP');
    expect(browse.requests).toHaveLength(0);
    await requestDelete();
    await expect
      .element(warning())
      .toHaveTextContent(
        'VIP is the trigger for the active automation VIP welcome. Turn off the automation to delete this label.',
      );
    expect(remove.requests).toHaveLength(0);
    await userEvent.keyboard('{Enter}');
    await expect.element(warning()).not.toBeInTheDocument();
    await expect.element(input).toHaveValue('Renamed VIP');
    await page
      .getByTestId('member-labels-field')
      .getByRole('button', { name: 'Save', exact: true })
      .click();
    await expect.poll(() => edit.requests.length).toBe(1);
    expect(edit.lastRequest?.body).toMatchObject({ labels: [{ name: 'Renamed VIP' }] });
    expect(remove.requests).toHaveLength(0);
  });

  it('lists every active reference from the filter picker and navigates to the chosen automation', async () => {
    const { vip, active, activeDetail, inactive, archived, remove } = setup();
    const second = automation({ name: 'VIP follow-up', status: 'active' });
    const secondDetail = { ...activeDetail, ...second };
    fakeAutomations([active, second, inactive, archived]);
    fakeAdminEndpoint('GET', '/automations/', {
      automations: [active, second, inactive, archived],
    });
    fakeAdminEndpoint('GET', `/automations/${second.id}/`, { automations: [secondDetail] });
    await openFilter();
    await editLabel(vip.name);
    await requestDelete();
    await expect.element(warning()).toHaveTextContent('VIP welcome');
    await expect.element(warning()).toHaveTextContent('VIP follow-up');
    await expect.element(warning()).not.toHaveTextContent('Archived VIP');
    await warning()
      .getByRole('link', { name: 'Go to automation VIP follow-up', exact: true })
      .click();
    await expect.poll(currentRoute).toBe(`/automations/${second.id}`);
    await expect
      .element(page.getByRole('textbox', { name: 'Automation name' }))
      .toHaveValue(second.name);
    expect(remove.requests).toHaveLength(0);
  });

  it.each(['Add label', 'Remove label', 'Import'])(
    'blocks deletion inside %s and restores the parent picker on Close',
    async (surface) => {
      const { remove } = setup();
      if (surface === 'Import') {
        await renderAdminApp('/members/import', { labs });
        await expect.element(imports.dropzone()).toBeVisible();
        await imports
          .fileInput()
          .upload(new File(['email\nada@example.com\n'], 'members.csv', { type: 'text/csv' }));
        await expect.element(imports.fieldSelect('email')).toBeVisible();
      } else {
        await renderAdminApp('/members', { labs });
        await membersScreen.openActionsMenu();
        await membersScreen.menuItem(new RegExp(surface)).click();
      }
      await page.getByRole('combobox', { name: 'Search labels...' }).click();
      await editLabel('VIP');
      await requestDelete();
      await expect.element(warning()).toBeVisible();
      await warning().getByRole('button', { name: 'Close' }).click();
      await expect.element(warning()).not.toBeInTheDocument();
      await expect.element(button('Delete')).toBeVisible();
      await expect.element(page.getByRole('dialog')).toBeVisible();
      expect(remove.requests).toHaveLength(0);
    },
  );

  it('rechecks after an automation is turned off, then allows the normal confirmed deletion', async () => {
    const { m, activeDetail, inactive, archived, remove } = setup();
    await openProfile(m.id);
    await editLabel('VIP');
    await requestDelete();
    await expect.element(warning()).toBeVisible();
    await warning().getByRole('button', { name: 'Close' }).click();
    await expect.element(warning()).not.toBeInTheDocument();
    fakeAdminEndpoint('GET', '/automations/', {
      automations: [{ ...activeDetail, status: 'inactive' }, inactive, archived],
    });
    await requestDelete();
    await expect.element(page.getByText('Delete label?', { exact: true })).toBeVisible();
    expect(remove.requests).toHaveLength(0);
    await button('Delete').click();
    await expect.poll(() => remove.requests.length).toBe(1);
    await expect.element(warning()).not.toBeInTheDocument();
  });

  it('allows unrelated labels through the existing confirmation', async () => {
    const { m, other } = setup();
    const remove = fakeAdminEndpoint('DELETE', `/labels/${other.id}/`, {});
    await openProfile(m.id);
    await editLabel('Other');
    await requestDelete();
    await expect.element(page.getByText('Delete label?', { exact: true })).toBeVisible();
    expect(remove.requests).toHaveLength(0);
    await button('Delete').click();
    await expect.poll(() => remove.requests.length).toBe(1);
  });

  it.each([404, 500])(
    'waits for the lookup and retries a %s without allowing deletion',
    async (status) => {
      const { m, active, inactive, archived, remove } = setup();
      const pending = deferred<void>();
      fakeAdminEndpoint('GET', '/automations/', async () => {
        await pending.promise;
        return HttpResponse.json({}, { status });
      });
      await openProfile(m.id);
      await editLabel('VIP');
      await requestDelete();
      await expect.element(button('Delete')).toHaveAttribute('aria-busy', 'true');
      await expect.element(button('Delete')).toBeDisabled();
      await expect
        .element(page.getByText('Delete label?', { exact: true }))
        .not.toBeInTheDocument();
      pending.resolve();
      await expect
        .element(
          page.getByText('Something went wrong while loading automations, please try again.', {
            exact: true,
          }),
        )
        .toBeVisible();
      expect(remove.requests).toHaveLength(0);
      fakeAdminEndpoint('GET', '/automations/', { automations: [active, inactive, archived] });
      await expect.element(button('Delete')).toBeEnabled();
      await button('Delete').click();
      await expect.element(warning()).toBeVisible();
      expect(remove.requests).toHaveLength(0);
    },
  );
});

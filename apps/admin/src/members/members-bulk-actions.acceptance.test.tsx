import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  configResponse,
  fakeAdminEndpoint,
  fakeMembers,
  label,
  member,
  renderAdminApp,
} from '@test-utils/acceptance';
import { membersScreen } from './members.screen';

const bulkResponse = {
  bulk: {
    meta: { stats: { successful: 2, unsuccessful: 0 }, errors: [], unsuccessfulData: [] },
  },
};

async function setupBulkActions({
  capability = true,
  oldBackend = false,
  unsuccessful = false,
}: { capability?: boolean | null; oldBackend?: boolean; unsuccessful?: boolean } = {}) {
  const existing = label({ name: 'existing', slug: 'existing' });
  const another = label({ name: 'another', slug: 'another' });
  fakeMembers(
    member.many(2, () => ({ labels: [existing, another] })),
    { labels: [existing, another] },
  );
  const bulkApi = fakeAdminEndpoint('PUT', /^\/members\/bulk\/\?/, ({ body }) => {
    const action = (body as { bulk: { action: string } }).bulk.action;
    if (oldBackend && action === 'removeLabels') {
      return Response.json(
        { errors: [{ type: 'ValidationError', message: 'Unsupported action' }] },
        { status: 422 },
      );
    }
    if (unsuccessful) {
      return {
        bulk: {
          ...bulkResponse.bulk,
          meta: { ...bulkResponse.bulk.meta, stats: { successful: 0, unsuccessful: 2 } },
        },
      };
    }
    return bulkResponse;
  });
  const config = configResponse();
  await renderAdminApp('/members?filter=label:existing', {
    boot: {
      browseConfig: {
        response: {
          ...config,
          config: {
            ...config.config,
            ...(capability === null
              ? {}
              : { capabilities: { membersBulkRemoveLabels: capability } }),
          },
        },
      },
    },
  });
  return { bulkApi, existing, another };
}

describe('Members bulk actions', () => {
  it('adds a label to filtered members', async () => {
    const { bulkApi, existing } = await setupBulkActions();

    await membersScreen.openActionsMenu();
    await membersScreen.menuItem(/Add label/).click();
    await membersScreen.dialog().getByRole('combobox').click();
    await membersScreen.dialog().getByRole('option', { name: 'existing' }).click();
    await membersScreen.dialog().getByRole('heading').click();
    await membersScreen.dialog().getByRole('button', { name: 'Add label' }).click();

    await expect
      .poll(() => bulkApi.lastRequest?.body)
      .toEqual({
        bulk: { action: 'addLabel', meta: { label: { id: existing.id } } },
      });
    expect(bulkApi.lastRequest?.url).toContain('filter=label%3A%5Bexisting%5D');
  });

  it('removes a label from filtered members', async () => {
    const { bulkApi, existing } = await setupBulkActions();

    await membersScreen.openActionsMenu();
    await membersScreen.menuItem(/Remove label/).click();
    await membersScreen.dialog().getByRole('combobox').click();
    await membersScreen.dialog().getByRole('option', { name: 'existing' }).click();
    await membersScreen.dialog().getByRole('heading').click();
    await membersScreen.dialog().getByRole('button', { name: 'Remove label' }).click();

    await expect
      .poll(() => bulkApi.lastRequest?.body)
      .toEqual({
        bulk: { action: 'removeLabel', meta: { label: { id: existing.id } } },
      });
    expect(bulkApi.lastRequest?.url).toContain('filter=label%3A%5Bexisting%5D');
  });

  it('removes multiple labels from the same filtered members in one request', async () => {
    const { bulkApi, existing, another } = await setupBulkActions();

    await membersScreen.openActionsMenu();
    await membersScreen.menuItem(/Remove label/).click();
    await membersScreen.dialog().getByRole('combobox').click();
    await membersScreen.dialog().getByRole('option', { name: 'existing' }).click();
    await membersScreen.dialog().getByRole('option', { name: 'another' }).click();
    await membersScreen.dialog().getByRole('heading').click();
    await membersScreen.dialog().getByRole('button', { name: 'Remove 2 labels' }).click();

    await expect.element(page.getByText('Labels removed successfully')).toBeVisible();
    expect(bulkApi.requests).toHaveLength(1);
    expect(bulkApi.lastRequest?.body).toMatchObject({ bulk: { action: 'removeLabels' } });
    const body = bulkApi.lastRequest?.body as { bulk: { meta: { labels: unknown[] } } };
    expect(body.bulk.meta.labels).toEqual(
      expect.arrayContaining([{ id: existing.id }, { id: another.id }]),
    );
    expect(body.bulk.meta.labels).toHaveLength(2);
    expect(bulkApi.lastRequest?.url).toContain('filter=label%3A%5Bexisting%5D');
  });

  it('reports an error without partially removing labels on an older backend', async () => {
    const { bulkApi, existing, another } = await setupBulkActions({ oldBackend: true });

    await membersScreen.openActionsMenu();
    await membersScreen.menuItem(/Remove label/).click();
    await membersScreen.dialog().getByRole('combobox').click();
    await membersScreen.dialog().getByRole('option', { name: 'existing' }).click();
    await membersScreen.dialog().getByRole('option', { name: 'another' }).click();
    await membersScreen.dialog().getByRole('heading').click();
    await membersScreen.dialog().getByRole('button', { name: 'Remove 2 labels' }).click();

    await expect.element(page.getByText('Failed to remove label')).toBeVisible();
    await expect.element(page.getByText('Labels removed successfully')).not.toBeInTheDocument();
    expect(bulkApi.requests).toHaveLength(1);
    expect(bulkApi.lastRequest?.body).toMatchObject({ bulk: { action: 'removeLabels' } });
    const body = bulkApi.lastRequest?.body as { bulk: { meta: { labels: unknown[] } } };
    expect(body.bulk.meta.labels).toEqual(
      expect.arrayContaining([{ id: existing.id }, { id: another.id }]),
    );
    expect(body.bulk.meta.labels).toHaveLength(2);
  });

  it('reports unsuccessful removals instead of showing a success toast', async () => {
    const { bulkApi } = await setupBulkActions({ unsuccessful: true });

    await membersScreen.openActionsMenu();
    await membersScreen.menuItem(/Remove label/).click();
    await membersScreen.dialog().getByRole('combobox').click();
    await membersScreen.dialog().getByRole('option', { name: 'existing' }).click();
    await membersScreen.dialog().getByRole('heading').click();
    await membersScreen.dialog().getByRole('button', { name: 'Remove label' }).click();

    await expect.element(page.getByText('Failed to remove label')).toBeVisible();
    await expect.element(page.getByText('Label removed successfully')).not.toBeInTheDocument();
    expect(bulkApi.requests).toHaveLength(1);
  });

  it.each([null, false])(
    'limits selection when multi-label capability is %s',
    async (capability) => {
      const { bulkApi, another } = await setupBulkActions({ oldBackend: true, capability });

      await membersScreen.openActionsMenu();
      await membersScreen.menuItem(/Remove label/).click();
      await expect
        .element(
          page.getByText(
            'Select one label at a time. Update Ghost to remove multiple labels at once.',
          ),
        )
        .toBeVisible();
      await membersScreen.dialog().getByRole('combobox').click();
      await membersScreen.dialog().getByRole('option', { name: 'existing' }).click();
      await membersScreen.dialog().getByRole('option', { name: 'another' }).click();
      await expect
        .element(membersScreen.dialog().getByRole('button', { name: 'Remove existing' }))
        .not.toBeInTheDocument();
      await expect
        .element(membersScreen.dialog().getByRole('button', { name: 'Remove another' }))
        .toBeVisible();
      await membersScreen.dialog().getByRole('heading').click();
      await membersScreen.dialog().getByRole('button', { name: 'Remove label' }).click();

      await expect.element(page.getByText('Label removed successfully')).toBeVisible();
      expect(bulkApi.requests).toHaveLength(1);
      expect(bulkApi.lastRequest?.body).toEqual({
        bulk: { action: 'removeLabel', meta: { label: { id: another.id } } },
      });
    },
  );

  it('unsubscribes all filtered members', async () => {
    const { bulkApi } = await setupBulkActions();

    await membersScreen.openActionsMenu();
    await membersScreen.menuItem(/Unsubscribe/).click();
    await membersScreen.dialog().getByRole('button', { name: 'Unsubscribe' }).click();

    await expect
      .poll(() => bulkApi.lastRequest?.body)
      .toEqual({
        bulk: { action: 'unsubscribe', meta: {} },
      });
    expect(bulkApi.lastRequest?.url).toContain('filter=label%3A%5Bexisting%5D');
  });
});

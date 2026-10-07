import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import type {
  AppInstallation,
  AppInstallationManifest,
} from '@tryghost/admin-x-framework/api/app-installations';
import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeTags,
  renderAdminApp,
  staffRole,
} from '@test-utils/acceptance';
import { appsScreen } from './apps.screen';
import { MANIFEST_URL, fakeInstallations, installation, labs, manifest } from './apps.test-utils';

const DETAILS_ROUTE = '/apps/details/installation-1';

/** Reading one installation, whatever it includes. */
const readPath = (id: string) => new RegExp(`^/apps/installations/${id}/(\\?|$)`);

const manifestRow = (
  id: string,
  createdAt: string,
  overrides: Partial<AppInstallationManifest> = {},
): AppInstallationManifest => ({
  id,
  manifest_url: MANIFEST_URL,
  manifest: manifest(),
  requires_approval: false,
  created_at: createdAt,
  ...overrides,
});

/** A staff history entry for the installation, as the actions endpoint returns it. */
const action = (
  id: string,
  event: string,
  createdAt: string,
  context: Record<string, string> = {},
) => ({
  id,
  event,
  created_at: createdAt,
  context: JSON.stringify(context),
  resource_id: 'installation-1',
  resource_type: 'app_installation',
  actor_id: 'user-1',
  actor_type: 'user',
  actor: { id: 'user-1', name: 'Jamie Larson', slug: 'jamie', image: null },
});

/** One installation as the detail page reads it, with its manifests and staff history. */
function fakeDetails(
  read: AppInstallation,
  actions: ReturnType<typeof action>[] = [action('a1', 'installed', read.created_at)],
) {
  const readApi = fakeAdminEndpoint('GET', readPath(read.id), () => ({
    app_installations: [read],
  }));
  const actionsApi = fakeAdminEndpoint('GET', /^\/actions\/(\?|$)/, () => ({
    actions,
    meta: { pagination: { page: 1, limit: 'all', pages: 1, total: actions.length } },
  }));
  return { readApi, actionsApi };
}

/** The review of a suspended app's changes, as the install screen fetches it. */
const fakeReview = () =>
  fakeAdminEndpoint('POST', '/apps/installations/preview/', {
    app_installation_previews: [
      {
        manifest_url: MANIFEST_URL,
        manifest: manifest({ name: 'Podcasts' }),
        digest: 'digest-2',
        installation: {
          id: 'installation-1',
          status: 'suspended',
          manifest_url: MANIFEST_URL,
          manifest: manifest(),
          changes: [{ path: 'name', requires_approval: true }],
        },
      },
    ],
  });

const fakeUninstall = (id = 'installation-1') =>
  fakeAdminEndpoint(
    'DELETE',
    `/apps/installations/${id}/`,
    () => new Response(null, { status: 204 }),
  );

describe('Managing apps', () => {
  it('adds Apps to the sidebar for Administrators, only with the apps flag', async () => {
    fakeInstallations();
    await renderAdminApp('/apps', { labs });
    await expect.element(appsScreen.sidebarLink()).toBeVisible();
  });

  it('leaves Apps out of the sidebar without the apps flag', async () => {
    fakeTags([]);
    await renderAdminApp('/tags');
    await expect.element(page.getByTestId('admin-sidebar')).toBeVisible();
    await expect.element(appsScreen.sidebarLink()).not.toBeInTheDocument();
  });

  it('leaves Apps out of the sidebar for staff who can’t manage apps', async () => {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Editor' })];
    fakeTags([]);

    await renderAdminApp('/tags', { labs, boot: { browseMe: { response: me } } });

    await expect.element(page.getByTestId('admin-sidebar')).toBeVisible();
    await expect.element(appsScreen.sidebarLink()).not.toBeInTheDocument();
  });

  it('opens an app’s details from the list', async () => {
    fakeInstallations([installation()]);
    fakeDetails(installation({ manifests: [manifestRow('m1', '2026-10-01T10:00:00.000Z')] }));

    await renderAdminApp('/apps', { labs });
    await appsScreen.row('Podcast').getByText('Publish episodes and embed players.').click();

    await expect.poll(currentRoute).toBe(DETAILS_ROUTE);
    await expect.element(appsScreen.details()).toHaveTextContent('Podcast');
  });

  it('shows who made the app, where it runs, who installed it, and its history', async () => {
    const moved = manifest({
      surfaces: [{ type: 'admin_page', url: 'https://podcast.example.net/admin' }],
    });
    const { actionsApi } = fakeDetails(
      installation({
        manifest: moved,
        manifests: [
          manifestRow('m3', '2026-10-03T10:00:00.000Z', {
            manifest: moved,
            requires_approval: true,
          }),
          manifestRow('m2', '2026-10-02T10:00:00.000Z', {
            manifest: manifest({ description: 'Episodes and players.' }),
          }),
          manifestRow('m1', '2026-10-01T10:00:00.000Z'),
        ],
      }),
      [
        action('a2', 'changes_approved', '2026-10-03T10:00:00.000Z', {
          from_manifest_id: 'm2',
          to_manifest_id: 'm3',
        }),
        action('a1', 'installed', '2026-10-01T10:00:00.000Z'),
      ],
    );

    await renderAdminApp(DETAILS_ROUTE, { labs });

    const details = appsScreen.details();
    await expect.element(details).toHaveTextContent('Example Audio');
    await expect.element(appsScreen.detailsServedFrom()).toHaveTextContent('podcast.example.net');
    await expect.element(details).toHaveTextContent('by Jamie Larson');
    await expect(appsScreen.historyEntries()).toHaveCount(3);
    await expect
      .element(appsScreen.historyEntries().nth(0))
      .toHaveTextContent('Moved to podcast.example.net by Jamie Larson');
    await expect.element(appsScreen.historyEntries().nth(1)).toHaveTextContent('Updated');
    await expect
      .element(appsScreen.historyEntries().nth(2))
      .toHaveTextContent('Installed by Jamie Larson');
    expect(new URL(actionsApi.requests[0].url).searchParams.get('filter')).toBe(
      "resource_type:app_installation+resource_id:'installation-1'",
    );
  });

  it('uninstalls an app from the list, after saying integration keys stay', async () => {
    const installations = fakeInstallations([installation()]);
    const uninstallApi = fakeAdminEndpoint('DELETE', '/apps/installations/installation-1/', () => {
      installations.set([]);
      return new Response(null, { status: 204 });
    });

    await renderAdminApp('/apps', { labs });
    await appsScreen.rowActions('Podcast').click();
    await appsScreen.menuItem('Uninstall').click();

    const dialog = appsScreen.uninstallDialog();
    await expect.element(dialog).toHaveTextContent('Uninstall Podcast?');
    await expect
      .element(appsScreen.integrationKeyNote())
      .toHaveTextContent('Settings › Integrations');
    await dialog.getByRole('button', { name: 'Uninstall' }).click();

    await expect.element(page.getByText('Podcast uninstalled')).toBeVisible();
    await expect.element(appsScreen.emptyState()).toBeVisible();
    expect(uninstallApi.requests).toHaveLength(1);
  });

  it('changes nothing when uninstalling is cancelled', async () => {
    fakeInstallations([installation()]);
    const uninstallApi = fakeUninstall();

    await renderAdminApp('/apps', { labs });
    await appsScreen.rowActions('Podcast').click();
    await appsScreen.menuItem('Uninstall').click();
    await appsScreen.cancelButton().click();

    await expect.element(appsScreen.uninstallDialog()).not.toBeInTheDocument();
    await expect(appsScreen.rows()).toHaveCount(1);
    expect(uninstallApi.requests).toHaveLength(0);
  });

  it('returns to Apps after uninstalling from an app’s details', async () => {
    const installations = fakeInstallations([installation()]);
    fakeDetails(installation({ manifests: [manifestRow('m1', '2026-10-01T10:00:00.000Z')] }));
    fakeAdminEndpoint('DELETE', '/apps/installations/installation-1/', () => {
      installations.set([]);
      return new Response(null, { status: 204 });
    });

    await renderAdminApp(DETAILS_ROUTE, { labs });
    await appsScreen.uninstallButton().click();
    await appsScreen.uninstallDialog().getByRole('button', { name: 'Uninstall' }).click();

    await expect.poll(currentRoute).toBe('/apps');
    await expect.element(appsScreen.emptyState()).toBeVisible();
  });

  it('keeps an app installed, and says so, when uninstalling fails', async () => {
    fakeInstallations([installation()]);
    fakeAdminEndpoint(
      'DELETE',
      '/apps/installations/installation-1/',
      () =>
        new Response(JSON.stringify({ errors: [{ message: 'Ghost is having a moment.' }] }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await renderAdminApp('/apps', { labs });
    await appsScreen.rowActions('Podcast').click();
    await appsScreen.menuItem('Uninstall').click();
    await appsScreen.uninstallDialog().getByRole('button', { name: 'Uninstall' }).click();

    await expect.element(page.getByText('Ghost is having a moment.')).toBeVisible();
    await expect.element(appsScreen.uninstallDialog()).toBeVisible();
  });

  it('marks an app waiting for approval, and leads to the review', async () => {
    const suspended = installation({
      status: 'suspended',
      manifests: [
        manifestRow('m2', '2026-10-02T10:00:00.000Z', { requires_approval: true }),
        manifestRow('m1', '2026-10-01T10:00:00.000Z'),
      ],
    });
    fakeInstallations([suspended]);
    fakeDetails(suspended);
    fakeReview();

    await renderAdminApp('/apps', { labs });
    await expect.element(appsScreen.row('Podcast')).toHaveTextContent('Needs approval');
    await appsScreen.row('Podcast').getByText('Publish episodes and embed players.').click();

    await expect
      .element(appsScreen.needsApproval())
      .toHaveTextContent('Podcast has been updated and needs additional permissions.');
    await expect
      .element(appsScreen.historyEntries().first())
      .toHaveTextContent('Updated, needs approval');
    await appsScreen.reviewChangesButton().click();

    await expect
      .poll(currentRoute)
      .toBe(`/apps/install?manifest=${encodeURIComponent(MANIFEST_URL)}`);
    await expect.element(appsScreen.approveChangesButton()).toBeVisible();
  });

  it('can review changes from the list too', async () => {
    fakeInstallations([installation({ status: 'suspended' })]);
    const reviewApi = fakeReview();

    await renderAdminApp('/apps', { labs });
    await appsScreen.rowActions('Podcast').click();
    await appsScreen.menuItem('Review changes').click();

    await expect
      .poll(currentRoute)
      .toBe(`/apps/install?manifest=${encodeURIComponent(MANIFEST_URL)}`);
    await expect.element(appsScreen.approveChangesButton()).toBeVisible();
    expect(reviewApi.requests[0].body).toEqual({
      app_installation_previews: [{ manifest_url: MANIFEST_URL }],
    });
  });

  it('shows an uninstalled app’s record without offering to uninstall it again', async () => {
    fakeDetails(
      installation({
        status: 'uninstalled',
        manifests: [manifestRow('m1', '2026-10-01T10:00:00.000Z')],
      }),
      [
        action('a2', 'uninstalled', '2026-10-02T10:00:00.000Z'),
        action('a1', 'installed', '2026-10-01T10:00:00.000Z'),
      ],
    );

    await renderAdminApp(DETAILS_ROUTE, { labs });

    await expect.element(appsScreen.details()).toHaveTextContent('Uninstalled');
    await expect
      .element(appsScreen.historyEntries().first())
      .toHaveTextContent('Uninstalled by Jamie Larson');
    await expect.element(appsScreen.uninstallButton()).not.toBeInTheDocument();
  });

  it('says when an app doesn’t exist', async () => {
    fakeAdminEndpoint(
      'GET',
      readPath('missing'),
      () =>
        new Response(JSON.stringify({ errors: [{ message: 'App installation not found.' }] }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await renderAdminApp('/apps/details/missing', { labs });

    await expect.element(page.getByText('Page not found')).toBeVisible();
  });
});

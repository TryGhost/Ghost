import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type {
  AppInstallation,
  AppInstallationHistoryEntry,
} from '@tryghost/admin-x-framework/api/app-installations';
import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeTags,
  renderAdminApp,
  siteResponse,
  staffRole,
} from '@test-utils/acceptance';
import { APP_FRAME_SANDBOX, appFrameTimeouts } from './lib/frame';
import { appsScreen } from './apps.screen';
import {
  APP_PAGE_URL,
  ICON_SVG,
  ICON_URL,
  MANIFEST_URL,
  STORED_ICON,
  failAppFrame,
  fakeAppFrame,
  fakeAppPage,
  fakeInstallations,
  imageSources,
  installation,
  labs,
  manifest,
  readPath,
} from './apps.test-utils';

const DETAILS_ROUTE = '/apps/details/installation-1';
const APP_ROUTE = '/apps/installation-1';

const jamie = { id: 'user-1', name: 'Jamie Larson' };

const entry = (
  id: string,
  event: AppInstallationHistoryEntry['event'],
  createdAt: string,
  overrides: Partial<AppInstallationHistoryEntry> = {},
): AppInstallationHistoryEntry => ({
  id,
  event,
  actor: event === 'updated' || event === 'suspended' ? null : jamie,
  created_at: createdAt,
  ...overrides,
});

const installedOn = (createdAt: string) => entry('h1', 'installed', createdAt);

const fakeDetails = (read: AppInstallation) =>
  fakeAdminEndpoint('GET', readPath(read.id), () => ({ app_installations: [read] }));

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
          revision: 0,
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

  it('opens an app from the list, in a sandboxed frame from the app’s own URL', async () => {
    fakeInstallations([installation()]);
    await fakeAppPage(installation());

    await renderAdminApp('/apps', { labs });
    await appsScreen.row('Podcast').getByText('Publish episodes and embed players.').click();

    await expect.poll(currentRoute).toBe(APP_ROUTE);
    const frame = appsScreen.frame();
    await expect.element(frame).toHaveAttribute('src', APP_PAGE_URL);
    await expect.element(frame).toHaveAttribute('sandbox', APP_FRAME_SANDBOX);
    await expect.element(frame).toHaveAttribute('allow', expect.stringContaining("camera 'none'"));
    // On for every origin unless refused, so the frame must say so.
    await expect
      .element(frame)
      .toHaveAttribute('allow', expect.stringContaining("browsing-topics 'none'"));
    await expect
      .element(frame)
      .toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    await expect.element(frame).toBeVisible();
  });

  it('opens an app’s details from the row’s menu, and the app from its details', async () => {
    fakeInstallations([installation()]);
    fakeDetails(installation({ history: [installedOn('2026-10-01T10:00:00.000Z')] }));
    await fakeAppFrame();

    await renderAdminApp('/apps', { labs });
    await appsScreen.rowActions('Podcast').click();
    await appsScreen.detailsMenuItem().click();

    await expect.poll(currentRoute).toBe(DETAILS_ROUTE);
    await expect.element(appsScreen.details()).toHaveTextContent('Podcast');
    await appsScreen.openLink().click();

    await expect.poll(currentRoute).toBe(APP_ROUTE);
    await expect.element(appsScreen.frame()).toBeVisible();
  });

  it('calls an app unresponsive when its page doesn’t load in time, and tries again', async () => {
    fakeInstallations();
    fakeDetails(installation());
    const previous = appFrameTimeouts.ready;
    appFrameTimeouts.ready = 300;
    try {
      // A page that takes longer than Admin waits.
      await fakeAppFrame({ delayMs: 5_000 });
      await renderAdminApp(APP_ROUTE, { labs });

      await expect
        .element(appsScreen.notResponding())
        .toHaveTextContent('Podcast isn’t responding');
      await expect.element(appsScreen.frame()).not.toBeInTheDocument();

      // The retry gets the usual time, so a slow runner can't fail it.
      appFrameTimeouts.ready = previous;
      await fakeAppFrame();
      await appsScreen.tryAgainButton().click();

      await expect.element(appsScreen.frame()).toBeVisible();
    } finally {
      appFrameTimeouts.ready = previous;
    }
  });

  it('keeps a loading frame hidden until its page has loaded', async () => {
    fakeInstallations();
    await fakeAppPage(installation());
    await fakeAppFrame({ delayMs: 600 });

    await renderAdminApp(APP_ROUTE, { labs });

    // In the document, so it loads, but out of sight and reach while it does.
    const frame = appsScreen.frame();
    await expect.element(frame).toBeInTheDocument();
    await expect.element(frame).toHaveAttribute('aria-hidden', 'true');
    await expect.element(frame).not.toBeVisible();

    await expect.element(frame).toBeVisible();
    await expect.element(frame).toHaveAttribute('aria-hidden', 'false');
  });

  it('leaves a loaded app alone once the time it had to load is up', async () => {
    fakeInstallations();
    const previous = appFrameTimeouts.ready;
    // Short, so the spec doesn't wait long for it to pass, but with room for the frame and
    // the probe to finish first on a slow runner.
    appFrameTimeouts.ready = 1_000;
    try {
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1_200);
      });

      await expect.element(appsScreen.frame()).toBeVisible();
      await expect.element(appsScreen.notResponding()).not.toBeInTheDocument();
    } finally {
      appFrameTimeouts.ready = previous;
    }
  });

  // TODO(BER-3983): rests on the probe. With the bridge, a server that can't be reached is a
  // handshake that never comes, so this becomes a timeout and the spec changes with it.
  it('calls an app unresponsive straight away when its server can’t be reached', async () => {
    fakeInstallations();
    fakeAdminEndpoint('GET', readPath('installation-1'), () => ({
      app_installations: [installation()],
    }));
    await failAppFrame();

    // Well within the time Admin would otherwise wait for the frame.
    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(appsScreen.notResponding()).toHaveTextContent('Podcast isn’t responding');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
  });

  it('refuses to frame an app whose page is on Admin’s own address', async () => {
    fakeInstallations();
    // Accepted before Admin moved here, say. Nothing of it loads: no frame, no page fetch.
    const onAdmin = manifest({
      surfaces: [{ type: 'admin_page', url: `${window.location.origin}/ghost/app/` }],
    });
    fakeAdminEndpoint('GET', readPath('installation-1'), () => ({
      app_installations: [installation({ manifest: onAdmin })],
    }));

    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(appsScreen.notFramed()).toHaveTextContent('Podcast can’t open here');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
  });

  it('refuses to frame an app whose page is on the site’s address', async () => {
    fakeInstallations();
    // Admin isn't necessarily served from the site's address, so that one is read.
    const site = siteResponse();
    site.site.url = 'https://blog.example.com/';
    const onSite = manifest({
      surfaces: [{ type: 'admin_page', url: 'https://blog.example.com/app/' }],
    });
    fakeAdminEndpoint('GET', readPath('installation-1'), () => ({
      app_installations: [installation({ manifest: onSite })],
    }));

    await renderAdminApp(APP_ROUTE, { labs, boot: { browseSite: { response: site } } });

    await expect.element(appsScreen.notFramed()).toBeVisible();
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
  });

  it('sends staff who can’t manage apps away from an app’s page, without reading it', async () => {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Editor' })];

    // No installation is faked: a request to read it would fail the test.
    await renderAdminApp(APP_ROUTE, { labs, boot: { browseMe: { response: me } } });

    await expect.poll(currentRoute).toBe('/site');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
  });

  it('doesn’t load a suspended app, and leads to the review instead', async () => {
    const suspended = installation({ status: 'suspended' });
    fakeInstallations([suspended]);
    fakeDetails(suspended);
    fakeReview();

    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(appsScreen.needsApproval()).toHaveTextContent('Podcast needs approval');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
    await appsScreen.reviewChangesButton().click();

    await expect
      .poll(currentRoute)
      .toBe(`/apps/install?manifest=${encodeURIComponent(MANIFEST_URL)}`);
  });

  it('doesn’t load an uninstalled app', async () => {
    fakeInstallations();
    fakeDetails(installation({ status: 'uninstalled' }));

    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(appsScreen.notInstalled()).toHaveTextContent('This app isn’t installed');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
  });

  it('says when an app page doesn’t exist', async () => {
    fakeInstallations();
    const id = 'abcdefabcdefabcdefabcdef';
    fakeAdminEndpoint(
      'GET',
      readPath(id),
      () =>
        new Response(JSON.stringify({ errors: [{ message: 'App installation not found.' }] }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await renderAdminApp(`/apps/${id}`, { labs });

    await expect.element(appsScreen.notInstalled()).toBeVisible();
  });

  it('says an app page address that isn’t an app’s doesn’t exist, rather than offering a retry', async () => {
    fakeInstallations();
    fakeAdminEndpoint(
      'GET',
      readPath('missing'),
      () =>
        new Response(
          JSON.stringify({ errors: [{ type: 'ValidationError', message: 'Validation error.' }] }),
          { status: 422, headers: { 'content-type': 'application/json' } },
        ),
    );

    await renderAdminApp('/apps/missing', { labs });

    await expect.element(appsScreen.notInstalled()).toBeVisible();
  });

  it('says an app page couldn’t load in its own words, not the API’s', async () => {
    fakeInstallations();
    fakeAdminEndpoint(
      'GET',
      readPath('installation-1'),
      () =>
        new Response(JSON.stringify({ errors: [{ message: 'Ghost is having a moment.' }] }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(page.getByText('Couldn’t load this app. Please try again.')).toBeVisible();
    await expect.element(page.getByText('Ghost is having a moment.')).not.toBeInTheDocument();
  });

  it('opens an app in a new tab from a modified click on its row', async () => {
    fakeInstallations([installation()]);
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    try {
      await renderAdminApp('/apps', { labs });
      await appsScreen
        .row('Podcast')
        .getByText('Publish episodes and embed players.')
        .click({ modifiers: ['ControlOrMeta'] });

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringMatching(/#\/apps\/installation-1$/),
        '_blank',
        'noopener',
      );
      await expect.poll(currentRoute).toBe('/apps');
    } finally {
      openSpy.mockRestore();
    }
  });

  it('shows who made the app, where it runs, who installed it, and its history', async () => {
    fakeInstallations();
    const moved = manifest({
      surfaces: [{ type: 'admin_page', url: 'https://podcast.example.net/admin' }],
    });
    const readApi = fakeDetails(
      installation({
        manifest: moved,
        history: [
          entry('h3', 'changes_approved', '2026-10-03T10:00:00.000Z', {
            moved_to: 'podcast.example.net',
          }),
          entry('h2', 'updated', '2026-10-02T10:00:00.000Z'),
          installedOn('2026-10-01T10:00:00.000Z'),
        ],
      }),
    );

    await renderAdminApp(DETAILS_ROUTE, { labs });

    const details = appsScreen.details();
    await expect.element(details).toHaveTextContent('Example Audio');
    await expect
      .element(appsScreen.capabilities().last())
      .toHaveTextContent('Read and write data to podcast.example.net');
    await expect.element(details).toHaveTextContent('by Jamie Larson');
    await expect(appsScreen.historyEntries()).toHaveCount(3);
    await expect
      .element(appsScreen.historyEntries().nth(0))
      .toHaveTextContent('Moved to podcast.example.net by Jamie Larson');
    await expect.element(appsScreen.historyEntries().nth(1)).toHaveTextContent('Updated');
    await expect
      .element(appsScreen.historyEntries().nth(2))
      .toHaveTextContent('Installed by Jamie Larson');
    expect(new URL(readApi.requests[0].url).searchParams.get('include')).toBe('history');
  });

  // Any request to the app's icon URL would also fail the test, as one the spec didn't fake.
  it('draws an app’s own icon from the copy Ghost stored, never from the app', async () => {
    const withIcon = installation({
      manifest: manifest({ icon: { url: ICON_URL } }),
      icon_svg: ICON_SVG,
    });
    fakeInstallations([withIcon]);
    fakeDetails(withIcon);

    await renderAdminApp('/apps', { labs });

    await expect.element(appsScreen.row('Podcast')).toBeVisible();
    const row = appsScreen.row('Podcast').element();
    expect(imageSources(row)).toEqual([STORED_ICON]);
    await expect.poll(() => row.querySelector('img')!.naturalWidth).toBeGreaterThan(0);
    expect(imageSources(appsScreen.sidebarApps().element())).toEqual([STORED_ICON]);

    await appsScreen.rowActions('Podcast').click();
    await appsScreen.detailsMenuItem().click();

    await expect.element(appsScreen.details()).toHaveTextContent('Example Audio');
    expect(imageSources(appsScreen.details().element())).toEqual([STORED_ICON]);
  });

  it('draws the default icon for an app’s own icon without a stored copy', async () => {
    fakeInstallations([installation({ manifest: manifest({ icon: { url: ICON_URL } }) })]);

    await renderAdminApp('/apps', { labs });

    await expect.element(appsScreen.row('Podcast')).toBeVisible();
    const row = appsScreen.row('Podcast').element();
    expect(imageSources(row)).toEqual([]);
    expect(row.querySelector('svg.lucide-app-window')).not.toBeNull();
    expect(imageSources(appsScreen.sidebarApps().element())).toEqual([]);
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
    fakeDetails(installation({ history: [installedOn('2026-10-01T10:00:00.000Z')] }));
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

  it('keeps the dialog open while uninstalling, even on Escape', async () => {
    fakeInstallations([installation()]);
    let respond: (response: Response) => void = () => {};
    fakeAdminEndpoint(
      'DELETE',
      '/apps/installations/installation-1/',
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
    );

    await renderAdminApp('/apps', { labs });
    await appsScreen.rowActions('Podcast').click();
    await appsScreen.menuItem('Uninstall').click();
    await appsScreen.uninstallDialog().getByRole('button', { name: 'Uninstall' }).click();
    await userEvent.keyboard('{Escape}');

    await expect.element(appsScreen.uninstallDialog()).toBeVisible();
    respond(new Response(null, { status: 204 }));
    await expect.element(appsScreen.uninstallDialog()).not.toBeInTheDocument();
  });

  it('marks an app waiting for approval, and leads to the review', async () => {
    const suspended = installation({
      status: 'suspended',
      history: [
        entry('h2', 'suspended', '2026-10-02T10:00:00.000Z'),
        installedOn('2026-10-01T10:00:00.000Z'),
      ],
    });
    fakeInstallations([suspended]);
    fakeDetails(suspended);
    fakeReview();

    await renderAdminApp('/apps', { labs });
    await expect
      .element(appsScreen.row('Podcast').getByTestId('app-needs-approval-badge'))
      .toHaveTextContent('Needs approval');
    await appsScreen.rowActions('Podcast').click();
    await appsScreen.detailsMenuItem().click();

    await expect
      .element(appsScreen.needsApproval())
      .toHaveTextContent('Podcast has been updated, and the changes need your approval.');
    await expect
      .element(appsScreen.historyEntries().first())
      .toHaveTextContent('Updated, needs approval');
    await appsScreen.reviewChangesLink().click();

    await expect
      .poll(currentRoute)
      .toBe(`/apps/install?manifest=${encodeURIComponent(MANIFEST_URL)}`);
    await expect.element(appsScreen.approveChangesButton()).toBeVisible();
  });

  it('can review changes from the list too', async () => {
    fakeInstallations([installation({ status: 'suspended' })]);
    const reviewApi = fakeReview();

    await renderAdminApp('/apps', { labs });
    await appsScreen.row('Podcast').getByRole('link', { name: 'Review changes' }).click();

    await expect
      .poll(currentRoute)
      .toBe(`/apps/install?manifest=${encodeURIComponent(MANIFEST_URL)}`);
    await expect.element(appsScreen.approveChangesButton()).toBeVisible();
    expect(reviewApi.requests[0].body).toEqual({
      app_installation_previews: [{ manifest_url: MANIFEST_URL }],
    });
  });

  it('shows an uninstalled app’s record without offering to uninstall it again', async () => {
    fakeInstallations();
    fakeDetails(
      installation({
        status: 'uninstalled',
        history: [
          entry('h2', 'uninstalled', '2026-10-02T10:00:00.000Z'),
          installedOn('2026-10-01T10:00:00.000Z'),
        ],
      }),
    );

    await renderAdminApp(DETAILS_ROUTE, { labs });

    await expect.element(appsScreen.details()).toHaveTextContent('Uninstalled');
    await expect
      .element(appsScreen.historyEntries().first())
      .toHaveTextContent('Uninstalled by Jamie Larson');
    await expect.element(appsScreen.uninstallButton()).not.toBeInTheDocument();
  });

  it('says when an app doesn’t exist', async () => {
    fakeInstallations();
    const id = 'abcdefabcdefabcdefabcdef';
    fakeAdminEndpoint(
      'GET',
      readPath(id),
      () =>
        new Response(JSON.stringify({ errors: [{ message: 'App installation not found.' }] }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await renderAdminApp(`/apps/details/${id}`, { labs });

    await expect.element(page.getByText('Page not found')).toBeVisible();
  });

  it('says an address that isn’t an app’s doesn’t exist, rather than offering a retry', async () => {
    fakeInstallations();
    fakeAdminEndpoint(
      'GET',
      readPath('missing'),
      () =>
        new Response(
          JSON.stringify({ errors: [{ type: 'ValidationError', message: 'Validation error.' }] }),
          { status: 422, headers: { 'content-type': 'application/json' } },
        ),
    );

    await renderAdminApp('/apps/details/missing', { labs });

    await expect.element(page.getByText('Page not found')).toBeVisible();
  });
});

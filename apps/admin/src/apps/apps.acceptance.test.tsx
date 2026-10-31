import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type {
  AppInstallation,
  AppInstallationHistoryEntry,
} from '@tryghost/admin-x-framework/api/app-installations';
import {
  type AppFrameResult,
  allowUnhandledRequests,
  callAppFrame,
  callHostRaw,
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeFrameOrigin,
  fakeTags,
  holdModuleLoads,
  postFrameForm,
  reloadFrame,
  renderAdminApp,
  settingsResponse,
  siteResponse,
  staffRole,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { APP_FRAME_SANDBOX, appFrameTimeouts } from './lib/frame';
import { appsScreen } from './apps.screen';
import {
  APP_ORIGIN,
  APP_PAGE_URL,
  ICON_DATA_URL,
  ICON_URL,
  MANIFEST_URL,
  failAppFrame,
  fakeAppFrame,
  fakeAppPage,
  fakeInstallations,
  fakeSessionStart,
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

const apiError = (status: number, message: string, code?: string) =>
  new Response(JSON.stringify({ errors: [{ message, ...(code ? { code } : {}) }] }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** What Ghost returns for a request to an Admin API route it doesn't have. */
const routeNotFound = () =>
  new Response(
    JSON.stringify({
      errors: [
        {
          message: 'Resource not found',
          context: null,
          type: 'NotFoundError',
          details: null,
          property: null,
          help: null,
          code: null,
          id: 'b1e2c3d4-0000-4000-8000-000000000000',
          ghostErrorCode: null,
        },
      ],
    }),
    { status: 404, headers: { 'content-type': 'application/json' } },
  );

/**
 * Sets `appFrameTimeouts.ready` to `ms` while `run` runs, or until `run` calls `restore` to give
 * the rest of the spec the usual timeout.
 */
async function withReadyTimeout(ms: number, run: (restore: () => void) => Promise<void>) {
  const previous = appFrameTimeouts.ready;
  const restore = () => {
    appFrameTimeouts.ready = previous;
  };
  appFrameTimeouts.ready = ms;
  try {
    await run(restore);
  } finally {
    restore();
  }
}

/** The app page's current state, read from inside its frame. */
const appState = () => callAppFrame(APP_ORIGIN, 'state');

/**
 * The error a call from the app's page was refused with, or the value it returned if it wasn't
 * refused.
 */
const refusal = (result: AppFrameResult<unknown>) =>
  'error' in result ? result.error : `answered ${JSON.stringify(result.value)}`;

/** The value a call from the app's page returned. Fails the spec if the call was refused. */
function answer<Value>(result: AppFrameResult<Value>): Value {
  if ('error' in result) {
    throw new Error(`Refused: ${result.error}`);
  }
  return result.value;
}

const fakeUninstall = (id = 'installation-1') =>
  fakeAdminEndpoint(
    'DELETE',
    `/apps/installations/${id}/`,
    () => new Response(null, { status: 204 }),
  );

describe('Managing apps', () => {
  // The sidebar lists the installed apps on every screen. Specs that need installed apps fake their
  // own.
  beforeEach(() => {
    fakeInstallations();
  });

  it('adds Apps to the sidebar for Administrators, only with the apps flag', async () => {
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
    const { sessionsApi, readApi } = await fakeAppPage(installation());

    await renderAdminApp('/apps', { labs });
    await appsScreen.row('Podcast').getByText('Publish episodes and embed players.').click();

    await expect.poll(currentRoute).toBe(APP_ROUTE);
    const frame = appsScreen.frame();
    await expect.element(frame).toBeVisible();
    // Opening the page starts a session, which re-checks the app before any of it loads and returns
    // the installation. Nothing else is read to open the app.
    expect(sessionsApi.requests).toHaveLength(1);
    expect(readApi.requests).toHaveLength(0);
    await expect.element(frame).toHaveAttribute('src', APP_PAGE_URL);
    await expect.element(frame).toHaveAttribute('sandbox', APP_FRAME_SANDBOX);
    // Popups stay sandboxed, so one can't navigate Admin's tab, and neither can the frame.
    expect(APP_FRAME_SANDBOX.split(' ').sort()).toEqual([
      'allow-downloads',
      'allow-forms',
      'allow-popups',
      'allow-same-origin',
      'allow-scripts',
    ]);
    await expect.element(frame).toHaveAttribute('allow', expect.stringContaining("camera 'none'"));
    // On for every origin unless refused, so the frame must say so.
    await expect
      .element(frame)
      .toHaveAttribute('allow', expect.stringContaining("browsing-topics 'none'"));
    await expect
      .element(frame)
      .toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  });

  it('lets the app’s page open the share sheet, but not a page on another origin it goes to', async () => {
    const elsewhere = 'https://elsewhere.example';
    await fakeAppPage(installation());
    await fakeFrameOrigin(
      elsewhere,
      '<!doctype html><script>window.__app = { canShare: () => navigator.canShare({ url: location.href }) };</script>',
    );

    await renderAdminApp(APP_ROUTE, { labs });
    await expect.element(appsScreen.frame()).toBeVisible();
    expect(await callAppFrame(APP_ORIGIN, 'canShare')).toBe(true);

    await callAppFrame(APP_ORIGIN, 'followLink', `${elsewhere}/page`);
    // Retried until the page there has loaded.
    await expect.poll(() => callAppFrame(elsewhere, 'canShare').catch(() => undefined)).toBe(false);
  });

  it('opens an app’s details from the row’s menu, and the app from its details', async () => {
    fakeInstallations([installation()]);
    await fakeAppPage(installation({ history: [installedOn('2026-10-01T10:00:00.000Z')] }));

    await renderAdminApp('/apps', { labs });
    await appsScreen.rowActions('Podcast').click();
    await appsScreen.detailsMenuItem().click();

    await expect.poll(currentRoute).toBe(DETAILS_ROUTE);
    await expect.element(appsScreen.details()).toHaveTextContent('Podcast');
    await appsScreen.openLink().click();

    await expect.poll(currentRoute).toBe(APP_ROUTE);
    await expect.element(appsScreen.frame()).toBeVisible();
  });

  it('starts the app with the site, the staff user, the theme and its own route', async () => {
    await fakeAppPage(installation({ revision: 3 }));

    await renderAdminApp(`${APP_ROUTE}/episodes/12?tab=notes`, { labs });
    await expect.element(appsScreen.frame()).toBeVisible();

    const { site } = siteResponse();
    const [me] = currentUserResponse().users;
    const setting = (key: string) =>
      settingsResponse().settings.find((candidate) => candidate.key === key)?.value;
    const { context } = await appState();
    expect(context).toEqual({
      site: {
        url: site.url,
        title: site.title,
        timezone: setting('timezone'),
        locale: site.locale,
      },
      // The signed-in Owner, by ID and role only: no name, no email.
      user: { id: me.id, role: 'Owner' },
      theme: { mode: 'light', accent_color: setting('accent_color') },
      session: { revision: 3 },
      path: '/episodes/12?tab=notes',
    });
  });

  it('keeps the frame hidden until the app has started', async () => {
    // The page loads at once, but takes a while to start.
    await fakeAppPage(installation(), { flags: { connectDelayMs: 600 } });

    await renderAdminApp(APP_ROUTE, { labs });

    // The frame is in the document so it loads, but hidden and unreachable while the app starts.
    const frame = appsScreen.frame();
    await expect.element(frame).toBeInTheDocument();
    await expect.element(frame).toHaveAttribute('aria-hidden', 'true');
    await expect.element(frame).not.toBeVisible();

    await expect.element(frame).toBeVisible();
    await expect.element(frame).toHaveAttribute('aria-hidden', 'false');
  });

  it('shows an app as unresponsive when it never sends a hello, and tries again', async () => {
    await withReadyTimeout(300, async (restore) => {
      const { sessionsApi } = await fakeAppPage(installation(), { flags: { silent: true } });
      await renderAdminApp(APP_ROUTE, { labs });

      await expect
        .element(appsScreen.notResponding())
        .toHaveTextContent('Podcast isn’t responding');
      await expect.element(appsScreen.frame()).not.toBeInTheDocument();

      // The retry gets the usual time, so a slow runner can't fail it.
      restore();
      await fakeAppFrame();
      await appsScreen.tryAgainButton().click();

      await expect.element(appsScreen.frame()).toBeVisible();
      // Trying again reloads the page within the same session.
      expect(sessionsApi.requests).toHaveLength(1);
    });
  });

  it('shows an app as unresponsive when its server can’t be reached', async () => {
    await withReadyTimeout(300, async () => {
      await fakeAppPage(installation());
      // A server that can't be reached means the hello never arrives.
      await failAppFrame();

      await renderAdminApp(APP_ROUTE, { labs });

      await expect
        .element(appsScreen.notResponding())
        .toHaveTextContent('Podcast isn’t responding');
      await expect.element(appsScreen.frame()).not.toBeInTheDocument();
    });
  });

  it('keeps a started app open after the start timeout passes', async () => {
    // Short, so the spec doesn't wait long for the timeout, but long enough for the app to start
    // first on a slow runner.
    await withReadyTimeout(1_000, async () => {
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1_200);
      });

      await expect.element(appsScreen.frame()).toBeVisible();
      await expect.element(appsScreen.notResponding()).not.toBeInTheDocument();
    });
  });

  it('refuses to frame an app whose page is on Admin’s own address', async () => {
    // Accepted before Admin moved here, say. Nothing of it loads: no frame, no page fetch.
    const onAdmin = manifest({
      surfaces: [{ type: 'admin_page', url: `${window.location.origin}/ghost/app/` }],
    });
    fakeSessionStart('installation-1', installation({ manifest: onAdmin }));

    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(appsScreen.notFramed()).toHaveTextContent('Podcast can’t open here');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
  });

  it('refuses to frame an app whose page is on the site’s address', async () => {
    // Admin isn't necessarily served from the site's address, so that one is read.
    const site = siteResponse();
    site.site.url = 'https://blog.example.com/';
    const onSite = manifest({
      surfaces: [{ type: 'admin_page', url: 'https://blog.example.com/app/' }],
    });
    fakeSessionStart('installation-1', installation({ manifest: onSite }));

    await renderAdminApp(APP_ROUTE, { labs, boot: { browseSite: { response: site } } });

    await expect.element(appsScreen.notFramed()).toBeVisible();
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
  });

  it('sends staff who can’t manage apps away from an app’s page, without reading it', async () => {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Editor' })];

    // No session is faked: a request to start one would fail the test.
    await renderAdminApp(APP_ROUTE, { labs, boot: { browseMe: { response: me } } });

    await expect.poll(currentRoute).toBe('/site');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
  });

  it('opens the review over a suspended app, and loads the app once approved', async () => {
    const suspended = installation({ status: 'suspended', revision: 1 });
    fakeInstallations([suspended]);
    const { sessionsApi, set } = await fakeAppPage(suspended);
    fakeReview();
    const approved = installation({ manifest: manifest({ name: 'Podcasts' }), revision: 2 });
    const approveApi = fakeAdminEndpoint('PUT', '/apps/installations/installation-1/', () => {
      set(approved);
      return { app_installations: [approved] };
    });

    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(appsScreen.needsApproval()).toHaveTextContent('Podcast needs approval');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
    // The review opens straight away, in place of the app, and the URL stays on the app's route.
    await expect.element(appsScreen.approveChangesButton()).toBeVisible();
    expect(currentRoute()).toBe(APP_ROUTE);

    // Closing it leaves the page explaining why, with a button to reopen the review.
    await appsScreen.cancelButton().click();
    await expect.element(appsScreen.installDialog()).not.toBeInTheDocument();
    await appsScreen.reviewChangesButton().click();
    await appsScreen.approveChangesButton().click();

    await expect.element(page.getByText('Changes to Podcasts approved')).toBeVisible();
    await expect.element(appsScreen.frame()).toBeVisible();
    expect(currentRoute()).toBe(APP_ROUTE);
    expect(approveApi.requests).toHaveLength(1);
    // Approving starts a new session, pinned to the approved revision.
    expect(sessionsApi.requests).toHaveLength(2);
    expect((await appState()).context?.session).toEqual({ revision: 2 });
  });

  it('loads a suspended app once the review finds its changes already approved', async () => {
    const suspended = installation({ status: 'suspended', revision: 1 });
    const { sessionsApi } = await fakeAppPage(suspended);
    // Approved in another tab in the meantime, so the review has nothing left to approve.
    const approved = installation({ revision: 2 });
    fakeAdminEndpoint('POST', '/apps/installations/preview/', {
      app_installation_previews: [
        {
          manifest_url: MANIFEST_URL,
          manifest: manifest(),
          digest: 'digest-2',
          installation: {
            id: 'installation-1',
            status: 'active',
            revision: 2,
            manifest_url: MANIFEST_URL,
            manifest: manifest(),
            changes: [],
          },
        },
      ],
    });

    await renderAdminApp(APP_ROUTE, { labs });
    await expect.element(appsScreen.needsApproval()).toBeVisible();
    sessionsApi.set(approved);

    await expect
      .element(appsScreen.installDialog())
      .toHaveTextContent('Podcast is already installed');
    await appsScreen.doneButton().click();

    await expect.element(appsScreen.frame()).toBeVisible();
    expect(currentRoute()).toBe(APP_ROUTE);
    expect(sessionsApi.requests).toHaveLength(2);
    expect((await appState()).context?.session).toEqual({ revision: 2 });
  });

  it('opens the new installation when the review reinstalls an app uninstalled in the meantime', async () => {
    const suspended = installation({ status: 'suspended', revision: 1 });
    const { sessionsApi } = await fakeAppPage(suspended);
    // Uninstalled in another tab in the meantime, so the review offers a fresh install.
    fakeAdminEndpoint('POST', '/apps/installations/preview/', {
      app_installation_previews: [
        { manifest_url: MANIFEST_URL, manifest: manifest(), digest: 'digest-2' },
      ],
    });
    const reinstalled = installation({ id: 'installation-2' });
    fakeAdminEndpoint('POST', '/apps/installations/', { app_installations: [reinstalled] });
    const reinstalledSessionsApi = fakeSessionStart('installation-2', reinstalled);

    await renderAdminApp(APP_ROUTE, { labs });
    await expect.element(appsScreen.needsApproval()).toBeVisible();
    await appsScreen.installButton().click();

    await expect.poll(currentRoute).toBe('/apps/installation-2');
    await expect.element(appsScreen.frame()).toBeVisible();
    expect(sessionsApi.requests).toHaveLength(1);
    expect(reinstalledSessionsApi.requests).toHaveLength(1);
  });

  it('opens the active installation when the review finds the app reinstalled in the meantime', async () => {
    const suspended = installation({ status: 'suspended', revision: 1 });
    const { sessionsApi } = await fakeAppPage(suspended);
    // Uninstalled and installed again in another tab: the review finds the new installation.
    fakeAdminEndpoint('POST', '/apps/installations/preview/', {
      app_installation_previews: [
        {
          manifest_url: MANIFEST_URL,
          manifest: manifest(),
          digest: 'digest-2',
          installation: {
            id: 'installation-2',
            status: 'active',
            revision: 0,
            manifest_url: MANIFEST_URL,
            manifest: manifest(),
            changes: [],
          },
        },
      ],
    });
    const reinstalledSessionsApi = fakeSessionStart(
      'installation-2',
      installation({ id: 'installation-2' }),
    );

    await renderAdminApp(APP_ROUTE, { labs });
    await expect
      .element(appsScreen.installDialog())
      .toHaveTextContent('Podcast is already installed');
    await appsScreen.doneButton().click();

    await expect.poll(currentRoute).toBe('/apps/installation-2');
    await expect.element(appsScreen.frame()).toBeVisible();
    expect(sessionsApi.requests).toHaveLength(1);
    expect(reinstalledSessionsApi.requests).toHaveLength(1);
  });

  it('doesn’t load an uninstalled app on a Ghost version without app sessions', async () => {
    // A current Ghost refuses to start a session of an uninstalled app, as the next spec shows. A
    // Ghost from before app sessions returns a plain 404 to the session start, and returns the app
    // to the read.
    const older = installation({ status: 'uninstalled' });
    delete older.revision;
    fakeSessionStart('installation-1', routeNotFound());
    const readApi = fakeAdminEndpoint('GET', readPath('installation-1'), {
      app_installations: [older],
    });

    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(appsScreen.notInstalled()).toHaveTextContent('This app isn’t installed');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
    expect(readApi.requests).toHaveLength(1);
  });

  it('says the app isn’t installed when it was uninstalled or never installed', async () => {
    const id = 'abcdefabcdefabcdefabcdef';
    fakeSessionStart(id, apiError(404, 'This app is not installed.', 'APP_NOT_INSTALLED'));

    await renderAdminApp(`/apps/${id}`, { labs });

    await expect.element(appsScreen.notInstalled()).toBeVisible();
  });

  it('says an app is unavailable when Ghost can’t use its manifest, and opens it once it can', async () => {
    fakeInstallations([installation()]);
    const { sessionsApi } = await fakeAppPage(installation());
    sessionsApi.set(apiError(409, 'This app is unavailable.', 'APP_UNAVAILABLE'));

    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(appsScreen.unavailable()).toHaveTextContent('Podcast isn’t available');
    await expect.element(appsScreen.unavailable()).toHaveTextContent('podcast.example.com');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();

    sessionsApi.set(installation());
    await page.getByRole('button', { name: 'Try again' }).click();

    await expect.element(appsScreen.frame()).toBeVisible();
    expect(sessionsApi.requests).toHaveLength(2);
  });

  it('says an app page address that isn’t an app’s doesn’t exist, rather than offering a retry', async () => {
    fakeSessionStart(
      'missing',
      new Response(
        JSON.stringify({ errors: [{ type: 'ValidationError', message: 'Validation error.' }] }),
        { status: 422, headers: { 'content-type': 'application/json' } },
      ),
    );

    await renderAdminApp('/apps/missing', { labs });

    await expect.element(appsScreen.notInstalled()).toBeVisible();
  });

  it('shows Admin’s own message, not the API’s, when an app page can’t load, and retries', async () => {
    const { sessionsApi } = await fakeAppPage(installation());
    sessionsApi.set(apiError(500, 'Ghost is having a moment.'));

    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(page.getByText('Couldn’t load this app. Please try again.')).toBeVisible();
    await expect.element(page.getByText('Ghost is having a moment.')).not.toBeInTheDocument();
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();

    sessionsApi.set(installation());
    await page.getByRole('button', { name: 'Retry' }).click();

    await expect.element(appsScreen.frame()).toBeVisible();
    expect(sessionsApi.requests).toHaveLength(2);
  });

  it('opens an app without a re-check on a Ghost version without app sessions', async () => {
    // Admin and Core deploy independently. A Ghost from before app sessions returns a plain 404
    // when Admin starts a session, and its installations have no revision.
    const older = installation();
    delete older.revision;
    const { sessionsApi, readApi, set } = await fakeAppPage(installation());
    set(older);
    sessionsApi.set(routeNotFound());

    const { queryClient } = await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(appsScreen.frame()).toBeVisible();
    expect((await appState()).context?.session).toEqual({ revision: 0 });
    expect(sessionsApi.requests).toHaveLength(1);
    // The installation is read once to open the app, without a re-check. It isn't read again to
    // detect the session's end, even when the publisher comes back to the tab, because a missing
    // revision never changes.
    window.dispatchEvent(new Event('visibilitychange'));
    await expect.poll(() => queryClient.isFetching()).toBe(0);
    expect(readApi.requests).toHaveLength(1);
  });

  it('ends the session when the installation’s revision increases, and starts a new one', async () => {
    const { sessionsApi, readApi, set } = await fakeAppPage(installation());
    await renderAdminApp(APP_ROUTE, { labs });
    await expect.element(appsScreen.frame()).toBeVisible();
    expect((await appState()).context?.session).toEqual({ revision: 0 });
    expect(readApi.requests).toHaveLength(0);

    // Changed while the publisher was away from the tab. The tab reads it again when they return.
    set(installation({ revision: 1, manifest: manifest({ description: 'Episodes.' }) }));
    // Changed again before the next session starts, so the read the previous session left in the
    // cache shows a lower revision than the new session's.
    sessionsApi.set(installation({ revision: 2 }));
    window.dispatchEvent(new Event('visibilitychange'));

    await expect.poll(() => sessionsApi.requests.length).toBe(2);
    await expect.element(appsScreen.frame()).toBeVisible();
    await expect.poll(async () => (await appState()).context?.session).toEqual({ revision: 2 });
    // The previous session's read doesn't end the new session, and the new session reads nothing to
    // start.
    expect(sessionsApi.requests).toHaveLength(2);
    expect(readApi.requests).toHaveLength(1);
  });

  it('doesn’t end the session when a read shows a lower revision', async () => {
    // This happens when a read is sent before the session starts and its response arrives after.
    const { sessionsApi, readApi } = await fakeAppPage(installation({ revision: 1 }));
    sessionsApi.set(installation({ revision: 2 }));
    const { queryClient } = await renderAdminApp(APP_ROUTE, { labs });
    await expect.element(appsScreen.frame()).toBeVisible();

    window.dispatchEvent(new Event('visibilitychange'));
    await expect.poll(() => readApi.requests.length).toBe(1);
    await expect.poll(() => queryClient.isFetching()).toBe(0);

    expect(sessionsApi.requests).toHaveLength(1);
    expect((await appState()).context?.session).toEqual({ revision: 2 });
    await expect.element(appsScreen.frame()).toBeVisible();
  });

  it('restarts the app in place when its page reloads itself', async () => {
    const { sessionsApi } = await fakeAppPage(installation());
    await renderAdminApp(APP_ROUTE, { labs });
    await expect.element(appsScreen.frame()).toBeVisible();
    const frame = appsScreen.frame().element();
    answer(await callAppFrame(APP_ORIGIN, 'navigate', '/episodes/12'));
    await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/12`);
    expect((await appState()).context?.path).toBe('/admin');

    // The old document's channel is gone with it, and the new document's SDK sends a hello.
    await reloadFrame(APP_ORIGIN);

    // The app starts again in the same frame, at Admin's current route, within the same session.
    await expect.poll(async () => (await appState()).context?.path).toBe('/episodes/12');
    await expect.element(appsScreen.frame()).toBeVisible();
    expect(appsScreen.frame().element()).toBe(frame);
    expect(currentRoute()).toBe(`${APP_ROUTE}/episodes/12`);
    expect(sessionsApi.requests).toHaveLength(1);
  });

  it('starts the document a form in the app loads in place, keeping the form’s result', async () => {
    const { sessionsApi } = await fakeAppPage(installation());
    await renderAdminApp(APP_ROUTE, { labs });
    await expect.element(appsScreen.frame()).toBeVisible();
    const frame = appsScreen.frame().element();
    answer(await callAppFrame(APP_ORIGIN, 'navigate', '/episodes/12'));
    await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/12`);

    // A page rendered by the app's server posts a form, and the response is a new document.
    await postFrameForm(APP_ORIGIN, '/episodes/12/save');

    // The form's response is shown, not a fresh load of the app's page, and Admin follows it.
    await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/12/save`);
    await expect.element(appsScreen.frame()).toBeVisible();
    expect((await appState()).address).toBe('/episodes/12/save');
    expect(appsScreen.frame().element()).toBe(frame);
    expect(sessionsApi.requests).toHaveLength(1);
  });

  it('notifies the app when Admin’s theme changes', async () => {
    await fakeAppPage(installation());
    await renderAdminApp(APP_ROUTE, { labs });
    await expect.element(appsScreen.frame()).toBeVisible();
    const accentColor = settingsResponse().settings.find(
      (setting) => setting.key === 'accent_color',
    )?.value;
    expect((await appState()).theme).toEqual({ mode: 'light', accent_color: accentColor });

    await sidebarScreen.selectAppearance('dark');

    const dark = { mode: 'dark', accent_color: accentColor };
    await expect
      .poll(async () => (await appState()).received)
      .toEqual([{ call: 'themeChanged', value: dark }]);
    expect((await appState()).theme).toEqual(dark);
  });

  describe('the app’s title', () => {
    it('shows the app page’s title as the document title while open, and restores Admin’s after', async () => {
      fakeInstallations([installation()]);
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      await expect.poll(() => document.title).toBe('Podcast app · Podcast');
      await callAppFrame(APP_ORIGIN, 'setTitle', 'Episodes');
      await expect.poll(() => document.title).toBe('Episodes · Podcast');

      await appsScreen.sidebarLink().click();

      await expect(appsScreen.rows()).toHaveCount(1);
      await expect
        .poll(() => document.title)
        .toBe(`Ghost Admin - ${String(siteResponse().site.title)}`);
    });
  });

  describe('the app’s route', () => {
    // The index of Admin's current history entry, as React Router numbers them.
    const historyIndex = () => (window.history.state as { idx?: number } | null)?.idx ?? 0;
    const frameAddress = async () => (await appState()).address;

    it('follows the app’s own route in Admin’s URL, without reloading the app', async () => {
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();
      const start = historyIndex();

      answer(await callAppFrame(APP_ORIGIN, 'navigate', '/episodes/12'));
      await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/12`);
      // A router's redirect replaces Admin's entry rather than adding one.
      answer(await callAppFrame(APP_ORIGIN, 'redirect', '/episodes/13'));
      await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/13`);

      expect(historyIndex()).toBe(start + 1);
      // It's still the page that started at the app's entry route, and it isn't sent any path it
      // reported itself.
      const { context, path, received } = await appState();
      expect(context?.path).toBe('/admin');
      expect(path).toBe('/episodes/13');
      expect(received).toEqual([]);
      await expect.element(appsScreen.frame()).toHaveAttribute('src', APP_PAGE_URL);
    });

    // Admin owns the history: each of the app's moves is one entry in Admin's, and the frame
    // keeps a single one. Each of these steps through the app with back and forward, leaves it,
    // and comes back to where it was.
    for (const multiPage of [false, true]) {
      it(`steps back and forward through ${multiPage ? 'a multi-page' : 'a single-page'} app, leaves it and comes back`, async () => {
        fakeInstallations([installation()]);
        await fakeAppPage(installation(), { flags: { multiPage } });
        await renderAdminApp('/apps', { labs });
        await appsScreen.row('Podcast').getByText('Publish episodes and embed players.').click();
        await expect.poll(currentRoute).toBe(APP_ROUTE);
        await expect.element(appsScreen.frame()).toBeVisible();
        const move = (path: string) =>
          multiPage
            ? callAppFrame(APP_ORIGIN, 'followLink', path)
            : callAppFrame(APP_ORIGIN, 'navigate', path);

        answer(await move('/episodes'));
        await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes`);
        await expect.poll(frameAddress).toBe('/episodes');
        answer(await move('/episodes/12'));
        await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/12`);
        await expect.poll(frameAddress).toBe('/episodes/12');

        window.history.back();
        await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes`);
        await expect.poll(frameAddress).toBe('/episodes');
        window.history.back();
        await expect.poll(currentRoute).toBe(APP_ROUTE);
        await expect.poll(frameAddress).toBe('/admin');
        window.history.forward();
        await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes`);
        await expect.poll(frameAddress).toBe('/episodes');

        // The publisher leaves for the Apps list, then comes back with back.
        await sidebarScreen.navLink('Apps').click();
        await expect.poll(currentRoute).toBe('/apps');
        window.history.back();
        await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes`);
        await expect.element(appsScreen.frame()).toBeVisible();
        // The page opens where the publisher was, with no steps of the frame's own to go through.
        await expect.poll(frameAddress).toBe('/episodes');
        window.history.back();
        await expect.poll(currentRoute).toBe(APP_ROUTE);
        await expect.poll(frameAddress).toBe('/admin');
        window.history.back();
        await expect.poll(currentRoute).toBe('/apps');
      });
    }

    it('moves the app when Admin moves itself, and back undoes it', async () => {
      fakeInstallations([installation()]);
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();
      answer(await callAppFrame(APP_ORIGIN, 'navigate', '/episodes/12'));
      await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/12`);

      // The publisher opens the app from the sidebar, so Admin itself goes to the app's entry.
      await appsScreen.sidebarApp('Podcast').click();
      await expect.poll(currentRoute).toBe(APP_ROUTE);
      await expect
        .poll(async () => (await appState()).received)
        .toEqual([{ call: 'pathChanged', value: '/admin' }]);
      expect(await frameAddress()).toBe('/admin');

      window.history.back();
      await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/12`);
      await expect.poll(frameAddress).toBe('/episodes/12');
      window.history.back();
      await expect.poll(currentRoute).toBe(APP_ROUTE);
      await expect.poll(frameAddress).toBe('/admin');
    });

    it('opens the app’s page at the route in Admin’s URL', async () => {
      await fakeAppPage(installation());
      await renderAdminApp(`${APP_ROUTE}/episodes/12?tab=notes`, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      await expect
        .element(appsScreen.frame())
        .toHaveAttribute('src', `${APP_ORIGIN}/episodes/12?tab=notes`);
      expect((await appState()).context?.path).toBe('/episodes/12?tab=notes');
      expect(currentRoute()).toBe(`${APP_ROUTE}/episodes/12?tab=notes`);
    });

    it('follows an app that bounced away and back faster than Admin renders, sending nothing back', async () => {
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      // For example, an auth guard's bounce: both moves reach Admin before it has rendered either.
      answer(await callAppFrame(APP_ORIGIN, 'navigate', '/login'));
      answer(await callAppFrame(APP_ORIGIN, 'redirect', '/admin'));
      await expect.poll(currentRoute).toBe(APP_ROUTE);

      // Admin passing through /login isn't sent back to the app, which has already left it.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });
      expect((await appState()).received).toEqual([]);
      expect((await appState()).path).toBe('/admin');
    });

    it('lets the publisher leave the app while the route they chose loads', async () => {
      // The pages list owns its request graph.
      allowUnhandledRequests();
      await fakeAppPage(installation());
      // The Pages route loads slowly, so navigating to it doesn't finish until the spec lets it
      // load.
      const loadPages = await holdModuleLoads('/src/posts/list/pages-route.tsx');
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      await sidebarScreen.navLink('Pages').click();
      // Meanwhile the app navigates and asks to open a place. Neither takes the publisher back to
      // the app.
      answer(await callAppFrame(APP_ORIGIN, 'navigate', '/episodes/12'));
      expect(refusal(await callAppFrame(APP_ORIGIN, 'open', { apps: true }))).toBe(
        'rejected: The publisher is on their way elsewhere in Admin',
      );
      expect(currentRoute()).toBe(APP_ROUTE);
      // The app is sent the path Admin stays on.
      await expect
        .poll(async () => (await appState()).received)
        .toEqual([{ call: 'pathChanged', value: '/admin' }]);

      await loadPages();
      await expect.poll(currentRoute).toBe('/pages');
    });

    it('keeps a `labs` query in the app’s route from setting Admin’s Labs overrides', async () => {
      // An ObjectId, as Ghost generates them, which is how Admin recognises an app's page.
      const id = '6a1b2c3d4e5f60718293a4b5';
      await fakeAppPage(installation({ id }));
      await renderAdminApp(`/apps/${id}`, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      answer(await callAppFrame(APP_ORIGIN, 'navigate', '/?labs=someFlag'));

      await expect.poll(currentRoute).toBe(`/apps/${id}/?labs=someFlag`);
      expect(sessionStorage.getItem('ghost-admin:labs-overrides')).toBeNull();
    });

    it('refuses a route that would leave the app, and stays where it is', async () => {
      // Uses a page without the SDK, which refuses most of these itself, because Admin can't rely
      // on the SDK.
      await fakeAppPage(installation(), { kind: 'raw' });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      for (const path of ['//evil.example/', 'https://evil.example/', 'episodes']) {
        expect(refusal(await callHostRaw(APP_ORIGIN, 'pathChanged', path, 'push'))).toMatch(
          /^invalid_path: /,
        );
      }
      expect(refusal(await callHostRaw(APP_ORIGIN, 'pathChanged', '/episodes', 'back'))).toBe(
        'invalid_argument: Expected a move of push or replace',
      );
      // `..` is resolved within the app's own routes, never Admin's.
      await callHostRaw(APP_ORIGIN, 'pathChanged', '/../../settings', 'push');
      await expect.poll(currentRoute).toBe(`${APP_ROUTE}/settings`);
    });
  });

  describe('places the app opens', () => {
    const postId = '6500000000000000000000a1';
    const pageId = '6500000000000000000000a3';
    const memberId = '6500000000000000000000b2';

    it('opens a post in the editor', async () => {
      // The editor owns its request graph.
      allowUnhandledRequests();
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      await callAppFrame(APP_ORIGIN, 'open', { post: { id: postId } });

      await expect.poll(currentRoute).toBe(`/editor/post/${postId}`);
    });

    it('opens a page in the editor', async () => {
      // The editor owns its request graph.
      allowUnhandledRequests();
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      await callAppFrame(APP_ORIGIN, 'open', { page: { id: pageId } });

      await expect.poll(currentRoute).toBe(`/editor/page/${pageId}`);
    });

    it('opens a member', async () => {
      // The member's page owns its request graph.
      allowUnhandledRequests();
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      await callAppFrame(APP_ORIGIN, 'open', { member: { id: memberId } });

      await expect.poll(currentRoute).toBe(`/members/${memberId}`);
    });

    it('opens the Apps list', async () => {
      fakeInstallations([installation()]);
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      await callAppFrame(APP_ORIGIN, 'open', { apps: true });

      await expect.poll(currentRoute).toBe('/apps');
      await expect(appsScreen.rows()).toHaveCount(1);
    });

    it('opens nothing that isn’t a place Admin offers', async () => {
      await fakeAppPage(installation(), { kind: 'raw' });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      for (const place of [{ settings: true }, { post: { id: '../settings' } }, '/settings']) {
        expect(refusal(await callHostRaw(APP_ORIGIN, 'open', place))).toMatch(
          /^invalid_argument: /,
        );
      }
      expect(currentRoute()).toBe(APP_ROUTE);
    });
  });

  describe('the Admin API, on the app’s behalf', () => {
    it('sends an app’s request with Admin’s headers and the app’s own, and returns the response', async () => {
      await fakeAppPage(installation());
      const postsApi = fakeAdminEndpoint('GET', '/posts/?limit=5', {
        posts: [{ id: 'post-1', title: 'Episode 1' }],
      });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      const result = await callAppFrame(APP_ORIGIN, 'fetch', {
        path: '/posts/?limit=5',
        headers: { 'X-Podcast-Trace': 'abc' },
      });

      const response = answer(result);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(JSON.parse(response.body)).toEqual({ posts: [{ id: 'post-1', title: 'Episode 1' }] });
      expect(postsApi.requests).toHaveLength(1);
      const { headers } = postsApi.requests[0];
      expect(headers['app-pragma']).toBe('no-cache');
      expect(headers['x-podcast-trace']).toBe('abc');
    });

    it('refuses a request that sets a header only Admin sets, without sending it', async () => {
      // Uses a page without the SDK, which refuses these itself, because Admin can't rely on the
      // SDK.
      await fakeAppPage(installation(), { kind: 'raw' });
      // Faked so that a request that got through is recorded, rather than failing as unhandled.
      const postsApi = fakeAdminEndpoint('GET', '/posts/', { posts: [] });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      expect(
        refusal(
          await callHostRaw(APP_ORIGIN, 'fetch', {
            path: '/posts/',
            headers: { Authorization: 'Ghost forged-token' },
          }),
        ),
      ).toBe('invalid_argument: Expected no authorization header, which only Admin sets');
      for (const name of ['X-Ghost-Version', 'App-Pragma', 'Cookie', 'X-Forwarded-For']) {
        expect(
          refusal(
            await callHostRaw(APP_ORIGIN, 'fetch', { path: '/posts/', headers: { [name]: 'x' } }),
          ),
          name,
        ).toMatch(/^invalid_argument: /);
      }
      // A body in UTF-7 would carry code injection past the checks on what a write contains.
      expect(
        refusal(
          await callHostRaw(APP_ORIGIN, 'fetch', {
            path: '/posts/',
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-7' },
            body: '{"posts":[{"codeinjection_head":"+ADw-script+AD4-"}]}',
          }),
        ),
      ).toBe('invalid_argument: Expected no content-type header, which only Admin sets');
      expect(postsApi.requests).toHaveLength(0);
    });

    it('sends a write with its body, labelled as JSON', async () => {
      await fakeAppPage(installation());
      const tagsApi = fakeAdminEndpoint('POST', '/tags/', ({ body }) => body, { status: 201 });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      const result = await callAppFrame(APP_ORIGIN, 'fetch', {
        path: '/tags/',
        method: 'POST',
        body: JSON.stringify({ tags: [{ name: 'Podcast' }] }),
      });

      expect(answer(result).status).toBe(201);
      expect(tagsApi.requests[0].body).toEqual({ tags: [{ name: 'Podcast' }] });
      expect(tagsApi.requests[0].headers['content-type']).toBe('application/json');
    });

    it('sends a write with cards in its content as it is', async () => {
      await fakeAppPage(installation());
      const postsApi = fakeAdminEndpoint('POST', '/posts/', ({ body }) => body, { status: 201 });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      const post = {
        title: 'Episode 1',
        lexical: JSON.stringify({
          root: {
            type: 'root',
            children: [{ type: 'html', html: '<iframe src="https://player.example/1"></iframe>' }],
          },
        }),
        feature_image_caption: 'Art by <a href="https://example.com/">Jo</a>',
      };
      const result = await callAppFrame(APP_ORIGIN, 'fetch', {
        path: '/posts/',
        method: 'POST',
        body: JSON.stringify({ posts: [post] }),
      });

      expect(answer(result).status).toBe(201);
      expect(postsApi.requests[0].body).toEqual({ posts: [post] });
    });

    // An app's request can be refused as unauthorized while the staff session still works.
    it('stays with the app when its request is unauthorized while the session works', async () => {
      await fakeAppPage(installation());
      const path = '/tags/';
      fakeAdminEndpoint(
        'GET',
        path,
        { errors: [{ type: 'UnauthorizedError', message: 'Invalid token' }] },
        { status: 401 },
      );
      const sessionCheck = fakeAdminEndpoint('GET', '/users/me/', currentUserResponse());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      const result = await callAppFrame(APP_ORIGIN, 'fetch', { path });

      expect(answer(result).status).toBe(401);
      expect(sessionCheck.requests).toHaveLength(1);
      expect(currentRoute()).toBe(APP_ROUTE);
      await expect.element(appsScreen.frame()).toBeVisible();
    });

    it('refuses what the allowlist doesn’t allow without sending it', async () => {
      await fakeAppPage(installation());
      // Faked so that a request that got through is recorded, rather than failing as unhandled.
      const tokenApi = fakeAdminEndpoint('GET', /^\/users\/.*\/token\//i, { apiKey: {} });
      const postsApi = fakeAdminEndpoint('POST', '/posts/', ({ body }) => body, { status: 201 });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      for (const path of [
        '/users/6500000000000000000000c3/token/',
        '/USERS/6500000000000000000000c3/Token',
        '/apps/installations/',
        '/members/',
        // Core's rewrite for its old versioned addresses would send both of these to /db/.
        '/v4/db/?x=ghost/api/v4/admin/',
        '/dbv4//?x=ghost/api/v4/admin/',
      ]) {
        expect(refusal(await callAppFrame(APP_ORIGIN, 'fetch', { path })), path).toMatch(
          /^blocked: /,
        );
      }
      expect(
        refusal(
          await callAppFrame(APP_ORIGIN, 'fetch', {
            path: '/posts/?filter=tag:news',
            method: 'DELETE',
          }),
        ),
      ).toBe("blocked: Apps can't use DELETE /posts/");

      for (const [post, refused] of [
        [{ codeinjection_head: '<script></script>' }, 'codeinjection_head'],
        [{ mobiledoc: '{"version":"0.3.1","cards":[],"sections":[]}' }, 'mobiledoc'],
      ] as const) {
        expect(
          refusal(
            await callAppFrame(APP_ORIGIN, 'fetch', {
              path: '/posts/',
              method: 'POST',
              body: JSON.stringify({ posts: [{ title: 'Hello', ...post }] }),
            }),
          ),
        ).toBe(`blocked: Apps can't send ${refused} to POST /posts/`);
      }
      expect(
        refusal(
          await callAppFrame(APP_ORIGIN, 'fetch', {
            path: '/posts/?source=html',
            method: 'POST',
            body: JSON.stringify({ posts: [{ title: 'Hello', html: '<script></script>' }] }),
          }),
        ),
      ).toBe("blocked: Apps can't use the source parameter on POST /posts/");
      // Ghost's query parser reads both of these as `newsletter`, and an app could publish with
      // email through either.
      for (const path of [
        '/posts/6500000000000000000000a1/?[newsletter]=weekly',
        '/posts/6500000000000000000000a1/?%5Bnewsletter%5D=weekly',
      ]) {
        expect(
          refusal(
            await callAppFrame(APP_ORIGIN, 'fetch', {
              path,
              method: 'PUT',
              body: JSON.stringify({ posts: [{ status: 'published' }] }),
            }),
          ),
          path,
        ).toBe(
          "blocked: Apps can't use the [newsletter] parameter on PUT /posts/6500000000000000000000a1/",
        );
      }
      expect(tokenApi.requests).toHaveLength(0);
      expect(postsApi.requests).toHaveLength(0);
    });

    it('refuses a path the Admin API only redirects, and says its paths end in /', async () => {
      await fakeAppPage(installation());
      // As Ghost responds to a path without its trailing `/`.
      const postsApi = fakeAdminEndpoint(
        'GET',
        '/posts',
        () => new Response(null, { status: 301, headers: { location: '/ghost/api/admin/posts/' } }),
      );
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      expect(refusal(await callAppFrame(APP_ORIGIN, 'fetch', { path: '/posts' }))).toBe(
        'invalid_path: The Admin API answers /posts only with a redirect: its paths end in /, such as /posts/',
      );
      expect(postsApi.requests).toHaveLength(1);
    });

    it('refuses a path that would leave the Admin API, without sending it', async () => {
      // Uses a page without the SDK, which refuses a URL itself, because Admin can't rely on the
      // SDK.
      await fakeAppPage(installation(), { kind: 'raw' });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      for (const path of [
        '/../../content/posts/',
        '/%2e%2e/%2e%2e/content/posts/',
        'https://evil.example/ghost/api/admin/posts/',
        '//evil.example/posts/',
        'posts/',
      ]) {
        expect(refusal(await callHostRaw(APP_ORIGIN, 'fetch', { path })), path).toMatch(
          /^invalid_path: /,
        );
      }
    });
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

  // The icon URL isn't faked, so a request to it would fail the test.
  it('draws an app’s own icon from the copy Ghost stored, never from the app', async () => {
    const withIcon = installation({
      manifest: manifest({ icon: { url: ICON_URL } }),
      icon_data_url: ICON_DATA_URL,
    });
    fakeInstallations([withIcon]);
    fakeDetails(withIcon);

    await renderAdminApp('/apps', { labs });

    await expect.element(appsScreen.row('Podcast')).toBeVisible();
    const row = appsScreen.row('Podcast').element();
    expect(imageSources(row)).toEqual([ICON_DATA_URL]);
    await expect.poll(() => row.querySelector('img')!.naturalWidth).toBeGreaterThan(0);
    expect(imageSources(appsScreen.sidebarApps().element())).toEqual([ICON_DATA_URL]);

    await appsScreen.rowActions('Podcast').click();
    await appsScreen.detailsMenuItem().click();

    await expect.element(appsScreen.details()).toHaveTextContent('Example Audio');
    expect(imageSources(appsScreen.details().element())).toEqual([ICON_DATA_URL]);
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

  it('draws the default icon for a stored copy that isn’t an image data URL', async () => {
    fakeInstallations([
      installation({ manifest: manifest({ icon: { url: ICON_URL } }), icon_data_url: ICON_URL }),
    ]);

    await renderAdminApp('/apps', { labs });

    await expect.element(appsScreen.row('Podcast')).toBeVisible();
    expect(imageSources(appsScreen.row('Podcast').element())).toEqual([]);
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

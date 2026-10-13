import { describe, expect, it, vi } from 'vitest';
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
  fakeTags,
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
  MANIFEST_URL,
  failAppFrame,
  fakeAppFrame,
  fakeAppPage,
  fakeInstallations,
  fakeSessionStart,
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

const apiError = (status: number, message: string) =>
  new Response(JSON.stringify({ errors: [{ message }] }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/**
 * Holds `appFrameTimeouts.ready` at `ms` for the length of `run`, or until it calls
 * `restore` to give what follows the usual time.
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

/** The app's page as it stands, from inside its frame. */
const appState = () => callAppFrame(APP_ORIGIN, 'state');

/** What a call from the app's page was refused with, or what it answered if it wasn't. */
const refusal = (result: AppFrameResult<unknown>) =>
  'error' in result ? result.error : `answered ${JSON.stringify(result.value)}`;

/** What a call from the app's page answered, failing the spec if it was refused. */
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
    const { sessionsApi } = await fakeAppPage(installation());

    await renderAdminApp('/apps', { labs });
    await appsScreen.row('Podcast').getByText('Publish episodes and embed players.').click();

    await expect.poll(currentRoute).toBe(APP_ROUTE);
    const frame = appsScreen.frame();
    await expect.element(frame).toBeVisible();
    // Opening the page starts a session, which re-checks the app before any of it loads.
    expect(sessionsApi.requests).toHaveLength(1);
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

    // In the document, so it loads, but out of sight and reach while the app starts.
    const frame = appsScreen.frame();
    await expect.element(frame).toBeInTheDocument();
    await expect.element(frame).toHaveAttribute('aria-hidden', 'true');
    await expect.element(frame).not.toBeVisible();

    await expect.element(frame).toBeVisible();
    await expect.element(frame).toHaveAttribute('aria-hidden', 'false');
  });

  it('calls an app unresponsive when it never says hello, and tries again', async () => {
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

  it('calls an app unresponsive when its server can’t be reached', async () => {
    await withReadyTimeout(300, async () => {
      await fakeAppPage(installation());
      // A server that can't be reached is a hello that never comes.
      await failAppFrame();

      await renderAdminApp(APP_ROUTE, { labs });

      await expect
        .element(appsScreen.notResponding())
        .toHaveTextContent('Podcast isn’t responding');
      await expect.element(appsScreen.frame()).not.toBeInTheDocument();
    });
  });

  it('leaves a started app alone once the time it had to start is up', async () => {
    // Short, so the spec doesn't wait long for it to pass, but with room for the app to
    // start first on a slow runner.
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

  it('opens the review on top of a suspended app, and loads the app once approved', async () => {
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
    // The review opens straight away, where the app would be, and the URL stays the app's.
    await expect.element(appsScreen.approveChangesButton()).toBeVisible();
    expect(currentRoute()).toBe(APP_ROUTE);

    // Closing it leaves the page explaining why, with a way back to the review.
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

  it('doesn’t load an uninstalled app', async () => {
    fakeSessionStart('installation-1', installation({ status: 'uninstalled' }));

    await renderAdminApp(APP_ROUTE, { labs });

    await expect.element(appsScreen.notInstalled()).toHaveTextContent('This app isn’t installed');
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
  });

  it('says when an app page doesn’t exist', async () => {
    const id = 'abcdefabcdefabcdefabcdef';
    fakeSessionStart(id, apiError(404, 'App installation not found.'));

    await renderAdminApp(`/apps/${id}`, { labs });

    await expect.element(appsScreen.notInstalled()).toBeVisible();
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

  it('says an app page couldn’t load in its own words, not the API’s, and tries again', async () => {
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

  it('ends the session when the installation moves on, and starts another', async () => {
    const { sessionsApi, set } = await fakeAppPage(installation());
    await renderAdminApp(APP_ROUTE, { labs });
    await expect.element(appsScreen.frame()).toBeVisible();
    expect((await appState()).context?.session).toEqual({ revision: 0 });

    // Changed while the publisher was away from the tab, which reads it again on return.
    set(installation({ revision: 1, manifest: manifest({ description: 'Episodes.' }) }));
    window.dispatchEvent(new Event('visibilitychange'));

    await expect.poll(() => sessionsApi.requests.length).toBe(2);
    await expect.element(appsScreen.frame()).toBeVisible();
    await expect.poll(async () => (await appState()).context?.session).toEqual({ revision: 1 });
  });

  it('starts the app afresh when its page reloads itself', async () => {
    const { sessionsApi } = await fakeAppPage(installation());
    await renderAdminApp(APP_ROUTE, { labs });
    await expect.element(appsScreen.frame()).toBeVisible();
    await callAppFrame(APP_ORIGIN, 'setPath', '/episodes/12');
    await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/12`);
    expect((await appState()).context?.path).toBe('/');

    // The new document's SDK says hello, its channel gone with the old one.
    await reloadFrame(APP_ORIGIN);

    // Started again, in a new frame, at Admin's route for it, within the same session.
    await expect.poll(async () => (await appState()).context?.path).toBe('/episodes/12');
    await expect.element(appsScreen.frame()).toBeVisible();
    expect(currentRoute()).toBe(`${APP_ROUTE}/episodes/12`);
    expect(sessionsApi.requests).toHaveLength(1);
  });

  it('tells the app when Admin’s theme changes', async () => {
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
    it('shows the app’s page title as Admin’s while it is open, and puts Admin’s back after', async () => {
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
    it('follows the app’s own route in Admin’s address, without reloading the app', async () => {
      await fakeAppPage(installation());
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      await callAppFrame(APP_ORIGIN, 'setPath', '/episodes/12');
      await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/12`);

      // A redirect within the app takes the place of the route it came from.
      await callAppFrame(APP_ORIGIN, 'setPath', '/episodes/13', { replace: true });
      await expect.poll(currentRoute).toBe(`${APP_ROUTE}/episodes/13`);

      // Still the page that started at the app's first route, told nothing it said itself.
      const { context, path, received } = await appState();
      expect(context?.path).toBe('/');
      expect(path).toBe('/episodes/13');
      expect(received).toEqual([]);
      await expect.element(appsScreen.frame()).toHaveAttribute('src', APP_PAGE_URL);

      window.history.back();
      await expect.poll(currentRoute).toBe(APP_ROUTE);
      await expect
        .poll(async () => (await appState()).received)
        .toEqual([{ call: 'pathChanged', value: '/' }]);
      expect((await appState()).path).toBe('/');
    });

    it('refuses a route that would leave the app, and stays where it is', async () => {
      // Without the SDK, which refuses most of these itself: Admin can't count on it.
      await fakeAppPage(installation(), { kind: 'raw' });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      for (const path of ['//evil.example/', 'https://evil.example/', 'episodes']) {
        expect(refusal(await callHostRaw(APP_ORIGIN, 'pathChanged', path))).toMatch(
          /^invalid_path: /,
        );
      }
      // `..` is resolved within the app's own routes, never Admin's.
      await callHostRaw(APP_ORIGIN, 'pathChanged', '/../../settings');
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
    it('answers an app’s request, with Admin’s headers and none of the app’s credentials', async () => {
      await fakeAppPage(installation());
      const postsApi = fakeAdminEndpoint('GET', '/posts/?limit=5', {
        posts: [{ id: 'post-1', title: 'Episode 1' }],
      });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      const result = await callAppFrame(APP_ORIGIN, 'fetch', {
        path: '/posts/?limit=5',
        headers: {
          Authorization: 'Ghost forged-token',
          'X-Ghost-Version': '0.0',
          'App-Pragma': 'cache',
          'X-Podcast-Trace': 'abc',
        },
      });

      const response = answer(result);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(JSON.parse(response.body)).toEqual({ posts: [{ id: 'post-1', title: 'Episode 1' }] });
      expect(postsApi.requests).toHaveLength(1);
      const { headers } = postsApi.requests[0];
      expect(headers.authorization).toBeUndefined();
      expect(headers['x-ghost-version']).toBeUndefined();
      expect(headers['app-pragma']).toBe('no-cache');
      expect(headers['x-podcast-trace']).toBe('abc');
    });

    it('sends a write with its body, as JSON unless the app says otherwise', async () => {
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

    it('refuses a route the blocklist closes, without sending it', async () => {
      await fakeAppPage(installation());
      // Faked, so a request that got through would be seen rather than fail as unhandled.
      const tokenApi = fakeAdminEndpoint('GET', /^\/users\/.*\/token\//i, { apiKey: {} });
      await renderAdminApp(APP_ROUTE, { labs });
      await expect.element(appsScreen.frame()).toBeVisible();

      for (const path of [
        '/users/6500000000000000000000c3/token/',
        '/USERS/6500000000000000000000c3/Token',
        '/apps/installations/',
      ]) {
        expect(refusal(await callAppFrame(APP_ORIGIN, 'fetch', { path }))).toMatch(/^blocked: /);
      }
      expect(tokenApi.requests).toHaveLength(0);
    });

    it('refuses a path that would leave the Admin API, without sending it', async () => {
      // Without the SDK, which refuses a URL itself: Admin can't count on it.
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

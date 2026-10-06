import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import type {
  AppInstallation,
  AppInstallationPreview,
  AppManifest,
} from '@tryghost/admin-x-framework/api/app-installations';
import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeUsers,
  renderAdminApp,
  staffRole,
  staffUser,
} from '@test-utils/acceptance';
import { ADMINISTRATOR_FILTER, OWNER_FILTER } from './lib/app-managers';
import { appsScreen } from './apps.screen';

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';
const INSTALL_ROUTE = `/apps/install?manifest=${encodeURIComponent(MANIFEST_URL)}`;
const labs = { apps: true };

const manifest = (overrides: Partial<AppManifest> = {}): AppManifest => ({
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes and embed players.',
  author: { name: 'Example Audio', url: 'https://example.com/' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
  ...overrides,
});

const preview = (overrides: Partial<AppInstallationPreview> = {}): AppInstallationPreview => ({
  manifest_url: MANIFEST_URL,
  manifest: manifest(),
  digest: 'digest-1',
  installation: null,
  ...overrides,
});

const installation = (overrides: Partial<AppInstallation> = {}): AppInstallation => ({
  id: 'installation-1',
  app_id: 'com.example.podcast',
  status: 'active',
  manifest_url: MANIFEST_URL,
  manifest: manifest(),
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

/** The site's installation of the app as a preview reports it: what was approved, and what changed. */
const existing = (
  changes: NonNullable<AppInstallationPreview['installation']>['changes'],
  status: AppInstallation['status'] = 'active',
) => ({ id: 'installation-1', status, manifest_url: MANIFEST_URL, manifest: manifest(), changes });

/** An Admin API error, as Ghost serialises it. */
const apiError = (
  status: number,
  error: { type: string; code: string; context?: string; details?: unknown },
) =>
  new Response(
    JSON.stringify({
      errors: [
        {
          message: 'Something went wrong.',
          context: null,
          details: null,
          help: null,
          id: 'error-id',
          property: null,
          ghostErrorCode: null,
          ...error,
        },
      ],
    }),
    { status, headers: { 'content-type': 'application/json' } },
  );

/** The site's installations: listed by the Apps screen, and changed by installing. */
function fakeInstallations(initial: AppInstallation[] = []) {
  let installed = initial;
  fakeAdminEndpoint('GET', '/apps/installations/', () => ({ app_installations: installed }));
  return {
    set: (next: AppInstallation[]) => {
      installed = next;
    },
  };
}

const fakePreview = (response: Parameters<typeof fakeAdminEndpoint>[2]) =>
  fakeAdminEndpoint('POST', '/apps/installations/preview/', response);

const previewResponse = (body: AppInstallationPreview) => ({ app_installation_previews: [body] });

describe('Installing an app', () => {
  it('is hidden without the apps flag', async () => {
    await renderAdminApp(INSTALL_ROUTE);

    await expect.element(page.getByText('Page not found')).toBeVisible();
    await expect.element(appsScreen.installDialog()).not.toBeInTheDocument();
  });

  it('shows who the app is and where it runs, and installs the version reviewed', async () => {
    const installations = fakeInstallations();
    const previewApi = fakePreview(previewResponse(preview()));
    const installApi = fakeAdminEndpoint('POST', '/apps/installations/', () => {
      installations.set([installation()]);
      return { app_installations: [installation()] };
    });

    await renderAdminApp(INSTALL_ROUTE, { labs });

    const dialog = appsScreen.installDialog();
    await expect.element(dialog).toHaveTextContent('Podcast');
    await expect.element(dialog).toHaveTextContent('Publish episodes and embed players.');
    await expect.element(dialog).toHaveTextContent('By Example Audio');
    await expect.element(appsScreen.servedFrom()).toHaveTextContent('Runs on podcast.example.com');
    await expect.element(appsScreen.developmentBadge()).not.toBeInTheDocument();
    await expect
      .element(appsScreen.accessIndicator())
      .toHaveTextContent('Only install this app if you trust the developer');
    expect(previewApi.requests.map(({ body }) => body)).toEqual([
      { app_installation_previews: [{ manifest_url: MANIFEST_URL }] },
    ]);

    await appsScreen.installButton().click();

    await expect.poll(currentRoute).toBe('/apps');
    await expect(appsScreen.rows()).toHaveCount(1);
    await expect.element(appsScreen.row('Podcast')).toHaveTextContent('podcast.example.com');
    await expect.element(page.getByText('Podcast installed')).toBeVisible();
    expect(installApi.requests.map(({ body }) => body)).toEqual([
      { app_installations: [{ manifest_url: MANIFEST_URL, digest: 'digest-1' }] },
    ]);
  });

  it('marks an app served from the developer’s machine', async () => {
    fakeInstallations();
    fakePreview(
      previewResponse(
        preview({
          manifest_url: 'http://localhost:5173/ghost-app.json',
          manifest: manifest({
            surfaces: [{ type: 'admin_page', url: 'http://localhost:5173/admin' }],
          }),
        }),
      ),
    );

    await renderAdminApp('/apps/install?manifest=http://localhost:5173/ghost-app.json', { labs });

    await expect.element(appsScreen.servedFrom()).toHaveTextContent('Runs on localhost:5173');
    await expect.element(appsScreen.developmentBadge()).toBeVisible();
  });

  it('asks for a fresh review when the app changed while it was being reviewed', async () => {
    fakeInstallations();
    const changed = preview({ manifest: manifest({ name: 'Podcasts' }), digest: 'digest-2' });
    fakePreview(previewResponse(preview()));
    const installApi = fakeAdminEndpoint('POST', '/apps/installations/', ({ body }) => {
      const [{ digest }] = (body as { app_installations: Array<{ digest: string }> })
        .app_installations;
      return digest === 'digest-2'
        ? { app_installations: [installation({ manifest: changed.manifest })] }
        : apiError(409, { type: 'ConflictError', code: 'APP_MANIFEST_CHANGED', details: changed });
    });

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.installButton().click();

    await expect.element(appsScreen.notice()).toHaveTextContent('changed while you were reviewing');
    await expect.element(appsScreen.installDialog()).toHaveTextContent('Podcasts');

    await appsScreen.installButton().click();

    await expect.poll(currentRoute).toBe('/apps');
    expect(
      installApi.requests.map(
        ({ body }) =>
          (body as { app_installations: Array<{ digest: string }> }).app_installations[0].digest,
      ),
    ).toEqual(['digest-1', 'digest-2']);
  });

  it('reviews what changed for an app the site already has, and approves it in place', async () => {
    fakeInstallations([installation()]);
    const renamed = manifest({ name: 'Podcasts', description: 'New words.' });
    fakePreview(
      previewResponse(
        preview({
          manifest: renamed,
          digest: 'digest-2',
          installation: existing([
            { path: 'description', requires_approval: false },
            { path: 'name', requires_approval: true },
          ]),
        }),
      ),
    );
    const approveApi = fakeAdminEndpoint('PUT', '/apps/installations/installation-1/', {
      app_installations: [installation({ manifest: renamed })],
    });

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Review changes to Podcast');
    await expect.element(appsScreen.moveWarning()).not.toBeInTheDocument();
    await expect(appsScreen.changes()).toHaveCount(2);
    // What needs approval comes first; text changes are marked as not needing it.
    await expect.element(appsScreen.changes().nth(0)).toHaveTextContent('NamePodcastPodcasts');
    await expect.element(appsScreen.changes().nth(1)).toHaveTextContent('No approval needed');

    await appsScreen.approveChangesButton().click();

    await expect.poll(currentRoute).toBe('/apps');
    await expect.element(page.getByText('Changes to Podcasts approved')).toBeVisible();
    expect(approveApi.requests.map(({ body }) => body)).toEqual([
      { app_installations: [{ manifest_url: MANIFEST_URL, digest: 'digest-2' }] },
    ]);
  });

  it('warns that an install link would move an installed app to another host', async () => {
    fakeInstallations([installation()]);
    const elsewhere = 'https://evil.example/ghost-app.json';
    fakePreview(
      previewResponse(
        preview({
          manifest_url: elsewhere,
          manifest: manifest({
            surfaces: [{ type: 'admin_page', url: 'https://evil.example/admin' }],
          }),
          digest: 'digest-2',
          installation: existing([
            { path: 'manifest_url', requires_approval: true },
            { path: 'surfaces[0].url', requires_approval: true },
          ]),
        }),
      ),
    );
    const approveApi = fakeAdminEndpoint('PUT', '/apps/installations/installation-1/', {
      app_installations: [installation()],
    });

    await renderAdminApp(`/apps/install?manifest=${encodeURIComponent(elsewhere)}`, { labs });

    await expect
      .element(appsScreen.installDialog())
      .toHaveTextContent('Move Podcast to evil.example?');
    await expect
      .element(appsScreen.moveWarning())
      .toHaveTextContent('moves Podcast from podcast.example.com to evil.example');
    await expect
      .element(appsScreen.changes().nth(1))
      .toHaveTextContent('https://podcast.example.com/adminhttps://evil.example/admin');

    await appsScreen.approveMoveButton().click();

    await expect.poll(() => approveApi.requests.length).toBe(1);
    await expect.element(page.getByText('Podcast moved to evil.example')).toBeVisible();
  });

  it('says when the app is already installed and nothing changed', async () => {
    fakeInstallations([installation()]);
    fakePreview(previewResponse(preview({ installation: existing([]) })));

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect
      .element(appsScreen.installDialog())
      .toHaveTextContent('Podcast is already installed');
    await appsScreen.doneButton().click();

    await expect.poll(currentRoute).toBe('/apps');
    await expect(appsScreen.installDialog()).toHaveCount(0);
  });

  it('checks again when someone else installed the app in the meantime', async () => {
    fakeInstallations();
    let previews = 0;
    fakePreview(() => {
      previews += 1;
      return previewResponse(
        previews === 1
          ? preview()
          : preview({
              installation: existing([{ path: 'name', requires_approval: true }]),
              manifest: manifest({ name: 'Podcasts' }),
            }),
      );
    });
    fakeAdminEndpoint('POST', '/apps/installations/', () =>
      apiError(409, { type: 'ConflictError', code: 'APP_ALREADY_INSTALLED' }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.installButton().click();

    await expect.element(appsScreen.notice()).toHaveTextContent('Someone else installed');
    await expect.element(appsScreen.installDialog()).toHaveTextContent('Review changes to Podcast');
    expect(previews).toBe(2);
  });

  it('retries the install, not the check, when installing fails', async () => {
    const installations = fakeInstallations();
    const previewApi = fakePreview(previewResponse(preview()));
    let attempts = 0;
    let finishRetry = () => {};
    const retried = new Promise<void>((resolve) => {
      finishRetry = resolve;
    });
    const installApi = fakeAdminEndpoint('POST', '/apps/installations/', async () => {
      attempts += 1;
      if (attempts === 1) {
        return apiError(500, { type: 'InternalServerError', code: 'UNEXPECTED_ERROR' });
      }
      await retried;
      installations.set([installation()]);
      return { app_installations: [installation()] };
    });

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.installButton().click();

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Couldn’t install this app');
    await appsScreen.tryAgainButton().click();

    // While it installs again, the review stays on screen as it did the first time.
    await expect.poll(() => installApi.requests.length).toBe(2);
    await expect.element(appsScreen.installButton()).toBeDisabled();
    await expect.element(appsScreen.installDialog()).not.toHaveTextContent('Checking the app');
    finishRetry();

    await expect.poll(currentRoute).toBe('/apps');
    expect(installApi.requests).toHaveLength(2);
    expect(previewApi.requests).toHaveLength(1);
  });

  it('says when an install link doesn’t name an app, without blaming a developer', async () => {
    fakeInstallations();
    const previewApi = fakePreview(previewResponse(preview()));

    await renderAdminApp('/apps/install', { labs });

    await expect
      .element(appsScreen.installDialog())
      .toHaveTextContent('This install link is incomplete');
    await expect.element(appsScreen.installDialog()).not.toHaveTextContent('developer');
    await expect(appsScreen.problems()).toHaveCount(0);
    expect(previewApi.requests).toHaveLength(0);
  });

  it('says when this site’s Ghost can’t install apps yet', async () => {
    fakeAdminEndpoint(
      'GET',
      '/apps/installations/',
      apiError(404, { type: 'NotFoundError', code: 'NOT_FOUND' }),
    );
    fakePreview(apiError(404, { type: 'NotFoundError', code: 'NOT_FOUND' }));

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect
      .element(appsScreen.installDialog())
      .toHaveTextContent('This site can’t install apps yet');
    await appsScreen.okButton().click();

    await expect.poll(currentRoute).toBe('/apps');
    await expect.element(page.getByText('Apps need a newer version of Ghost.')).toBeVisible();
  });

  it('lists what is wrong with an invalid app for its developer, and installs nothing', async () => {
    fakeInstallations();
    fakePreview(
      apiError(422, {
        type: 'ValidationError',
        code: 'APP_MANIFEST_INVALID',
        context: 'id: Expected a lowercase reverse-domain ID',
        details: [{ path: 'id', message: 'Expected a lowercase reverse-domain ID' }],
      }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Can’t install this app');
    await expect
      .element(appsScreen.problems())
      .toHaveTextContent('Expected a lowercase reverse-domain ID');
    await appsScreen.okButton().click();

    await expect.poll(currentRoute).toBe('/apps');
    await expect.element(appsScreen.emptyState()).toBeVisible();
  });

  it('lets the publisher try again when the app can’t be reached', async () => {
    fakeInstallations();
    let attempts = 0;
    fakePreview(() => {
      attempts += 1;
      return attempts === 1
        ? apiError(422, {
            type: 'ValidationError',
            code: 'APP_MANIFEST_UNREACHABLE',
            context: `${MANIFEST_URL} answered with HTTP 503`,
          })
        : previewResponse(preview());
    });

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Can’t reach this app');
    await expect.element(appsScreen.unreachable()).toHaveTextContent('answered with HTTP 503');
    await appsScreen.tryAgainButton().click();

    await expect.element(appsScreen.installButton()).toBeVisible();
  });

  it('tells staff who can’t install apps who can, without checking the app', async () => {
    const owner = staffUser({
      name: 'Site Owner',
      email: 'owner@example.com',
      roles: [staffRole({ name: 'Owner' })],
    });
    const admin = staffUser({
      name: 'Site Admin',
      email: 'admin@example.com',
      roles: [staffRole({ name: 'Administrator' })],
    });
    const usersApi = fakeUsers(({ filter }) => (filter === OWNER_FILTER ? [owner] : [admin]));
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Editor' })];

    // No preview is faked: a request to check the app would fail the test.
    await renderAdminApp(INSTALL_ROUTE, { labs, boot: { browseMe: { response: me } } });

    await expect.element(appsScreen.notAllowedDialog()).toBeVisible();
    await expect(appsScreen.managers()).toHaveCount(2);
    await expect.element(appsScreen.managers().first()).toHaveTextContent('Site Owner');
    expect(usersApi.requests.map(({ filter }) => filter)).toEqual(
      expect.arrayContaining([OWNER_FILTER, ADMINISTRATOR_FILTER]),
    );
    await expect.element(appsScreen.installDialog()).not.toBeInTheDocument();
  });
});

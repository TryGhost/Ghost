import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type {
  AppInstallation,
  AppInstallationPreview,
  AppManifest,
} from '@tryghost/admin-x-framework/api/app-installations';
import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  renderAdminApp,
  staffRole,
} from '@test-utils/acceptance';
import { appsScreen } from './apps.screen';
import {
  ICON_DATA_URL,
  ICON_URL,
  MANIFEST_URL,
  fakeAppPage,
  fakeInstallations,
  imageSources,
  installation,
  labs,
  manifest,
} from './apps.test-utils';

/** Reads and edits posts, reading on its own too, and lists tags. */
const SCOPES: AppManifest['scopes'] = ['post:browse', 'post:edit', 'tag:browse'];

const INSTALL_ROUTE = `/apps/install?manifest=${encodeURIComponent(MANIFEST_URL)}`;

const preview = (overrides: Partial<AppInstallationPreview> = {}): AppInstallationPreview => ({
  manifest_url: MANIFEST_URL,
  manifest: manifest(),
  digest: 'digest-1',
  trusted_origins: [],
  icon_data_url: null,
  installation: null,
  ...overrides,
});

/** The site's installation of the app as a preview reports it: what was approved, and what changed. */
const existing = (
  changes: NonNullable<AppInstallationPreview['installation']>['changes'],
  status: AppInstallation['status'] = 'active',
) => ({
  id: 'installation-1',
  status,
  revision: 0,
  manifest_url: MANIFEST_URL,
  manifest: manifest(),
  icon_data_url: null,
  changes,
});

/** Where the site's installation was approved from, before this install link moved it. */
const PREVIOUS_URL = 'https://old.example.com/ghost-app.json';

/** The site's installation of the app as approved at `PREVIOUS_URL`, moving to this install link. */
const moving = (
  changes: NonNullable<AppInstallationPreview['installation']>['changes'],
  status: AppInstallation['status'] = 'active',
) => ({
  ...existing(
    [{ kind: 'field', path: 'manifest_url', requires_approval: true }, ...changes],
    status,
  ),
  manifest_url: PREVIOUS_URL,
  manifest: manifest({ manifest_url: PREVIOUS_URL }),
});

/**
 * An error as Ghost answers a preview, install or approval with. Its error handler replaces
 * the server's `message` with a generic one, and puts it at the start of `context`.
 */
const apiError = (
  status: number,
  {
    message,
    context,
    ...error
  }: { type: string; code: string; message?: string; context?: string; details?: unknown },
) =>
  new Response(
    JSON.stringify({
      errors: [
        {
          message: 'Validation error, cannot save app installation preview.',
          context: [message, context].filter(Boolean).join(' ') || null,
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
    const previewApi = fakePreview(
      previewResponse(preview({ manifest: manifest({ scopes: SCOPES }) })),
    );
    const installApi = fakeAdminEndpoint('POST', '/apps/installations/', () => {
      installations.set([installation()]);
      return { app_installations: [installation()] };
    });
    await fakeAppPage(installation());

    await renderAdminApp(INSTALL_ROUTE, { labs });

    const dialog = appsScreen.installDialog();
    await expect.element(dialog).toHaveTextContent('Podcast');
    await expect.element(dialog).toHaveTextContent('Publish episodes and embed players.');
    // Who made it, which nothing checks, so it's marked as unverified.
    await expect.element(dialog).toHaveTextContent('By Example Audio');
    await expect
      .element(appsScreen.unverifiedDeveloperBadge())
      .toHaveTextContent('Unverified developer');
    await expect
      .element(dialog.getByRole('link', { name: 'Example Audio', exact: true }))
      .toHaveAttribute('href', 'https://example.com/');
    await expect.element(appsScreen.developmentBadge()).not.toBeInTheDocument();
    await expect
      .element(appsScreen.accessIndicator())
      .toHaveTextContent(
        'Make sure you trust Example Audio. Ghost does not review apps such as Podcast. Only install apps from developers you trust.',
      );
    // One line per resource the app declares, in Ghost's words.
    await expect(appsScreen.accessItems()).toHaveCount(2);
    await expect
      .element(appsScreen.accessItems().first())
      .toHaveTextContent(
        'Posts and pagesList, search and read every post and page, drafts included.Edit, publish and email posts and pages, change who can read them and their authors, and create tags for them.',
      );
    await expect
      .element(appsScreen.accessItems().nth(1))
      .toHaveTextContent('TagsList and search tags.');
    // Where the app's data goes closes the box, but isn't one of the permissions.
    await expect(
      appsScreen.accessIndicator().getByRole('listitem').filter({ hasText: 'Data accessed by' }),
    ).toHaveCount(0);
    // What the app does: where it appears, and, with its permissions, where what it reads goes.
    await expect(appsScreen.capabilities()).toHaveCount(1);
    await expect
      .element(appsScreen.capabilities().first())
      .toHaveTextContent('A dedicated page in Admin');
    await expect
      .element(appsScreen.accessIndicator().getByTestId('app-data-accessed-by'))
      .toHaveTextContent(/Data accessed by\s*podcast\.example\.com/);
    expect(previewApi.requests.map(({ body }) => body)).toEqual([
      { app_installation_previews: [{ manifest_url: MANIFEST_URL }] },
    ]);

    await appsScreen.installButton().click();

    // A fresh install opens the app.
    await expect.poll(currentRoute).toBe('/apps/installation-1');
    await expect.element(page.getByText('Podcast installed')).toBeVisible();
    await expect.element(appsScreen.appPage()).toBeVisible();
    expect(installApi.requests.map(({ body }) => body)).toEqual([
      { app_installations: [{ manifest_url: MANIFEST_URL, digest: 'digest-1' }] },
    ]);

    // Back in Apps, the list already shows the new app.
    await appsScreen.sidebarLink().click();
    await expect.poll(currentRoute).toBe('/apps');
    await expect(appsScreen.rows()).toHaveCount(1);
    await expect.element(appsScreen.row('Podcast')).toHaveTextContent('Example Audio');
  });

  it('keeps the review open until Ghost has answered the install', async () => {
    const installations = fakeInstallations();
    fakePreview(previewResponse(preview()));
    let finishInstall!: () => void;
    const answered = new Promise<void>((resolve) => {
      finishInstall = resolve;
    });
    const installApi = fakeAdminEndpoint('POST', '/apps/installations/', async () => {
      await answered;
      installations.set([installation()]);
      return { app_installations: [installation()] };
    });
    await fakeAppPage(installation());

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.installButton().click();
    await expect.poll(() => installApi.requests.length).toBe(1);

    await expect.element(appsScreen.cancelButton()).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    // Nothing shows that closing was ignored, so give a close time to leave the install link.
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    await expect.element(appsScreen.installDialog()).toBeVisible();
    finishInstall();

    await expect.poll(currentRoute).toBe('/apps/installation-1');
  });

  it('says when an app asks for no access', async () => {
    fakeInstallations();
    fakePreview(previewResponse(preview()));

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.noAccess()).toBeVisible();
    // Whatever it asks for, Ghost hasn't reviewed it.
    await expect
      .element(appsScreen.accessIndicator())
      .toHaveTextContent('Only install apps from developers you trust.');
    await expect(appsScreen.accessItems()).toHaveCount(0);
  });

  it('marks what changed in access in the list when approving an installed app’s move', async () => {
    fakeInstallations([installation({ manifest_url: PREVIOUS_URL })]);
    fakePreview(
      previewResponse(
        preview({
          manifest: manifest({ scopes: SCOPES }),
          digest: 'digest-2',
          installation: {
            ...moving([
              { kind: 'scope', scope: 'post:edit', change: 'added' },
              { kind: 'scope', scope: 'product:browse', change: 'removed' },
            ]),
            manifest: manifest({
              manifest_url: PREVIOUS_URL,
              scopes: ['post:browse', 'tag:browse', 'product:browse'],
            }),
          },
        }),
      ),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });

    // A new scope is marked where it's listed.
    await expect(appsScreen.newAccess()).toHaveCount(1);
    await expect
      .element(appsScreen.newAccess())
      .toHaveTextContent('Edit, publish and email posts and pages');
    await expect
      .element(appsScreen.removedAccess())
      .toHaveTextContent('No longer requiresTiersList your tiers and their prices.');
    // Access isn't repeated among the field-by-field changes.
    await expect(appsScreen.changes()).toHaveCount(1);
    await expect.element(appsScreen.changes()).toHaveTextContent('Install link');
  });

  it('shows the app’s own icon from the copy Ghost would store, never from the app', async () => {
    fakeInstallations();
    fakePreview(
      previewResponse(
        preview({ manifest: manifest({ icon: { url: ICON_URL } }), icon_data_url: ICON_DATA_URL }),
      ),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.installButton()).toBeVisible();
    expect(imageSources(appsScreen.installDialog().element())).toEqual([ICON_DATA_URL]);
  });

  it('marks a development build, as its signed manifest says', async () => {
    fakeInstallations();
    fakePreview(previewResponse(preview({ manifest: manifest({ development: true }) })));

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.developmentBadge()).toBeVisible();
  });

  // Where an app runs says nothing about whether it's a development build.
  it('doesn’t mark an app on the developer’s machine that isn’t a development build', async () => {
    fakeInstallations();
    fakePreview(
      previewResponse(
        preview({
          manifest_url: 'http://my-app.localhost:5173/ghost-app.json',
          manifest: manifest({
            manifest_url: 'http://my-app.localhost:5173/ghost-app.json',
            surfaces: [{ type: 'admin_page', url: 'http://my-app.localhost:5173/admin' }],
          }),
        }),
      ),
    );

    await renderAdminApp('/apps/install?manifest=http://my-app.localhost:5173/ghost-app.json', {
      labs,
    });

    await expect
      .element(appsScreen.dataAccessedBy())
      .toHaveTextContent(/Data accessed by\s*my-app\.localhost:5173/);
    await expect.element(appsScreen.developmentBadge()).not.toBeInTheDocument();
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
    await fakeAppPage(installation({ manifest: changed.manifest }));

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.installButton().click();

    await expect.element(appsScreen.notice()).toHaveTextContent('has changed since you opened it');
    await expect.element(appsScreen.installDialog()).toHaveTextContent('Podcasts');

    await appsScreen.installButton().click();

    await expect.poll(currentRoute).toBe('/apps/installation-1');
    expect(
      installApi.requests.map(
        ({ body }) =>
          (body as { app_installations: Array<{ digest: string }> }).app_installations[0].digest,
      ),
    ).toEqual(['digest-1', 'digest-2']);
  });

  it('reviews what changed for an app the site has elsewhere, and approves it in place', async () => {
    fakeInstallations([installation({ manifest_url: PREVIOUS_URL })]);
    const renamed = manifest({
      name: 'Podcasts',
      description: 'New words.',
      author: { name: 'Podcast Network', url: 'https://podcasts.example.com/' },
    });
    fakePreview(
      previewResponse(
        preview({
          manifest: renamed,
          digest: 'digest-2',
          installation: moving([
            { kind: 'field', path: 'description', requires_approval: false },
            { kind: 'field', path: 'name', requires_approval: true },
            { kind: 'field', path: 'author.name', requires_approval: true },
          ]),
        }),
      ),
    );
    const approveApi = fakeAdminEndpoint('PUT', '/apps/installations/installation-1/', {
      app_installations: [installation({ manifest: renamed })],
    });

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.approveChangesButton()).toBeVisible();
    // The header shows the approved app, while the warning names the version being reviewed.
    await expect
      .element(appsScreen.installDialog().getByRole('heading', { name: 'Podcast', exact: true }))
      .toBeVisible();
    await expect
      .element(appsScreen.accessIndicator())
      .toHaveTextContent(
        'Make sure you trust Podcast Network. Ghost does not review apps such as Podcasts. Only approve changes from developers you trust.',
      );
    // Every changed field is shown, including the description that needs no approval on its own.
    await expect(appsScreen.changes()).toHaveCount(4);
    await expect
      .element(appsScreen.changes().nth(0))
      .toHaveTextContent('NameWas: PodcastNow: Podcasts');
    await expect
      .element(appsScreen.changes().nth(1))
      .toHaveTextContent('DescriptionWas: Publish episodes and embed players.Now: New words.');
    await expect
      .element(appsScreen.changes().nth(2))
      .toHaveTextContent('DeveloperWas: Example AudioNow: Podcast Network');
    await expect
      .element(appsScreen.changes().nth(3))
      .toHaveTextContent(`Install linkWas: ${PREVIOUS_URL}Now: ${MANIFEST_URL}`);

    await appsScreen.approveChangesButton().click();

    await expect.poll(currentRoute).toBe('/apps');
    await expect.element(page.getByText('Changes to Podcasts approved')).toBeVisible();
    expect(approveApi.requests.map(({ body }) => body)).toEqual([
      { app_installations: [{ manifest_url: MANIFEST_URL, digest: 'digest-2', revision: 0 }] },
    ]);
  });

  // The identity key proves it's the same app, so a move is a change like any other.
  it('reviews a move of an installed app like any other change', async () => {
    fakeInstallations([installation()]);
    const elsewhere = 'https://audio.example.org/ghost-app.json';
    fakePreview(
      previewResponse(
        preview({
          manifest_url: elsewhere,
          manifest: manifest({
            manifest_url: elsewhere,
            surfaces: [{ type: 'admin_page', url: 'https://audio.example.org/admin' }],
          }),
          digest: 'digest-2',
          trusted_origins: ['https://audio.example.org'],
          installation: existing([
            { kind: 'field', path: 'manifest_url', requires_approval: true },
            { kind: 'field', path: 'surfaces[0].url', requires_approval: true },
          ]),
        }),
      ),
    );
    const approveApi = fakeAdminEndpoint('PUT', '/apps/installations/installation-1/', {
      app_installations: [installation()],
    });

    await renderAdminApp(`/apps/install?manifest=${encodeURIComponent(elsewhere)}`, { labs });

    await expect.element(appsScreen.approveChangesButton()).toBeVisible();
    await expect(appsScreen.changes()).toHaveCount(2);
    await expect
      .element(appsScreen.changes().first())
      .toHaveTextContent(`Install linkWas: ${MANIFEST_URL}Now: ${elsewhere}`);
    await expect
      .element(appsScreen.changes().nth(1))
      .toHaveTextContent(
        'Page in AdminWas: https://podcast.example.com/adminNow: https://audio.example.org/admin',
      );

    await appsScreen.approveChangesButton().click();

    await expect.poll(() => approveApi.requests.length).toBe(1);
    expect(approveApi.requests[0].body).toEqual({
      app_installations: [{ manifest_url: elsewhere, digest: 'digest-2', revision: 0 }],
    });
    await expect.element(page.getByText('Changes to Podcast approved')).toBeVisible();
  });

  it('refuses another developer’s app with an installed app’s ID, with no way to approve it', async () => {
    fakeInstallations([installation()]);
    fakePreview(
      apiError(422, {
        type: 'ValidationError',
        code: 'APP_IDENTITY_MISMATCH',
        message: 'This app doesn’t come from the same developer as the installed one.',
      }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Can’t install this app');
    await expect
      .element(appsScreen.installDialog())
      .toHaveTextContent('doesn’t come from the same developer');
    await expect.element(appsScreen.approveChangesButton()).not.toBeInTheDocument();
    await expect.element(appsScreen.installButton()).not.toBeInTheDocument();
    await expect.element(appsScreen.tryAgainButton()).not.toBeInTheDocument();
    await appsScreen.okButton().click();

    await expect.poll(currentRoute).toBe('/apps');
  });

  it('says Ghost couldn’t confirm where an app comes from, with how it answered', async () => {
    fakeInstallations();
    fakePreview(
      apiError(422, {
        type: 'ValidationError',
        code: 'APP_CHALLENGE_FAILED',
        message: 'Ghost couldn’t confirm the app comes from its developer.',
        context: 'https://podcast.example.com: The signature was not made with backend_key',
      }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Can’t install this app');
    await expect
      .element(appsScreen.unconfirmed())
      .toHaveTextContent('The signature was not made with backend_key');
    // The server's own sentence starts what it says, so the dialog doesn't say it again.
    expect(
      appsScreen
        .installDialog()
        .element()
        .textContent?.match(/couldn’t confirm/g),
    ).toHaveLength(1);
    await expect.element(appsScreen.installButton()).not.toBeInTheDocument();
  });

  it('lets the publisher try again when the app’s backend can’t be reached', async () => {
    fakeInstallations();
    let attempts = 0;
    fakePreview(() => {
      attempts += 1;
      return attempts === 1
        ? apiError(422, {
            type: 'ValidationError',
            code: 'APP_CHALLENGE_UNREACHABLE',
            message: 'Could not reach the app to confirm it comes from its developer.',
            context: 'https://podcast.example.com',
          })
        : previewResponse(preview());
    });

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('didn’t answer as expected');
    await appsScreen.tryAgainButton().click();

    await expect.element(appsScreen.installButton()).toBeVisible();
  });

  it('lists an unsigned app’s problem for its developer', async () => {
    fakeInstallations();
    fakePreview(
      apiError(422, {
        type: 'ValidationError',
        code: 'APP_MANIFEST_UNSIGNED',
        message: 'The app’s manifest is not signed.',
        context:
          'Expected a signed manifest: flattened JWS JSON with protected, payload and signature',
      }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect
      .element(appsScreen.problems())
      .toHaveTextContent('The app’s details aren’t signed');
    await expect.element(appsScreen.problems()).toHaveTextContent('flattened JWS');
  });

  // The app's page starts a session, which reviews what waits for approval.
  it('says an app installed from this link is installed, and opens its page, whatever has changed', async () => {
    const suspended = installation({ status: 'suspended' });
    fakeInstallations([suspended]);
    fakePreview(
      previewResponse(
        preview({
          manifest: manifest({ name: 'Podcasts' }),
          digest: 'digest-2',
          installation: existing(
            [{ kind: 'field', path: 'name', requires_approval: true }],
            'suspended',
          ),
        }),
      ),
    );
    await fakeAppPage(suspended);

    await renderAdminApp(INSTALL_ROUTE, { labs });

    const dialog = appsScreen.installDialog();
    await expect.element(dialog).toHaveTextContent('Podcast is already installed');
    await expect.element(appsScreen.approveChangesButton()).not.toBeInTheDocument();
    await appsScreen.openButton().click();

    await expect.poll(currentRoute).toBe('/apps/installation-1');
    await expect.element(appsScreen.appPage()).toBeVisible();
  });

  it('checks again when someone else installed the app in the meantime, and offers to open it', async () => {
    fakeInstallations();
    let previews = 0;
    fakePreview(() => {
      previews += 1;
      return previewResponse(
        previews === 1
          ? preview()
          : preview({
              installation: existing([{ kind: 'field', path: 'name', requires_approval: true }]),
              manifest: manifest({ name: 'Podcasts' }),
            }),
      );
    });
    fakeAdminEndpoint('POST', '/apps/installations/', () =>
      apiError(409, { type: 'ConflictError', code: 'APP_ALREADY_INSTALLED' }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.installButton().click();

    await expect
      .element(appsScreen.installDialog())
      .toHaveTextContent('Podcast is already installed');
    await expect.element(appsScreen.openButton()).toBeVisible();
    // Nothing is left to review, so nothing says to review it again.
    await expect.element(appsScreen.notice()).not.toBeInTheDocument();
    await expect.element(appsScreen.approveChangesButton()).not.toBeInTheDocument();
    expect(previews).toBe(2);
  });

  it('reviews where the installation stands when someone else changed it in the meantime', async () => {
    fakeInstallations([installation({ manifest_url: PREVIOUS_URL })]);
    const previewApi = fakePreview(
      previewResponse(
        preview({
          manifest: manifest({ name: 'Podcasts' }),
          digest: 'digest-2',
          installation: moving([{ kind: 'field', path: 'name', requires_approval: true }]),
        }),
      ),
    );
    // Someone else approved a move first, so the review now starts from that.
    const moved = preview({
      manifest: manifest({ name: 'Podcasts' }),
      digest: 'digest-2',
      installation: {
        ...existing([
          { kind: 'field', path: 'manifest_url', requires_approval: true },
          { kind: 'field', path: 'name', requires_approval: true },
          { kind: 'field', path: 'surfaces[0].url', requires_approval: true },
        ]),
        revision: 1,
        manifest_url: 'https://new.example.com/ghost-app.json',
        manifest: manifest({
          manifest_url: 'https://new.example.com/ghost-app.json',
          surfaces: [{ type: 'admin_page', url: 'https://new.example.com/admin' }],
        }),
      },
    });
    const approveApi = fakeAdminEndpoint('PUT', '/apps/installations/installation-1/', () =>
      apiError(409, { type: 'ConflictError', code: 'APP_INSTALLATION_CHANGED', details: moved }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.approveChangesButton().click();

    await expect.element(appsScreen.notice()).toHaveTextContent('has changed since you opened it');
    await expect
      .element(appsScreen.changes().filter({ hasText: 'Install link' }))
      .toHaveTextContent(`Was: https://new.example.com/ghost-app.jsonNow: ${MANIFEST_URL}`);
    expect(previewApi.requests).toHaveLength(1);
    expect(approveApi.requests).toHaveLength(1);
  });

  it('checks again when the installation changed and Ghost sent no review', async () => {
    fakeInstallations([installation({ manifest_url: PREVIOUS_URL })]);
    let previews = 0;
    fakePreview(() => {
      previews += 1;
      return previewResponse(
        preview({
          manifest: manifest({ name: 'Podcasts' }),
          digest: 'digest-2',
          installation: moving([{ kind: 'field', path: 'name', requires_approval: true }]),
        }),
      );
    });
    fakeAdminEndpoint('PUT', '/apps/installations/installation-1/', () =>
      apiError(409, { type: 'ConflictError', code: 'APP_INSTALLATION_CHANGED' }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.approveChangesButton().click();

    await expect.element(appsScreen.notice()).toHaveTextContent('has changed since you opened it');
    expect(previews).toBe(2);
  });

  it('offers a fresh install when the app was uninstalled in the meantime', async () => {
    fakeInstallations();
    let previews = 0;
    fakePreview(() => {
      previews += 1;
      return previewResponse(previews === 1 ? preview({ installation: moving([]) }) : preview());
    });
    fakeAdminEndpoint('PUT', '/apps/installations/installation-1/', () =>
      apiError(409, { type: 'ConflictError', code: 'APP_INSTALLATION_UNINSTALLED' }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.approveChangesButton().click();

    await expect.element(appsScreen.notice()).toHaveTextContent('has changed since you opened it');
    await expect.element(appsScreen.installButton()).toBeVisible();
  });

  it('says it couldn’t approve the changes when the app is no longer valid', async () => {
    fakeInstallations([installation({ manifest_url: PREVIOUS_URL })]);
    fakePreview(
      previewResponse(
        preview({
          manifest: manifest({ name: 'Podcasts' }),
          digest: 'digest-2',
          installation: moving([{ kind: 'field', path: 'name', requires_approval: true }]),
        }),
      ),
    );
    fakeAdminEndpoint('PUT', '/apps/installations/installation-1/', () =>
      apiError(422, {
        type: 'ValidationError',
        code: 'APP_MANIFEST_INVALID',
        message: 'The app manifest is not valid.',
        context: 'surfaces[0].url: Expected an https URL',
        details: [{ path: 'surfaces[0].url', message: 'Expected an https URL' }],
      }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.approveChangesButton().click();

    await expect
      .element(appsScreen.installDialog())
      .toHaveTextContent('Couldn’t approve the changes');
    await expect.element(appsScreen.installDialog()).not.toHaveTextContent('install');
    await expect.element(appsScreen.problems()).toHaveTextContent('Expected an https URL');
  });

  it('keeps the notice on the review when trying again after confirming fails', async () => {
    fakeInstallations();
    const changed = preview({ manifest: manifest({ name: 'Podcasts' }), digest: 'digest-2' });
    fakePreview(previewResponse(preview()));
    let attempts = 0;
    let finishRetry = () => {};
    const retried = new Promise<void>((resolve) => {
      finishRetry = resolve;
    });
    fakeAdminEndpoint('POST', '/apps/installations/', async () => {
      attempts += 1;
      if (attempts === 1) {
        return apiError(409, {
          type: 'ConflictError',
          code: 'APP_MANIFEST_CHANGED',
          details: changed,
        });
      }
      if (attempts === 3) {
        await retried;
      }
      return apiError(500, { type: 'InternalServerError', code: 'UNEXPECTED_ERROR' });
    });

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.installButton().click();
    await expect.element(appsScreen.notice()).toHaveTextContent('has changed since you opened it');
    await appsScreen.installButton().click();
    await expect.element(appsScreen.installDialog()).toHaveTextContent('Couldn’t install this app');

    await appsScreen.tryAgainButton().click();

    // While it installs again, the review is back with its notice.
    await expect.poll(() => attempts).toBe(3);
    await expect.element(appsScreen.notice()).toHaveTextContent('has changed since you opened it');
    finishRetry();
    await expect.element(appsScreen.installDialog()).toHaveTextContent('Couldn’t install this app');
  });

  it('reviews another app from its own link after an install failed, rather than offering the retry', async () => {
    fakeInstallations();
    const otherUrl = 'https://notes.example.com/ghost-app.json';
    const other = manifest({ id: 'com.example.notes', name: 'Notes' });
    fakePreview(({ body }) => {
      const [asked] = (body as { app_installation_previews: { manifest_url: string }[] })
        .app_installation_previews;
      const reviewed =
        asked.manifest_url === otherUrl
          ? preview({ manifest_url: otherUrl, manifest: other })
          : preview();
      return previewResponse(reviewed);
    });
    fakeAdminEndpoint('POST', '/apps/installations/', () =>
      apiError(500, { type: 'InternalServerError', code: 'UNEXPECTED_ERROR' }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.installButton().click();
    await expect.element(appsScreen.installDialog()).toHaveTextContent('Couldn’t install this app');
    window.location.hash = `#/apps/install?manifest=${encodeURIComponent(otherUrl)}`;

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Notes');
    await expect.element(appsScreen.installButton()).toBeVisible();
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
    await fakeAppPage(installation());

    await renderAdminApp(INSTALL_ROUTE, { labs });
    await appsScreen.installButton().click();

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Couldn’t install this app');
    await appsScreen.tryAgainButton().click();

    // While it installs again, the review stays on screen as it did the first time.
    await expect.poll(() => installApi.requests.length).toBe(2);
    await expect.element(appsScreen.installButton()).toBeDisabled();
    await expect.element(appsScreen.installDialog()).not.toHaveTextContent('Loading app details');
    finishRetry();

    await expect.poll(currentRoute).toBe('/apps/installation-1');
    expect(installApi.requests).toHaveLength(2);
    expect(previewApi.requests).toHaveLength(1);
  });

  it('says when an install link doesn’t name an app, without blaming a developer', async () => {
    fakeInstallations();
    const previewApi = fakePreview(previewResponse(preview()));

    await renderAdminApp('/apps/install', { labs });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Couldn’t load app details');
    await expect.element(appsScreen.installDialog()).toHaveTextContent('doesn’t say which app');
    await expect.element(appsScreen.installDialog()).not.toHaveTextContent('developer');
    await expect(appsScreen.problems()).toHaveCount(0);
    expect(previewApi.requests).toHaveLength(0);
  });

  it('lists what is wrong with an invalid app for its developer, and installs nothing', async () => {
    fakeInstallations();
    fakePreview(
      apiError(422, {
        type: 'ValidationError',
        code: 'APP_MANIFEST_INVALID',
        message: 'The app manifest is not valid.',
        context: 'id: Expected a lowercase reverse-domain ID',
        details: [{ path: 'id', message: 'Expected a lowercase reverse-domain ID' }],
      }),
    );

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Couldn’t load app details');
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
            message: 'Could not load the app’s manifest.',
            context: `${MANIFEST_URL} answered with HTTP 503`,
          })
        : previewResponse(preview());
    });

    await renderAdminApp(INSTALL_ROUTE, { labs });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Couldn’t load app details');
    await expect.element(appsScreen.installDialog()).toHaveTextContent('didn’t answer as expected');
    await expect.element(appsScreen.unreachable()).toHaveTextContent('answered with HTTP 503');
    await appsScreen.tryAgainButton().click();

    await expect.element(appsScreen.installButton()).toBeVisible();
  });

  it('tells staff who can’t install apps who can, without checking the app', async () => {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Editor' })];

    // No preview is faked: a request to check the app would fail the test.
    await renderAdminApp(INSTALL_ROUTE, { labs, boot: { browseMe: { response: me } } });

    await expect
      .element(appsScreen.notAllowedDialog())
      .toHaveTextContent('Only the site owner and administrators can install apps');
    await expect.element(appsScreen.installDialog()).not.toBeInTheDocument();
    await appsScreen.okButton().click();

    // Home sends an editor on to the site preview.
    await expect.poll(currentRoute).toBe('/site');
  });
});

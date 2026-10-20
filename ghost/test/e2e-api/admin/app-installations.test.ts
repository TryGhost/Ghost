import assert from 'node:assert/strict';
import logging from '@tryghost/logging';
import ObjectId from 'bson-objectid';
import nock from 'nock';
import sinon from 'sinon';
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';

// Required, not imported, so this is the same module instance Ghost initialised at boot.
const appInstallations: typeof import('../../../core/server/services/app-installations').default =
  require('../../../core/server/services/app-installations').default;
const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'com.example.podcast',
    name: 'Podcast',
    description: 'Publish episodes and embed players.',
    author: { name: 'Example Audio', url: 'https://example.com' },
    accent_color: '#ff5500',
    icon: { name: 'audio-lines' },
    surfaces: [{ type: 'admin_page', url: '/admin' }],
    ...overrides,
  };
}

describe('App installations Admin API', function () {
  let agent: {
    get: (_url: string) => any;
    post: (_url: string) => any;
    put: (_url: string) => any;
    delete: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
    loginAsAdmin: () => Promise<void>;
    loginAsEditor: () => Promise<void>;
    loginAsContributor: () => Promise<void>;
    useZapierAdminAPIKey: () => Promise<void>;
    useStaffTokenForAdmin: () => Promise<void>;
  };
  let owner: { actor: { id: string; type: 'user' } };

  const service = () => appInstallations.service;
  const MANIFEST_HOST = 'https://podcast.example.com';
  const MANIFEST_PATH = '/ghost-app.json';
  const serve = (body: unknown, url = MANIFEST_HOST + MANIFEST_PATH) => {
    const { origin, pathname } = new URL(url);
    return nock(origin)
      .get(pathname)
      .reply(200, body as Record<string, unknown>);
  };
  const ICON_PATH = '/icon.svg';
  const ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
  const NEW_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle r="12"/></svg>';
  /** A manifest's icon as an SVG the app serves, rather than one Admin ships. */
  const servedIcon = { icon: { url: ICON_PATH } };
  /** Serves the app's icon, `times` times. */
  const serveIcon = (svg = ICON, times = 1) =>
    nock(MANIFEST_HOST).get(ICON_PATH).times(times).reply(200, svg);
  /** Confirms an install of the app as served, with the digest the publisher reviewed. */
  const installReviewed = (digest: string, overrides: Record<string, unknown> = {}) => {
    serve(manifest(overrides));
    return service().create(owner, { manifestUrl: MANIFEST_URL, digest });
  };
  /**
   * Installs the app as a publisher would: previewed, then confirmed. Hands back the
   * installation with the digest the publisher confirmed.
   */
  const install = async (overrides: Record<string, unknown> = {}) => {
    serve(manifest(overrides));
    const { digest } = await service().preview(MANIFEST_URL);
    return { ...(await installReviewed(digest, overrides)), digest };
  };
  const preview = async (manifestUrl = MANIFEST_URL, status = 200) => {
    const { body } = await agent
      .post('apps/installations/preview/')
      .body({ app_installation_previews: [{ manifest_url: manifestUrl }] })
      .expectStatus(status);
    return status === 200 ? body.app_installation_previews[0] : body.errors[0];
  };
  const actions = () =>
    models.Base.knex('actions')
      .where('resource_type', 'app_installation')
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc');
  const installationRow = (id: string) =>
    models.Base.knex('app_installations').where({ id }).first();
  const manifestRows = () => models.Base.knex('app_installation_manifests').orderBy('id', 'asc');
  /**
   * Replaces a stored manifest with one the contract rejects, as one stored under an older
   * contract can be.
   */
  const outdate = (manifestId: string) =>
    models.Base.knex('app_installation_manifests')
      .where({ id: manifestId })
      .update({ manifest: JSON.stringify({ id: 'com.example.podcast' }) });
  /** Starts an app session, as Admin does when an app page opens. */
  const start = (id: string, status = 200) =>
    agent.post(`apps/installations/${id}/sessions/`).expectStatus(status);

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'integrations', 'api_keys');
    owner = { actor: { id: fixtureManager.get('users', 0).id, type: 'user' } };
    await agent.loginAsOwner();
  });

  beforeEach(function () {
    mockManager.disableNetwork();
  });

  afterEach(async function () {
    sinon.restore();
    nock.cleanAll();
    mockManager.restore();
    await configUtils.restore();
    await models.Base.knex('app_installation_manifests').del();
    await models.Base.knex('app_installations').del();
    await models.Base.knex('actions').where('resource_type', 'app_installation').del();
  });

  describe('installing', function () {
    it('stores the validated manifest, with its URLs resolved', async function () {
      const installation = await install();

      assert.match(installation.id, /^[a-f\d]{24}$/);
      assert.equal(installation.app_id, 'com.example.podcast');
      assert.equal(installation.status, 'active');
      assert.equal(installation.manifest_url, MANIFEST_URL);
      assert.deepEqual(installation.manifest.surfaces, [
        { type: 'admin_page', url: 'https://podcast.example.com/admin' },
      ]);
      assert.ok(installation.created_at instanceof Date);
    });

    it('keeps the manifest as the approved one, with its digest', async function () {
      const installation = await install();

      const [stored] = await manifestRows();
      assert.equal(stored.installation_id, installation.id);
      assert.equal(stored.manifest_url, MANIFEST_URL);
      assert.deepEqual(JSON.parse(stored.manifest), installation.manifest);
      assert.equal(stored.digest, installation.digest);
      assert.equal(Boolean(stored.requires_approval), false);

      const installed = await installationRow(installation.id);
      assert.equal(installed.manifest_id, stored.id);
      assert.equal(installed.pending_manifest_id, null);
      assert.equal(installed.revision, 0);
    });

    it('refuses a second installation of an app that is already installed', async function () {
      await install();
      await assert.rejects(install(), { errorType: 'ConflictError' });
      assert.equal((await service().browse()).length, 1);
      assert.equal((await manifestRows()).length, 1);
    });

    it('refuses a second installation of an app that is suspended', async function () {
      const suspended = await install();
      await models.Base.knex('app_installations')
        .where({ id: suspended.id })
        .update({ status: 'suspended' });

      await assert.rejects(install(), { errorType: 'ConflictError' });
      assert.deepEqual(
        (await service().browse()).map((installation) => installation.status),
        ['suspended'],
      );
    });

    it('lets only one of three simultaneous confirmations install the app', async function () {
      serve(manifest());
      const { digest } = await service().preview(MANIFEST_URL);

      const results = await Promise.allSettled([
        installReviewed(digest),
        installReviewed(digest),
        installReviewed(digest),
      ]);

      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      for (const result of results) {
        if (result.status === 'rejected') {
          assert.equal(result.reason.errorType, 'ConflictError', result.reason.message);
          assert.equal(result.reason.code, 'APP_ALREADY_INSTALLED');
        }
      }
      assert.equal((await service().browse()).length, 1);
      assert.equal((await manifestRows()).length, 1);
      assert.equal((await actions()).length, 1);
    });

    it('installs different apps side by side', async function () {
      await install();
      await install({ id: 'com.example.other', name: 'Other' });

      assert.deepEqual(
        (await service().browse()).map((installation) => installation.app_id),
        ['com.example.podcast', 'com.example.other'],
      );
    });

    it('creates a new installation on reinstall, and never revives the old one', async function () {
      const first = await install();
      await service().uninstall(owner, first.id);
      const second = await install();

      assert.notEqual(second.id, first.id);
      assert.equal(second.status, 'active');
      assert.equal((await service().read(first.id)).status, 'uninstalled');
      assert.equal(
        await models.Base.knex('app_installations')
          .count('* as count')
          .first()
          .then((row: any) => Number(row.count)),
        2,
      );
    });

    it('records who installed the app in the staff history', async function () {
      const installation = await install();

      const [action] = await actions();
      assert.equal(action.event, 'installed');
      assert.equal(action.resource_id, installation.id);
      assert.equal(action.actor_type, 'user');
      assert.equal(action.actor_id, owner.actor.id);
      assert.deepEqual(JSON.parse(action.context), {
        primary_name: 'Podcast',
        app_id: 'com.example.podcast',
      });
    });
  });

  describe('POST /apps/installations/preview/', function () {
    it('fetches and checks a manifest without storing anything', async function () {
      serve(manifest());

      const result = await preview();

      assert.equal(result.manifest_url, MANIFEST_URL);
      assert.equal(result.manifest.surfaces[0].url, `${MANIFEST_HOST}/admin`);
      assert.match(result.digest, /^[a-f\d]{64}$/);
      assert.equal(result.installation, null);
      assert.equal((await service().browse()).length, 0);
    });

    it('shows what would change for an app that is already installed', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts', description: 'New words.' }));

      const result = await preview();

      assert.deepEqual(result.installation, {
        id: installed.id,
        status: 'active',
        revision: 0,
        manifest_url: MANIFEST_URL,
        manifest: installed.manifest,
        icon_svg: null,
        changes: [
          { path: 'description', requires_approval: false },
          { path: 'name', requires_approval: true },
        ],
      });
    });

    it('follows a redirect on the same host, and resolves URLs from where it ends', async function () {
      nock(MANIFEST_HOST).get(MANIFEST_PATH).reply(302, '', { location: '/v2/ghost-app.json' });
      serve(
        manifest({ surfaces: [{ type: 'admin_page', url: 'admin' }] }),
        `${MANIFEST_HOST}/v2/ghost-app.json`,
      );

      const result = await preview();

      assert.equal(result.manifest_url, MANIFEST_URL);
      assert.equal(result.manifest.surfaces[0].url, `${MANIFEST_HOST}/v2/admin`);
    });

    it('refuses a manifest that redirects to another host', async function () {
      nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(302, '', { location: 'https://elsewhere.example.net/ghost-app.json' });

      const error = await preview(MANIFEST_URL, 422);
      assert.equal(error.code, 'APP_MANIFEST_REDIRECTED');
    });

    it('explains when the app cannot be reached, without saying more than its answer', async function () {
      nock(MANIFEST_HOST).get(MANIFEST_PATH).reply(404);

      const error = await preview(MANIFEST_URL, 422);
      assert.equal(error.code, 'APP_MANIFEST_UNREACHABLE');
      assert.match(error.context, /ghost-app\.json answered with HTTP 404$/);
    });

    it('checks the manifest URL before fetching anything', async function () {
      for (const manifestUrl of [
        'podcast.example.com/ghost-app.json',
        'http://podcast.example.com/ghost-app.json',
        Object.assign(new URL(MANIFEST_URL), { username: 'user', password: 'example' }).href,
        `${MANIFEST_HOST}/${'a'.repeat(2000)}`,
      ]) {
        // Nothing is served for these, so a fetch would fail as unreachable instead.
        const error = await preview(manifestUrl, 422);
        assert.equal(error.code, 'APP_MANIFEST_URL_INVALID', manifestUrl);
      }
    });

    it('refuses a manifest that is not JSON', async function () {
      nock(MANIFEST_HOST).get(MANIFEST_PATH).reply(200, '<html></html>');

      const error = await preview(MANIFEST_URL, 422);
      assert.equal(error.code, 'APP_MANIFEST_NOT_JSON');
    });

    it('refuses a manifest larger than it can store', async function () {
      nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(200, JSON.stringify({ ...manifest(), padding: 'a'.repeat(70 * 1024) }));

      const error = await preview(MANIFEST_URL, 422);
      assert.equal(error.code, 'APP_MANIFEST_TOO_LARGE');
    });

    it('lists what is wrong with a manifest that is not valid', async function () {
      serve(manifest({ id: 'Podcast' }));

      const error = await preview(MANIFEST_URL, 422);
      assert.equal(error.code, 'APP_MANIFEST_INVALID');
      assert.match(error.context, /id: /);
      assert.deepEqual(
        error.details.map(({ path }: { path: string }) => path),
        ['id'],
      );
    });

    it('refuses an app served from the site itself', async function () {
      const siteUrl = configUtils.config.get('url');
      serve(
        manifest({ surfaces: [{ type: 'admin_page', url: `${siteUrl}/content/files/app.html` }] }),
      );

      const error = await preview(MANIFEST_URL, 422);
      assert.equal(error.code, 'APP_MANIFEST_INVALID');
      assert.deepEqual(
        error.details.map(({ path }: { path: string }) => path),
        ['surfaces[0].url'],
      );
    });
  });

  describe('POST /apps/installations/', function () {
    const confirm = (digest: string, status: number) =>
      agent
        .post('apps/installations/')
        .body({ app_installations: [{ manifest_url: MANIFEST_URL, digest }] })
        .expectStatus(status);

    it('installs the manifest that was reviewed', async function () {
      serve(manifest());
      const { digest } = await preview();
      serve(manifest());

      const { body } = await confirm(digest, 201);

      assert.equal(body.app_installations[0].app_id, 'com.example.podcast');
      assert.equal(body.app_installations[0].status, 'active');
      const [stored] = await manifestRows();
      assert.equal(stored.digest, digest);
      assert.equal((await actions())[0].event, 'installed');
    });

    it('refuses confirming another address with the digest reviewed elsewhere', async function () {
      // Every URL absolute, so the two addresses serve the very same manifest.
      const absolute = manifest({
        icon: { url: 'https://cdn.example.net/icon.svg' },
        surfaces: [{ type: 'admin_page', url: 'https://app.example.net/ghost' }],
      });
      // Fetched for the review, and again for the new review the refusal carries.
      nock('https://cdn.example.net').get('/icon.svg').times(2).reply(200, ICON);
      serve(absolute);
      const { digest } = await preview();
      const elsewhere = 'https://audio.example.org/ghost-app.json';
      serve(absolute, elsewhere);

      const { body } = await agent
        .post('apps/installations/')
        .body({ app_installations: [{ manifest_url: elsewhere, digest }] })
        .expectStatus(409);

      assert.equal(body.errors[0].code, 'APP_MANIFEST_CHANGED');
      assert.equal((await service().browse()).length, 0);
    });

    it('asks for a new review when the app changed in between', async function () {
      serve(manifest());
      const { digest } = await preview();
      serve(manifest({ name: 'Something else' }));

      const { body } = await confirm(digest, 409);

      assert.equal(body.errors[0].code, 'APP_MANIFEST_CHANGED');
      assert.equal(body.errors[0].details.manifest.name, 'Something else');
      assert.notEqual(body.errors[0].details.digest, digest);
      assert.equal((await service().browse()).length, 0);
    });

    it('refuses a manifest that is not valid, and stores nothing', async function () {
      serve(manifest());
      const { digest } = await preview();
      serve(manifest({ id: 'Podcast' }));

      const { body } = await confirm(digest, 422);

      assert.equal(body.errors[0].code, 'APP_MANIFEST_INVALID');
      assert.equal((await models.Base.knex('app_installations')).length, 0);
      assert.equal((await manifestRows()).length, 0);
      assert.equal((await actions()).length, 0);
    });

    it('refuses to install an app that is already installed', async function () {
      await install();
      serve(manifest());
      const { digest } = await preview();
      serve(manifest());

      const { body } = await confirm(digest, 409);
      assert.equal(body.errors[0].code, 'APP_ALREADY_INSTALLED');
    });

    it('keeps the manifest URL as it was checked, not as it was confirmed', async function () {
      const spelled = 'https://Podcast.Example.com/ghost-app.json#install';
      serve(manifest());
      const { digest } = await preview(spelled);
      serve(manifest());

      const { body } = await agent
        .post('apps/installations/')
        .body({ app_installations: [{ manifest_url: spelled, digest }] })
        .expectStatus(201);

      assert.equal(body.app_installations[0].manifest_url, MANIFEST_URL);
      const [stored] = await manifestRows();
      assert.equal(stored.manifest_url, MANIFEST_URL);
    });

    it('needs the reviewed digest', async function () {
      await agent
        .post('apps/installations/')
        .body({ app_installations: [{ manifest_url: MANIFEST_URL }] })
        .expectStatus(422);
    });
  });

  describe('PUT /apps/installations/:id/', function () {
    const NEW_URL = 'https://audio.example.org/ghost-app.json';
    const approve = (
      id: string,
      manifestUrl: string,
      digest: string,
      status: number,
      revision = 0,
    ) =>
      agent
        .put(`apps/installations/${id}/`)
        .body({ app_installations: [{ manifest_url: manifestUrl, digest, revision }] })
        .expectStatus(status);
    /**
     * Serves changes that need approval and starts a session, so the re-check stores them
     * as pending and suspends the app. Returns the pending manifest's ID.
     */
    const suspendWithPending = async (id: string, pending: Record<string, unknown>) => {
      serve(pending);
      await start(id);
      const row = await installationRow(id);
      assert.equal(row.status, 'suspended');
      return row.pending_manifest_id as string;
    };

    it('moves an app to where it is served now, keeping the installation', async function () {
      const installed = await install();
      serve(manifest(), NEW_URL);
      const reviewed = await preview(NEW_URL);
      assert.deepEqual(reviewed.installation.changes, [
        { path: 'manifest_url', requires_approval: true },
        { path: 'surfaces[0].url', requires_approval: true },
      ]);
      serve(manifest(), NEW_URL);

      const { body } = await approve(installed.id, NEW_URL, reviewed.digest, 200);

      assert.equal(body.app_installations[0].id, installed.id);
      assert.equal(body.app_installations[0].manifest_url, NEW_URL);
      assert.equal(
        body.app_installations[0].manifest.surfaces[0].url,
        'https://audio.example.org/admin',
      );

      const [first, second] = await manifestRows();
      const row = await installationRow(installed.id);
      assert.equal(row.manifest_id, second.id);
      assert.equal(row.revision, 1);
      assert.equal(Boolean(second.requires_approval), true);

      const [, action] = await actions();
      assert.equal(action.event, 'changes_approved');
      assert.equal(action.actor_id, owner.actor.id);
      assert.deepEqual(JSON.parse(action.context), {
        primary_name: 'Podcast',
        app_id: 'com.example.podcast',
        from_manifest_id: first.id,
        to_manifest_id: second.id,
      });
      assert.equal(first.source, 'install');
      assert.equal(second.source, 'approval');
    });

    it('changes nothing when approving what is already approved', async function () {
      const installed = await install();
      serve(manifest());
      const { digest } = await preview();
      serve(manifest());

      await approve(installed.id, MANIFEST_URL, digest, 200);

      assert.equal((await installationRow(installed.id)).revision, 0);
      assert.equal((await manifestRows()).length, 1);
      assert.equal((await actions()).length, 1);
    });

    it('approves changes that need no approval as an approval row', async function () {
      const installed = await install();
      serve(manifest({ description: 'Episodes and players.' }));
      const reviewed = await preview();
      assert.deepEqual(reviewed.installation.changes, [
        { path: 'description', requires_approval: false },
      ]);
      serve(manifest({ description: 'Episodes and players.' }));

      const { body } = await approve(installed.id, MANIFEST_URL, reviewed.digest, 200);

      assert.equal(body.app_installations[0].manifest.description, 'Episodes and players.');
      const [first, approved] = await manifestRows();
      assert.equal(approved.source, 'approval');
      assert.equal(Boolean(approved.requires_approval), false);
      const row = await installationRow(installed.id);
      assert.equal(row.manifest_id, approved.id);
      assert.equal(row.revision, 1);
      const [, action] = await actions();
      assert.equal(JSON.parse(action.context).from_manifest_id, first.id);
      assert.equal(JSON.parse(action.context).to_manifest_id, approved.id);
    });

    it('asks for a new review when the app changed in between', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      const { digest } = await preview();
      serve(manifest({ name: 'Something else' }));

      const { body } = await approve(installed.id, MANIFEST_URL, digest, 409);

      assert.equal(body.errors[0].code, 'APP_MANIFEST_CHANGED');
      assert.equal(body.errors[0].details.installation.id, installed.id);
      assert.equal((await service().read(installed.id)).manifest.name, 'Podcast');
      assert.equal((await manifestRows()).length, 1);
    });

    it('asks for a new review when the installation changed in between', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      const first = await preview();
      serve(manifest({ name: 'Podcasts' }));
      await approve(installed.id, MANIFEST_URL, first.digest, 200, first.installation.revision);

      serve(manifest({ name: 'Podcasts' }));
      const { body } = await approve(
        installed.id,
        MANIFEST_URL,
        first.digest,
        409,
        first.installation.revision,
      );

      assert.equal(body.errors[0].code, 'APP_INSTALLATION_CHANGED');
      assert.equal(body.errors[0].details.installation.revision, 1);
      assert.equal((await installationRow(installed.id)).revision, 1);
      assert.equal((await manifestRows()).length, 2);
    });

    it('asks for a new review when a re-check changes the installation while the reviewed manifest is fetched', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      const reviewed = await preview();
      nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(200, async () => {
          // An app session starts during the fetch, and its re-check finds other changes
          // that need approval, so it suspends the app.
          serve(manifest({ name: 'Podcasts!' }));
          await service().startSession(installed.id);
          return manifest({ name: 'Podcasts' });
        });

      const { body } = await approve(installed.id, MANIFEST_URL, reviewed.digest, 409);

      const [error] = body.errors;
      assert.equal(error.code, 'APP_INSTALLATION_CHANGED');
      // A new preview, against the installation as the re-check left it.
      assert.equal(error.details.digest, reviewed.digest);
      assert.equal(error.details.installation.status, 'suspended');
      assert.equal(error.details.installation.revision, 1);
      assert.deepEqual(error.details.installation.changes, [
        { path: 'name', requires_approval: true },
      ]);
      const row = await installationRow(installed.id);
      assert.equal(row.status, 'suspended');
      assert.equal(row.revision, 1);
      // The install and the re-check's pending manifest, and nothing from the approval.
      assert.equal((await manifestRows()).length, 2);
      assert.equal((await actions()).length, 1);
    });

    it('needs the revision that was reviewed, as a whole number', async function () {
      const installed = await install();
      serve(manifest());
      const { digest } = await preview();
      for (const revision of [undefined, '0', 1.5, -1]) {
        await agent
          .put(`apps/installations/${installed.id}/`)
          .body({ app_installations: [{ manifest_url: MANIFEST_URL, digest, revision }] })
          .expectStatus(422);
      }
    });

    it('runs a suspended app again once the changes it waits for are approved', async function () {
      const installed = await install();
      await suspendWithPending(installed.id, manifest({ name: 'Podcasts' }));
      serve(manifest({ name: 'Podcasts' }));
      const reviewed = await preview();
      assert.equal(reviewed.installation.status, 'suspended');
      assert.equal(reviewed.installation.revision, 1);
      serve(manifest({ name: 'Podcasts' }));

      const { body } = await approve(
        installed.id,
        MANIFEST_URL,
        reviewed.digest,
        200,
        reviewed.installation.revision,
      );

      assert.equal(body.app_installations[0].status, 'active');
      assert.equal(body.app_installations[0].manifest.name, 'Podcasts');
      const row = await installationRow(installed.id);
      assert.equal(row.pending_manifest_id, null);
      assert.equal(row.revision, 2);
    });

    it('approves the manifest waiting for approval as its own row, not a copy', async function () {
      const installed = await install();
      const pendingId = await suspendWithPending(installed.id, manifest({ name: 'Podcasts' }));
      serve(manifest({ name: 'Podcasts' }));
      const reviewed = await preview();
      serve(manifest({ name: 'Podcasts' }));

      await approve(
        installed.id,
        MANIFEST_URL,
        reviewed.digest,
        200,
        reviewed.installation.revision,
      );

      const row = await installationRow(installed.id);
      assert.equal(row.manifest_id, pendingId);
      assert.equal(row.pending_manifest_id, null);
      assert.equal((await manifestRows()).length, 2);
      const [, action] = await actions();
      assert.equal(JSON.parse(action.context).to_manifest_id, pendingId);

      const { body } = await agent
        .get(`apps/installations/${installed.id}/?include=history`)
        .expectStatus(200);
      const events = body.app_installations[0].history.map((entry: any) => entry.event);
      assert.ok(events.includes('suspended'), `expected a suspended entry in ${events}`);
    });

    it('approves a newer manifest than the pending one, replacing it', async function () {
      const installed = await install();
      const pendingId = await suspendWithPending(installed.id, manifest({ name: 'Podcasts' }));
      serve(manifest({ name: 'Podcasts!' }));
      const reviewed = await preview();
      serve(manifest({ name: 'Podcasts!' }));

      const { body } = await approve(
        installed.id,
        MANIFEST_URL,
        reviewed.digest,
        200,
        reviewed.installation.revision,
      );

      assert.equal(body.app_installations[0].status, 'active');
      assert.equal(body.app_installations[0].manifest.name, 'Podcasts!');
      const [first, waited, approved] = await manifestRows();
      assert.equal(waited.id, pendingId);
      assert.equal(approved.source, 'approval');
      assert.equal(Boolean(approved.requires_approval), true);
      const row = await installationRow(installed.id);
      assert.equal(row.manifest_id, approved.id);
      assert.equal(row.pending_manifest_id, null);
      assert.equal(row.revision, 2);
      const [, action] = await actions();
      assert.deepEqual(JSON.parse(action.context), {
        primary_name: 'Podcasts!',
        app_id: 'com.example.podcast',
        from_manifest_id: first.id,
        to_manifest_id: approved.id,
      });

      const { body: details } = await agent
        .get(`apps/installations/${installed.id}/?include=history`)
        .expectStatus(200);
      assert.deepEqual(
        details.app_installations[0].history.map((entry: any) => [
          entry.event,
          entry.actor?.name ?? null,
        ]),
        [
          ['changes_approved', 'Joe Bloggs'],
          ['suspended', null],
          ['installed', 'Joe Bloggs'],
        ],
      );
    });

    it('approves a newer manifest than a pending one stored under an older contract', async function () {
      const installed = await install();
      await outdate(await suspendWithPending(installed.id, manifest({ name: 'Podcasts' })));
      serve(manifest({ name: 'Podcasts!' }));
      const reviewed = await preview();
      serve(manifest({ name: 'Podcasts!' }));

      const { body } = await approve(
        installed.id,
        MANIFEST_URL,
        reviewed.digest,
        200,
        reviewed.installation.revision,
      );

      assert.equal(body.app_installations[0].status, 'active');
      assert.equal(body.app_installations[0].manifest.name, 'Podcasts!');
      assert.equal((await installationRow(installed.id)).pending_manifest_id, null);
    });

    // A pending manifest is recognised by its digest alone, which covers the address too.
    it('does not approve the pending manifest when the same manifest is approved from another address', async function () {
      const absolute = manifest({
        name: 'Podcasts',
        surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
      });
      const installed = await install();
      const pendingId = await suspendWithPending(installed.id, absolute);
      serve(absolute, NEW_URL);
      const reviewed = await preview(NEW_URL);
      serve(absolute, NEW_URL);

      await approve(installed.id, NEW_URL, reviewed.digest, 200, reviewed.installation.revision);

      const row = await installationRow(installed.id);
      assert.notEqual(row.manifest_id, pendingId);
      const rows = await manifestRows();
      const pending = rows.find((r: { id: string }) => r.id === pendingId);
      const approved = rows.find((r: { id: string }) => r.id === row.manifest_id);
      assert.equal(approved.manifest, pending.manifest);
      assert.equal(approved.manifest_url, NEW_URL);
      assert.equal(approved.source, 'approval');
    });

    it('lets go of a pending manifest the app went back on, keeping no copy', async function () {
      const installed = await install();
      await suspendWithPending(installed.id, manifest({ name: 'Podcasts' }));
      serve(manifest());
      const reviewed = await preview();
      assert.deepEqual(reviewed.installation.changes, []);
      serve(manifest());

      const { body } = await approve(
        installed.id,
        MANIFEST_URL,
        reviewed.digest,
        200,
        reviewed.installation.revision,
      );

      assert.equal(body.app_installations[0].status, 'active');
      assert.equal(body.app_installations[0].manifest.name, 'Podcast');
      const row = await installationRow(installed.id);
      assert.equal(row.pending_manifest_id, null);
      assert.equal(row.revision, 2);
      // The approved one and the pending one: approving added nothing.
      assert.equal((await manifestRows()).length, 2);
      const [, action] = await actions();
      assert.equal(action.event, 'changes_approved');
      assert.equal(JSON.parse(action.context).from_manifest_id, row.manifest_id);
      assert.equal(JSON.parse(action.context).to_manifest_id, row.manifest_id);
    });

    it('approves silent changes the app kept after going back on the pending ones, as an approval row', async function () {
      const installed = await install();
      const pendingId = await suspendWithPending(installed.id, manifest({ name: 'Podcasts' }));
      serve(manifest({ description: 'Episodes and players.' }));
      const reviewed = await preview();
      assert.deepEqual(reviewed.installation.changes, [
        { path: 'description', requires_approval: false },
      ]);
      serve(manifest({ description: 'Episodes and players.' }));

      const { body } = await approve(
        installed.id,
        MANIFEST_URL,
        reviewed.digest,
        200,
        reviewed.installation.revision,
      );

      assert.equal(body.app_installations[0].status, 'active');
      assert.equal(body.app_installations[0].manifest.name, 'Podcast');
      assert.equal(body.app_installations[0].manifest.description, 'Episodes and players.');
      const [first, waited, approved] = await manifestRows();
      assert.equal(waited.id, pendingId);
      assert.equal(approved.source, 'approval');
      assert.equal(Boolean(approved.requires_approval), false);
      const row = await installationRow(installed.id);
      assert.equal(row.manifest_id, approved.id);
      assert.equal(row.pending_manifest_id, null);
      assert.equal(row.revision, 2);
      const [, action] = await actions();
      assert.equal(JSON.parse(action.context).from_manifest_id, first.id);
      assert.equal(JSON.parse(action.context).to_manifest_id, approved.id);
    });

    it('refuses a manifest for a different app', async function () {
      const installed = await install();
      serve(manifest({ id: 'com.example.other' }), NEW_URL);
      const { digest } = await preview(NEW_URL);
      serve(manifest({ id: 'com.example.other' }), NEW_URL);

      const { body } = await approve(installed.id, NEW_URL, digest, 422);
      assert.equal(body.errors[0].code, 'APP_MANIFEST_OTHER_APP');
    });

    it('refuses an installation that has been uninstalled, without fetching', async function () {
      const installed = await install();
      serve(manifest());
      const { digest } = await preview();
      await service().uninstall(owner, installed.id);
      const unfetched = serve(manifest());

      const { body } = await approve(installed.id, MANIFEST_URL, digest, 409);
      assert.equal(body.errors[0].code, 'APP_INSTALLATION_UNINSTALLED');
      assert.equal(unfetched.isDone(), false);
    });

    it('refuses an installation uninstalled while the reviewed manifest is fetched', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      const reviewed = await preview();
      nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(200, async () => {
          await service().uninstall(owner, installed.id);
          return manifest({ name: 'Podcasts' });
        });

      const { body } = await approve(installed.id, MANIFEST_URL, reviewed.digest, 409);

      assert.equal(body.errors[0].code, 'APP_INSTALLATION_UNINSTALLED');
      const row = await installationRow(installed.id);
      assert.equal(row.status, 'uninstalled');
      assert.equal(row.revision, 1);
      assert.equal((await manifestRows()).length, 1);
      assert.deepEqual(
        (await actions()).map((action: { event: string }) => action.event),
        ['installed', 'uninstalled'],
      );
    });

    it('refuses an installation uninstalled while an out-of-date review’s manifest is fetched', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      const reviewed = await preview();
      await suspendWithPending(installed.id, manifest({ name: 'Podcasts!' }));
      nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(200, async () => {
          await service().uninstall(owner, installed.id);
          return manifest({ name: 'Podcasts' });
        });

      const { body } = await approve(
        installed.id,
        MANIFEST_URL,
        reviewed.digest,
        409,
        reviewed.installation.revision,
      );

      assert.equal(body.errors[0].code, 'APP_INSTALLATION_UNINSTALLED');
      assert.equal((await installationRow(installed.id)).status, 'uninstalled');
      assert.equal((await manifestRows()).length, 2);
    });
  });

  describe('POST /apps/installations/:id/sessions/', function () {
    const pendingOf = async (id: string) => {
      const row = await installationRow(id);
      return row.pending_manifest_id
        ? models.Base.knex('app_installation_manifests')
            .where({ id: row.pending_manifest_id })
            .first()
        : null;
    };

    it('returns the installation, changing nothing when the manifest is unchanged', async function () {
      const installed = await install();
      serve(manifest());

      const { body } = await start(installed.id);

      assert.deepEqual(Object.keys(body), ['app_sessions']);
      const [session] = body.app_sessions;
      assert.deepEqual(Object.keys(session), ['installation']);
      assert.equal(session.installation.id, installed.id);
      assert.equal(session.installation.status, 'active');
      assert.equal(session.installation.revision, 0);
      assert.equal((await manifestRows()).length, 1);
      assert.equal((await installationRow(installed.id)).revision, 0);
    });

    it('applies changes that need no approval, as a new manifest row', async function () {
      const installed = await install();
      serve(manifest({ description: 'Episodes and players.', accent_color: '#00ff00' }));

      const { body } = await start(installed.id);

      const [session] = body.app_sessions;
      assert.equal(session.installation.revision, 1);
      assert.equal(session.installation.status, 'active');
      assert.equal(session.installation.manifest.description, 'Episodes and players.');
      assert.equal(session.installation.manifest.accent_color, '#00ff00');
      const rows = await manifestRows();
      assert.equal(rows.length, 2);
      const row = await installationRow(installed.id);
      const applied = rows.find((stored: any) => stored.id === row.manifest_id);
      assert.equal(applied.source, 'update');
      assert.equal(Boolean(applied.requires_approval), false);
      assert.equal(row.pending_manifest_id, null);
      assert.equal(row.revision, 1);
      // No person made this change, so there's no staff history entry.
      assert.equal((await actions()).length, 1);
    });

    it('suspends the app on changes that need approval, keeping the approved manifest', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));

      const { body } = await start(installed.id);

      const { installation } = body.app_sessions[0];
      assert.equal(installation.status, 'suspended');
      assert.equal(installation.manifest.name, 'Podcast');
      const pending = await pendingOf(installed.id);
      assert.equal(JSON.parse(pending.manifest).name, 'Podcasts');
      assert.equal(pending.source, 'update');
      assert.equal(Boolean(pending.requires_approval), true);
      assert.equal((await installationRow(installed.id)).revision, 1);
      assert.equal((await actions()).length, 1);
    });

    it('replaces an older pending manifest with the newer one', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      await start(installed.id);
      const first = await pendingOf(installed.id);
      serve(manifest({ name: 'Podcasts!' }));

      await start(installed.id);

      const second = await pendingOf(installed.id);
      assert.notEqual(second.id, first.id);
      assert.equal(JSON.parse(second.manifest).name, 'Podcasts!');
      assert.equal((await installationRow(installed.id)).revision, 2);
    });

    it('changes nothing when the manifest is the pending one', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      await start(installed.id);
      serve(manifest({ name: 'Podcasts' }));

      await start(installed.id);

      assert.equal((await manifestRows()).length, 2);
      assert.equal((await installationRow(installed.id)).revision, 1);
    });

    it('lifts a suspension when the app reverts the pending changes', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      await start(installed.id);
      serve(manifest());

      const { body } = await start(installed.id);

      assert.equal(body.app_sessions[0].installation.status, 'active');
      assert.equal(body.app_sessions[0].installation.manifest.name, 'Podcast');
      const row = await installationRow(installed.id);
      assert.equal(row.pending_manifest_id, null);
      assert.equal(row.revision, 2);
      // The approved manifest again, in a new row so the history can show the app resuming.
      const [approved, waited, resumed] = await manifestRows();
      assert.equal(row.manifest_id, resumed.id);
      assert.equal(resumed.source, 'resume');
      assert.equal(Boolean(resumed.requires_approval), false);
      assert.equal(resumed.digest, approved.digest);
      assert.notEqual(resumed.id, waited.id);
      // No person made this change, so there's no staff history entry.
      assert.equal((await actions()).length, 1);

      const { body: details } = await agent
        .get(`apps/installations/${installed.id}/?include=history`)
        .expectStatus(200);
      assert.deepEqual(
        details.app_installations[0].history.map((entry: any) => [
          entry.event,
          entry.actor?.name ?? null,
        ]),
        [
          ['resumed', null],
          ['suspended', null],
          ['installed', 'Joe Bloggs'],
        ],
      );
    });

    it('lifts a suspension whose pending manifest was stored under an older contract', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      await start(installed.id);
      await outdate((await pendingOf(installed.id)).id);
      serve(manifest());

      const { body } = await start(installed.id);

      assert.equal(body.app_sessions[0].installation.status, 'active');
      const row = await installationRow(installed.id);
      assert.equal(row.pending_manifest_id, null);
      assert.equal(row.revision, 2);
    });

    it('applies a silent change while other changes are pending, clearing them', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      await start(installed.id);
      serve(manifest({ description: 'Episodes and players.' }));

      const { body } = await start(installed.id);

      const { installation } = body.app_sessions[0];
      assert.equal(installation.status, 'active');
      assert.equal(installation.manifest.name, 'Podcast');
      assert.equal(installation.manifest.description, 'Episodes and players.');
      const row = await installationRow(installed.id);
      assert.equal(row.pending_manifest_id, null);
      const resumed = (await manifestRows()).find((stored: any) => stored.id === row.manifest_id);
      assert.equal(resumed.source, 'resume');
      assert.equal(Boolean(resumed.requires_approval), false);

      const { body: details } = await agent
        .get(`apps/installations/${installed.id}/?include=history`)
        .expectStatus(200);
      assert.deepEqual(
        details.app_installations[0].history.map((entry: any) => entry.event),
        ['resumed', 'suspended', 'installed'],
      );
    });

    it('fails as unavailable when the app cannot be reached, changing nothing, and opens again once it can', async function () {
      const installed = await install();
      nock(MANIFEST_HOST).get(MANIFEST_PATH).reply(503);
      const warn = sinon.stub(logging, 'warn');

      const { body } = await start(installed.id, 409);

      assert.equal(body.errors[0].code, 'APP_UNAVAILABLE');
      assert.match(body.errors[0].context, /^APP_MANIFEST_UNREACHABLE: /);
      assert.equal((await manifestRows()).length, 1);
      assert.equal((await installationRow(installed.id)).revision, 0);
      // The loader logs why the request failed, which the answer leaves out.
      assert.ok(warn.calledWith(`Could not load the app manifest at ${MANIFEST_URL}`));

      serve(manifest());
      const { body: opened } = await start(installed.id);
      assert.equal(opened.app_sessions[0].installation.status, 'active');
      assert.equal(opened.app_sessions[0].installation.revision, 0);
    });

    it('fails as unavailable when the fetched manifest is not valid, saying why', async function () {
      const installed = await install();
      serve(manifest({ accent_color: 'red' }));

      const { body } = await start(installed.id, 409);

      assert.equal(body.errors[0].code, 'APP_UNAVAILABLE');
      assert.equal((await manifestRows()).length, 1);
      assert.equal((await installationRow(installed.id)).revision, 0);
      assert.match(body.errors[0].context, /^APP_MANIFEST_INVALID: .*\(accent_color: /);
    });

    it('fails as unavailable when the manifest URL serves another app, saying why', async function () {
      const installed = await install();
      serve(manifest({ id: 'com.example.other' }));

      const { body } = await start(installed.id, 409);

      assert.equal(body.errors[0].code, 'APP_UNAVAILABLE');
      assert.equal((await manifestRows()).length, 1);
      assert.equal((await installationRow(installed.id)).revision, 0);
      assert.match(
        body.errors[0].context,
        /^APP_MANIFEST_OTHER_APP: .* now serves com\.example\.other/,
      );
    });

    it('fails as unavailable when the manifest URL redirects to another host, saying where', async function () {
      const installed = await install();
      nock(MANIFEST_HOST).get(MANIFEST_PATH).reply(302, undefined, {
        location: 'https://elsewhere.example.com/ghost-app.json',
      });
      const { body } = await start(installed.id, 409);

      assert.equal(body.errors[0].code, 'APP_UNAVAILABLE');
      assert.equal((await manifestRows()).length, 1);
      assert.match(
        body.errors[0].context,
        /^APP_MANIFEST_REDIRECTED: .*redirects to elsewhere\.example\.com\)$/,
      );
    });

    it('fails the session on an error that is not about the manifest, then tries again', async function () {
      const installed = await install();
      // A fault in Ghost, not the app, so it isn't reported as the app being unavailable.
      const load = sinon
        .stub(service() as unknown as { loadManifest: () => Promise<unknown> }, 'loadManifest')
        .rejects(new Error('Ghost broke'));
      sinon.stub(logging, 'error');

      await start(installed.id, 500);

      assert.equal((await manifestRows()).length, 1);
      assert.equal((await installationRow(installed.id)).revision, 0);
      // The failed re-check is not shared with the next session.
      load.restore();
      serve(manifest({ description: 'Changed' }));
      const { body } = await start(installed.id);
      assert.equal(body.app_sessions[0].installation.revision, 1);
    });

    it('answers 404 for an installation that has been uninstalled, without fetching', async function () {
      const installed = await install();
      await agent.delete(`apps/installations/${installed.id}/`).expectStatus(204);
      const served = serve(manifest());

      const { body } = await start(installed.id, 404);

      assert.equal(body.errors[0].code, 'APP_NOT_INSTALLED');
      assert.equal(served.isDone(), false);
    });

    it('doesn’t bring back an installation uninstalled while the manifest was being fetched', async function () {
      const installed = await install();
      nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(200, async () => {
          await service().uninstall(owner, installed.id);
          return manifest({ description: 'Changed' });
        });

      // The installation is gone by the time the fetch returns, so there's no session to start.
      const { body } = await start(installed.id, 404);

      assert.equal(body.errors[0].code, 'APP_NOT_INSTALLED');
      const row = await installationRow(installed.id);
      assert.equal(row.status, 'uninstalled');
      assert.equal((await manifestRows()).length, 1);
    });

    it('answers 404 for an app uninstalled while fetching a manifest it can’t use', async function () {
      const installed = await install();
      nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(200, async () => {
          await service().uninstall(owner, installed.id);
          return manifest({ accent_color: 'red' });
        });

      const { body } = await start(installed.id, 404);

      assert.equal(body.errors[0].code, 'APP_NOT_INSTALLED');
    });

    it('doesn’t change a new installation of the same app made while the manifest was being fetched', async function () {
      const installed = await install();
      let reinstalled: { id: string } | undefined;
      nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(200, async () => {
          await service().uninstall(owner, installed.id);
          reinstalled = await install();
          return manifest({ name: 'Podcasts' });
        });

      await start(installed.id, 404);

      assert.notEqual(reinstalled!.id, installed.id);
      assert.equal((await installationRow(installed.id)).status, 'uninstalled');
      const later = await installationRow(reinstalled!.id);
      assert.equal(later.status, 'active');
      assert.equal(later.revision, 0);
      assert.equal(later.pending_manifest_id, null);
      // The approved manifest of each installation, and nothing from the re-check.
      assert.equal((await manifestRows()).length, 2);
    });

    it('shows up in the app’s history as an update or a suspension', async function () {
      const installed = await install();
      serve(manifest({ description: 'Episodes and players.' }));
      await start(installed.id);
      serve(manifest({ description: 'Episodes and players.', name: 'Podcasts' }));
      await start(installed.id);

      const { body } = await agent
        .get(`apps/installations/${installed.id}/?include=history`)
        .expectStatus(200);

      const { history } = body.app_installations[0];
      assert.deepEqual(
        history.map((entry: any) => [entry.event, entry.actor?.name ?? null]),
        [
          ['suspended', null],
          ['updated', null],
          ['installed', 'Joe Bloggs'],
        ],
      );
    });

    it('makes one fetch for two sessions started at the same time', async function () {
      const installed = await install();
      // The app only responds once both sessions have started, so the second one starts
      // while the first one's re-check is still running, however slow its request is.
      const startSession = service().startSession;
      let started = 0;
      let bothStarted!: () => void;
      const bothStartedPromise = new Promise<void>((resolve) => {
        bothStarted = resolve;
      });
      sinon.stub(service(), 'startSession').callsFake(function (id: string) {
        started += 1;
        if (started === 2) {
          bothStarted();
        }
        return startSession.call(service(), id);
      });
      // The wait is bounded, so a second session that never starts fails the check below
      // with a reason, rather than the test by timing out.
      let gaveUp = false;
      let giveUpWaiting!: () => void;
      const secondStartedOrGaveUp = Promise.race([
        bothStartedPromise,
        new Promise<void>((resolve) => {
          giveUpWaiting = resolve;
        }),
      ]);
      const first = nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(200, async () => {
          await secondStartedOrGaveUp;
          return manifest({ description: 'Changed' });
        });
      const second = serve(manifest({ description: 'Changed' }));

      // Calling `then` sends a request, so the bound starts once both are sent.
      const sending = Promise.all([start(installed.id).then(), start(installed.id).then()]);
      const giveUp = setTimeout(() => {
        gaveUp = true;
        giveUpWaiting();
      }, 2000);
      const sessions = await sending.finally(() => clearTimeout(giveUp));

      assert.equal(gaveUp, false, 'The second session never started while the re-check was out');
      assert.equal(first.isDone(), true);
      assert.equal(second.isDone(), false);
      assert.deepEqual(
        sessions.map(({ body }) => body.app_sessions[0].installation.revision),
        [1, 1],
      );
      assert.equal((await manifestRows()).length, 2);
      assert.equal((await installationRow(installed.id)).revision, 1);
    });

    it('does nothing when the installation changed while the manifest was being fetched', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      const reviewed = await service().preview(MANIFEST_URL);
      nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(200, async () => {
          // A publisher approves a newer version while the re-check is running, so the
          // manifest the re-check loaded may be older than the approved one.
          serve(manifest({ name: 'Podcasts' }));
          await service().approve(owner, installed.id, {
            manifestUrl: MANIFEST_URL,
            digest: reviewed.digest,
            revision: 0,
          });
          return manifest();
        });

      const { body } = await start(installed.id);

      const [session] = body.app_sessions;
      assert.equal(session.installation.revision, 1);
      assert.equal(session.installation.status, 'active');
      assert.equal(session.installation.manifest.name, 'Podcasts');
      const row = await installationRow(installed.id);
      assert.equal(row.revision, 1);
      assert.equal(row.pending_manifest_id, null);
      // The install and the approval, and nothing from the re-check.
      assert.equal((await manifestRows()).length, 2);
    });

    it('doesn’t fail the session over an unusable manifest when the installation changed during the fetch', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      const reviewed = await service().preview(MANIFEST_URL);
      nock(MANIFEST_HOST)
        .get(MANIFEST_PATH)
        .reply(200, async () => {
          serve(manifest({ name: 'Podcasts' }));
          await service().approve(owner, installed.id, {
            manifestUrl: MANIFEST_URL,
            digest: reviewed.digest,
            revision: 0,
          });
          return manifest({ id: 'com.example.other' });
        });

      const { body } = await start(installed.id);

      const [session] = body.app_sessions;
      assert.equal(session.installation.revision, 1);
      assert.equal(session.installation.manifest.name, 'Podcasts');
    });

    it('answers 404 for an installation that does not exist, saying it is not installed', async function () {
      const { body } = await start(new ObjectId().toHexString(), 404);

      assert.equal(body.errors[0].code, 'APP_NOT_INSTALLED');
    });
  });

  describe('the app’s icon', function () {
    const approve = (id: string, digest: string, revision: number) =>
      agent
        .put(`apps/installations/${id}/`)
        .body({ app_installations: [{ manifest_url: MANIFEST_URL, digest, revision }] })
        .expectStatus(200);
    /** Installs the app with an SVG icon it serves, which the review and the install each fetch. */
    const installWithIcon = async () => {
      serveIcon(ICON, 2);
      return install(servedIcon);
    };
    const iconOf = async (manifestId: string) =>
      (await models.Base.knex('app_installation_manifests').where({ id: manifestId }).first())
        .icon_svg;

    it('previews a sanitized copy of the SVG the app serves', async function () {
      serve(manifest(servedIcon));
      nock(MANIFEST_HOST)
        .get(ICON_PATH)
        .reply(
          200,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)">
            <script>alert(2)</script>
            <image href="https://tracker.example.net/pixel.png" width="1" height="1"/>
            <foreignObject><img src="x" onerror="alert(3)"/></foreignObject>
            <path d="M0 0h24v24H0z"/>
          </svg>`,
        );

      const result = await preview();

      assert.equal(result.manifest.icon.url, `${MANIFEST_HOST}${ICON_PATH}`);
      assert.match(result.icon_svg, /<path d="M0 0h24v24H0z"\/>/);
      assert.doesNotMatch(
        result.icon_svg,
        /script|alert|onload|onerror|<image|foreignObject|<img|tracker/i,
      );
    });

    it('keeps a copy of icons as design tools export them', async function () {
      // Adobe Illustrator's Save As declares entities in the doctype and styles shapes
      // through a stylesheet, and Sketch draws shapes it defines through <use>.
      const exported = [
        `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
	<!ENTITY ns_extend "http://ns.adobe.com/Extensibility/1.0/">
]>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><style type="text/css">
	.st0{fill:#FFFFFF;}
</style><path class="st0" d="M0 0h24v24H0z"/></svg>`,
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
          viewBox="0 0 24 24"><defs><path id="path-1" d="M0 0h24v24H0z"/></defs>
          <use xlink:href="#path-1"/></svg>`,
      ];
      const copies = [];
      for (const svg of exported) {
        serve(manifest(servedIcon));
        serveIcon(svg);
        copies.push((await preview()).icon_svg);
      }

      assert.match(
        copies[0],
        /^<svg [^>]*><path d="M0 0h24v24H0z" style="fill:#FFFFFF"\/><\/svg>$/,
      );
      assert.match(
        copies[1],
        /<path id="(svg-[0-9a-f]+-)path-1" d="M0 0h24v24H0z"\/><\/defs><use xlink:href="#\1path-1"\/>/,
      );
    });

    it('keeps no copy of an icon Admin ships', async function () {
      const installed = await install();

      assert.equal(installed.icon_svg, null);
      assert.equal((await manifestRows())[0].icon_svg, null);
    });

    it('stores the copy with the installed manifest, and shows it with the installation', async function () {
      const installed = await installWithIcon();

      assert.equal(installed.icon_svg, ICON);
      const [stored] = await manifestRows();
      assert.equal(stored.icon_svg, ICON);
      const { body: list } = await agent.get('apps/installations/').expectStatus(200);
      assert.equal(list.app_installations[0].icon_svg, ICON);
      const { body: read } = await agent
        .get(`apps/installations/${installed.id}/`)
        .expectStatus(200);
      assert.equal(read.app_installations[0].icon_svg, ICON);
    });

    it('shows the approved copy beside the reviewed one', async function () {
      await installWithIcon();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      serveIcon(NEW_ICON);

      const result = await preview();

      assert.equal(result.icon_svg, NEW_ICON);
      assert.equal(result.installation.icon_svg, ICON);
    });

    it('refuses an app whose icon can’t be used, saying why at icon.url', async function () {
      const cases: Array<[() => nock.Scope, string]> = [
        [
          () => nock(MANIFEST_HOST).get(ICON_PATH).reply(404),
          'Expected an icon that loads, not HTTP 404',
        ],
        [
          () =>
            nock(MANIFEST_HOST)
              .get(ICON_PATH)
              .reply(302, '', { location: 'https://elsewhere.example.net/icon.svg' }),
          'Expected an icon on its own host, not a redirect to elsewhere.example.net',
        ],
        [
          () => serveIcon(ICON.replace('</svg>', `<desc>${'x'.repeat(16 * 1024)}</desc></svg>`)),
          'Expected an icon of at most 16 KB',
        ],
        [() => serveIcon('<html><body>Not found</body></html>'), 'Expected an SVG image'],
        [
          () => serveIcon(`<svg xmlns="http://www.w3.org/2000/svg">${'<g>'.repeat(500)}</svg>`),
          'Expected an icon of at most 500 elements',
        ],
      ];
      for (const [serveBadIcon, message] of cases) {
        serve(manifest(servedIcon));
        serveBadIcon();

        const error = await preview(MANIFEST_URL, 422);

        assert.equal(error.code, 'APP_MANIFEST_INVALID', message);
        assert.ok(error.context.endsWith(`icon.url: ${message}`), error.context);
        assert.deepEqual(error.details, [{ path: 'icon.url', message }]);
      }
    });

    it('refuses an install whose icon stopped loading after the review, storing nothing', async function () {
      serve(manifest(servedIcon));
      serveIcon();
      const { digest } = await preview();
      serve(manifest(servedIcon));
      nock(MANIFEST_HOST).get(ICON_PATH).reply(503);

      const { body } = await agent
        .post('apps/installations/')
        .body({ app_installations: [{ manifest_url: MANIFEST_URL, digest }] })
        .expectStatus(422);

      assert.equal(body.errors[0].code, 'APP_MANIFEST_INVALID');
      assert.deepEqual(body.errors[0].details, [
        { path: 'icon.url', message: 'Expected an icon that loads, not HTTP 503' },
      ]);
      assert.equal((await manifestRows()).length, 0);
    });

    // The copy is only ever taken when a manifest version is stored, so a re-check that
    // stores nothing never contacts the icon's URL, and the icon can't change by itself.
    it('never fetches the icon again for a re-check that stores nothing', async function () {
      const installed = await installWithIcon();
      serve(manifest(servedIcon));
      const unchanged = serveIcon(NEW_ICON);

      const { body } = await start(installed.id);

      assert.equal(unchanged.isDone(), false);
      assert.equal(body.app_sessions[0].installation.icon_svg, ICON);

      // Nor for the pending manifest, which already has its copy.
      nock.cleanAll();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      serveIcon(NEW_ICON);
      await start(installed.id);
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      const pending = serveIcon(ICON);

      await start(installed.id);

      assert.equal(pending.isDone(), false);
      const row = await installationRow(installed.id);
      assert.equal(await iconOf(row.pending_manifest_id), NEW_ICON);
      assert.equal(await iconOf(row.manifest_id), ICON);
    });

    it('fetches the icon again for a re-check that stores a new manifest', async function () {
      const installed = await installWithIcon();
      serve(manifest({ ...servedIcon, description: 'Episodes and players.' }));
      serveIcon(NEW_ICON);

      const { body } = await start(installed.id);

      assert.equal(body.app_sessions[0].installation.revision, 1);
      assert.equal(body.app_sessions[0].installation.icon_svg, NEW_ICON);
      assert.deepEqual(
        (await manifestRows()).map((row: { icon_svg: string }) => row.icon_svg).sort(),
        [NEW_ICON, ICON].sort(),
      );
    });

    it('fails as unavailable when a re-check that stores a new manifest can’t use its icon, storing nothing', async function () {
      const installed = await installWithIcon();
      serve(manifest({ ...servedIcon, description: 'Episodes and players.' }));
      nock(MANIFEST_HOST).get(ICON_PATH).reply(503);
      const warn = sinon.stub(logging, 'warn');

      const { body } = await start(installed.id, 409);

      assert.equal(body.errors[0].code, 'APP_UNAVAILABLE');
      assert.equal(
        body.errors[0].context,
        'APP_MANIFEST_INVALID: The app manifest is not valid. (icon.url: Expected an icon that loads, not HTTP 503)',
      );
      assert.equal((await manifestRows()).length, 1);
      assert.equal((await installationRow(installed.id)).revision, 0);
      assert.ok(warn.calledWith(`Could not load the app icon at ${MANIFEST_HOST}${ICON_PATH}`));

      // It opens again once the icon loads.
      serve(manifest({ ...servedIcon, description: 'Episodes and players.' }));
      serveIcon(NEW_ICON);
      const { body: opened } = await start(installed.id);
      assert.equal(opened.app_sessions[0].installation.revision, 1);
      assert.equal(opened.app_sessions[0].installation.icon_svg, NEW_ICON);
    });

    // The re-check and the approval decide before their transaction, so the icon can be
    // fetched outside it; the transaction then only goes ahead at the same revision.
    const changeDuringIconFetch = (id: string, svg: string) =>
      nock(MANIFEST_HOST)
        .get(ICON_PATH)
        .reply(200, async () => {
          await models.Base.knex('app_installations').where({ id }).increment('revision', 1);
          return svg;
        });

    it('stores nothing when the installation changes while a re-check fetches the icon', async function () {
      const installed = await installWithIcon();
      serve(manifest({ ...servedIcon, description: 'Episodes and players.' }));
      changeDuringIconFetch(installed.id, NEW_ICON);

      const { body } = await start(installed.id);

      assert.equal(body.app_sessions[0].installation.revision, 1);
      assert.equal(body.app_sessions[0].installation.icon_svg, ICON);
      assert.equal((await manifestRows()).length, 1);
    });

    it('asks for a new review when the installation changes while an approval fetches the icon', async function () {
      const installed = await installWithIcon();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      serveIcon(NEW_ICON);
      const reviewed = await preview();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      changeDuringIconFetch(installed.id, NEW_ICON);
      // For the new review the refusal carries.
      serveIcon(NEW_ICON);

      const { body } = await agent
        .put(`apps/installations/${installed.id}/`)
        .body({
          app_installations: [{ manifest_url: MANIFEST_URL, digest: reviewed.digest, revision: 0 }],
        })
        .expectStatus(409);

      assert.equal(body.errors[0].code, 'APP_INSTALLATION_CHANGED');
      assert.equal(body.errors[0].details.installation.revision, 1);
      assert.equal((await manifestRows()).length, 1);
      assert.equal((await actions()).length, 1);
    });

    it('refuses an approval when the app is uninstalled while it fetches the icon, storing nothing', async function () {
      const installed = await installWithIcon();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      serveIcon(NEW_ICON);
      const reviewed = await preview();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      nock(MANIFEST_HOST)
        .get(ICON_PATH)
        .reply(200, async () => {
          await service().uninstall(owner, installed.id);
          return NEW_ICON;
        });

      const { body } = await agent
        .put(`apps/installations/${installed.id}/`)
        .body({
          app_installations: [{ manifest_url: MANIFEST_URL, digest: reviewed.digest, revision: 0 }],
        })
        .expectStatus(409);

      assert.equal(body.errors[0].code, 'APP_INSTALLATION_UNINSTALLED');
      assert.equal((await manifestRows()).length, 1);
      assert.deepEqual(
        (await actions()).map(({ event }: { event: string }) => event),
        ['installed', 'uninstalled'],
      );
    });

    it('fetches the icon for an approval that stores a new manifest', async function () {
      const installed = await installWithIcon();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      serveIcon(NEW_ICON);
      const reviewed = await preview();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      serveIcon(NEW_ICON);

      const { body } = await approve(installed.id, reviewed.digest, reviewed.installation.revision);

      assert.equal(body.app_installations[0].icon_svg, NEW_ICON);
      assert.equal(await iconOf((await installationRow(installed.id)).manifest_id), NEW_ICON);
    });

    // A review shows the copy approving it would keep. When that's a copy Ghost already has,
    // neither the review nor the approval fetches the icon, so one that stopped loading
    // doesn't get in the way.
    const iconStopsLoading = () => nock(MANIFEST_HOST).get(ICON_PATH).times(2).reply(503);

    it('reviews and approves the pending manifest with the copy it already has', async function () {
      const installed = await installWithIcon();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      serveIcon(NEW_ICON);
      await start(installed.id);
      iconStopsLoading();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));
      const reviewed = await preview();
      serve(manifest({ ...servedIcon, name: 'Podcasts' }));

      const { body } = await approve(installed.id, reviewed.digest, reviewed.installation.revision);

      assert.equal(reviewed.icon_svg, NEW_ICON);
      assert.equal(body.app_installations[0].status, 'active');
      assert.equal(body.app_installations[0].icon_svg, NEW_ICON);
    });

    it('reviews and approves what is already approved with the installed copy', async function () {
      const installed = await installWithIcon();
      iconStopsLoading();
      serve(manifest(servedIcon));
      const reviewed = await preview();
      serve(manifest(servedIcon));

      const { body } = await approve(installed.id, reviewed.digest, reviewed.installation.revision);

      assert.deepEqual(reviewed.installation.changes, []);
      assert.equal(reviewed.icon_svg, ICON);
      assert.equal(body.app_installations[0].icon_svg, ICON);
    });
  });

  describe('GET /apps/installations/', function () {
    it('lists the active installations', async function () {
      const ended = await install({ id: 'com.example.ended' });
      await service().uninstall(owner, ended.id);
      const active = await install();

      const { body } = await agent.get('apps/installations/').expectStatus(200);

      assert.deepEqual(Object.keys(body), ['app_installations']);
      assert.equal(body.app_installations.length, 1);
      assert.deepEqual(Object.keys(body.app_installations[0]).sort(), [
        'app_id',
        'created_at',
        'icon_svg',
        'id',
        'manifest',
        'manifest_url',
        'revision',
        'status',
        'updated_at',
      ]);
      assert.equal(body.app_installations[0].id, active.id);
      assert.equal(body.app_installations[0].manifest.name, 'Podcast');
    });

    it('answers with an empty list when nothing is installed', async function () {
      const { body } = await agent.get('apps/installations/').expectStatus(200);
      assert.deepEqual(body, { app_installations: [] });
    });
  });

  describe('GET /apps/installations/:id/', function () {
    it('shows one installation, ended or not', async function () {
      const installation = await install();
      await service().uninstall(owner, installation.id);

      const { body } = await agent.get(`apps/installations/${installation.id}/`).expectStatus(200);

      assert.equal(body.app_installations.length, 1);
      assert.equal(body.app_installations[0].id, installation.id);
      assert.equal(body.app_installations[0].status, 'uninstalled');
    });

    it('leaves out the history unless it is asked for', async function () {
      const installation = await install();

      const { body } = await agent.get(`apps/installations/${installation.id}/`).expectStatus(200);

      assert.equal(body.app_installations[0].history, undefined);
    });

    it('tells what happened to the installation, newest first, and who decided', async function () {
      const installed = await install();
      serve(manifest({ name: 'Podcasts' }));
      const { digest, installation } = await preview();
      serve(manifest({ name: 'Podcasts' }));
      await agent
        .put(`apps/installations/${installed.id}/`)
        .body({
          app_installations: [
            { manifest_url: MANIFEST_URL, digest, revision: installation.revision },
          ],
        })
        .expectStatus(200);
      await agent.delete(`apps/installations/${installed.id}/`).expectStatus(204);

      const { body } = await agent
        .get(`apps/installations/${installed.id}/?include=history`)
        .expectStatus(200);

      const { history } = body.app_installations[0];
      assert.deepEqual(
        history.map((entry: any) => [entry.event, entry.actor?.name]),
        [
          ['uninstalled', 'Joe Bloggs'],
          ['changes_approved', 'Joe Bloggs'],
          ['installed', 'Joe Bloggs'],
        ],
      );
      assert.deepEqual(Object.keys(history[0]).sort(), ['actor', 'created_at', 'event', 'id']);
      assert.equal(history[2].actor.id, owner.actor.id);
      assert.match(history[0].created_at, /^\d{4}-\d{2}-\d{2}T/);
    });

    it('says where an approval moved the app to', async function () {
      const installed = await install();
      const movedTo = 'https://audio.example.org/ghost-app.json';
      serve(manifest(), movedTo);
      const { digest, installation } = await preview(movedTo);
      serve(manifest(), movedTo);
      await agent
        .put(`apps/installations/${installed.id}/`)
        .body({
          app_installations: [{ manifest_url: movedTo, digest, revision: installation.revision }],
        })
        .expectStatus(200);

      const { body } = await agent
        .get(`apps/installations/${installed.id}/?include=history`)
        .expectStatus(200);

      const [approval] = body.app_installations[0].history;
      assert.equal(approval.event, 'changes_approved');
      assert.equal(approval.moved_to, 'audio.example.org');
    });

    it('answers 404 for an installation that does not exist', async function () {
      await agent.get('apps/installations/abcdefabcdefabcdefabcdef/').expectStatus(404);
    });
  });

  describe('DELETE /apps/installations/:id/', function () {
    it('marks the installation as uninstalled and keeps the record', async function () {
      const installation = await install();

      await agent.delete(`apps/installations/${installation.id}/`).expectStatus(204);

      assert.equal((await service().browse()).length, 0);
      const kept = await service().read(installation.id);
      assert.equal(kept.status, 'uninstalled');
      assert.deepEqual(kept.manifest, installation.manifest);
      assert.equal((await manifestRows()).length, 1);
    });

    it('ends any open app sessions, by moving the revision on', async function () {
      const installation = await install();

      await agent.delete(`apps/installations/${installation.id}/`).expectStatus(204);
      await agent.delete(`apps/installations/${installation.id}/`).expectStatus(204);

      const ended = await installationRow(installation.id);
      assert.equal(ended.revision, 1);
      assert.equal(ended.current_app_id, null);
    });

    it('records who uninstalled the app in the staff history', async function () {
      const installation = await install();

      await agent.delete(`apps/installations/${installation.id}/`).expectStatus(204);

      const [, action] = await actions();
      assert.equal(action.event, 'uninstalled');
      assert.equal(action.resource_id, installation.id);
      assert.equal(action.actor_id, owner.actor.id);
      assert.equal(JSON.parse(action.context).primary_name, 'Podcast');
    });

    it('does nothing, and records nothing, the second time', async function () {
      const installation = await install();

      await agent.delete(`apps/installations/${installation.id}/`).expectStatus(204);
      await agent.delete(`apps/installations/${installation.id}/`).expectStatus(204);

      assert.equal((await actions()).length, 2);
    });

    it('answers 404 for an installation that does not exist', async function () {
      await agent.delete('apps/installations/abcdefabcdefabcdefabcdef/').expectStatus(404);
    });
  });

  describe('staff history', function () {
    it('still lists actions alongside their resources', async function () {
      const installation = await install();
      await service().uninstall(owner, installation.id);

      const { body } = await agent
        .get('actions/?include=actor,resource&filter=resource_type:app_installation')
        .expectStatus(200);

      assert.deepEqual(body.actions.map((action: any) => action.event).sort(), [
        'installed',
        'uninstalled',
      ]);
    });
  });

  describe('where it is available', function () {
    it('answers 404 when the apps flag is off', async function () {
      const installation = await install();
      mockManager.mockLabsDisabled('apps');

      await agent.get('apps/installations/').expectStatus(404);
      await agent.get(`apps/installations/${installation.id}/`).expectStatus(404);
      // Admin uses this code to tell an uninstalled app from a Ghost without app sessions,
      // so a disabled flag must not send it.
      const { body } = await start(installation.id, 404);
      assert.notEqual(body.errors?.[0]?.code, 'APP_NOT_INSTALLED');
      await agent.delete(`apps/installations/${installation.id}/`).expectStatus(404);
      assert.equal((await service().read(installation.id)).status, 'active');
    });

    it('refuses to read a stored manifest it cannot make sense of', async function () {
      const installation = await install();
      await models.Base.knex('app_installation_manifests').update({ manifest: '{"id":' });

      await assert.rejects(service().read(installation.id), { name: 'ZodError' });
    });

    it('answers 404 where in-development tables are not created', async function () {
      configUtils.set('createInDevelopmentTables', false);

      assert.equal(appInstallations.extras.isAvailable(), false);
      await agent.get('apps/installations/').expectStatus(404);
    });
  });

  // Last, because it signs in as other users and sign-ins are rate limited.
  describe('who may use it', function () {
    let installationId: string;

    beforeEach(async function () {
      installationId = (await install()).id;
    });

    const assertRefused = async function () {
      await agent
        .post('apps/installations/preview/')
        .body({ app_installation_previews: [{ manifest_url: MANIFEST_URL }] })
        .expectStatus(403);
      await agent
        .post('apps/installations/')
        .body({ app_installations: [{ manifest_url: MANIFEST_URL, digest: 'a' }] })
        .expectStatus(403);
      await agent
        .put(`apps/installations/${installationId}/`)
        .body({ app_installations: [{ manifest_url: MANIFEST_URL, digest: 'a' }] })
        .expectStatus(403);
      await agent.get('apps/installations/').expectStatus(403);
      await agent.get(`apps/installations/${installationId}/`).expectStatus(403);
      await agent.post(`apps/installations/${installationId}/sessions/`).expectStatus(403);
      await agent.delete(`apps/installations/${installationId}/`).expectStatus(403);
      assert.equal((await service().read(installationId)).status, 'active');
    };

    it('administrators', async function () {
      await agent.loginAsAdmin();
      await agent.get('apps/installations/').expectStatus(200);
      await agent.get(`apps/installations/${installationId}/`).expectStatus(200);
      serve(manifest());
      await agent.post(`apps/installations/${installationId}/sessions/`).expectStatus(200);
      await agent.delete(`apps/installations/${installationId}/`).expectStatus(204);
    });

    it('not editors', async function () {
      await agent.loginAsEditor();
      await assertRefused();
    });

    it('not contributors', async function () {
      await agent.loginAsContributor();
      await assertRefused();
    });

    it('not integrations', async function () {
      await agent.useZapierAdminAPIKey();
      await assertRefused();
    });

    it("an administrator's staff token, which acts as the administrator", async function () {
      await agent.useStaffTokenForAdmin();
      await agent.get('apps/installations/').expectStatus(200);
      await agent.delete(`apps/installations/${installationId}/`).expectStatus(204);

      const [, action] = await actions();
      assert.equal(action.event, 'uninstalled');
      assert.equal(action.actor_type, 'user');
    });
  });
});

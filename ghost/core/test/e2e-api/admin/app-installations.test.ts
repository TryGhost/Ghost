import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ObjectId from 'bson-objectid';
import nock from 'nock';
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';
import { toDatabaseDate } from '../../../core/server/lib/db-types/date';

// Required, not imported, so this is the same module instance Ghost initialised at boot.
const appInstallations: typeof import('../../../core/server/services/app-installations') = require('../../../core/server/services/app-installations');
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

  const service = () => appInstallations.service!;
  const install = (overrides: Record<string, unknown> = {}) =>
    service().install(owner, { manifestUrl: MANIFEST_URL, manifest: manifest(overrides) });
  const MANIFEST_HOST = 'https://podcast.example.com';
  const MANIFEST_PATH = '/ghost-app.json';
  const serve = (body: unknown, url = MANIFEST_HOST + MANIFEST_PATH) => {
    const { origin, pathname } = new URL(url);
    return nock(origin)
      .get(pathname)
      .reply(200, body as Record<string, unknown>);
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
      assert.equal(stored.digest, createHash('sha256').update(stored.manifest).digest('hex'));
      assert.equal(Boolean(stored.requires_approval), false);

      const installed = await installationRow(installation.id);
      assert.equal(installed.manifest_id, stored.id);
      assert.equal(installed.pending_manifest_id, null);
      assert.equal(installed.revision, 0);
    });

    it('refuses a manifest that is not valid, and stores nothing', async function () {
      await assert.rejects(install({ id: 'Podcast', allowed_origins: [] }), (err: any) => {
        assert.equal(err.errorType, 'ValidationError');
        assert.match(err.context, /id: /);
        return true;
      });
      assert.equal((await service().browse()).length, 0);
      assert.equal((await actions()).length, 0);
    });

    it('refuses an app served from the site itself', async function () {
      const siteUrl = configUtils.config.get('url');
      await assert.rejects(
        install({ surfaces: [{ type: 'admin_page', url: `${siteUrl}/content/files/app.html` }] }),
        { errorType: 'ValidationError' },
      );
    });

    it('stores the manifest URL as it was checked, not as it was given', async function () {
      const installation = await service().install(owner, {
        manifestUrl: ' https://Podcast.Example.com/ghost-app.json\n',
        manifest: manifest(),
      });

      assert.equal(installation.manifest_url, MANIFEST_URL);
      const [stored] = await manifestRows();
      assert.equal(stored.manifest_url, MANIFEST_URL);
    });

    it('keeps the manifest URL without its fragment, which no fetch ever sends', async function () {
      const installation = await service().install(owner, {
        manifestUrl: `${MANIFEST_URL}#v2`,
        manifest: manifest(),
      });

      assert.equal(installation.manifest_url, MANIFEST_URL);
    });

    it('refuses a manifest URL longer than it can store', async function () {
      const manifestUrl = `https://podcast.example.com/${'a'.repeat(2000)}`;
      await assert.rejects(service().install(owner, { manifestUrl, manifest: manifest() }), {
        errorType: 'ValidationError',
      });
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

    it('lets only one of two simultaneous confirmations install the app', async function () {
      const results = await Promise.allSettled([install(), install(), install()]);

      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      for (const result of results) {
        if (result.status === 'rejected') {
          assert.equal(result.reason.errorType, 'ConflictError');
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
      assert.equal((await manifestRows())[0].digest, digest);
      assert.equal((await actions())[0].event, 'installed');
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

    it('refuses to install an app that is already installed', async function () {
      await install();
      serve(manifest());
      const { digest } = await preview();
      serve(manifest());

      const { body } = await confirm(digest, 409);
      assert.equal(body.errors[0].code, 'APP_ALREADY_INSTALLED');
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
    // What the lifecycle's refetch will do once it exists: keep the newer manifest as the
    // one waiting for approval, and stop the app until an Administrator decides.
    const suspendWithPending = async (id: string, pending: Record<string, unknown>) => {
      // Stored as Ghost would store it: parsed, with its URLs resolved, and digested.
      serve(pending);
      const reviewed = await preview();
      const pendingId = new ObjectId().toHexString();
      await models.Base.knex('app_installation_manifests').insert({
        id: pendingId,
        installation_id: id,
        manifest_url: MANIFEST_URL,
        manifest: JSON.stringify(reviewed.manifest),
        digest: reviewed.digest,
        requires_approval: true,
        created_at: toDatabaseDate(new Date()),
      });
      await models.Base.knex('app_installations')
        .where({ id })
        .update({ status: 'suspended', pending_manifest_id: pendingId });
      return pendingId;
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
      serve(manifest({ name: 'Podcasts' }));

      const { body } = await approve(installed.id, MANIFEST_URL, reviewed.digest, 200);

      assert.equal(body.app_installations[0].status, 'active');
      assert.equal(body.app_installations[0].manifest.name, 'Podcasts');
      const row = await installationRow(installed.id);
      assert.equal(row.pending_manifest_id, null);
      assert.equal(row.revision, 1);
    });

    it('approves the manifest waiting for approval as its own row, not a copy', async function () {
      const installed = await install();
      const pendingId = await suspendWithPending(installed.id, manifest({ name: 'Podcasts' }));
      serve(manifest({ name: 'Podcasts' }));
      const reviewed = await preview();
      serve(manifest({ name: 'Podcasts' }));

      await approve(installed.id, MANIFEST_URL, reviewed.digest, 200);

      const row = await installationRow(installed.id);
      assert.equal(row.manifest_id, pendingId);
      assert.equal(row.pending_manifest_id, null);
      assert.equal((await manifestRows()).length, 2);
      const [, action] = await actions();
      assert.equal(JSON.parse(action.context).to_manifest_id, pendingId);
    });

    it('lets go of a pending manifest the app went back on, keeping no copy', async function () {
      const installed = await install();
      await suspendWithPending(installed.id, manifest({ name: 'Podcasts' }));
      serve(manifest());
      const reviewed = await preview();
      assert.deepEqual(reviewed.installation.changes, []);
      serve(manifest());

      const { body } = await approve(installed.id, MANIFEST_URL, reviewed.digest, 200);

      assert.equal(body.app_installations[0].status, 'active');
      assert.equal(body.app_installations[0].manifest.name, 'Podcast');
      const row = await installationRow(installed.id);
      assert.equal(row.pending_manifest_id, null);
      assert.equal(row.revision, 1);
      // The approved one and the pending one: approving added nothing.
      assert.equal((await manifestRows()).length, 2);
      const [, action] = await actions();
      assert.equal(action.event, 'changes_approved');
      assert.equal(JSON.parse(action.context).from_manifest_id, row.manifest_id);
      assert.equal(JSON.parse(action.context).to_manifest_id, row.manifest_id);
    });

    it('does not lift a suspension that is not waiting for changes', async function () {
      const installed = await install();
      await models.Base.knex('app_installations')
        .where({ id: installed.id })
        .update({ status: 'suspended' });
      serve(manifest({ name: 'Podcasts' }));
      const { digest } = await preview();
      serve(manifest({ name: 'Podcasts' }));

      const { body } = await approve(installed.id, MANIFEST_URL, digest, 200);

      assert.equal(body.app_installations[0].status, 'suspended');
      assert.equal(body.app_installations[0].manifest.name, 'Podcasts');
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
        'id',
        'manifest',
        'manifest_url',
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

      assert.equal(appInstallations.isAvailable(), false);
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
      await agent.delete(`apps/installations/${installationId}/`).expectStatus(403);
      assert.equal((await service().read(installationId)).status, 'active');
    };

    it('administrators', async function () {
      await agent.loginAsAdmin();
      await agent.get('apps/installations/').expectStatus(200);
      await agent.get(`apps/installations/${installationId}/`).expectStatus(200);
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

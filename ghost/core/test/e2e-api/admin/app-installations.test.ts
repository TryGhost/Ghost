import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';

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

  afterEach(async function () {
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

import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { InternalKeys } from '../../core/server/services/internal-keys';

const { agentProvider, fixtureManager } =
  require('../utils/e2e-framework') as typeof import('../utils/e2e-framework');
const configUtils = require('../utils/config-utils');
const models = require('../../core/server/models');
const db = require('../../core/server/data/db');
const { AdminAPITestAgent } = require('../utils/agents');
const adapterManager = require('../../core/server/services/adapter-manager').default;
// Retain the same root and frontend consumer that boot and authentication use.
const internalKeys: InternalKeys = require('../../core/server/services/internal-keys').default;
const { getFrontendKey } = require('../../core/frontend/services/proxy');

describe('Internal keys through cold boot and authentication reset', function () {
  let agents: Awaited<ReturnType<typeof agentProvider.getAgentsWithFrontend>> | undefined;
  const sandbox = sinon.createSandbox();

  beforeAll(async function () {
    configUtils.set('sentry:disabled', true);
    agents = await agentProvider.getAgentsWithFrontend();
    await fixtureManager.init('users');
    await agents.adminAgent.loginAsOwner();
  });

  afterEach(function () {
    sandbox.restore();
  });

  afterAll(async function () {
    try {
      await agents?.ghostServer.stop();
    } finally {
      await configUtils.restore();
    }
  });

  it('rotates persisted keys, clears sessions and reschedules with the previous key', async function () {
    assert.ok(agents);
    const otherStaffAgent = new AdminAPITestAgent(agents.ghostServer.rootApp, {
      apiURL: '/ghost/api/admin/',
      originURL: configUtils.config.get('url'),
    });
    await otherStaffAgent.loginAsAdmin();
    const beforeReset = await db.knex('sessions').count({ count: '*' });
    assert.ok(Number(beforeReset[0].count) >= 2, 'Both staff sessions must exist before reset');
    const previousFrontendPromise = internalKeys.get('ghost-internal-frontend');
    const previousFrontend = await previousFrontendPromise;
    const previousScheduler = await internalKeys.get('ghost-scheduler');
    assert.equal(await getFrontendKey(), previousFrontend.secret);
    assert.deepEqual(
      await models.Integration.getApiKeyBySlug('ghost-internal-frontend', 'content'),
      previousFrontend,
    );
    const scheduler = adapterManager.getAdapter('scheduling');
    const reschedule = sandbox.spy(scheduler, 'rescheduleAll');

    const { body } = await agents.adminAgent
      .post('authentication/reset/')
      .body({})
      .expectStatus(200);
    assert.equal(body.security_action[0].action, 'reset_authentication');
    assert.ok(body.security_action[0].api_keys_rotated >= 2);
    assert.ok(body.security_action[0].users_locked > 0);
    sinon.assert.calledOnceWithExactly(reschedule, { previousKey: previousScheduler });
    const afterReset = await db.knex('sessions').count({ count: '*' });
    assert.equal(Number(afterReset[0].count), 0, 'Reset must delete every persisted staff session');

    const currentFrontend = await models.Integration.getApiKeyBySlug(
      'ghost-internal-frontend',
      'content',
    );
    const currentScheduler = await models.Integration.getApiKeyBySlug('ghost-scheduler', 'admin');
    assert.equal(currentFrontend.id, previousFrontend.id);
    assert.notEqual(currentFrontend.secret, previousFrontend.secret);
    assert.equal(currentScheduler.id, previousScheduler.id);
    assert.notEqual(currentScheduler.secret, previousScheduler.secret);
    assert.equal(await getFrontendKey(), currentFrontend.secret);
    assert.deepEqual(await internalKeys.get('ghost-scheduler'), currentScheduler);
    // Invalidating the map does not revoke a promise already held by a caller.
    assert.equal(await previousFrontendPromise, previousFrontend);
    await agents.adminAgent.get('users/me/').expectStatus(403);
    await otherStaffAgent.get('users/me/').expectStatus(403);
  });
});

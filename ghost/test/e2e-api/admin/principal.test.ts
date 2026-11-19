import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Principal } from '../../../core/server/auth/principal';
import { agentProvider, fixtureManager } from '../../utils/e2e-framework';

// Required, not imported, so these are the module instances Ghost uses and the stubs reach it
const domainEvents = require('@tryghost/domain-events');
const DataGenerator = require('../../utils/fixtures/data-generator');
const models = require('../../../core/server/models');
const permissions = require('../../../core/server/auth/permissions');
const { getSignedAdminToken } = require('../../../core/server/adapters/scheduling/utils');

// Each auth chain must hand its principal to the permission checks, on either engine
describe('Request principal', function () {
  let adminAgent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let contentAgent: Awaited<ReturnType<typeof agentProvider.getContentAPIAgent>>;
  let parseContext: sinon.SinonSpy;

  beforeAll(async function () {
    adminAgent = await agentProvider.getAdminAPIAgent();
    contentAgent = await agentProvider.getContentAPIAgent();
    await fixtureManager.init('users', 'integrations', 'api_keys');
    await contentAgent.authenticate();
  });

  beforeEach(function () {
    parseContext = sinon.spy(permissions, 'parseContext');
  });

  afterEach(function () {
    sinon.restore();
    adminAgent.resetAuthentication();
  });

  /** Who the first principal permissions saw names, by kind, method and ids */
  function principal() {
    const call = parseContext.getCalls().find(({ args }) => args[0]?.principal);
    assert.ok(call, 'parseContext never saw a principal');
    const seen: Principal = call.args[0].principal;
    return {
      kind: seen.kind,
      method: 'method' in seen ? seen.method : undefined,
      userId: seen.kind === 'user' ? seen.user.id : undefined,
      apiKeyId: 'apiKey' in seen ? seen.apiKey?.id : undefined,
    };
  }

  it('reaches permissions from a staff token', async function () {
    const owner = DataGenerator.Content.users[0];
    const staffKey = DataGenerator.forKnex.user_api_keys.find(
      (apiKey: { user_id: string }) => apiKey.user_id === owner.id,
    );
    await adminAgent.useStaffTokenForOwner();
    await adminAgent.get('users/me').expectStatus(200);

    assert.deepEqual(principal(), {
      kind: 'user',
      method: 'staff_token',
      userId: owner.id,
      apiKeyId: staffKey.id,
    });
  });

  it('reaches permissions from a URL token', async function () {
    sinon.stub(domainEvents, 'dispatch');
    const key = await models.Integration.getApiKeyBySlug('ghost-scheduler', 'admin');
    const token = getSignedAdminToken({
      publishedAt: new Date().toISOString(),
      apiUrl: '/admin/',
      key,
    });

    await adminAgent.put(`gifts/flush_reminders/?token=${token}`).expectStatus(204);

    assert.deepEqual(principal(), {
      kind: 'integration',
      method: 'admin_api_key',
      userId: undefined,
      apiKeyId: key.id,
    });
  });

  it('reaches permissions from a content key', async function () {
    await contentAgent.get('posts/').expectStatus(200);

    assert.deepEqual(principal(), {
      kind: 'integration',
      method: 'content_api_key',
      userId: undefined,
      apiKeyId: DataGenerator.Content.api_keys[1].id,
    });
  });
});

const assert = require('node:assert/strict');
const nock = require('nock');
const { randomUUID } = require('node:crypto');
const { agentProvider, fixtureManager, configUtils } = require('../../utils/e2e-framework');

describe('Canvas staff pairing API', function () {
  let agent;
  const configured = {
    url: 'https://relay.example',
    internalUrl: 'https://relay.example',
    tenant: 'alpha',
    secret: 'a'.repeat(64),
  };
  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
  });
  afterEach(async function () {
    await configUtils.restore();
    nock.cleanAll();
  });
  it('requires staff authentication', async function () {
    await agent.get('/canvas-relay/').expectStatus(403);
    await agent
      .post('/canvas-relay/pair/')
      .body({ canvasRelay: [{ session: randomUUID(), code: '1234ABCD' }] })
      .expectStatus(403);
  });
  it('feature detects an unconfigured relay without exposing issuer secrets', async function () {
    await agent.loginAsOwner();
    configUtils.set('canvasRelay', null);
    await agent
      .get('/canvas-relay/')
      .expectStatus(200)
      .expect(({ body }) => {
        assert.equal(body.canvasRelay, null);
      });
    configUtils.set('canvasRelay', configured);
    await agent
      .get('/canvas-relay/')
      .expectStatus(200)
      .expect(({ body }) => {
        assert.deepEqual(body.canvasRelay, { url: configured.url, tenant: configured.tenant });
      });
  });
  it('authorizes the current staff owner, approves once and returns only the editor capability', async function () {
    await agent.loginAsOwner();
    configUtils.set('canvasRelay', configured);
    const session = randomUUID();
    const scope = nock(configured.url)
      .post(`/v1/tenants/alpha/sessions/${session}/pairing/approve`, { code: '1234ABCD' })
      .matchHeader('authorization', /^Bearer /)
      .reply(200, { status: 'approved' });
    await agent
      .post('/canvas-relay/pair/')
      .body({ canvasRelay: [{ session, code: '1234ABCD' }] })
      .expectStatus(200)
      .expect(({ body, headers }) => {
        const connection = body.canvasRelay;
        assert.equal(connection.session, session);
        assert.equal(connection.tenant, 'alpha');
        assert.equal(connection.serviceUrl, configured.url);
        const claims = JSON.parse(Buffer.from(connection.token.split('.')[1], 'base64url'));
        assert.equal(claims.role, 'editor');
        assert.equal(claims.aud, configured.url);
        assert(claims.sub);
        assert.equal(headers['cache-control'], 'no-store');
      });
    assert(scope.isDone());
  });
  it('rejects invalid input and staff without theme permissions before contacting the relay', async function () {
    await agent.loginAsOwner();
    configUtils.set('canvasRelay', configured);
    await agent
      .post('/canvas-relay/pair/')
      .body({ canvasRelay: [{ session: '../other', code: '1234ABCD' }] })
      .expectStatus(422);
    await agent.loginAsAuthor();
    await agent.get('/canvas-relay/').expectStatus(403);
    await agent
      .post('/canvas-relay/pair/')
      .body({ canvasRelay: [{ session: randomUUID(), code: '1234ABCD' }] })
      .expectStatus(403);
  });
  it('revokes the same staff-bound session through Ghost', async function () {
    await agent.loginAsOwner();
    configUtils.set('canvasRelay', configured);
    const session = randomUUID();
    const scope = nock(configured.url)
      .post(`/v1/tenants/alpha/sessions/${session}/revoke`, {})
      .reply(200, { status: 'revoked' });
    await agent
      .post('/canvas-relay/revoke/')
      .body({ canvasRelay: [{ session }] })
      .expectStatus(200)
      .expect(({ body }) => {
        assert.equal(body.canvasRelay.status, 'revoked');
      });
    assert(scope.isDone());
  });
  it('does not let a staff API token substitute for approval in the signed-in editor', async function () {
    await agent.useStaffTokenForOwner();
    configUtils.set('canvasRelay', configured);
    await agent.get('/canvas-relay/').expectStatus(403);
    await agent
      .post('/canvas-relay/pair/')
      .body({ canvasRelay: [{ session: randomUUID(), code: '1234ABCD' }] })
      .expectStatus(403);
  });
});

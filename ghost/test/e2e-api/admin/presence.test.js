const assert = require('node:assert/strict');
const {
  agentProvider,
  configUtils,
  fixtureManager,
  matchers,
  mockManager,
  resetRateLimits,
} = require('../../utils/e2e-framework');
const { anyContentLength, anyContentVersion, anyEtag, anyErrorId, anyNumber } = matchers;

describe('Presence API', function () {
  let ownerAgent;
  let editorAgent;
  let contributorAgent;
  let integrationAgent;
  let post;
  let owner;

  // Agents are created up front: starting one mid-suite resets the booted
  // instance and invalidates the other agents' sessions.
  beforeAll(async function () {
    ownerAgent = await agentProvider.getAdminAPIAgent();
    editorAgent = await agentProvider.getAdminAPIAgent();
    contributorAgent = await agentProvider.getAdminAPIAgent();
    integrationAgent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'posts', 'integrations');
    await ownerAgent.loginAsOwner();
    await editorAgent.loginAsEditor();
    await contributorAgent.loginAsContributor();
    await integrationAgent.useZapierAdminAPIKey();
    post = fixtureManager.get('posts', 0);
    owner = fixtureManager.get('users', 0);
  });

  afterEach(function () {
    mockManager.restore();
  });

  it('records the caller and reports nobody else', async function () {
    await ownerAgent
      .post('presence/')
      .body({ presence: [{ editing: { id: post.id, type: 'post' } }] })
      .expectStatus(200)
      .matchHeaderSnapshot({
        // The body carries `serverTime`, so its length is not fixed.
        'content-length': anyContentLength,
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        presence: [{ serverTime: anyNumber }],
      });
  });

  it('shows another user who is editing a requested post', async function () {
    await ownerAgent
      .post('presence/')
      .body({ presence: [{ editing: { id: post.id, type: 'post' } }] })
      .expectStatus(200);

    const { body } = await editorAgent
      .post('presence/')
      .body({ presence: [{ resources: [{ id: post.id, type: 'post' }] }] })
      .expectStatus(200);

    assert.equal(body.presence[0].active.length, 1);
    assert.equal(body.presence[0].active[0].userId, owner.id);
    assert.equal(body.presence[0].active[0].resourceId, post.id);
    assert.equal(body.presence[0].active[0].resourceType, 'post');
  });

  it('removes the caller on leave', async function () {
    await ownerAgent
      .post('presence/')
      .body({ presence: [{ editing: { id: post.id, type: 'post' } }] })
      .expectStatus(200);

    await ownerAgent
      .post('presence/leave/')
      .body({ presence: [{ resource: { id: post.id, type: 'post' } }] })
      .expectStatus(204);

    const { body } = await editorAgent
      .post('presence/')
      .body({ presence: [{ resources: [{ id: post.id, type: 'post' }] }] })
      .expectStatus(200);

    assert.deepEqual(body.presence[0].active, []);
  });

  it('accepts a contributor', async function () {
    await contributorAgent
      .post('presence/')
      .body({ presence: [{ resources: [{ id: post.id, type: 'post' }] }] })
      .expectStatus(200);
  });

  it('rejects an integration key', async function () {
    await integrationAgent
      .post('presence/')
      .body({ presence: [{ resources: [{ id: post.id, type: 'post' }] }] })
      .expectStatus(403)
      .matchBodySnapshot({
        errors: [{ id: anyErrorId }],
      });
  });

  it('rejects malformed input', async function () {
    await ownerAgent
      .post('presence/')
      .body({ presence: [{ editing: { id: 'nope', type: 'post' } }] })
      .expectStatus(422)
      .matchBodySnapshot({
        errors: [{ id: anyErrorId }],
      });
  });

  it('rejects a body without the presence envelope', async function () {
    await ownerAgent
      .post('presence/')
      .body({ editing: { id: post.id, type: 'post' } })
      .expectStatus(422)
      .matchBodySnapshot({
        errors: [{ id: anyErrorId }],
      });
  });

  it('limits each staff user through the shared rate limiter', async function () {
    await resetRateLimits();
    // One more than the retry count is allowed, then the user is blocked.
    const allowed = configUtils.config.get('spam').presence_block.freeRetries + 1;
    const body = { presence: [{ resources: [{ id: post.id, type: 'post' }] }] };
    for (let i = 0; i < allowed; i++) {
      await contributorAgent.post('presence/').body(body).expectStatus(200);
    }

    const rejected = await contributorAgent.post('presence/').body(body).expectStatus(429);
    assert.ok(Number(rejected.headers['retry-after']) >= 1);
    assert.equal(rejected.body.errors[0].type, 'TooManyRequestsError');

    // Another user has their own budget.
    await editorAgent.post('presence/').body(body).expectStatus(200);
    await resetRateLimits();
  });

  it('is not found while polling is disabled', async function () {
    mockManager.mockLabsDisabled('editorPresencePolling');
    await ownerAgent
      .post('presence/')
      .body({ presence: [{ editing: { id: post.id, type: 'post' } }] })
      .expectStatus(404)
      .matchBodySnapshot({
        errors: [{ id: anyErrorId }],
      });
  });
});

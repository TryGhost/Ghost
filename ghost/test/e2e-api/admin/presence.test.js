const assert = require('node:assert/strict');
const {
  agentProvider,
  configUtils,
  fixtureManager,
  matchers,
  mockManager,
  resetRateLimits,
} = require('../../utils/e2e-framework');
const { anyContentLength, anyContentVersion, anyEtag, anyErrorId, anyNumber, anyObjectId } =
  matchers;

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

  it('keeps a user present while another of their tabs is still open', async function () {
    const editing = { id: post.id, type: 'post' };
    const poll = (tab) =>
      editorAgent
        .post('presence/')
        .body({ presence: [{ editing, tab }] })
        .expectStatus(200);
    await poll('tab-one-0001');
    await poll('tab-two-0002');

    await editorAgent
      .post('presence/leave/')
      .body({ presence: [{ resource: editing, tab: 'tab-one-0001' }] })
      .expectStatus(204);

    const seen = () =>
      ownerAgent
        .post('presence/')
        .body({ presence: [{ resources: [editing] }] })
        .expectStatus(200);
    const oneLeft = await seen();
    assert.equal(oneLeft.body.presence[0].active.length, 1);

    await editorAgent
      .post('presence/leave/')
      .body({ presence: [{ resource: editing, tab: 'tab-two-0002' }] })
      .expectStatus(204);

    // Gone only if each leave removed the tab it named.
    const noneLeft = await seen();
    assert.deepEqual(noneLeft.body.presence[0].active, []);
  });

  it('gives the lease to the first tab that asks and moves it on take', async function () {
    const editing = { id: fixtureManager.get('posts', 1).id, type: 'post' };
    const poll = (agent, tab, lease) =>
      agent
        .post('presence/')
        .body({ presence: [{ editing, tab, lease }] })
        .expectStatus(200);

    await poll(ownerAgent, 'tab-owner-0001', 'hold').matchBodySnapshot({
      presence: [{ lease: { userId: anyObjectId }, serverTime: anyNumber }],
    });
    const waiting = await poll(editorAgent, 'tab-editor-001', 'hold');
    assert.deepEqual(waiting.body.presence[0].lease, { userId: owner.id, mine: false });

    const taken = await poll(editorAgent, 'tab-editor-001', 'take');
    assert.equal(taken.body.presence[0].lease.mine, true);
    const passed = await poll(ownerAgent, 'tab-owner-0001', 'hold');
    assert.equal(passed.body.presence[0].lease.mine, false);
  });

  it('lets a tab watch a document without holding it', async function () {
    const editing = { id: fixtureManager.get('posts', 2).id, type: 'post' };
    const poll = (agent, tab, lease) =>
      agent
        .post('presence/')
        .body({ presence: [{ editing, tab, lease }] })
        .expectStatus(200);

    // Nobody holds a document its readers only watch.
    await poll(ownerAgent, 'tab-owner-0002', 'watch').matchBodySnapshot({
      presence: [{ serverTime: anyNumber }],
    });
    const alsoWatching = await poll(editorAgent, 'tab-editor-002', 'watch');
    assert.equal(alsoWatching.body.presence[0].lease, null);

    const claimed = await poll(editorAgent, 'tab-editor-002', 'hold');
    assert.equal(claimed.body.presence[0].lease.mine, true);
    const watching = await poll(ownerAgent, 'tab-owner-0002', 'watch');
    assert.deepEqual(watching.body.presence[0].lease, {
      userId: claimed.body.presence[0].lease.userId,
      mine: false,
    });
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

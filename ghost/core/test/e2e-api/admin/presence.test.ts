import { beforeAll, afterEach, describe, expect, it } from 'vitest';
const { agentProvider, fixtureManager, configUtils } = require('../../utils/e2e-framework');

describe('Presence API', () => {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let tokenAgent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let postId: string;
  const body = (editing = true) => ({
    presence: [
      {
        resources: [{ id: postId, type: 'post' }],
        ...(editing ? { editing: { id: postId, type: 'post' } } : {}),
      },
    ],
  });

  beforeAll(async () => {
    agent = await agentProvider.getAdminAPIAgent();
    tokenAgent = await agentProvider.getAdminAPIAgent({ staffTokenRole: 'admin' });
    await fixtureManager.init('users', 'posts');
    await agent.loginAsOwner();
    const response = await agent
      .post('/posts/')
      .body({ posts: [{ title: 'Presence test', status: 'draft' }] })
      .expectStatus(201);
    postId = response.body.posts[0].id;
  });
  afterEach(async () => {
    await configUtils.restore();
  });

  it('records an editor and reads it from a separate poll', async () => {
    const response = await agent.post('/presence/').body(body()).expectStatus(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.body.presence[0].events).toEqual(
      expect.arrayContaining([expect.objectContaining({ resourceId: postId })]),
    );
    const read = await agent.post('/presence/').body(body(false)).expectStatus(200);
    expect(read.body.presence[0].events).toHaveLength(1);
  });

  it('rejects malformed and oversized requests', async () => {
    await agent
      .post('/presence/')
      .body({ presence: [{ resources: [] }] })
      .expectStatus(422);
    await agent
      .post('/presence/')
      .body({ presence: [{ resources: Array(51).fill({ id: postId, type: 'post' }) }] })
      .expectStatus(422);
  });

  it('rejects staff API tokens', async () => {
    await tokenAgent.post('/presence/').body(body()).expectStatus(403);
  });

  it('supports pages and distinguishes their resource type', async () => {
    const created = await agent
      .post('/pages/')
      .body({ pages: [{ title: 'Presence page' }] })
      .expectStatus(201);
    const id = created.body.pages[0].id;
    const resource = { id, type: 'page' };
    await agent
      .post('/presence/')
      .body({
        presence: [{ resources: [resource], editing: resource }],
      })
      .expectStatus(200);
    const read = await agent
      .post('/presence/')
      .body({ presence: [{ resources: [resource] }] })
      .expectStatus(200);
    expect(read.body.presence[0].events).toEqual([
      expect.objectContaining({ resourceId: id, resourceType: 'page' }),
    ]);
    const wrongType = await agent
      .post('/presence/')
      .body({ presence: [{ resources: [{ id, type: 'post' }] }] })
      .expectStatus(200);
    expect(wrongType.body.presence[0].events).toEqual([]);
  });

  it('returns no data for inaccessible resources and rejects advertising them', async () => {
    await agent.loginAsAuthor();
    try {
      const response = await agent.post('/presence/').body(body(false)).expectStatus(200);
      expect(response.body.presence[0].events).toEqual([]);
      await agent.post('/presence/').body(body()).expectStatus(403);
    } finally {
      await agent.loginAsOwner();
    }
  });

  it('disables the endpoint with the feature flag', async () => {
    configUtils.set('labs:editorPresence', false);
    await agent.post('/presence/').body(body()).expectStatus(404);
  });
});

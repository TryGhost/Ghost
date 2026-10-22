import ObjectId from 'bson-objectid';
import assert from 'node:assert/strict';
import { agentProvider, fixtureManager } from '../../utils/e2e-framework';

// @ts-expect-error Module has no type declarations.
import models from '../../../core/server/models';

type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;

// Editing a post must only lock that post. Locking its tags and authors too made
// concurrent edits of different posts sharing tags deadlock each other.
describe('Concurrent post edits', function () {
  let agent: Agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  it('edits posts that share tags in parallel without failing', async function () {
    const now = new Date();

    // A shared author would be locked first and serialise every edit
    const authorIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const id = new ObjectId().toHexString();
      await models.Base.knex('users').insert({
        id,
        name: `Author ${i}`,
        slug: `concurrent-author-${i}`,
        email: `concurrent-author-${i}@example.com`,
        password: 'not-a-real-hash',
        status: 'active',
        visibility: 'public',
        created_at: now,
        updated_at: now,
      });
      authorIds.push(id);
    }

    const tags = Array.from({ length: 6 }, (_, i) => ({ name: `Shared ${i}` }));
    // Each round moves every post onto tags its neighbours currently have
    const tagsFor = (n: number) => [tags[n % tags.length], tags[(n + 3) % tags.length]];
    const postCount = authorIds.length;

    const posts: { id: string; updated_at: string }[] = [];
    for (let i = 0; i < postCount; i++) {
      const { body } = await agent
        .post('/posts/')
        .body({
          posts: [{ title: `Concurrent ${i}`, tags: tagsFor(i), authors: [{ id: authorIds[i] }] }],
        })
        .expectStatus(201);
      posts.push(body.posts[0]);
    }

    for (let round = 1; round <= 5; round++) {
      const responses = await Promise.all(
        posts.map((post, i) =>
          agent.put(`/posts/${post.id}/`).body({
            posts: [
              {
                title: `Concurrent ${i} round ${round}`,
                tags: tagsFor(i + round),
                updated_at: post.updated_at,
              },
            ],
          }),
        ),
      );

      const failures = responses
        .filter((res) => res.statusCode !== 200)
        .map(
          (res) =>
            `${res.statusCode}: ${res.body.errors?.[0]?.context ?? JSON.stringify(res.body)}`,
        );
      assert.deepEqual(failures, []);

      responses.forEach((res, i) => {
        posts[i] = res.body.posts[0];
      });
    }
  });
});

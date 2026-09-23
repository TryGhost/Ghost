const assert = require('node:assert/strict');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');

const card = (overrides = {}) => ({
  type: 'addon',
  version: 1,
  id: 'episode-1',
  addonHandle: 'podcast',
  blockName: 'episode',
  props: {},
  html: '<p>Podcast episode</p>',
  ...overrides,
});
const lexical = (children) =>
  JSON.stringify({
    root: { type: 'root', version: 1, children, direction: null, format: '', indent: 0 },
  });

describe('Admin posts: card existence', function () {
  let agent;
  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'posts');
    await agent.loginAsOwner();
  });

  it('finds matching cards before pagination and counts each post once', async function () {
    const expected = [];
    for (const [title, children] of [
      ['Card query A', [card(), card({ id: 'episode-2' })]],
      ['Card query B', [card()]],
      ['Card query C', [card({ addonHandle: 'another-app' })]],
    ]) {
      const result = await agent
        .post('posts/')
        .body({ posts: [{ title, lexical: lexical(children) }] })
        .expectStatus(201);
      if (title !== 'Card query C') {
        expected.push(result.body.posts[0].id);
      }
    }
    const query =
      'posts/?has_card=addon:podcast:episode&filter=status:draft&order=title%20asc&limit=1';
    const first = await agent.get(query).expectStatus(200);
    const second = await agent.get(`${query}&page=2`).expectStatus(200);
    assert.deepEqual([first.body.posts[0].id, second.body.posts[0].id], expected);
    assert.equal(first.body.meta.pagination.total, 2);
    assert.equal(first.body.meta.pagination.pages, 2);
  });

  it('rejects invalid selectors rather than silently returning unfiltered posts', async function () {
    for (const selector of ['', 'podcast', 'addon:podcast', 'addon:podcast:episode:*']) {
      await agent.get(`posts/?has_card=${encodeURIComponent(selector)}`).expectStatus(422);
    }
    await agent.get('posts/?has_card[]=addon:podcast:episode').expectStatus(422);
  });

  it('composes with publication filters and reflects removal of the last card', async function () {
    const created = await agent
      .post('posts/')
      .body({
        posts: [
          {
            title: 'A restricted podcast preview',
            status: 'published',
            visibility: 'paid',
            lexical: lexical([card()]),
          },
        ],
      })
      .expectStatus(201);
    const post = created.body.posts[0];
    const query = 'posts/?has_card=addon:podcast:episode&filter=status:published';
    const before = await agent.get(query).expectStatus(200);
    assert.deepEqual(
      before.body.posts.map((item) => item.id),
      [post.id],
    );
    await agent
      .put(`posts/${post.id}/`)
      .body({
        posts: [
          {
            updated_at: post.updated_at,
            lexical: lexical([
              {
                type: 'paragraph',
                version: 1,
                children: [],
                direction: null,
                format: '',
                indent: 0,
              },
            ]),
          },
        ],
      })
      .expectStatus(200);
    const after = await agent.get(query).expectStatus(200);
    assert.equal(after.body.meta.pagination.total, 0);
    assert.deepEqual(after.body.posts, []);
  });

  it('queries exact manifest identities with encoded separators and non-slug names', async function () {
    const addonHandle = 'Podcast:100%';
    const blockName = 'Épisode_preview:' + 'x'.repeat(80);
    const created = await agent
      .post('posts/')
      .body({
        posts: [
          {
            title: 'Unusual registered identity',
            lexical: lexical([card({ addonHandle, blockName })]),
          },
        ],
      })
      .expectStatus(201);
    const selector = `addon:${encodeURIComponent(addonHandle)}:${encodeURIComponent(blockName)}`;
    const result = await agent
      .get(`posts/?has_card=${encodeURIComponent(selector)}`)
      .expectStatus(200);
    assert.deepEqual(
      result.body.posts.map((item) => item.id),
      [created.body.posts[0].id],
    );
    await agent.get('posts/?has_card=addon:podcast:%25ZZ').expectStatus(422);
  });
});

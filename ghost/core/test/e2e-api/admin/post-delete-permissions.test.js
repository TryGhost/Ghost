const assert = require('node:assert/strict');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Post delete permissions', function () {
  let ownerAgent;
  let authorAgent;

  beforeAll(async function () {
    ownerAgent = await agentProvider.getAdminAPIAgent();
    authorAgent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await ownerAgent.loginAsOwner();
    await authorAgent.loginAsAuthor();
  });

  async function createPost(agent, type = 'post', authorId) {
    const endpoint = type === 'page' ? '/pages/' : '/posts/';
    const pluralType = type === 'page' ? 'pages' : 'posts';
    const post = { title: `${type} delete permission test`, status: 'draft' };
    if (authorId) {
      post.authors = [{ id: authorId }];
    }
    const response = await agent
      .post(endpoint)
      .body({ [pluralType]: [post] })
      .expectStatus(201);

    return response.body[pluralType][0];
  }

  it("rejects an Author deleting another author's post", async function () {
    const post = await createPost(ownerAgent);

    await authorAgent.delete(`/posts/${post.id}/`).expectStatus(403);

    const persistedPost = await models.Post.findOne({ id: post.id, status: 'all' });
    assert(persistedPost, "Expected the other author's post not to be deleted");
  });

  it('allows an Author to delete their own post', async function () {
    const post = await createPost(authorAgent, 'post', fixtureManager.get('users', 3).id);

    await authorAgent.delete(`/posts/${post.id}/`).expectStatus(204).expectEmptyBody();

    const persistedPost = await models.Post.findOne({ id: post.id, status: 'all' });
    assert.equal(persistedPost, null);
  });

  it('rejects an Author bulk deleting posts', async function () {
    const post = await createPost(ownerAgent);
    const filter = `id:'${post.id}'`;

    await authorAgent.delete('/posts/?filter=' + encodeURIComponent(filter)).expectStatus(403);

    const persistedPost = await models.Post.findOne({ id: post.id, status: 'all' });
    assert(persistedPost, 'Expected the post not to be deleted');
  });

  it('rejects an Author bulk deleting pages', async function () {
    const page = await createPost(ownerAgent, 'page');
    const filter = `id:'${page.id}'`;

    await authorAgent.delete('/pages/?filter=' + encodeURIComponent(filter)).expectStatus(403);

    const persistedPage = await models.Post.findOne({ id: page.id, status: 'all' });
    assert(persistedPage, 'Expected the page not to be deleted');
  });
});

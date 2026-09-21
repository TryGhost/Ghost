const assert = require('node:assert/strict');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const DataGenerator = require('../../utils/fixtures/data-generator');

describe('Comments API on gated posts', function () {
  let anonymousAgent;
  let freeAgent;
  let freeMember;
  let adminAgent;
  let post;
  let comment;

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsForMembers();
    anonymousAgent = agents.membersAgent;
    adminAgent = agents.adminAgent;
    await fixtureManager.init('posts', 'members');
    await adminAgent.loginAsOwner();

    freeAgent = anonymousAgent.duplicate();
    await freeAgent.loginAs('free-reader@example.com');
    freeMember = await models.Member.findOne({ email: 'free-reader@example.com' });

    post = await models.Post.add(
      {
        title: 'Paid discussion',
        status: 'published',
        visibility: 'paid',
        lexical: DataGenerator.markdownToLexical('Paid post content'),
      },
      { context: { internal: true } },
    );
    comment = await models.Comment.add({
      post_id: post.id,
      member_id: freeMember.id,
      html: '<p>Paid comment</p>',
    });
  });

  beforeEach(function () {
    mockManager.mockSetting('comments_enabled', 'all');
  });

  afterEach(function () {
    mockManager.restore();
  });

  it('lets readers without post access read comments without the post excerpt', async function () {
    for (const url of [
      `/api/comments/post/${post.id}/?include=post`,
      `/api/comments/${comment.id}/?include=post`,
    ]) {
      const { body } = await anonymousAgent.get(url).expectStatus(200);

      assert.equal(body.comments[0].html, '<p>Paid comment</p>');
      assert.equal(body.comments[0].post.title, 'Paid discussion');
      assert.equal('excerpt' in body.comments[0].post, false);
    }
  });

  it('keeps the post excerpt in the Admin API', async function () {
    const { body } = await adminAgent.get(`comments/${comment.id}/?include=post`).expectStatus(200);

    assert.equal(body.comments[0].post.excerpt.trim(), 'Paid post content');
  });

  for (const [reaction, score] of [
    ['like', 1],
    ['dislike', -1],
  ]) {
    it(`requires post access to ${reaction} but not to remove the vote`, async function () {
      const voteData = { comment_id: comment.id, member_id: freeMember.id, score };
      const url = `/api/comments/${comment.id}/${reaction}/`;

      await freeAgent.post(url).expectStatus(403);
      assert.equal(await models.CommentLike.findOne(voteData), null);

      // Simulate a vote cast while the member still had access to the post.
      await models.CommentLike.add(voteData);
      await freeAgent.delete(url).expectStatus(204);
      assert.equal(await models.CommentLike.findOne(voteData), null);
    });
  }

  it('lets members edit their comments after losing post access', async function () {
    await freeAgent
      .put(`/api/comments/${comment.id}/`)
      .body({ comments: [{ html: '<p>Updated comment</p>' }] })
      .expectStatus(200);

    const updated = await models.Comment.findOne({ id: comment.id });
    assert.equal(updated.get('html'), '<p>Updated comment</p>');
  });
});

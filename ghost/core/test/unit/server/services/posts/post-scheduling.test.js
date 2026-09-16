const assert = require('node:assert/strict');
const sinon = require('sinon');
const api = require('../../../../../core/server/api').endpoints;
const scheduling = require('../../../../../core/server/services/posts/post-scheduling');

describe('Scheduled publish concurrency', function () {
  let read;
  let edit;
  let post;

  beforeEach(function () {
    post = {
      id: 'scheduled-post',
      status: 'scheduled',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    read = sinon.stub(api.posts, 'read').resolves({ posts: [post] });
    edit = sinon.stub(api.posts, 'edit').resolves({ posts: [{ ...post, status: 'published' }] });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('skips overlapping deliveries immediately and clears the guard after success', async function () {
    let finishEdit;
    edit.returns(
      new Promise((resolve) => {
        finishEdit = resolve;
      }),
    );
    const first = scheduling.publish('posts', post.id, false, {});

    try {
      const duplicate = await scheduling.publish('posts', post.id, false, {});
      assert.deepEqual(duplicate, { scheduledResource: null, preScheduledResource: null });
      sinon.assert.calledOnce(read);
      sinon.assert.calledOnce(edit);
    } finally {
      finishEdit({ posts: [{ ...post, status: 'published' }] });
      await first;
    }

    read.resolves({ posts: [{ ...post, status: 'published' }] });
    await scheduling.publish('posts', post.id, false, {});
    sinon.assert.calledTwice(read);
    sinon.assert.calledOnce(edit);
  });

  it('propagates a publish failure and allows a later retry', async function () {
    const error = new Error('Publish failed');
    edit.onFirstCall().rejects(error);

    await assert.rejects(scheduling.publish('posts', post.id, false, {}), error);
    const result = await scheduling.publish('posts', post.id, false, {});

    assert.equal(result.scheduledResource.status, 'published');
    sinon.assert.calledTwice(read);
    sinon.assert.calledTwice(edit);
  });

  it('allows different posts to publish concurrently', async function () {
    const results = await Promise.all([
      scheduling.publish('posts', post.id, false, {}),
      scheduling.publish('posts', 'another-post', false, {}),
    ]);

    assert.ok(results.every((result) => result.scheduledResource.status === 'published'));
    sinon.assert.calledTwice(read);
    sinon.assert.calledTwice(edit);
  });
});

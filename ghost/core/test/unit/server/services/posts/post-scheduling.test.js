const assert = require('node:assert/strict');
const sinon = require('sinon');
const api = require('../../../../../core/server/api').endpoints;
const postScheduling = require('../../../../../core/server/services/posts/post-scheduling');

describe('Scheduled publishing', function () {
  let read, edit, post;

  const publish = (id = 'post-id') =>
    postScheduling.publish('posts', id, false, { id, context: { internal: true } });

  beforeEach(function () {
    post = {
      id: 'post-id',
      status: 'scheduled',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    read = sinon.stub().resolves({ posts: [post] });
    edit = sinon.stub().resolves({ posts: [{ ...post, status: 'published' }] });
    sinon.stub(api, 'posts').get(() => ({ read, edit }));
  });

  afterEach(function () {
    sinon.restore();
  });

  it('returns a no-op for an overlapping delivery before the active publish finishes', async function () {
    const pending = Promise.withResolvers();
    read.onFirstCall().returns(pending.promise);
    const active = publish();

    try {
      assert.deepEqual(await publish(), {
        scheduledResource: null,
        preScheduledResource: null,
      });
      sinon.assert.calledOnce(read);
      sinon.assert.notCalled(edit);
    } finally {
      pending.resolve({ posts: [post] });
      await active;
    }

    sinon.assert.calledOnce(edit);

    // A later scheduling of the same resource must not retain the old guard.
    await publish();
    sinon.assert.calledTwice(edit);
  });

  it('releases the guard after failure so the scheduler can retry', async function () {
    const failure = new Error('Publish failed');
    edit.onFirstCall().rejects(failure);

    await assert.rejects(publish(), (err) => err === failure);

    const result = await publish();
    assert.equal(result.scheduledResource.status, 'published');
    sinon.assert.calledTwice(edit);
  });

  it('allows another resource to publish while the first is in flight', async function () {
    const pending = Promise.withResolvers();
    read.onFirstCall().returns(pending.promise);
    const active = publish();

    try {
      const result = await publish('other-post-id');
      assert.equal(result.scheduledResource.status, 'published');
      sinon.assert.calledTwice(read);
      sinon.assert.calledOnce(edit);
    } finally {
      pending.resolve({ posts: [post] });
      await active;
    }
  });
});

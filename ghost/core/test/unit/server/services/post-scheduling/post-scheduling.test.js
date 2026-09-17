const assert = require('node:assert/strict');
const sinon = require('sinon');
const moment = require('moment');
const testUtils = require('../../../../utils');
const { Post } = require('../../../../../core/server/models/post');
const events = require('../../../../../core/server/lib/common/events');
const SchedulingDefault =
  require('../../../../../core/server/adapters/scheduling/scheduling-default').default;
const urlUtils = require('../../../../../core/shared/url-utils').default;
const { getSignedAdminToken } = require('../../../../../core/server/adapters/scheduling/utils');
const {
  getSchedulerIdempotencyKey,
} = require('../../../../../core/server/adapters/scheduling/get-scheduler-idempotency-key');
const PostScheduling =
  require('../../../../../core/server/services/post-scheduling/post-scheduling').default;
const nock = require('nock');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const api = require('../../../../../core/server/api').endpoints;
const postScheduling = require('../../../../../core/server/services/posts/post-scheduling');

describe('PostScheduling', function () {
  let adapter;
  let internalKeys;

  beforeEach(function () {
    adapter = new SchedulingDefault();
    // These tests only assert that schedule/unschedule are called with the
    // right arguments — they don't need the adapter to actually run. Stub
    // the internals that arm real setTimeout loops and fire real HTTP pings
    // (run = recursive 5-min loop, _execute = per-job ping timers,
    // _pingUrl = the got request). Otherwise the adapter leaves live timers
    // and in-flight requests behind that, under the shared module registry
    // (isolate: false), hang whichever file runs next in the worker — e.g.
    // scheduling-default's own real-HTTP pingUrl tests then time out.
    sinon.stub(adapter, 'run');
    sinon.stub(adapter, '_execute');
    sinon.stub(adapter, '_pingUrl').resolves();
    sinon.stub(adapterManager, 'getAdapter').returns(adapter);
    sinon.spy(adapter, 'schedule');
    sinon.spy(adapter, 'unschedule');

    internalKeys = new Map([
      ['ghost-scheduler', Promise.resolve({ id: 'integrationUniqueId', secret: 'aaaa' })],
    ]);
  });

  afterEach(function () {
    sinon.restore();
  });

  it('returns a no-op for an overlapping delivery before the active publish finishes', async function () {
    const post = {
      id: 'post-id',
      status: 'scheduled',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const pending = Promise.withResolvers();
    const read = sinon.stub().returns(pending.promise);
    const edit = sinon.stub().resolves({ posts: [{ ...post, status: 'published' }] });
    sinon.stub(api, 'posts').get(() => ({ read, edit }));
    const publish = () =>
      postScheduling.publish('posts', post.id, false, {
        id: post.id,
        context: { internal: true },
      });
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
  });

  describe('constructor', function () {
    it('wires event handlers and starts the adapter', async function () {
      const post = Post.forge(
        testUtils.DataGenerator.forKnex.createPost({
          id: 1337,
          lexical: testUtils.DataGenerator.markdownToLexical('something'),
        }),
      );
      nock('http://scheduler.local:1111')
        .get(() => true)
        .query(true)
        .reply(200);
      nock('http://scheduler.local:1111')
        .post(() => true)
        .query(true)
        .reply(200);
      nock('http://scheduler.local:1111')
        .put(() => true)
        .query(true)
        .reply(200);

      new PostScheduling({ apiUrl: 'http://scheduler.local:1111/', internalKeys, adapter });

      events.emit('post.scheduled', post);
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      sinon.assert.calledOnce(adapter.schedule);
      const job = adapter.schedule.args[0][0];
      const signedAdminToken = getSignedAdminToken({
        publishedAt: post.get('published_at'),
        apiUrl: 'http://scheduler.local:1111/',
        key: { id: 'integrationUniqueId', secret: 'aaaa' },
      });
      const callbackUrl = `${urlUtils.urlJoin(
        'http://scheduler.local:1111/',
        'schedules',
        'posts',
        post.get('id'),
      )}/?token=${signedAdminToken}`;

      assert.equal(job.time, moment(post.get('published_at')).valueOf());
      assert.equal(job.url, callbackUrl);
      assert.equal(job.extra.httpMethod, 'PUT');
      assert.equal(job.extra.oldTime, null);
      assert.equal(
        job.extra.idempotencyKey,
        getSchedulerIdempotencyKey({
          namespace: 'post-scheduling',
          date: new Date(job.time),
          url: new URL(callbackUrl),
        }),
      );
    });
  });

  describe('idempotency key', function () {
    // Drives jobs through the boot rebuild rather than the event handlers so
    // no listeners pile up on the shared events emitter between tests.
    let scheduledPosts = [];

    beforeEach(function () {
      sinon.stub(Post, 'findAll').callsFake(({ filter }) => {
        return Promise.resolve(filter.includes('type:post') ? scheduledPosts : []);
      });
    });

    function scheduledPost(overrides = {}) {
      return Post.forge(
        testUtils.DataGenerator.forKnex.createPost({
          id: 4242,
          lexical: testUtils.DataGenerator.markdownToLexical('something'),
          ...overrides,
        }),
      );
    }

    async function rebuildAndGetJob({ post, keys = internalKeys }) {
      scheduledPosts = [post];
      adapter.schedule.resetHistory();
      const service = new PostScheduling({
        apiUrl: 'http://scheduler.local:1111/',
        internalKeys: keys,
        adapter,
      });
      await service.rescheduleAll();
      sinon.assert.calledOnce(adapter.schedule);
      return adapter.schedule.args[0][0];
    }

    it('is the same when the same post is registered again for the same time', async function () {
      // Outcome: a persistent queue fed by a boot rebuild sees the second
      // registration as the job it already holds, not as a duplicate.
      const post = scheduledPost();

      const first = await rebuildAndGetJob({ post });
      const second = await rebuildAndGetJob({ post });

      assert(first.extra.idempotencyKey.startsWith('ghost-post-scheduling-'));
      assert.equal(first.extra.idempotencyKey, second.extra.idempotencyKey);
    });

    it('changes when the publish time changes', async function () {
      // Outcome: a reschedule registers a distinct job rather than deduping
      // against the job queued for the old time.
      const publishedAt = moment().add(1, 'day').toDate();

      const first = await rebuildAndGetJob({ post: scheduledPost({ published_at: publishedAt }) });
      const second = await rebuildAndGetJob({
        post: scheduledPost({ published_at: moment(publishedAt).add(1, 'hour').toDate() }),
      });

      assert.notEqual(first.extra.idempotencyKey, second.extra.idempotencyKey);
    });

    it('changes when the signing key changes', async function () {
      // Outcome: after a key rotation the re-signed callback is a distinct
      // job, so the unschedule of the old URL cannot take the new job with it.
      const post = scheduledPost();

      const first = await rebuildAndGetJob({ post });
      const second = await rebuildAndGetJob({
        post,
        keys: new Map([
          ['ghost-scheduler', Promise.resolve({ id: 'rotatedKeyId', secret: 'bbbb' })],
        ]),
      });

      assert.notEqual(first.extra.idempotencyKey, second.extra.idempotencyKey);
    });
  });

  describe('rescheduleAll', function () {
    function stubScheduledPost() {
      const post = Post.forge(
        testUtils.DataGenerator.forKnex.createPost({
          id: 4004,
          lexical: testUtils.DataGenerator.markdownToLexical('something'),
        }),
      );
      sinon.stub(Post, 'findAll').callsFake(({ filter }) => {
        return Promise.resolve(filter.includes('type:post') ? [post] : []);
      });
      return post;
    }

    it('unschedules with the previous key and reschedules with the current key', async function () {
      stubScheduledPost();
      internalKeys = new Map([
        ['ghost-scheduler', Promise.resolve({ id: 'k1', secret: 'aaaabbbb' })],
      ]);

      const service = new PostScheduling({
        apiUrl: 'http://scheduler.local:1111/',
        internalKeys,
        adapter,
      });

      await service.rescheduleAll({ previousKey: { id: 'k1', secret: 'ccccdddd' } });

      sinon.assert.calledOnce(adapter.unschedule);
      sinon.assert.calledOnce(adapter.schedule);
      assert.notEqual(
        adapter.unschedule.args[0][0].url,
        adapter.schedule.args[0][0].url,
        'unschedule URL (signed with old key) must differ from schedule URL (signed with new key)',
      );
    });

    it('rotation tells the adapter to actually delete the stale queued job', async function () {
      // Outcome: rotation requests a real (non-bootstrap) unschedule of
      // the previous-key URL, so the adapter writes a tombstone and the
      // stale callback is suppressed at execution time. Without this,
      // the old URL keeps firing and the server logs 401s. SchedulingDefault's
      // own tests cover the tombstone semantics; here we verify
      // PostScheduling honours the contract.
      stubScheduledPost();
      internalKeys = new Map([
        ['ghost-scheduler', Promise.resolve({ id: 'k1', secret: 'aaaabbbb' })],
      ]);

      const service = new PostScheduling({
        apiUrl: 'http://scheduler.local:1111/',
        internalKeys,
        adapter,
      });
      await service.rescheduleAll({ previousKey: { id: 'k1', secret: 'ccccdddd' } });

      sinon.assert.calledOnce(adapter.unschedule);
      assert.equal(adapter.unschedule.args[0][1].bootstrap, false);
    });

    it('same-key rebuild marks unschedule as bootstrap so the new job survives', async function () {
      // Outcome: when no previousKey is supplied (boot), unschedule and
      // schedule use the same URL. PostScheduling must mark the
      // unschedule as bootstrap so the adapter skips the tombstone and
      // the about-to-be-scheduled job stays pingable.
      stubScheduledPost();
      internalKeys = new Map([
        ['ghost-scheduler', Promise.resolve({ id: 'k1', secret: 'aaaabbbb' })],
      ]);

      const service = new PostScheduling({
        apiUrl: 'http://scheduler.local:1111/',
        internalKeys,
        adapter,
      });
      await service.rescheduleAll();

      sinon.assert.calledOnce(adapter.unschedule);
      assert.equal(adapter.unschedule.args[0][1].bootstrap, true);
    });
  });
});

const { EventEmitter } = require('events');
const assert = require('node:assert/strict');
const sinon = require('sinon');

const postPresence = require('../../../../../core/server/services/post-presence');
const {
  markPostPresence,
} = require('../../../../../core/server/services/post-presence/mark-post-presence');
const {
  stream: presenceStream,
  MAX_STREAMS_PER_USER,
} = require('../../../../../core/server/web/api/endpoints/admin/presence-controller');

describe('PostPresence resilience', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('markPostPresence — never breaks the parent API call', function () {
    it('swallows errors from postPresence.mark', function () {
      sinon.stub(postPresence, 'mark').throws(new Error('cache exploded'));

      assert.doesNotThrow(() =>
        markPostPresence({ user: { id: 'u1', get: () => 'Alice' } }, { id: 'post-1' }),
      );
    });

    it('swallows errors from frame.user.get', function () {
      assert.doesNotThrow(() =>
        markPostPresence(
          {
            user: {
              id: 'u1',
              get: () => {
                throw new Error('bookshelf getter blew up');
              },
            },
          },
          { id: 'post-1' },
        ),
      );
    });
  });

  describe('presence-stream SSE handler — listener lifecycle', function () {
    function makeReqRes() {
      const req = new EventEmitter();
      const res = new EventEmitter();
      res.writeHead = sinon.stub();
      res.flushHeaders = sinon.stub();
      res.write = sinon.stub();
      return { req, res };
    }

    it('unsubscribes from the bus when the request closes', async function () {
      const baseline = postPresence._emitter.listenerCount('presence');

      const { req, res } = makeReqRes();
      await presenceStream(req, res);

      assert.equal(
        postPresence._emitter.listenerCount('presence'),
        baseline + 1,
        'handler should subscribe on open',
      );

      req.emit('close');

      assert.equal(
        postPresence._emitter.listenerCount('presence'),
        baseline,
        'handler should unsubscribe on req close',
      );
    });

    it('also unsubscribes when the response emits close (proxy teardown path)', async function () {
      const baseline = postPresence._emitter.listenerCount('presence');

      const { req, res } = makeReqRes();
      await presenceStream(req, res);
      res.emit('close');

      assert.equal(postPresence._emitter.listenerCount('presence'), baseline);
    });

    it('does not double-unsubscribe when multiple close/error events fire', async function () {
      const baseline = postPresence._emitter.listenerCount('presence');

      const { req, res } = makeReqRes();
      await presenceStream(req, res);
      req.emit('close');
      req.emit('error', new Error('socket reset'));
      res.emit('close');
      res.emit('error', new Error('write after end'));

      assert.equal(
        postPresence._emitter.listenerCount('presence'),
        baseline,
        'cleanup should be idempotent across all four signals',
      );
    });
  });

  describe('presence-stream SSE handler — concurrent stream cap', function () {
    function makeUserReqRes(userId) {
      const req = new EventEmitter();
      req.user = { id: userId };
      const res = new EventEmitter();
      res.writeHead = sinon.stub();
      res.flushHeaders = sinon.stub();
      res.write = sinon.stub();
      res.end = sinon.stub();
      res.status = sinon.stub().returns(res);
      return { req, res };
    }

    async function openStreams(userId, count) {
      const opened = [];
      for (let i = 0; i < count; i += 1) {
        const pair = makeUserReqRes(userId);
        await presenceStream(pair.req, pair.res);
        opened.push(pair);
      }
      return opened;
    }

    it('rejects a stream beyond the per-user limit with 429', async function () {
      const opened = await openStreams('cap-user-1', MAX_STREAMS_PER_USER);

      const { req, res } = makeUserReqRes('cap-user-1');
      await presenceStream(req, res);

      sinon.assert.calledWith(res.status, 429);
      sinon.assert.notCalled(res.writeHead);

      opened.forEach((pair) => pair.req.emit('close'));
    });

    it('counts the limit per user, so one user cannot block another', async function () {
      const opened = await openStreams('cap-user-2', MAX_STREAMS_PER_USER);

      const { req, res } = makeUserReqRes('cap-user-3');
      await presenceStream(req, res);

      sinon.assert.notCalled(res.status);
      sinon.assert.calledOnce(res.writeHead);

      req.emit('close');
      opened.forEach((pair) => pair.req.emit('close'));
    });

    it('does not leak a slot when the client disconnects while roles load', async function () {
      const baseline = postPresence._emitter.listenerCount('presence');

      for (let i = 0; i < MAX_STREAMS_PER_USER + 1; i += 1) {
        const { req, res } = makeUserReqRes('cap-user-5');
        // Roles load before the close handlers are registered, so simulate a
        // request that is already gone by the time the handler resumes.
        req.user.load = sinon.stub().callsFake(async () => {
          req.destroyed = true;
        });
        await presenceStream(req, res);
      }

      const { req, res } = makeUserReqRes('cap-user-5');
      await presenceStream(req, res);

      sinon.assert.notCalled(res.status);
      sinon.assert.calledOnce(res.writeHead);
      assert.equal(
        postPresence._emitter.listenerCount('presence'),
        baseline + 1,
        'aborted streams should not leave subscribers behind',
      );

      req.emit('close');
    });

    it('frees a slot when a stream closes', async function () {
      const opened = await openStreams('cap-user-4', MAX_STREAMS_PER_USER);
      opened[0].req.emit('close');

      const { req, res } = makeUserReqRes('cap-user-4');
      await presenceStream(req, res);

      sinon.assert.notCalled(res.status);
      sinon.assert.calledOnce(res.writeHead);

      req.emit('close');
      opened.slice(1).forEach((pair) => pair.req.emit('close'));
    });
  });
});

const { EventEmitter } = require('events');
const assert = require('node:assert/strict');
const sinon = require('sinon');

const postPresence = require('../../../../../core/server/services/post-presence');
const {
  markPostPresence,
} = require('../../../../../core/server/services/post-presence/mark-post-presence');
const {
  stream: presenceStream,
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
});

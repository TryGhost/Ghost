const {EventEmitter} = require('events');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');

const labs = require('../../../../../core/shared/labs');
const postPresence = require('../../../../../core/server/services/post-presence');
const presenceStream = require('../../../../../core/server/web/api/endpoints/admin/lib/presence-stream');

describe('PostPresence resilience', function () {
    let labsStub;

    beforeEach(function () {
        labsStub = sinon.stub(labs, 'isSet');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('markPostPresence (posts.js) — never breaks the parent API call', function () {
        const postsEndpoint = rewire('../../../../../core/server/api/endpoints/posts');
        const markPostPresence = postsEndpoint.__get__('markPostPresence');

        it('swallows errors from postPresence.mark', function () {
            labsStub.withArgs('editorPresence').returns(true);
            sinon.stub(postPresence, 'mark').throws(new Error('cache exploded'));

            assert.doesNotThrow(() => markPostPresence(
                {user: {id: 'u1', get: () => 'Alice'}},
                {id: 'post-1'}
            ));
        });

        it('swallows errors from labs.isSet itself', function () {
            // Defensive: if the labs subsystem ever throws during isSet
            // (boot order, stubbed labs, etc.) the post API must not crash.
            labsStub.withArgs('editorPresence').throws(new Error('labs unavailable'));

            assert.doesNotThrow(() => markPostPresence(
                {user: {id: 'u1', get: () => 'Alice'}},
                {id: 'post-1'}
            ));
        });

        it('swallows errors from frame.user.get', function () {
            labsStub.withArgs('editorPresence').returns(true);

            assert.doesNotThrow(() => markPostPresence(
                {user: {id: 'u1', get: () => {
                    throw new Error('bookshelf getter blew up');
                }}},
                {id: 'post-1'}
            ));
        });
    });

    describe('presence-stream SSE handler — listener lifecycle', function () {
        function makeReqRes() {
            const req = new EventEmitter();
            const res = new EventEmitter();
            res.writeHead = sinon.stub();
            res.flushHeaders = sinon.stub();
            res.write = sinon.stub();
            return {req, res};
        }

        it('unsubscribes from the bus when the request closes', function () {
            labsStub.withArgs('editorPresence').returns(true);
            const baseline = postPresence._emitter.listenerCount('presence');

            const {req, res} = makeReqRes();
            presenceStream(req, res);

            assert.equal(
                postPresence._emitter.listenerCount('presence'),
                baseline + 1,
                'handler should subscribe on open'
            );

            req.emit('close');

            assert.equal(
                postPresence._emitter.listenerCount('presence'),
                baseline,
                'handler should unsubscribe on req close'
            );
        });

        it('also unsubscribes when the response emits close (proxy teardown path)', function () {
            labsStub.withArgs('editorPresence').returns(true);
            const baseline = postPresence._emitter.listenerCount('presence');

            const {req, res} = makeReqRes();
            presenceStream(req, res);
            res.emit('close');

            assert.equal(postPresence._emitter.listenerCount('presence'), baseline);
        });

        it('does not double-unsubscribe when multiple close/error events fire', function () {
            labsStub.withArgs('editorPresence').returns(true);
            const baseline = postPresence._emitter.listenerCount('presence');

            const {req, res} = makeReqRes();
            presenceStream(req, res);
            req.emit('close');
            req.emit('error', new Error('socket reset'));
            res.emit('close');
            res.emit('error', new Error('write after end'));

            assert.equal(
                postPresence._emitter.listenerCount('presence'),
                baseline,
                'cleanup should be idempotent across all four signals'
            );
        });
    });
});

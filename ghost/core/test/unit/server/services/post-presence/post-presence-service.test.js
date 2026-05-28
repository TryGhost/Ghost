const assert = require('node:assert/strict');
const sinon = require('sinon');

const PostPresenceService = require('../../../../../core/server/services/post-presence/post-presence-service');

const POST_ID = 'post-1';
const OTHER_POST_ID = 'post-2';
const USER = {id: 'u1', name: 'Alice', profileImage: 'http://example/a.png'};
const OTHER_USER = {id: 'u2', name: 'Bob', profileImage: null};

function makeService(opts = {}) {
    return new PostPresenceService({idleMs: 1000, ttlMs: 5000, cleanupIntervalMs: 500, ...opts});
}

describe('PostPresenceService', function () {
    let clock;

    beforeEach(function () {
        clock = sinon.useFakeTimers();
    });

    afterEach(function () {
        clock.restore();
    });

    describe('constructor', function () {
        it('throws when idleMs is greater than or equal to ttlMs', function () {
            assert.throws(() => new PostPresenceService({idleMs: 1000, ttlMs: 1000}), /idleMs < ttlMs/);
            assert.throws(() => new PostPresenceService({idleMs: 2000, ttlMs: 1000}), /idleMs < ttlMs/);
        });

        it('accepts valid options and applies defaults', function () {
            const service = new PostPresenceService();
            assert.equal(service.idleMs, 90 * 1000);
            assert.equal(service.ttlMs, 180 * 1000);
            assert.equal(service.cleanupIntervalMs, 30 * 1000);
        });
    });

    describe('mark', function () {
        it('publishes a post event for a new entry', function () {
            const service = makeService();
            const handler = sinon.spy();
            service.subscribe(handler);

            service.mark(POST_ID, USER);

            assert.equal(handler.callCount, 1);
            const event = handler.firstCall.args[0];
            assert.equal(event.type, 'post');
            assert.equal(event.postId, POST_ID);
            assert.equal(event.users.length, 1);
            assert.equal(event.users[0].id, USER.id);
            assert.equal(event.users[0].isIdle, false);
            service.stop();
        });

        it('is silent on an already-active heartbeat (autosave dedup)', function () {
            const service = makeService();
            const handler = sinon.spy();
            service.subscribe(handler);

            service.mark(POST_ID, USER);
            assert.equal(handler.callCount, 1);

            clock.tick(500); // well within idleMs
            service.mark(POST_ID, USER);
            assert.equal(handler.callCount, 1, 'second mark should not re-publish');
            service.stop();
        });

        it('publishes on idle→active transition', function () {
            const service = makeService();
            const handler = sinon.spy();
            service.subscribe(handler);

            service.mark(POST_ID, USER);
            // Advance past idleMs and run the sweep so the entry flips idle.
            clock.tick(1500);
            assert.equal(handler.callCount, 2, 'sweep publishes idle transition');

            service.mark(POST_ID, USER);
            assert.equal(handler.callCount, 3, 'idle→active re-publishes');
            assert.equal(handler.lastCall.args[0].users[0].isIdle, false);
            service.stop();
        });

        it('ignores invalid input without throwing or publishing', function () {
            const service = makeService();
            const handler = sinon.spy();
            service.subscribe(handler);

            assert.doesNotThrow(() => service.mark(undefined, USER));
            assert.doesNotThrow(() => service.mark(POST_ID, null));
            assert.doesNotThrow(() => service.mark(POST_ID, {}));
            assert.doesNotThrow(() => service.mark(POST_ID, {id: ''}));

            assert.equal(handler.callCount, 0);
            assert.equal(service.snapshot().length, 0);
            service.stop();
        });
    });

    describe('lazy start', function () {
        it('does not schedule the cleanup interval until the first mark', function () {
            const service = makeService();
            assert.equal(service._cleanupTimer, null);

            service.subscribe(() => {});
            assert.equal(service._cleanupTimer, null, 'subscribe alone should not start the timer');

            service.mark(POST_ID, USER);
            assert.ok(service._cleanupTimer, 'first mark starts the timer');

            const initialTimer = service._cleanupTimer;
            service.mark(POST_ID, OTHER_USER);
            assert.equal(service._cleanupTimer, initialTimer, 'subsequent marks reuse the timer');
            service.stop();
        });
    });

    describe('_sweep transitions', function () {
        it('flips active entries to idle past idleMs and removes them past ttlMs', function () {
            const service = makeService();
            const handler = sinon.spy();
            service.subscribe(handler);

            service.mark(POST_ID, USER);
            assert.equal(handler.callCount, 1);

            // Within idleMs: no transition.
            clock.tick(500);
            assert.equal(handler.callCount, 1);
            assert.equal(service.snapshot()[0].users[0].isIdle, false);

            // Past idleMs: flips idle and publishes.
            clock.tick(700);
            assert.equal(handler.callCount, 2);
            assert.equal(handler.lastCall.args[0].users[0].isIdle, true);

            // Past ttlMs: removed and publishes empty list.
            clock.tick(5000);
            const lastEvent = handler.lastCall.args[0];
            assert.equal(lastEvent.users.length, 0);
            assert.equal(service.snapshot().length, 0);
            service.stop();
        });
    });

    describe('_cleanupAll error boundary', function () {
        it('continues iterating other posts when a subscriber throws for one post', function () {
            const service = makeService();
            const calls = [];
            service.subscribe((event) => {
                calls.push(event.postId);
                if (event.postId === POST_ID && event.users.length === 0) {
                    throw new Error('boom');
                }
            });

            service.mark(POST_ID, USER);
            service.mark(OTHER_POST_ID, OTHER_USER);
            calls.length = 0;

            // Advance past ttlMs so both posts get cleaned up in the same sweep.
            clock.tick(6000);

            // The post that threw still publishes (the throw happens inside
            // the subscriber). The other post must also publish — the
            // per-iteration try/catch in _cleanupAll guarantees this.
            assert.ok(calls.includes(POST_ID));
            assert.ok(calls.includes(OTHER_POST_ID), 'other post still swept after a throwing subscriber');
            service.stop();
        });
    });

    describe('leave', function () {
        it('is a no-op for an unknown post or user', function () {
            const service = makeService();
            const handler = sinon.spy();
            service.subscribe(handler);

            service.leave('unknown', 'u1');
            service.mark(POST_ID, USER);
            handler.resetHistory();
            service.leave(POST_ID, 'never-marked');

            assert.equal(handler.callCount, 0);
            service.stop();
        });

        it('emits empty users and drops the post when removing the last user', function () {
            const service = makeService();
            const handler = sinon.spy();
            service.subscribe(handler);

            service.mark(POST_ID, USER);
            handler.resetHistory();

            service.leave(POST_ID, USER.id);
            assert.equal(handler.callCount, 1);
            assert.equal(handler.firstCall.args[0].users.length, 0);
            assert.equal(service.snapshot().length, 0);
            service.stop();
        });
    });

    describe('snapshot / wire shape', function () {
        it('drops stale entries and posts with no fresh users', function () {
            const service = makeService();
            service.mark(POST_ID, USER);
            service.mark(OTHER_POST_ID, OTHER_USER);

            clock.tick(6000); // past ttlMs

            assert.deepEqual(service.snapshot(), []);
            service.stop();
        });

        it('strips lastSeen from snapshot and post-event payloads', function () {
            const service = makeService();
            const handler = sinon.spy();
            service.subscribe(handler);

            service.mark(POST_ID, USER);

            const snapUser = service.snapshot()[0].users[0];
            assert.equal(snapUser.lastSeen, undefined, 'snapshot user should not include lastSeen');

            const eventUser = handler.firstCall.args[0].users[0];
            assert.equal(eventUser.lastSeen, undefined, 'published event user should not include lastSeen');
            service.stop();
        });
    });
});

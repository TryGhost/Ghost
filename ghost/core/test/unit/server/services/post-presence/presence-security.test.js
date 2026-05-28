const {EventEmitter} = require('events');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');

const labs = require('../../../../../core/shared/labs');
const models = require('../../../../../core/server/models');
const postPresence = require('../../../../../core/server/services/post-presence');
const PostPresenceService = require('../../../../../core/server/services/post-presence/post-presence-service');
const {canReceiveEvent} = require('../../../../../core/server/services/post-presence/presence-permissions');
const presenceStream = require('../../../../../core/server/web/api/endpoints/admin/lib/presence-stream');
const presenceEnter = require('../../../../../core/server/web/api/endpoints/admin/lib/presence-enter');

function fakeReqRes(user) {
    const req = new EventEmitter();
    req.user = user;
    const res = new EventEmitter();
    res.writeHead = sinon.stub();
    res.flushHeaders = sinon.stub();
    res.write = sinon.stub();
    res.status = sinon.stub().returnsThis();
    res.end = sinon.stub();
    return {req, res};
}

function fakeUser({id, roles = []}) {
    return {
        id,
        get: () => null,
        hasRole: name => roles.includes(name)
    };
}

describe('PostPresence security: per-subscriber filtering', function () {
    let labsStub;

    beforeEach(function () {
        labsStub = sinon.stub(labs, 'isSet');
        labsStub.withArgs('editorPresence').returns(true);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('canReceiveEvent (the permission filter itself)', function () {
        it('elevated subscribers receive every event regardless of authorIds', function () {
            const editor = {userId: 'editor-1', elevated: true};
            assert.equal(canReceiveEvent(editor, {authorIds: []}), true);
            assert.equal(canReceiveEvent(editor, {authorIds: ['someone-else']}), true);
            assert.equal(canReceiveEvent(editor, {}), true); // missing authorIds, elevated still sees
        });

        it('non-elevated subscribers ONLY see events where their userId is in authorIds', function () {
            const author = {userId: 'author-1', elevated: false};
            assert.equal(canReceiveEvent(author, {authorIds: ['author-1']}), true);
            assert.equal(canReceiveEvent(author, {authorIds: ['author-1', 'editor-1']}), true);
            assert.equal(canReceiveEvent(author, {authorIds: ['someone-else']}), false);
            assert.equal(canReceiveEvent(author, {authorIds: []}), false);
        });

        it('non-elevated subscribers see nothing if the event has no authorIds', function () {
            const author = {userId: 'author-1', elevated: false};
            assert.equal(canReceiveEvent(author, {}), false);
            assert.equal(canReceiveEvent(author, {authorIds: null}), false);
            assert.equal(canReceiveEvent(author, {authorIds: 'not-an-array'}), false);
        });

        it('a null subscriber receives nothing', function () {
            assert.equal(canReceiveEvent(null, {authorIds: ['x']}), false);
        });
    });

    describe('service: authorIds are captured and emitted on every event', function () {
        let service;
        afterEach(function () {
            if (service) {
                service.stop();
            }
        });

        it('mark stores postContext and includes authorIds in the published event', function () {
            service = new PostPresenceService({idleMs: 1000, ttlMs: 5000, cleanupIntervalMs: 500});
            const handler = sinon.spy();
            service.subscribe(handler);

            service.mark('p1', {id: 'u1', name: 'A'}, {authorIds: ['u1', 'u2']});

            assert.equal(handler.callCount, 1);
            const event = handler.firstCall.args[0];
            assert.deepEqual(event.authorIds, ['u1', 'u2']);
        });

        it('snapshot includes authorIds per post', function () {
            service = new PostPresenceService({idleMs: 1000, ttlMs: 5000, cleanupIntervalMs: 500});
            service.mark('p1', {id: 'u1', name: 'A'}, {authorIds: ['u1']});
            service.mark('p2', {id: 'u2', name: 'B'}, {authorIds: ['u2', 'u3']});

            const snap = service.snapshot();
            const p1 = snap.find(p => p.postId === 'p1');
            const p2 = snap.find(p => p.postId === 'p2');
            assert.deepEqual(p1.authorIds, ['u1']);
            assert.deepEqual(p2.authorIds, ['u2', 'u3']);
        });

        it('when last user leaves a post, the postContext is dropped', function () {
            service = new PostPresenceService({idleMs: 1000, ttlMs: 5000, cleanupIntervalMs: 500});
            service.mark('p1', {id: 'u1', name: 'A'}, {authorIds: ['u1']});
            service.leave('p1', 'u1');

            assert.equal(service._postContexts.has('p1'), false);
        });

        it('leave publishes BEFORE clearing the postContext so non-elevated subscribers still get the empty event', function () {
            // Regression test: the published empty-leave event must
            // carry the post's authorIds so a non-elevated subscriber
            // who currently has this post in view receives the
            // "users: []" signal and clears the stale avatar.
            service = new PostPresenceService({idleMs: 1000, ttlMs: 5000, cleanupIntervalMs: 500});
            const handler = sinon.spy();
            service.subscribe(handler);

            service.mark('p1', {id: 'editor-1', name: 'E'}, {authorIds: ['author-7']});
            handler.resetHistory();

            service.leave('p1', 'editor-1');

            assert.equal(handler.callCount, 1);
            const event = handler.firstCall.args[0];
            assert.equal(event.users.length, 0);
            assert.deepEqual(event.authorIds, ['author-7'], 'authorIds must survive the leave so subscribers in that list can receive the clear');
        });

        it('_cleanupAll publishes BEFORE clearing the postContext (TTL path)', function () {
            const clock = sinon.useFakeTimers();
            try {
                service = new PostPresenceService({idleMs: 100, ttlMs: 300, cleanupIntervalMs: 50});
                const handler = sinon.spy();
                service.subscribe(handler);

                service.mark('p1', {id: 'editor-1', name: 'E'}, {authorIds: ['author-7']});
                handler.resetHistory();

                clock.tick(400); // past ttlMs

                const removalEvent = handler.getCalls().find(call => call.args[0].users.length === 0);
                assert.ok(removalEvent, 'a removal event must fire');
                assert.deepEqual(removalEvent.args[0].authorIds, ['author-7'], 'authorIds must survive TTL cleanup');
            } finally {
                clock.restore();
            }
        });
    });

    describe('SSE handler: an Author cannot see presence for posts they do not author', function () {
        beforeEach(function () {
            // Reset the singleton's state between tests so test order doesn't matter.
            postPresence._byPostId.clear();
            postPresence._postContexts.clear();
        });

        it('snapshot sent on connect is filtered: Author receives only their own post', function () {
            // Two posts are active. The Author is only listed as an author on p1.
            // The Editor's draft (p2) must NOT leak to the Author.
            postPresence.mark('p1', {id: 'author-1', name: 'A'}, {authorIds: ['author-1']});
            postPresence.mark('p2', {id: 'editor-1', name: 'E'}, {authorIds: ['editor-1']});

            const author = fakeUser({id: 'author-1', roles: ['Author']});
            const {req, res} = fakeReqRes(author);
            presenceStream(req, res);

            // First res.write call is the snapshot frame.
            const writeCall = res.write.firstCall;
            assert.ok(writeCall, 'snapshot should be written');
            const sseFrame = writeCall.args[0];
            // Parse the SSE data line.
            const dataLine = sseFrame.match(/^data: (.+)\n\n$/)[1];
            const payload = JSON.parse(dataLine);

            assert.equal(payload.type, 'snapshot');
            const postIds = payload.posts.map(p => p.postId);
            assert.deepEqual(postIds, ['p1'], 'Author must only see p1, NEVER p2');

            req.emit('close');
        });

        it('per-event forwarding: Author does not receive an event for an editor-only post', function () {
            const author = fakeUser({id: 'author-1', roles: ['Author']});
            const {req, res} = fakeReqRes(author);
            presenceStream(req, res);
            res.write.resetHistory();

            // Editor marks themselves on p2 (Author has no role on this post).
            postPresence.mark('p2', {id: 'editor-1', name: 'E'}, {authorIds: ['editor-1']});

            // No SSE write should occur for the Author.
            assert.equal(res.write.callCount, 0, 'Author must not receive events for p2');

            req.emit('close');
        });

        it('per-event forwarding: Author DOES receive an event for a post they author', function () {
            const author = fakeUser({id: 'author-1', roles: ['Author']});
            const {req, res} = fakeReqRes(author);
            presenceStream(req, res);
            res.write.resetHistory();

            postPresence.mark('p1', {id: 'editor-1', name: 'E'}, {authorIds: ['author-1', 'editor-1']});

            assert.equal(res.write.callCount, 1, 'Author should receive event for p1');
            const dataLine = res.write.firstCall.args[0].match(/^data: (.+)\n\n$/)[1];
            const payload = JSON.parse(dataLine);
            assert.equal(payload.postId, 'p1');

            req.emit('close');
        });

        it('Editor (elevated) receives ALL events regardless of authorIds', function () {
            const editor = fakeUser({id: 'editor-1', roles: ['Editor']});
            const {req, res} = fakeReqRes(editor);
            presenceStream(req, res);
            res.write.resetHistory();

            postPresence.mark('p99', {id: 'someone', name: 'S'}, {authorIds: ['somebody-else']});

            assert.equal(res.write.callCount, 1, 'Editor sees every event');
            const dataLine = res.write.firstCall.args[0].match(/^data: (.+)\n\n$/)[1];
            assert.equal(JSON.parse(dataLine).postId, 'p99');

            req.emit('close');
        });

        it('Contributor (non-elevated) does NOT see drafts they are not authoring', function () {
            postPresence.mark('p-draft', {id: 'editor-1', name: 'E'}, {authorIds: ['editor-1']});

            const contributor = fakeUser({id: 'contributor-1', roles: ['Contributor']});
            const {req, res} = fakeReqRes(contributor);
            presenceStream(req, res);

            const dataLine = res.write.firstCall.args[0].match(/^data: (.+)\n\n$/)[1];
            const payload = JSON.parse(dataLine);
            assert.deepEqual(payload.posts, [], 'Contributor must see empty snapshot');

            req.emit('close');
        });
    });

    describe('presence-enter handler authorizes via the Post model', function () {
        it('returns 403 when Post.findOne throws a permission error', async function () {
            const permError = new Error('No permissions to read post.');
            permError.errorType = 'NoPermissionError';
            sinon.stub(models.Post, 'findOne').rejects(permError);
            const markSpy = sinon.spy(postPresence, 'mark');
            const res = {status: sinon.stub().returnsThis(), end: sinon.stub()};

            await presenceEnter(
                {params: {id: 'p1'}, user: {id: 'u1', get: () => null}},
                res
            );

            sinon.assert.calledWith(res.status, 403);
            sinon.assert.notCalled(markSpy);
        });

        it('returns 204 (best-effort, no mark) when Post.findOne throws a non-permission error', async function () {
            // Transient errors (DB blip, etc.) must not be misreported
            // as 403. The presence flow degrades silently — no avatar
            // appears for the caller, but the editor continues normally.
            sinon.stub(models.Post, 'findOne').rejects(new Error('Connection reset'));
            const markSpy = sinon.spy(postPresence, 'mark');
            const res = {status: sinon.stub().returnsThis(), end: sinon.stub()};

            await presenceEnter(
                {params: {id: 'p1'}, user: {id: 'u1', get: () => null}},
                res
            );

            sinon.assert.calledWith(res.status, 204);
            sinon.assert.notCalled(markSpy);
        });

        it('returns 404 when the post does not exist (findOne resolves null)', async function () {
            sinon.stub(models.Post, 'findOne').resolves(null);
            const markSpy = sinon.spy(postPresence, 'mark');
            const res = {status: sinon.stub().returnsThis(), end: sinon.stub()};

            await presenceEnter(
                {params: {id: 'missing'}, user: {id: 'u1', get: () => null}},
                res
            );

            sinon.assert.calledWith(res.status, 404);
            sinon.assert.notCalled(markSpy);
        });

        it('passes authorIds from the post model through to mark()', async function () {
            const fakePost = {
                related: () => ({
                    map: fn => [{id: 'u1'}, {id: 'u9'}].map(a => fn({get: k => a[k]}))
                })
            };
            sinon.stub(models.Post, 'findOne').resolves(fakePost);
            const markStub = sinon.stub(postPresence, 'mark');
            const res = {status: sinon.stub().returnsThis(), end: sinon.stub()};

            await presenceEnter(
                {params: {id: 'p1'}, user: {id: 'u1', get: () => 'Alice'}},
                res
            );

            sinon.assert.calledOnce(markStub);
            const [postId, user, postContext] = markStub.firstCall.args;
            assert.equal(postId, 'p1');
            assert.equal(user.id, 'u1');
            assert.deepEqual(postContext.authorIds, ['u1', 'u9']);
            sinon.assert.calledWith(res.status, 204);
        });
    });

    describe('markPostPresence helper (posts.js)', function () {
        const postsEndpoint = rewire('../../../../../core/server/api/endpoints/posts');
        const markPostPresence = postsEndpoint.__get__('markPostPresence');

        it('does not mark when the edit came via a staff API token (api_key context)', function () {
            const markSpy = sinon.spy(postPresence, 'mark');

            markPostPresence(
                {
                    user: {id: 'u1', get: () => 'Alice'},
                    options: {context: {api_key: 'some-api-key-id'}}
                },
                {id: 'post-1', authors: [{id: 'u1'}]}
            );

            sinon.assert.notCalled(markSpy);
        });

        it('passes authorIds extracted from the post DTO through to mark()', function () {
            const markStub = sinon.stub(postPresence, 'mark');

            markPostPresence(
                {user: {id: 'u1', get: () => 'Alice'}, options: {context: {user: 'u1'}}},
                {id: 'post-1', authors: [{id: 'u1'}, {id: 'u2'}]}
            );

            sinon.assert.calledOnce(markStub);
            const [postId, user, postContext] = markStub.firstCall.args;
            assert.equal(postId, 'post-1');
            assert.equal(user.id, 'u1');
            assert.deepEqual(postContext.authorIds, ['u1', 'u2']);
        });

        it('passes an empty authorIds array when the DTO has no authors field', function () {
            const markStub = sinon.stub(postPresence, 'mark');

            markPostPresence(
                {user: {id: 'u1', get: () => 'Alice'}, options: {}},
                {id: 'post-1'}
            );

            sinon.assert.calledOnce(markStub);
            assert.deepEqual(markStub.firstCall.args[2].authorIds, []);
        });
    });
});

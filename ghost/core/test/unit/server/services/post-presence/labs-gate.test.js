const sinon = require('sinon');
const rewire = require('rewire');

const labs = require('../../../../../core/shared/labs');
const postPresence = require('../../../../../core/server/services/post-presence');

describe('PostPresence labs flag gate', function () {
    let labsStub;

    beforeEach(function () {
        labsStub = sinon.stub(labs, 'isSet');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('markPostPresence helper (posts.js)', function () {
        // The helper isn't exported, so reach it via rewire.
        const postsEndpoint = rewire('../../../../../core/server/api/endpoints/posts');
        const markPostPresence = postsEndpoint.__get__('markPostPresence');

        it('does not call postPresence.mark when editorPresence is off', function () {
            labsStub.withArgs('editorPresence').returns(false);
            const markSpy = sinon.spy(postPresence, 'mark');

            markPostPresence(
                {user: {id: 'u1', get: () => 'Alice'}},
                {id: 'post-1'}
            );

            sinon.assert.notCalled(markSpy);
        });

        it('calls postPresence.mark when editorPresence is on', function () {
            labsStub.withArgs('editorPresence').returns(true);
            const markStub = sinon.stub(postPresence, 'mark');

            markPostPresence(
                {user: {id: 'u1', get: key => (key === 'name' ? 'Alice' : 'image.png')}},
                {id: 'post-1'}
            );

            sinon.assert.calledOnce(markStub);
            sinon.assert.calledWith(markStub, 'post-1', {
                id: 'u1', name: 'Alice', profileImage: 'image.png'
            });
        });
    });

    describe('presence-enter handler', function () {
        const handler = require('../../../../../core/server/web/api/endpoints/admin/lib/presence-enter');

        it('returns 404 and does not mark when editorPresence is off', function () {
            labsStub.withArgs('editorPresence').returns(false);
            const markSpy = sinon.spy(postPresence, 'mark');
            const res = {status: sinon.stub().returnsThis(), end: sinon.stub()};

            handler({params: {id: 'p1'}, user: {id: 'u1', get: () => 'Alice'}}, res);

            sinon.assert.calledWith(res.status, 404);
            sinon.assert.notCalled(markSpy);
        });
    });

    describe('presence-leave handler', function () {
        const handler = require('../../../../../core/server/web/api/endpoints/admin/lib/presence-leave');

        it('returns 404 and does not leave when editorPresence is off', function () {
            labsStub.withArgs('editorPresence').returns(false);
            const leaveSpy = sinon.spy(postPresence, 'leave');
            const res = {status: sinon.stub().returnsThis(), end: sinon.stub()};

            handler({params: {id: 'p1'}, user: {id: 'u1'}}, res);

            sinon.assert.calledWith(res.status, 404);
            sinon.assert.notCalled(leaveSpy);
        });
    });

    describe('presence-stream handler', function () {
        const handler = require('../../../../../core/server/web/api/endpoints/admin/lib/presence-stream');

        it('returns 404 and never subscribes when editorPresence is off', function () {
            labsStub.withArgs('editorPresence').returns(false);
            const subscribeSpy = sinon.spy(postPresence, 'subscribe');
            const res = {
                status: sinon.stub().returnsThis(),
                end: sinon.stub(),
                writeHead: sinon.stub(),
                flushHeaders: sinon.stub(),
                write: sinon.stub(),
                on: sinon.stub()
            };
            const req = {on: sinon.stub()};

            handler(req, res);

            sinon.assert.calledWith(res.status, 404);
            sinon.assert.notCalled(res.writeHead);
            sinon.assert.notCalled(subscribeSpy);
        });
    });
});

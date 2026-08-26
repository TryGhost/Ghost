import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: presence', function () {
    setupTest();

    let service, feature, originalEventSource, eventSourceSpy;

    beforeEach(function () {
        service = this.owner.lookup('service:presence');
        feature = this.owner.lookup('service:feature');

        // Spy on the global EventSource constructor so we can assert it's
        // never called when the flag is off.
        originalEventSource = window.EventSource;
        eventSourceSpy = sinon.stub().returns({
            close: sinon.stub(),
            onmessage: null,
            onerror: null
        });
        window.EventSource = eventSourceSpy;
        window.EventSource.CLOSED = originalEventSource ? originalEventSource.CLOSED : 2;
        window.EventSource.CONNECTING = originalEventSource ? originalEventSource.CONNECTING : 0;
    });

    afterEach(function () {
        service.stop();
        window.EventSource = originalEventSource;
        sinon.restore();
    });

    describe('start() labs gate', function () {
        it('does not open an SSE connection when editorPresence is off', function () {
            sinon.stub(feature, 'get').withArgs('editorPresence').returns(false);

            service.start();

            expect(eventSourceSpy.called, 'EventSource should not be constructed').to.be.false;
            expect(service._source, '_source should remain null').to.be.null;
            expect(service._beforeUnloadHandler, 'pagehide handler should not be registered').to.be.null;
        });

        it('opens the SSE connection when editorPresence is on', function () {
            sinon.stub(feature, 'get').withArgs('editorPresence').returns(true);

            service.start();

            expect(eventSourceSpy.calledOnce, 'EventSource should be constructed once').to.be.true;
            expect(service._source, '_source should be set').to.not.be.null;
        });
    });

    it('does not enter or leave posts while the feature is disabled', function () {
        sinon.stub(feature, 'get').withArgs('editorPresence').returns(false);
        const enterStub = sinon.stub(service, '_sendEnter');
        const leaveStub = sinon.stub(service, '_sendLeave');

        service.enterPost('post-1');
        service.leavePost('post-1');

        expect(enterStub.called).to.be.false;
        expect(leaveStub.called).to.be.false;
    });

    it('leaves the previous post before entering a new one', function () {
        sinon.stub(feature, 'get').withArgs('editorPresence').returns(true);
        service._source = {close: sinon.stub()};
        const enterStub = sinon.stub(service, '_sendEnter');
        const leaveStub = sinon.stub(service, '_sendLeave');

        service.enterPost('post-1');
        service.enterPost('post-2');

        expect(leaveStub).to.have.been.calledOnceWith('post-1');
        expect(enterStub).to.have.been.calledTwice;
        expect(enterStub.secondCall).to.have.been.calledWith('post-2');
        expect(enterStub.firstCall.calledBefore(leaveStub.firstCall)).to.be.true;
        expect(leaveStub.firstCall.calledBefore(enterStub.secondCall)).to.be.true;
    });

    it('sends a final leave and clears state when stopped', function () {
        sinon.stub(feature, 'get').withArgs('editorPresence').returns(true);
        const close = sinon.stub();
        const leaveStub = sinon.stub(service, '_sendLeave');
        service._source = {close};
        service._currentPostId = 'post-1';
        service._byPostId = new Map([['post-1', [{id: 'user-1'}]]]);

        service.stop();

        expect(leaveStub).to.have.been.calledOnceWith('post-1');
        expect(close.calledOnce).to.be.true;
        expect(service._currentPostId).to.be.null;
        expect(service._byPostId.size).to.equal(0);
    });

    it('re-enters the current post when EventSource reconnects', function () {
        sinon.stub(feature, 'get').withArgs('editorPresence').returns(true);
        const enterStub = sinon.stub(service, '_sendEnter');
        sinon.stub(service, '_sendLeave');
        service._currentPostId = 'post-1';

        service.start();
        service._source.onopen();

        expect(enterStub).to.have.been.calledOnceWith('post-1');
    });

    it('retries EventSource construction on a later editor entry', function () {
        sinon.stub(feature, 'get').withArgs('editorPresence').returns(true);
        sinon.stub(console, 'warn');
        sinon.stub(service, '_sendEnter');
        sinon.stub(service, '_sendLeave');
        eventSourceSpy.onFirstCall().throws(new Error('temporary browser failure'));
        eventSourceSpy.onSecondCall().returns({
            close: sinon.stub(),
            onmessage: null,
            onerror: null
        });

        service.start();
        expect(service._source).to.be.null;

        service.enterPost('post-1');

        expect(eventSourceSpy.calledTwice).to.be.true;
        expect(service._source).to.not.be.null;
    });

    it('applies snapshot and post events without exposing the current user', function () {
        service._handleMessage({
            data: JSON.stringify({
                type: 'snapshot',
                posts: [{
                    postId: 'post-1',
                    users: [{id: 'current-user'}, {id: 'peer-1'}]
                }]
            })
        });
        sinon.stub(service.session, 'user').value({id: 'current-user'});

        expect(service.usersForPost('post-1')).to.deep.equal([{id: 'peer-1'}]);

        service._handleMessage({
            data: JSON.stringify({type: 'post', postId: 'post-1', users: []})
        });

        expect(service.usersForPost('post-1')).to.deep.equal([]);
    });

    it('drops malformed events without replacing current state', function () {
        const warnStub = sinon.stub(console, 'warn');
        service._byPostId = new Map([['post-1', [{id: 'peer-1'}]]]);

        service._handleMessage({data: '{nope'});

        expect(service._byPostId.has('post-1')).to.be.true;
        expect(warnStub.calledOnce).to.be.true;
    });
});

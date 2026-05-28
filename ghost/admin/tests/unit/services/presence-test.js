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
});

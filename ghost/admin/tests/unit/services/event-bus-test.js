import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: event-bus', function () {
    setupTest('service:event-bus', {});
    it('works', function () {
        let service = this.subject();
        let eventHandler = sinon.spy();

        service.subscribe('test-event', eventHandler);

        service.publish('test-event', 'test');

        service.unsubscribe('test-event', eventHandler);

        service.publish('test-event', 'test two');

        expect(
            eventHandler.calledOnce,
            'event handler only triggered once'
        ).to.be.true;

        expect(
            eventHandler.calledWith('test'),
            'event handler was passed correct arguments'
        ).to.be.true;
    });
});

import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Controller: member', function () {
    setupTest();

    let controller;
    let triggerEmberDataChange;

    beforeEach(function () {
        triggerEmberDataChange = sinon.spy();
        controller = this.owner.lookup('controller:member');
        Object.defineProperty(controller, 'stateBridge', {
            configurable: true,
            value: {triggerEmberDataChange}
        });
        controller.member = {id: 'member-1'};
    });

    afterEach(function () {
        sinon.restore();
    });

    it('invalidates the React members cache through the Ember bridge when member data changes', function () {
        controller.invalidateMembersCache();

        expect(triggerEmberDataChange.calledOnce).to.be.true;
        expect(triggerEmberDataChange.calledWith('update', 'member', 'member-1', null)).to.be.true;
    });
});

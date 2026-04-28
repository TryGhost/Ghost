import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Controller: member', function () {
    setupTest();

    let controller;
    let stateBridge;

    beforeEach(function () {
        controller = this.owner.lookup('controller:member');
        stateBridge = this.owner.lookup('service:state-bridge');
        sinon.spy(stateBridge, 'triggerEmberDataChange');
        controller.member = {id: 'member-1'};
    });

    afterEach(function () {
        sinon.restore();
    });

    it('invalidates the React members cache through the Ember bridge when member data changes', function () {
        controller.invalidateMembersCache();

        expect(stateBridge.triggerEmberDataChange.calledOnce).to.be.true;
        expect(stateBridge.triggerEmberDataChange.calledWith('update', 'member', 'member-1', null)).to.be.true;
    });

    it('invalidates the React comments cache through the Ember bridge when commenting changes', function () {
        controller.invalidateCommentsCache();

        expect(stateBridge.triggerEmberDataChange.calledOnce).to.be.true;
        expect(stateBridge.triggerEmberDataChange.calledWith('update', 'comment', 'member-1', null)).to.be.true;
    });
});

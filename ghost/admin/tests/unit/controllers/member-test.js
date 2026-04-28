import sinon from 'sinon';
import {describe, it, beforeEach, afterEach} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Controller: member', function () {
    setupTest();

    let controller;
    let queryClient;

    beforeEach(function () {
        controller = this.owner.lookup('controller:member');
        queryClient = {
            invalidateQueries: sinon.spy()
        };
        window.adminXQueryClient = queryClient;
    });

    afterEach(function () {
        delete window.adminXQueryClient;
        sinon.restore();
    });

    it('invalidates the React members cache when member data changes', function () {
        controller.invalidateMembersCache();

        expect(queryClient.invalidateQueries.calledOnce).to.be.true;
        expect(queryClient.invalidateQueries.calledWith({queryKey: ['MembersResponseType']})).to.be.true;
    });
});

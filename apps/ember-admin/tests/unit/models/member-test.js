import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Model: member', function () {
    setupTest();

    let store;

    beforeEach(function () {
        store = this.owner.lookup('service:store');
    });

    it('has a validation type of "member"', function () {
        const model = store.createRecord('member');

        expect(model.get('validationType')).to.equal('member');
    });
});

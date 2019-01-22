import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Model: member', function () {
    setupTest();

    // Replace this with your real tests.
    it('exists', function () {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('member', {});
        expect(model).to.be.ok;
    });
});

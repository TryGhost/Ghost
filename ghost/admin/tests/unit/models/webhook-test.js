import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Model: webhook', function () {
    setupModelTest('webhook', {
        // Specify the other units that are required for this test.
        needs: []
    });

    // Replace this with your real tests.
    it('exists', function () {
        let model = this.subject();
        // var store = this.store();
        expect(model).to.be.ok;
    });
});

import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Model: api-key', function () {
    setupModelTest('api-key', {
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

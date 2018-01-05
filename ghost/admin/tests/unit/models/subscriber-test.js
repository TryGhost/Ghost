import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Model: subscriber', function () {
    setupModelTest('subscriber', {
        // Specify the other units that are required for this test.
        needs: ['model:post', 'service:session']
    });

    // Replace this with your real tests.
    it('exists', function () {
        let model = this.subject();
        // var store = this.store();
        expect(model).to.be.ok;
    });
});

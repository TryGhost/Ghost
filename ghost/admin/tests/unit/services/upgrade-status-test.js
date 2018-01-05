import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: upgrade-status', function () {
    setupTest('service:upgrade-status', {
        // Specify the other units that are required for this test.
        // needs: ['service:foo']
        needs: ['service:notifications']
    });

    // Replace this with your real tests.
    it('exists', function () {
        let service = this.subject();
        expect(service).to.be.ok;
    });
});

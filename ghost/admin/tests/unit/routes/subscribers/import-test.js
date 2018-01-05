import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Route: subscribers/import', function () {
    setupTest('route:subscribers/import', {
        // Specify the other units that are required for this test.
        needs: ['service:notifications']
    });

    it('exists', function () {
        let route = this.subject();
        expect(route).to.be.ok;
    });
});

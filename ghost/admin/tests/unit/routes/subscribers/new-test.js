import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Route: subscribers/new', function () {
    setupTest('route:subscribers/new', {
        needs: ['service:notifications']
    });

    it('exists', function () {
        let route = this.subject();
        expect(route).to.be.ok;
    });
});

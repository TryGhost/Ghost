/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupTest} from 'ember-mocha';

describe('Unit: Route: subscribers', function() {
    setupTest('route:subscribers', {
        needs: ['service:notifications']
    });

    it('exists', function() {
        let route = this.subject();
        expect(route).to.be.ok;
    });
});

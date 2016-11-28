/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupTest} from 'ember-mocha';

describe('Unit: Controller: subscribers', function() {
    setupTest('controller:subscribers', {
        needs: ['service:notifications']
    });

    // Replace this with your real tests.
    it('exists', function() {
        let controller = this.subject();
        expect(controller).to.be.ok;
    });
});

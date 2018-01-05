import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Controller: subscribers', function () {
    setupTest('controller:subscribers', {
        needs: ['service:notifications', 'service:session']
    });

    // Replace this with your real tests.
    it('exists', function () {
        let controller = this.subject();
        expect(controller).to.be.ok;
    });
});

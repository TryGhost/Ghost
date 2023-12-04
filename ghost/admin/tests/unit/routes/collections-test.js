import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit | Route | collections', function () {
    setupTest();

    it('exists', function () {
        let route = this.owner.lookup('route:collections');
        expect(route).to.be.ok;
    });
});

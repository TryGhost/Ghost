import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit | Route | explore', function () {
    setupTest();

    it('exists', function () {
        let route = this.owner.lookup('route:explore.connect');
        expect(route).to.be.ok;
    });
});

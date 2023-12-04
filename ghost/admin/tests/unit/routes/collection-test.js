import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit | Route | collection', function () {
    setupTest();

    it('exists', function () {
        let route = this.owner.lookup('route:collection');
        expect(route).to.be.ok;
    });
});

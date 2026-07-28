import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit | Service | limit', function () {
    setupTest();

    let limitService;

    beforeEach(function () {
        limitService = this.owner.lookup('service:limit');
    });

    it('exists', function () {
        expect(limitService).to.be.ok;
    });
});

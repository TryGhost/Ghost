import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Controller: member', function () {
    setupTest();

    it('does not require the deleted members controller to load', function () {
        expect(() => this.owner.lookup('controller:member')).not.to.throw();
    });
});

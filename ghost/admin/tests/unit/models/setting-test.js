import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Model: setting', function () {
    setupTest();

    it('has a validation type of "setting"', function () {
        let model = this.owner.lookup('service:store').createRecord('setting');

        expect(model.get('validationType')).to.equal('setting');
    });
});

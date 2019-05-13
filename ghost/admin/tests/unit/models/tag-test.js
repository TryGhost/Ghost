import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Model: tag', function () {
    setupTest();

    it('has a validation type of "tag"', function () {
        let model = this.owner.lookup('service:store').createRecord('tag');

        expect(model.get('validationType')).to.equal('tag');
    });
});

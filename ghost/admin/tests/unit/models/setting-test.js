import {describe, it} from 'mocha';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Model: setting', function () {
    setupModelTest('setting');
    it('has a validation type of "setting"', function () {
        let model = this.subject();

        expect(model.get('validationType')).to.equal('setting');
    });
});

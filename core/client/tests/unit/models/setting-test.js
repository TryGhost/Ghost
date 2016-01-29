import {
    describeModel,
    it
} from 'ember-mocha';

describeModel('setting', 'Unit: Model: setting', function () {
    it('has a validation type of "setting"', function () {
        let model = this.subject();

        expect(model.get('validationType')).to.equal('setting');
    });
});

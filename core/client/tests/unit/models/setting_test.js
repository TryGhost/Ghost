import {
    describeModel,
    it
} from 'ember-mocha';

describeModel('setting', function () {
    it('has a validation type of "setting"', function () {
        var model = this.subject();

        expect(model.get('validationType')).to.equal('setting');
    });
});

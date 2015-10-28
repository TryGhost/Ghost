import {
    describeModel,
    it
} from 'ember-mocha';

describeModel('tag', 'Unit: Model: tag', function () {
    it('has a validation type of "tag"', function () {
        let model = this.subject();

        expect(model.get('validationType')).to.equal('tag');
    });
});

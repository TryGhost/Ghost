import {
    describeModel,
    it
} from 'ember-mocha';

describeModel('tag', function () {
    it('has a validation type of "tag"', function () {
        var model = this.subject();

        expect(model.get('validationType')).to.equal('tag');
    });
});

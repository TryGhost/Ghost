import Ember from 'ember';
import {
    describeModel,
    it
} from 'ember-mocha';

describeModel('role', function () {
    it('provides a lowercase version of the name', function () {
        var model = this.subject({
            name: 'Author'
        });

        expect(model.get('name')).to.equal('Author');
        expect(model.get('lowerCaseName')).to.equal('author');

        Ember.run(function () {
            model.set('name', 'Editor');

            expect(model.get('name')).to.equal('Editor');
            expect(model.get('lowerCaseName')).to.equal('editor');
        });
    });
});

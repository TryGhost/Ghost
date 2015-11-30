import Ember from 'ember';
import {
    describeModel,
    it
} from 'ember-mocha';

const {run} = Ember;

describeModel('role', 'Unit: Model: role', function () {
    it('provides a lowercase version of the name', function () {
        const model = this.subject({
            name: 'Author'
        });

        expect(model.get('name')).to.equal('Author');
        expect(model.get('lowerCaseName')).to.equal('author');

        run(function () {
            model.set('name', 'Editor');

            expect(model.get('name')).to.equal('Editor');
            expect(model.get('lowerCaseName')).to.equal('editor');
        });
    });
});

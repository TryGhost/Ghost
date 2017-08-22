import {describe, it} from 'mocha';
import {run} from '@ember/runloop';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Model: role', function () {
    setupModelTest('role', {
        needs: ['service:ajax']
    });

    it('provides a lowercase version of the name', function () {
        let model = this.subject({
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

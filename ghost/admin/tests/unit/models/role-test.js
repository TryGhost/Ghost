import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupTest} from 'ember-mocha';

describe('Unit: Model: role', function () {
    setupTest();

    it('provides a lowercase version of the name', function () {
        let model = this.owner.lookup('service:store').createRecord('role', {
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

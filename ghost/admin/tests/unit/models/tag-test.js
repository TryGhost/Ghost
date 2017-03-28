import {describe, it} from 'mocha';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Model: tag', function () {
    setupModelTest('tag', {
        needs: [
            'service:feature'
        ]
    });

    it('has a validation type of "tag"', function () {
        let model = this.subject();

        expect(model.get('validationType')).to.equal('tag');
    });
});

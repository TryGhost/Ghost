import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Model: navigation-item', function () {
    setupTest('model:navigation-item', {
        // Specify the other units that are required for this test.
        needs: []
    });

    it('isComplete is true when label and url are filled', function () {
        let model = this.subject();

        model.set('label', 'test');
        model.set('url', 'test');

        expect(model.get('isComplete')).to.be.true;
    });

    it('isComplete is false when label is blank', function () {
        let model = this.subject();

        model.set('label', '');
        model.set('url', 'test');

        expect(model.get('isComplete')).to.be.false;
    });

    it('isComplete is false when url is blank', function () {
        let model = this.subject();

        model.set('label', 'test');
        model.set('url', '');

        expect(model.get('isComplete')).to.be.false;
    });

    it('isBlank is true when label and url are blank', function () {
        let model = this.subject();

        model.set('label', '');
        model.set('url', '');

        expect(model.get('isBlank')).to.be.true;
    });

    it('isBlank is false when label is present', function () {
        let model = this.subject();

        model.set('label', 'test');
        model.set('url', '');

        expect(model.get('isBlank')).to.be.false;
    });

    it('isBlank is false when url is present', function () {
        let model = this.subject();

        model.set('label', '');
        model.set('url', 'test');

        expect(model.get('isBlank')).to.be.false;
    });
});

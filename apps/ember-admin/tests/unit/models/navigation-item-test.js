import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Model: navigation-item', function () {
    setupTest();

    it('isComplete is true when label and url are filled', function () {
        let model = this.owner.lookup('model:navigation-item');

        model.set('label', 'test');
        model.set('url', 'test');

        expect(model.get('isComplete')).to.be.true;
    });

    it('isComplete is true when icon and url are filled', function () {
        let model = this.owner.lookup('model:navigation-item');

        model.set('label', '');
        model.set('icon', 'https://example.com/icon.svg');
        model.set('url', 'test');

        expect(model.get('isComplete')).to.be.true;
    });

    it('isComplete is false when label and icon are blank', function () {
        let model = this.owner.lookup('model:navigation-item');

        model.set('label', '');
        model.set('icon', '');
        model.set('url', 'test');

        expect(model.get('isComplete')).to.be.false;
    });

    it('isComplete is false when url is blank', function () {
        let model = this.owner.lookup('model:navigation-item');

        model.set('label', 'test');
        model.set('url', '');

        expect(model.get('isComplete')).to.be.false;
    });

    it('isBlank is true when label, url, and icon are blank', function () {
        let model = this.owner.lookup('model:navigation-item');

        model.set('label', '');
        model.set('url', '');
        model.set('icon', '');

        expect(model.get('isBlank')).to.be.true;
    });

    it('isBlank is false when label is present', function () {
        let model = this.owner.lookup('model:navigation-item');

        model.set('label', 'test');
        model.set('url', '');

        expect(model.get('isBlank')).to.be.false;
    });

    it('isBlank is false when url is present', function () {
        let model = this.owner.lookup('model:navigation-item');

        model.set('label', '');
        model.set('url', 'test');

        expect(model.get('isBlank')).to.be.false;
    });

    it('isBlank is false when icon is present', function () {
        let model = this.owner.lookup('model:navigation-item');

        model.set('label', '');
        model.set('url', '');
        model.set('icon', 'https://example.com/icon.svg');

        expect(model.get('isBlank')).to.be.false;
    });
});

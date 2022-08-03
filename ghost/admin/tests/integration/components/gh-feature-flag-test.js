import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import {click, find, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

const featureStub = Service.extend({
    testFlag: true
});

describe('Integration: Component: gh-feature-flag', function () {
    setupRenderingTest();

    beforeEach(function () {
        this.owner.register('service:feature', featureStub);
    });

    it('renders properties correctly', async function () {
        await render(hbs`<GhFeatureFlag @flag="testFlag" />`);
        expect(find('label').getAttribute('for')).to.equal(find('input[type="checkbox"]').id);
    });

    it('renders correctly when flag is set to true', async function () {
        await render(hbs`<GhFeatureFlag @flag="testFlag" />`);
        expect(find('label input[type="checkbox"]').checked).to.be.true;
    });

    it('renders correctly when flag is set to false', async function () {
        let feature = this.owner.lookup('service:feature');
        feature.set('testFlag', false);

        await render(hbs`<GhFeatureFlag @flag="testFlag" />`);
        expect(find('label input[type="checkbox"]').checked).to.be.false;
    });

    it('updates to reflect changes in flag property', async function () {
        await render(hbs`<GhFeatureFlag @flag="testFlag" />`);
        expect(find('label input[type="checkbox"]').checked).to.be.true;

        await click('label');
        expect(find('label input[type="checkbox"]').checked).to.be.false;
    });
});

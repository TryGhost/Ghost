import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {blur, fillIn, find, findAll, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-psm-visibility-input', function () {
    setupRenderingTest();

    it('renders', async function () {
        this.set('post', {
            visibility: 'members'
        });

        await render(hbs`{{gh-psm-visibility-input post=post}}`);

        expect(this.element, 'top-level elements').to.exist;
        expect(findAll('option'), 'number of options').to.have.length(4);
        expect(find('select').value, 'selected option value').to.equal('members');
    });

    it('updates post visibility on change', async function () {
        let setVisibility = sinon.spy();

        this.set('post', {
            visibility: 'public',
            set: setVisibility
        });

        await render(hbs`{{gh-psm-visibility-input post=post}}`);

        expect(this.element, 'top-level elements').to.exist;
        expect(findAll('option'), 'number of options').to.have.length(4);
        expect(find('select').value, 'selected option value').to.equal('public');

        await fillIn('select', 'paid');
        await blur('select');

        expect(setVisibility.calledTwice).to.be.true;
        expect(setVisibility.calledWith('visibility', 'paid')).to.be.true;
        expect(setVisibility.calledWith('tiers', [])).to.be.true;
    });
});

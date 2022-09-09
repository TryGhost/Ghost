import {describe, it} from 'mocha';
import {expect} from 'chai';
import {hbs} from 'ember-cli-htmlbars';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Helper: humanize-recipient-filter', function () {
    setupRenderingTest();

    it('handles all members', async function () {
        await render(hbs`{{humanize-recipient-filter "status:free,status:-free"}}`);
        expect(this.element.textContent.trim()).to.equal('All members');
    });

    it('handles free members', async function () {
        await render(hbs`{{humanize-recipient-filter "status:free"}}`);
        expect(this.element.textContent.trim()).to.equal('Free members');
    });

    it('handles paid members', async function () {
        await render(hbs`{{humanize-recipient-filter "status:-free"}}`);
        expect(this.element.textContent.trim()).to.equal('Paid members');
    });

    it('handles free members and labels array', async function () {
        await render(hbs`{{humanize-recipient-filter "status:free,labels:[one,two]"}}`);
        expect(this.element.textContent.trim()).to.equal('Free members & Labels: One, Two');
    });

    it('handles free members and individual labels', async function () {
        await render(hbs`{{humanize-recipient-filter "status:free,label:one,label:two"}}`);
        expect(this.element.textContent.trim()).to.equal('Free members & Labels: One, Two');
    });

    it('handles paid members and labels array', async function () {
        await render(hbs`{{humanize-recipient-filter "status:-free,labels:[one,two]"}}`);
        expect(this.element.textContent.trim()).to.equal('Paid members & Labels: One, Two');
    });

    it('handles paid members and individual labels', async function () {
        await render(hbs`{{humanize-recipient-filter "status:-free,label:one,label:two"}}`);
        expect(this.element.textContent.trim()).to.equal('Paid members & Labels: One, Two');
    });

    it('handles just labels', async function () {
        await render(hbs`{{humanize-recipient-filter "label:one,label:two"}}`);
        expect(this.element.textContent.trim()).to.equal('Labels: One, Two');
    });

    it('handles paid members and products array', async function () {
        await render(hbs`{{humanize-recipient-filter "status:-free,products:[one,two]"}}`);
        expect(this.element.textContent.trim()).to.equal('Paid members & Products: One, Two');
    });

    it('handles paid members and individual products', async function () {
        await render(hbs`{{humanize-recipient-filter "status:-free,product:one,product:two"}}`);
        expect(this.element.textContent.trim()).to.equal('Paid members & Products: One, Two');
    });

    it('handles just products', async function () {
        await render(hbs`{{humanize-recipient-filter "product:one,product:two"}}`);
        expect(this.element.textContent.trim()).to.equal('Products: One, Two');
    });

    it('handles labels and products', async function () {
        await render(hbs`{{humanize-recipient-filter "label:one,product:two"}}`);
        expect(this.element.textContent.trim()).to.equal('Label: One & Product: Two');
    });
});

import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {click, find, findAll, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-image-uploader-with-preview', function () {
    setupRenderingTest();

    it('renders image if provided', async function () {
        let remove = sinon.spy();
        this.set('remove', remove);
        this.set('image', 'http://example.com/test.png');

        await render(hbs`{{gh-image-uploader-with-preview image=image remove=(action remove)}}`);

        expect(findAll('.gh-image-uploader.-with-image').length).to.equal(1);
        expect(find('img').getAttribute('src')).to.equal('http://example.com/test.png');
    });

    it('renders upload form when no image provided', async function () {
        await render(hbs`{{gh-image-uploader-with-preview image=image}}`);

        expect(findAll('input[type="file"]').length).to.equal(1);
    });

    it('triggers remove action when delete icon is clicked', async function () {
        let remove = sinon.spy();
        this.set('remove', remove);
        this.set('image', 'http://example.com/test.png');

        await render(hbs`{{gh-image-uploader-with-preview image=image remove=(action remove)}}`);
        await click('.image-delete');

        expect(remove.calledOnce).to.be.true;
    });
});

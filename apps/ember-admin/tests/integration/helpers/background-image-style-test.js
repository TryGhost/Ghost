import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Helper: background-image-style', function () {
    setupRenderingTest();

    it('renders', async function () {
        await render(hbs`{{background-image-style "test.png"}}`);
        expect(this.element).to.have.trimmed.text('background-image: url(test.png);');
    });

    it('escapes URLs', async function () {
        await render(hbs`{{background-image-style "test image.png"}}`);
        expect(this.element).to.have.trimmed.text('background-image: url(test%20image.png);');
    });

    it('handles already escaped URLs', async function () {
        await render(hbs`{{background-image-style "test%20image.png"}}`);
        expect(this.element).to.have.trimmed.text('background-image: url(test%20image.png);');
    });

    it('handles empty URLs', async function () {
        this.set('testImage', undefined);
        await render(hbs`{{background-image-style testImage}}`);
        expect(this.element, 'undefined').to.have.trimmed.text('');

        this.set('testImage', null);
        await render(hbs`{{background-image-style testImage}}`);
        expect(this.element, 'null').to.have.trimmed.text('');

        this.set('testImage', '');
        await render(hbs`{{background-image-style testImage}}`);
        expect(this.element, 'blank').to.have.trimmed.text('');
    });
});

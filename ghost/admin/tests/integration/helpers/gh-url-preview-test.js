import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Unit: Component: gh-url-preview', function () {
    setupRenderingTest();

    beforeEach(function () {
        let configStub = {
            blogUrl: 'http://my-ghost-blog.com'
        };
        this.owner.register('config:main', configStub, {instantiate: false});
    });

    it('generates the correct preview URL with a prefix', async function () {
        await render(hbs`
            <GhUrlPreview
                @prefix="tag"
                @slug="test-slug"
                @tagName="p"
                @classNames="test-class"
            />`);

        expect(this.element).to.have.trimmed.text('my-ghost-blog.com/tag/test-slug/');
    });

    it('generates the correct preview URL without a prefix', async function () {
        await render(hbs`
            <GhUrlPreview
                @slug="test-slug"
                @tagName="p"
                @classNames="test-class"
            />`);

        expect(this.element).to.have.trimmed.text('my-ghost-blog.com/test-slug/');
    });
});

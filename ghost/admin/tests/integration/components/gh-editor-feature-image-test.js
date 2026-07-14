import Component from '@ember/component';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {click, find, render, settled, waitUntil} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-editor-feature-image', function () {
    setupRenderingTest();

    beforeEach(function () {
        this.owner.register('component:koenig-lexical-editor-input', Component.extend({}));
        this.owner.register('template:components/koenig-lexical-editor-input', hbs``);

        this.setProperties({
            alt: 'Existing alt text',
            caption: null,
            clearImage: sinon.spy(),
            handleCaptionBlur: sinon.spy(),
            image: '/content/images/feature.png',
            updateAlt: sinon.spy(),
            updateCaption: sinon.spy(),
            updateImage: sinon.spy()
        });
    });

    async function renderFeatureImage(context) {
        await render(hbs`
            <GhEditorFeatureImage
                @image={{this.image}}
                @updateImage={{this.updateImage}}
                @clearImage={{this.clearImage}}
                @alt={{this.alt}}
                @updateAlt={{this.updateAlt}}
                @caption={{this.caption}}
                @updateCaption={{this.updateCaption}}
                @handleCaptionBlur={{this.handleCaptionBlur}}
                @generateAlt={{this.generateAlt}}
            />
        `, {owner: context.owner});
    }

    it('shows the generate action only when a callback and image are present', async function () {
        await renderFeatureImage(this);
        await click('[title="Toggle between editing alt text and caption"]');
        expect(find('[data-test-button="generate-feature-image-alt"]')).not.to.exist;

        this.set('generateAlt', sinon.stub().resolves('Generated alt text'));
        expect(find('[data-test-button="generate-feature-image-alt"]')).to.exist;

        this.set('image', null);
        expect(find('[data-test-button="generate-feature-image-alt"]')).not.to.exist;
    });

    it('blocks repeated generation while pending and replaces alt text on success', async function () {
        let resolveGeneration;
        const generation = new Promise((resolve) => {
            resolveGeneration = resolve;
        });
        const generateAlt = sinon.stub().returns(generation);
        this.set('generateAlt', generateAlt);

        await renderFeatureImage(this);
        await click('[title="Toggle between editing alt text and caption"]');

        const button = find('[data-test-button="generate-feature-image-alt"]');
        button.click();
        button.click();

        await waitUntil(() => button.disabled);
        expect(button.disabled).to.be.true;
        expect(button.textContent.trim()).to.equal('Generating…');
        expect(generateAlt.calledOnceWithExactly('/content/images/feature.png')).to.be.true;

        resolveGeneration('Generated alt text');
        await settled();

        expect(this.updateAlt.calledOnceWithExactly('Generated alt text')).to.be.true;
        expect(button.disabled).to.be.false;
        expect(button.textContent.trim()).to.equal('Generate');
    });

    it('preserves existing alt text and shows an API error when generation fails', async function () {
        const error = new Error('Generation failed');
        this.set('generateAlt', sinon.stub().rejects(error));
        const notifications = this.owner.lookup('service:notifications');
        const showAPIError = sinon.stub(notifications, 'showAPIError');

        await renderFeatureImage(this);
        await click('[title="Toggle between editing alt text and caption"]');
        await click('[data-test-button="generate-feature-image-alt"]');

        expect(this.updateAlt.called).to.be.false;
        expect(find('[aria-label="Alt text for feature image"]').value).to.equal('Existing alt text');
        expect(showAPIError.calledOnceWithExactly(error, {key: 'feature-image.alt-text.generate'})).to.be.true;
    });
});

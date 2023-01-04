import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-unsplash', function () {
    setupRenderingTest();

    it('renders', async function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // await render(hbs`
        //   {{#gh-unsplash}}
        //     template content
        //   {{/gh-unsplash}}
        // `);

        await render(hbs`<GhUnsplash />`);
        expect(this.element).to.exist;
    });

    it('loads new photos by default');
    it('has responsive columns');
    it('can zoom');
    it('can close zoom by clicking on image');
    it('can close zoom by clicking outside image');
    it('triggers insert action');
    it('handles errors');

    describe('searching', function () {
        it('works');
        it('handles no results');
        it('handles error');
    });

    describe('closing', function () {
        it('triggers close action');
        it('can be triggerd by escape key');
        it('cannot be triggered by escape key when zoomed');
    });
});

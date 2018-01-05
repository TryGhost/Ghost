import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-unsplash', function () {
    setupComponentTest('gh-unsplash', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#gh-unsplash}}
        //     template content
        //   {{/gh-unsplash}}
        // `);

        this.render(hbs`{{gh-unsplash}}`);
        expect(this.$()).to.have.length(1);
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

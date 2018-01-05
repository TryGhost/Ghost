import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-markdown-editor', function () {
    setupComponentTest('gh-markdown-editor', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#gh-markdown-editor}}
        //     template content
        //   {{/gh-markdown-editor}}
        // `);

        this.render(hbs`{{gh-markdown-editor}}`);
        expect(this.$()).to.have.length(1);
    });

    describe('unsplash', function () {
        it('has unsplash icon in toolbar if unsplash is active');
        it('opens unsplash modal when clicked');
        it('closes unsplash modal when close triggered');
        it('inserts unsplash image & credit when selected');
        it('inserts at cursor when editor has focus');
        it('inserts at end when editor is blurred');
    });
});

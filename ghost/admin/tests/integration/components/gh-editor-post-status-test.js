import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-editor-post-status', function () {
    setupComponentTest('gh-editor-post-status', {
        integration: true
    });

    it('renders', function () {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.on('myAction', function(val) { ... });
        // Template block usage:
        // this.render(hbs`
        //   {{#gh-editor-post-status}}
        //     template content
        //   {{/gh-editor-post-status}}
        // `);

        this.render(hbs`{{gh-editor-post-status}}`);
        expect(this.$()).to.have.length(1);
    });
});
